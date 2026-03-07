import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { showRewardedAd } from '../adsService';
import { useModel } from '../../contexts/ModelContext';

const SYSTEM_PROMPT = `You are a helpful multilingual assistant.`;

const NUM_LAYERS = 24;
const NUM_KV_HEADS = 2;
const HEAD_DIM = 64;
const MAX_NEW_TOKENS = 500;
const TIMER_SECONDS = 420;

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

  const scrollViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const historyRef = useRef([]);

  // ─── Tokenizer ───────────────────────────────────────────────────────────────

  const decode = useCallback(
    tokenIds => {
      if (!tokenizerRef?.current) return '';
      return tokenizerRef.current.decode(tokenIds);
    },
    [tokenizerRef],
  );

  // ─── Token Sampling ──────────────────────────────────────────────────────────

  const sampleToken = (logits, temperature = 0.7, topP = 0.9) => {
    const scaled = logits.map(l => l / temperature);

    let maxVal = scaled[0];
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i] > maxVal) maxVal = scaled[i];
    }

    const expVals = scaled.map(l => Math.exp(l - maxVal));
    let sum = 0;
    for (let i = 0; i < expVals.length; i++) sum += expVals[i];
    const probs = expVals.map(e => e / sum);

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

      const inputIds = tokenizerRef.current.encodeChat(
        SYSTEM_PROMPT,
        userMessage,
        historyRef.current,
      );

      const seqLen = inputIds.length;
      console.log('📝 Prompt length:', seqLen, 'tokens');

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

          if (step === 0) {
            console.log('📤 Output keys:', Object.keys(results));
            console.log('📊 Logits dims:', results.logits?.dims);
          }

          const logits = results.logits.data;
          const vocabSize = results.logits.dims[2];
          const lastLogits = Array.from(
            logits.slice(logits.length - vocabSize),
          );

          const nextTokenId = sampleToken(lastLogits);

          if (
            nextTokenId === 151645 ||
            nextTokenId === 151643 ||
            nextTokenId === 151644
          ) {
            console.log('✅ EOS token, stopping');
            break;
          }

          generatedIds.push(nextTokenId);
          fullText = decode(generatedIds);
          setStreamingText(fullText);

          if (step < 5) {
            console.log(
              `Step ${step}: token=${nextTokenId}, text="${decode([
                nextTokenId,
              ])}"`,
            );
          }

          currentInputIds = new BigInt64Array([BigInt(nextTokenId)]);
          pastLen += step === 0 ? seqLen : 1;
          attentionMask = new BigInt64Array(pastLen + 1).fill(1n);
          positionIds = new BigInt64Array([BigInt(pastLen)]);

          const newPastKV = {};
          for (let i = 0; i < NUM_LAYERS; i++) {
            newPastKV[`past_key_values.${i}.key`] = results[`present.${i}.key`];
            newPastKV[`past_key_values.${i}.value`] =
              results[`present.${i}.value`];
          }
          pastKV = newPastKV;

          await new Promise(r => setTimeout(r, 10));
        }
      } finally {
        setIsStreaming(false);
      }

      console.log('✅ Final response:', fullText);
      return fullText || 'No response generated.';
    },
    [sessionRef, tokenizerRef, decode],
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
          setTitle(chat.title || '');
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

    // Başlık yoksa VE sohbet henüz hiç mesaj içermiyorsa ilk 7 karakteri başlık yap
    let newTitle = title;
    if (!title && messages.length === 0) {
      newTitle = userText.slice(0, 7);
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
        -5,
      );

      const updatedGroups = groups.map(g =>
        g.id === currentGroupId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChatId
                  ? {
                      ...c,
                      title: newTitle, // ← burada güncel başlık
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
    setTitle(''); // ← yeni sohbet → başlık sıfırlanır
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
