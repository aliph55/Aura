import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { showRewardedAd } from '../../components/adsService';
import { useModel } from '../../contexts/ModelContext';

const SYSTEM_PROMPT = `You are Aura, an AI assistant. The user is a human talking to you.
IMPORTANT RULES:
- You are the ASSISTANT, not the user
- Never say "my name is [user's name]"
- Never repeat what the user said as if it's your own statement
- Keep responses short and helpful
- Respond in the same language as the user`;

const NUM_LAYERS = 24;
const NUM_KV_HEADS = 2;
const HEAD_DIM = 64;
const TIMER_SECONDS = 420;
const MAX_HISTORY = 5;

const getMaxTokens = userMessage => {
  const len = userMessage.trim().length;
  if (len < 20) return 80;
  if (len < 60) return 200;
  if (len < 150) return 400;
  return 600;
};

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

const disposePastKV = pastKV => {
  if (!pastKV) return;
  try {
    Object.values(pastKV).forEach(t => t?.dispose?.());
  } catch (e) {}
};

// --- MODULE-LEVEL REUSABLE BUFFERS -------------------------------------------
// topK <= 64 oldugu surece gecerli; her token'da allocation yok.
const _HEAP_CAPACITY = 64;
const _hs = new Float32Array(_HEAP_CAPACITY); // heap scores
const _hi = new Int32Array(_HEAP_CAPACITY); // heap indices
const _ev = new Float32Array(_HEAP_CAPACITY); // exp values (softmax)

// Min-heap siftDown
const _siftDown = (size, pos) => {
  while (true) {
    let smallest = pos;
    const l = (pos << 1) | 1;
    const r = l + 1;
    if (l < size && _hs[l] < _hs[smallest]) smallest = l;
    if (r < size && _hs[r] < _hs[smallest]) smallest = r;
    if (smallest === pos) break;
    let tmp = _hs[pos];
    _hs[pos] = _hs[smallest];
    _hs[smallest] = tmp;
    let ti = _hi[pos];
    _hi[pos] = _hi[smallest];
    _hi[smallest] = ti;
    pos = smallest;
  }
};

// --- FAST SAMPLING: O(vocab * log k) min-heap --------------------------------
// Onceki: O(vocab * topK) linear scan ~6M op; bu: ~800k op (~7.5x daha hizli)
const fastSampleToken = (
  logitsData,
  offset,
  vocabSize,
  temperature = 0.4,
  topK = 40,
) => {
  const k = Math.min(topK, _HEAP_CAPACITY, vocabSize);

  let maxVal = logitsData[offset];
  for (let i = 1; i < vocabSize; i++) {
    if (logitsData[offset + i] > maxVal) maxVal = logitsData[offset + i];
  }
  const invTemp = 1.0 / temperature;

  // Ilk k elemani yukle, Floyd heapify: O(k)
  for (let i = 0; i < k; i++) {
    _hs[i] = (logitsData[offset + i] - maxVal) * invTemp;
    _hi[i] = i;
  }
  for (let i = (k >> 1) - 1; i >= 0; i--) _siftDown(k, i);

  // Kalan elemanlari filtrele: O((vocab-k) * log k)
  for (let i = k; i < vocabSize; i++) {
    const score = (logitsData[offset + i] - maxVal) * invTemp;
    if (score > _hs[0]) {
      _hs[0] = score;
      _hi[0] = i;
      _siftDown(k, 0);
    }
  }

  // Softmax sadece top-k uzerinde
  let sum = 0.0;
  for (let i = 0; i < k; i++) {
    const e = Math.exp(_hs[i]);
    _ev[i] = e;
    sum += e;
  }

  // Weighted sample
  let rand = Math.random() * sum;
  for (let i = 0; i < k; i++) {
    rand -= _ev[i];
    if (rand <= 0) return _hi[i];
  }

  // Fallback: en yuksek score
  let bestIdx = _hi[0],
    bestScore = _hs[0];
  for (let i = 1; i < k; i++) {
    if (_hs[i] > bestScore) {
      bestScore = _hs[i];
      bestIdx = _hi[i];
    }
  }
  return bestIdx;
};

