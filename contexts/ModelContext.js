import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useCallback,
} from 'react';
import { Alert, Platform } from 'react-native';
import { initLlama, releaseAllLlama } from 'llama.rn';

const ModelContext = createContext(null);

export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel must be used within <ModelProvider>');
  return ctx;
};

// ─── Gemma 4 Prompt Builder ───────────────────────────────────────────────────
// Gemma 4 drops <start_of_turn>/<end_of_turn> for a new <|turn>role ... <turn|>
// format, and — unlike Gemma 3 — has a *native* system role. So we no longer
// need to smuggle the system prompt into the first user turn; it gets its own
// turn instead.
//
// enableThinking=true injects the <|think|> control token, which turns on
// Gemma 4's chain-of-thought mode. Left off by default since it costs extra
// tokens/latency, which matters more on-device than in the cloud.
export const buildGemmaPrompt = (
  messages,
  systemPrompt = '',
  enableThinking = false,
) => {
  let prompt = '<bos>';
  const thinkTag = enableThinking ? '<|think|>' : '';

  if (systemPrompt || enableThinking) {
    prompt += `<|turn>system\n${thinkTag}${systemPrompt}<turn|>\n`;
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `<|turn>user\n${msg.content}<turn|>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|turn>model\n${msg.content}<turn|>\n`;
    }
  }

  prompt += '<|turn>model\n';
  return prompt;
};

// ─── Thought-channel filter ───────────────────────────────────────────────────
// Even with thinking disabled, some Gemma 4 sizes still emit an empty
// <|channel>thought ... <channel|> wrapper before the real answer. This keeps
// it out of the chat UI, and stays streaming-safe (a marker can arrive split
// across several tokens).
const THOUGHT_OPEN = '<|channel>thought';
const THOUGHT_CLOSE = '<channel|>';

const createThoughtFilter = onVisible => {
  let buffer = '';
  let inThought = false;

  const feed = token => {
    buffer += token;

    for (;;) {
      if (!inThought) {
        const openIdx = buffer.indexOf(THOUGHT_OPEN);
        if (openIdx === -1) {
          // Hold back a tail as long as the marker in case it's mid-arrival.
          const safeLen = Math.max(0, buffer.length - THOUGHT_OPEN.length);
          if (safeLen > 0) {
            onVisible(buffer.slice(0, safeLen));
            buffer = buffer.slice(safeLen);
          }
          return;
        }
        if (openIdx > 0) onVisible(buffer.slice(0, openIdx));
        buffer = buffer.slice(openIdx + THOUGHT_OPEN.length);
        inThought = true;
      } else {
        const closeIdx = buffer.indexOf(THOUGHT_CLOSE);
        if (closeIdx === -1) {
          buffer = buffer.slice(-THOUGHT_CLOSE.length);
          return;
        }
        buffer = buffer.slice(closeIdx + THOUGHT_CLOSE.length);
        inThought = false;
        // loop again — there could be more visible text (or another marker)
        // left in the buffer after the close tag
      }
    }
  };

  // MUST be called once generation finishes. feed() always holds back a short
  // tail (in case it's the start of a marker), so without this, the last
  // ~17 characters of every response would be silently dropped — and short
  // replies could disappear completely.
  const flush = () => {
    if (!inThought && buffer) onVisible(buffer);
    buffer = '';
  };

  return { feed, flush };
};

// ─── GPU Layers (Android / iOS) ───────────────────────────────────────────────
const getGpuLayers = () => {
  if (Platform.OS === 'ios') return 99; // Metal
  return 20; // Android Vulkan — güvenli değer
};

