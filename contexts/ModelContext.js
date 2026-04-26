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

// ─── Gemma 3 Prompt Builder ───────────────────────────────────────────────────
export const buildGemmaPrompt = (messages, systemPrompt = '') => {
  let prompt = '<bos>';
  let systemInjected = false;

  for (const msg of messages) {
    if (msg.role === 'user') {
      const prefix =
        !systemInjected && systemPrompt ? `${systemPrompt}\n\n` : '';
      systemInjected = true;
      prompt += `<start_of_turn>user\n${prefix}${msg.content}<end_of_turn>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<start_of_turn>model\n${msg.content}<end_of_turn>\n`;
    }
  }

  prompt += '<start_of_turn>model\n';
  return prompt;
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

        console.log('🧠 Loading Gemma 3 1B-IT...');

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
        console.log('✅ Gemma 3 1B-IT ready');
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
        const prompt = buildGemmaPrompt(messages, systemPrompt);
        let fullResponse = '';

        await llamaCtxRef.current.completion(
          {
            prompt,
            n_predict: params.n_predict ?? 512,
            temperature: params.temperature ?? 0.7,
            top_p: params.top_p ?? 0.9,
            top_k: params.top_k ?? 40,
            repeat_penalty: params.repeat_penalty ?? 1.1,
            stop: ['<end_of_turn>', '<start_of_turn>'],
          },
          ({ token }) => {
            if (abortRef.current) return;
            fullResponse += token;
            onToken?.(token);
          },
        );

        if (abortRef.current) return '';

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