export const useChatLogic = ({ route, navigation }) => {
  const { groupId, chatId } = route.params || {};
  const { sessionRef, tokenizerRef, modelLoaded } = useModel();

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
  const [isFocused, setIsFocused] = useState(false);

  const scrollViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const historyRef = useRef([]);

  const decode = useCallback(
    tokenIds => {
      if (!tokenizerRef?.current) return '';
      return tokenizerRef.current.decode(tokenIds);
    },
    [tokenizerRef],
  );

  // --- Text Generation --------------------------------------------------------

  const generateResponse = useCallback(
    async userMessage => {
      if (!sessionRef?.current) throw new Error('Model not loaded');
      if (!tokenizerRef?.current) throw new Error('Tokenizer not loaded');

      const inputIds = tokenizerRef.current.encodeChat(
        SYSTEM_PROMPT,
        userMessage,
        historyRef.current.slice(-MAX_HISTORY),
      );

      const seqLen = inputIds.length;
      const maxTokens = getMaxTokens(userMessage);

      // BigInt donusumu: map() ara array'i olmadan
      const initialInputIds = new BigInt64Array(seqLen);
      for (let i = 0; i < seqLen; i++) initialInputIds[i] = BigInt(inputIds[i]);

      const initialPositionIds = new BigInt64Array(seqLen);
      for (let i = 0; i < seqLen; i++) initialPositionIds[i] = BigInt(i);

      let pastKV = createEmptyPastKV();

      const generatedIds = [];
      let fullText = '';
      setStreamingText('');
      setIsStreaming(true);

      const singleInput = new BigInt64Array(1);
      const singlePos = new BigInt64Array(1);

      try {
        for (let step = 0; step < maxTokens; step++) {
          const isFirst = step === 0;

          // maskLen: step 0 -> seqLen, step 1 -> seqLen+1, step n -> seqLen+n
          //
          // NOT: ONNX Runtime native bridge, TypedArray subarray/view'ini degil
          // tamponun gercek .byteLength'ini okur. Bu yuzden her adimda yeni
          // BigInt64Array zorunlu. Model inference'a gore ihmal edilebilir maliyet.
          const maskLen = seqLen + step;
          const maskData = new BigInt64Array(maskLen).fill(1n);

          const feeds = {
            input_ids: new ort.Tensor(
              'int64',
              isFirst ? initialInputIds : singleInput,
              [1, isFirst ? seqLen : 1],
            ),
            attention_mask: new ort.Tensor('int64', maskData, [1, maskLen]),
            position_ids: new ort.Tensor(
              'int64',
              isFirst ? initialPositionIds : singlePos,
              [1, isFirst ? seqLen : 1],
            ),
            ...pastKV,
          };

          const results = await sessionRef.current.run(feeds);
          disposePastKV(pastKV);
          pastKV = null;

          const logitsData = results.logits.data;
          const vocabSize = results.logits.dims[2];
          const offset = logitsData.length - vocabSize;

          const nextTokenId = fastSampleToken(logitsData, offset, vocabSize);

          if (nextTokenId === 151645 || nextTokenId === 151643) break;

          generatedIds.push(nextTokenId);

          // Her 8 token'da UI guncelle (eskisi 4) -- React render yariya iner
          if (step % 8 === 0) {
            fullText = decode(generatedIds);
            setStreamingText(fullText);
            await new Promise(r => setTimeout(r, 0));
          }

          // Sonraki adim icin single-element arrays'i guncelle
          singleInput[0] = BigInt(nextTokenId);
          // step 0'dan sonra: konum = seqLen; step 1'den sonra: seqLen+1; vb.
          singlePos[0] = BigInt(seqLen + step);

          const newPastKV = {};
          for (let i = 0; i < NUM_LAYERS; i++) {
            newPastKV[`past_key_values.${i}.key`] = results[`present.${i}.key`];
            newPastKV[`past_key_values.${i}.value`] =
              results[`present.${i}.value`];
          }
          pastKV = newPastKV;
        }

        if (generatedIds.length > 0) {
          fullText = decode(generatedIds);
          setStreamingText(fullText);
        }
      } finally {
        disposePastKV(pastKV);
        pastKV = null;
        setIsStreaming(false);
      }

      return fullText || 'No response generated.';
    },
    [sessionRef, tokenizerRef, decode],
  );

  // --- Storage ----------------------------------------------------------------

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
          setTitle(chat.title || '');
          historyRef.current = (chat.messages || [])
            .reduce((acc, m, i, arr) => {
              if (m.sender === 'user' && arr[i + 1]?.sender === 'ai') {
                acc.push([m.text, arr[i + 1].text]);
              }
              return acc;
            }, [])
            .slice(-MAX_HISTORY);
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }, [groupId, chatId, saveGroups]);

  // --- Chat Actions -----------------------------------------------------------

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Warning', 'Model is still loading, please wait.');
      return;
    }

    const userText = inputText.trim();
    setInputText('');

    let newTitle = title;
    if (!title && messages.length === 0) {
      newTitle = userText.slice(0, 30);
      setTitle(newTitle);
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      text: userText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

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
      historyRef.current = [...historyRef.current, [userText, response]].slice(
        -MAX_HISTORY,
      );

      const updatedGroups = groups.map(g =>
        g.id === currentGroupId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChatId
                  ? {
                      ...c,
                      title: newTitle,
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
    title,
    generateResponse,
    debouncedSave,
  ]);

  const startNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: '',
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
  }, [groups, currentGroupId, navigation, saveGroups]);

  const startNewGroup = useCallback(() => {
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();
    const newGroup = {
      id: newGroupId,
      name: 'General',
      chats: [
        {
          id: newChatId,
          title: '',
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
  }, [groups, navigation, saveGroups]);

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
  }, [groups, currentGroupId, newGroupName, saveGroups]);

  const formatTime = useCallback(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, [seconds]);

  // --- Effects ----------------------------------------------------------------

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsFocused(true);
      loadGroups();
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsFocused(false);
      setSeconds(TIMER_SECONDS);
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, loadGroups]);

  useEffect(() => {
    if (!isFocused) return;
    const id = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          showRewardedAd().catch(e => console.log('Ad skipped:', e.message));
          return TIMER_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isFocused]);

  useEffect(() => {
    loadGroups();
  }, [route.params?.groupId, route.params?.chatId]); // eslint-disable-line

  useEffect(() => {
    return () => clearTimeout(saveTimeoutRef.current);
  }, []);

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
    isFocused,
  };
};