// ─── Model Provider ───────────────────────────────────────────────────────────
export const ModelProvider = ({ children }) => {
  const llamaCtxRef = useRef(null);
  const isLoadingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const abortRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Model Yükleme ───────────────────────────────────────────────────────────
  const loadModel = useCallback(
    async modelPath => {
      if (!modelPath) throw new Error('Model path is required');
      if (isLoadingRef.current) return null;

      // Zaten yüklüyse dön
      if (llamaCtxRef.current && modelLoaded) {
        console.log('✅ Model already loaded');
        return llamaCtxRef.current;
      }

      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        // Önceki modeli temizle
        if (llamaCtxRef.current) {
          await llamaCtxRef.current.release();
          llamaCtxRef.current = null;
        }

        console.log('🧠 Loading Gemma 4 E2B-IT...');

        llamaCtxRef.current = await initLlama({
          model: modelPath,
          n_ctx: 2048,
          n_batch: 512,
          n_threads: 4,
          n_gpu_layers: getGpuLayers(),
          use_mlock: false,
          embedding: false,
        });

        setModelLoaded(true);
        console.log('✅ Gemma 4 E2B-IT ready');
        return llamaCtxRef.current;
      } catch (e) {
        console.error('❌ Model load failed:', e.message);
        llamaCtxRef.current = null;
        setModelLoaded(false);
        Alert.alert('Model Hatası', e.message);
        throw e;
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [modelLoaded],
  );

  // ── loadVocab (Download.tsx uyumu için) ─────────────────────────────────────
  const loadVocab = useCallback(async () => {
    // llama.rn GGUF içinden vocab'ı otomatik okur, ekstra işleme gerek yok
  }, []);

  // ── Chat / Mesaj Üretimi ────────────────────────────────────────────────────
  const chat = useCallback(
    async (messages, systemPrompt = '', onToken = null, params = {}) => {
      if (!llamaCtxRef.current) throw new Error('Model yüklü değil');
      if (isGeneratingRef.current) throw new Error('Zaten üretim yapılıyor');

      abortRef.current = false;
      isGeneratingRef.current = true;
      setIsGenerating(true);

      try {
        const enableThinking = params.thinking ?? false;
        const prompt = buildGemmaPrompt(messages, systemPrompt, enableThinking);
        let fullResponse = '';

        const thoughtFilter = createThoughtFilter(visibleText => {
          fullResponse += visibleText;
          onToken?.(visibleText);
        });

        await llamaCtxRef.current.completion(
          {
            prompt,
            n_predict: params.n_predict ?? 512,
            temperature: params.temperature ?? 0.7,
            top_p: params.top_p ?? 0.9,
            top_k: params.top_k ?? 40,
            repeat_penalty: params.repeat_penalty ?? 1.1,
            stop: ['<turn|>', '<|turn>'],
          },
          ({ token }) => {
            if (abortRef.current) return;
            thoughtFilter.feed(token);
          },
        );

        if (abortRef.current) return '';

        // Flush whatever's left in the buffer now that generation has ended —
        // otherwise the tail of every response gets swallowed (see flush()
        // comment above).
        thoughtFilter.flush();

        return fullResponse.trim();
      } catch (e) {
        if (abortRef.current) return '';
        console.error('❌ Chat error:', e.message);
        throw e;
      } finally {
        isGeneratingRef.current = false;
        setIsGenerating(false);
        abortRef.current = false;
      }
    },
    [],
  );

  // ── Üretimi Durdur ──────────────────────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    if (!isGeneratingRef.current) return;
    abortRef.current = true;
    llamaCtxRef.current?.stopCompletion?.();
    isGeneratingRef.current = false;
    setIsGenerating(false);
    console.log('🛑 Generation stopped');
  }, []);

  // ── Modeli Temizle (Uygulama kapanırken) ───────────────────────────────────
  const releaseModel = useCallback(async () => {
    try {
      await releaseAllLlama();
      llamaCtxRef.current = null;
      setModelLoaded(false);
    } catch (e) {
      console.error('❌ Release error:', e.message);
    }
  }, []);

  return (
    <ModelContext.Provider
      value={{
        isLoading,
        modelLoaded,
        isGenerating,
        loadModel,
        loadVocab,
        chat,
        stopGeneration,
        releaseModel,
        buildGemmaPrompt,
        llamaContextRef: llamaCtxRef,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export default ModelContext;
