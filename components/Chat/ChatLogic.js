import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { showRewardedAd } from '../adsService';
import { useModel } from '../../contexts/ModelContext';

// Qwen2 chat format
const SYSTEM_PROMPT = `You are a helpful multilingual assistant. Always respond in the same language as the user. If the user writes in Turkish, respond in Turkish. If in English, respond in English, and so on.`;

const NUM_LAYERS = 24; // Qwen2-0.5B layer sayısı
const NUM_KV_HEADS = 2; // Qwen2-0.5B KV head sayısı
const HEAD_DIM = 64; // Head boyutu
const MAX_NEW_TOKENS = 200;
const TIMER_SECONDS = 420;

// Qwen2 chat template
const buildPrompt = (userMessage, history = []) => {
  let prompt = `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n`;
  for (const [userMsg, assistantMsg] of history) {
    prompt += `<|im_start|>user\n${userMsg}<|im_end|>\n<|im_start|>assistant\n${assistantMsg}<|im_end|>\n`;
  }
  prompt += `<|im_start|>user\n${userMessage}<|im_end|>\n<|im_start|>assistant\n`;
  return prompt;
};

// Boş past_key_values oluştur
const createEmptyPastKV = () => {
  const pastKV = {};
  for (let i = 0; i < NUM_LAYERS; i++) {
    pastKV[`past_key_values.${i}.key`] = new ort.Tensor(
      'float32',
      new Float32Array(0),
      [1, NUM_KV_HEADS, 0, HEAD_DIM],
    );
    pastKV[`past_key_values.${i}.value`] = new ort.Tensor(
      'float32',
      new Float32Array(0),
      [1, NUM_KV_HEADS, 0, HEAD_DIM],
    );
  }
  return pastKV;
};

export const useChatLogic = ({ route, navigation }) => {
  const { groupId, chatId } = route.params || {};
  const { sessionRef, tokenizerRef, modelLoaded } = useModel();

  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(groupId);
  const [currentGroupName, setCurrentGroupName] = useState('');
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [title, setTitle] = useState('');
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const [isGroupNameModalVisible, setGroupNameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Refs
  const scrollViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const historyRef = useRef([]); // Son 5 konuşmayı tutar

  // ─── Tokenizer ───────────────────────────────────────────────────────────────

  const tokenize = useCallback(
    text => {
      if (!tokenizerRef?.current) throw new Error('Tokenizer not loaded');
      // @xenova/transformers tokenizer kullanımı
      const encoded = tokenizerRef.current(text, { return_tensors: false });
      return encoded.input_ids;
    },
    [tokenizerRef],
  );

  const decode = useCallback(
    tokenIds => {
      if (!tokenizerRef?.current) return '';
      return tokenizerRef.current.decode(tokenIds, {
        skip_special_tokens: true,
      });
    },
    [tokenizerRef],
  );

  // ─── Token Sampling ──────────────────────────────────────────────────────────

  const sampleToken = (logits, temperature = 0.7, topP = 0.9) => {
    // Temperature scaling
    const scaled = logits.map(l => l / temperature);
    const maxVal = Math.max(...scaled);
    const expVals = scaled.map(l => Math.exp(l - maxVal));
    const sum = expVals.reduce((a, b) => a + b, 0);
    const probs = expVals.map(e => e / sum);

    // Top-p (nucleus) sampling
    const sorted = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);

    let cumSum = 0;
    const nucleus = [];
    for (const item of sorted) {
      nucleus.push(item);
      cumSum += item.p;
      if (cumSum >= topP) break;
    }

    const nucleusSum = nucleus.reduce((s, item) => s + item.p, 0);
    let rand = Math.random() * nucleusSum;
    for (const item of nucleus) {
      rand -= item.p;
      if (rand <= 0) return item.i;
    }
    return nucleus[0].i;
  };

  // ─── Text Generation ─────────────────────────────────────────────────────────

  const generateResponse = useCallback(
    async userMessage => {
      if (!sessionRef?.current) throw new Error('Model not loaded');

      const prompt = buildPrompt(userMessage, historyRef.current);
      const inputIds = tokenize(prompt);
      const seqLen = inputIds.length;

      let currentInputIds = new BigInt64Array(inputIds.map(BigInt));
      let attentionMask = new BigInt64Array(seqLen).fill(1n);
      let positionIds = new BigInt64Array(
        Array.from({ length: seqLen }, (_, i) => BigInt(i)),
      );
      let pastKV = createEmptyPastKV();
      let pastLen = 0;

      const generatedIds = [];
      let fullText = '';
      setStreamingText('');
      setIsStreaming(true);

      try {
        for (let step = 0; step < MAX_NEW_TOKENS; step++) {
          const feeds = {
            input_ids: new ort.Tensor('int64', currentInputIds, [
              1,
              currentInputIds.length,
            ]),
            attention_mask: new ort.Tensor('int64', attentionMask, [
              1,
              attentionMask.length,
            ]),
            position_ids: new ort.Tensor('int64', positionIds, [
              1,
              positionIds.length,
            ]),
            ...pastKV,
          };

          const results = await sessionRef.current.run(feeds);

          // Logits al
          const logits = results.logits.data;
          const vocabSize = results.logits.dims[2];
          const lastLogits = Array.from(
            logits.slice(logits.length - vocabSize),
          );

          // Token seç
          const nextTokenId = sampleToken(lastLogits);
          generatedIds.push(nextTokenId);

          // Decode et
          fullText = decode(generatedIds);
          setStreamingText(fullText);

          // EOS kontrolü
          if (nextTokenId === 151645) break; // Qwen2 <|im_end|> token id

          // Sonraki adım için güncelle
          currentInputIds = new BigInt64Array([BigInt(nextTokenId)]);
          pastLen += step === 0 ? seqLen : 1;
          attentionMask = new BigInt64Array(pastLen + 1).fill(1n);
          positionIds = new BigInt64Array([BigInt(pastLen)]);

          // Past key values güncelle
          const newPastKV = {};
          for (let i = 0; i < NUM_LAYERS; i++) {
            newPastKV[`past_key_values.${i}.key`] = results[`present.${i}.key`];
            newPastKV[`past_key_values.${i}.value`] =
              results[`present.${i}.value`];
          }
          pastKV = newPastKV;

          // UI güncellemesi için kısa bekleme
          await new Promise(r => setTimeout(r, 10));
        }
      } finally {
        setIsStreaming(false);
      }

      return fullText || 'No response generated.';
    },
    [sessionRef, tokenizerRef],
  );

  // ─── Storage ─────────────────────────────────────────────────────────────────

  const saveGroups = useCallback(async groupsToSave => {
    try {
      await AsyncStorage.setItem('groups', JSON.stringify(groupsToSave));
    } catch (e) {
      console.error('Save error:', e);
    }
  }, []);

  const debouncedSave = useCallback(
    groupsToSave => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveGroups(groupsToSave), 1000);
    },
    [saveGroups],
  );

  const loadGroups = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('groups');
      const parsed = raw ? JSON.parse(raw) : [];

      if (parsed.length === 0) {
        const defaultGroup = {
          id: Date.now().toString(),
          name: 'General',
          chats: [],
        };
        setGroups([defaultGroup]);
        setCurrentGroupId(defaultGroup.id);
        setCurrentGroupName(defaultGroup.name);
        await saveGroups([defaultGroup]);
        return;
      }

      setGroups(parsed);

      if (groupId && chatId) {
        const group = parsed.find(g => g.id === groupId);
        const chat = group?.chats.find(c => c.id === chatId);
        if (group && chat) {
          setCurrentGroupId(groupId);
          setCurrentGroupName(group.name);
          setCurrentChatId(chatId);
          setMessages(chat.messages || []);
          setTitle(chat.title || 'Chat');
          historyRef.current = (chat.messages || [])
            .reduce((acc, m, i, arr) => {
              if (m.sender === 'user' && arr[i + 1]?.sender === 'ai') {
                acc.push([m.text, arr[i + 1].text]);
              }
              return acc;
            }, [])
            .slice(-5);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }, [groupId, chatId]);

  // ─── Chat Actions ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Warning', 'Model is still loading, please wait.');
      return;
    }

    const userText = inputText.trim();
    setInputText('');

    const userMessage = {
      id: `${Date.now()}-user`,
      text: userText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!title) setTitle(userText.slice(0, 50));

    try {
      const response = await generateResponse(userText);

      const aiMessage = {
        id: `${Date.now()}-ai`,
        text: response,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      setStreamingText('');

      // Geçmişi güncelle (max 5)
      historyRef.current = [...historyRef.current, [userText, response]].slice(
        -5,
      );

      // Kaydet
      const updatedGroups = groups.map(g =>
        g.id === currentGroupId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChatId
                  ? {
                      ...c,
                      messages: finalMessages,
                      lastOpened: new Date().toISOString(),
                    }
                  : c,
              ),
            }
          : g,
      );
      setGroups(updatedGroups);
      debouncedSave(updatedGroups);
    } catch (e) {
      console.error('Generation error:', e);
      setIsStreaming(false);
      Alert.alert('Error', e.message);
    }
  }, [
    inputText,
    isStreaming,
    modelLoaded,
    messages,
    groups,
    currentGroupId,
    currentChatId,
    generateResponse,
  ]);

  const startNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: 'Chat',
      messages: [],
      startDate: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
    };
    const updatedGroups = groups.map(g =>
      g.id === currentGroupId ? { ...g, chats: [...g.chats, newChat] } : g,
    );
    setGroups(updatedGroups);
    setCurrentChatId(newChatId);
    setMessages([]);
    setTitle('');
    historyRef.current = [];
    saveGroups(updatedGroups);
    navigation.setParams({ groupId: currentGroupId, chatId: newChatId });
  }, [groups, currentGroupId, navigation]);

  const startNewGroup = useCallback(() => {
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();
    const newGroup = {
      id: newGroupId,
      name: 'General',
      chats: [
        {
          id: newChatId,
          title: 'Chat',
          messages: [],
          startDate: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
        },
      ],
    };
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    setCurrentGroupId(newGroupId);
    setCurrentGroupName('General');
    setCurrentChatId(newChatId);
    setMessages([]);
    setTitle('');
    historyRef.current = [];
    saveGroups(updatedGroups);
    navigation.setParams({ groupId: newGroupId, chatId: newChatId });
  }, [groups, navigation]);

  const updateGroupName = useCallback(() => {
    if (!newGroupName.trim()) return;
    const updatedGroups = groups.map(g =>
      g.id === currentGroupId ? { ...g, name: newGroupName } : g,
    );
    setGroups(updatedGroups);
    setCurrentGroupName(newGroupName);
    setNewGroupName('');
    setGroupNameModalVisible(false);
    saveGroups(updatedGroups);
  }, [groups, currentGroupId, newGroupName]);

  // ─── Timer ────────────────────────────────────────────────────────────────────

  const formatTime = () => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          showRewardedAd();
          return TIMER_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadGroups();
  }, [route.params?.groupId, route.params?.chatId]);

  useEffect(() => {
    return navigation.addListener('focus', loadGroups);
  }, [navigation]);

  useEffect(() => {
    return () => clearTimeout(saveTimeoutRef.current);
  }, []);

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    messages,
    inputText,
    setInputText,
    isStreaming,
    streamingText,
    modelLoaded,
    groups,
    currentGroupId,
    currentGroupName,
    currentChatId,
    title,
    seconds,
    scrollViewRef,
    isGroupNameModalVisible,
    setGroupNameModalVisible,
    newGroupName,
    setNewGroupName,
    sendMessage,
    startNewChat,
    startNewGroup,
    updateGroupName,
    formatTime,
  };
};
