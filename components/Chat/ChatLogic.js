import { useState, useEffect, useRef, useCallback } from 'react';
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

const TIMER_SECONDS = 420;
const MAX_HISTORY = 10;

const getMaxTokens = userMessage => {
  const len = userMessage.trim().length;
  if (len < 20) return 100;
  if (len < 60) return 250;
  if (len < 150) return 450;
  return 650;
};

export const useChatLogic = ({ route, navigation }) => {
  const { groupId, chatId } = route.params || {};
  const { chat, stopGeneration, modelLoaded, isGenerating } = useModel();

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
  const abortRef = useRef(false);

  // Stale closure önleme için ref'ler
  const groupsRef = useRef(groups);
  const currentGroupIdRef = useRef(currentGroupId);
  const currentChatIdRef = useRef(currentChatId);
  const titleRef = useRef(title);
  const messagesRef = useRef(messages);
  const isGeneratingRef = useRef(isGenerating);

  // Ref'leri güncelle
  useEffect(() => {
    groupsRef.current = groups;
    currentGroupIdRef.current = currentGroupId;
    currentChatIdRef.current = currentChatId;
    titleRef.current = title;
    messagesRef.current = messages;
    isGeneratingRef.current = isGenerating;
  }, [groups, currentGroupId, currentChatId, title, messages, isGenerating]);

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

  // Mesaj üretimi
  const generateResponse = useCallback(
    async (userMessage, onToken) => {
      abortRef.current = false;

      const history = [
        ...historyRef.current.slice(-(MAX_HISTORY * 2)),
        { role: 'user', content: userMessage },
      ];

      return chat(
        history,
        SYSTEM_PROMPT,
        token => {
          if (!abortRef.current && onToken) onToken(token);
        },
        { n_predict: getMaxTokens(userMessage) },
      );
    },
    [chat],
  );

  // Mesaj gönder
  const sendMessage = useCallback(async () => {
    const currentInput = inputText.trim();
    if (!currentInput || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Uyarı', 'Model henüz yükleniyor, lütfen bekleyin.');
      return;
    }

    setInputText('');

    const currentMessages = messagesRef.current;
    const currentTitle = titleRef.current;
    const currentGrpId = currentGroupIdRef.current;
    const currentChtId = currentChatIdRef.current;
    const currentGroups = groupsRef.current;

    let newTitle = currentTitle;
    if (!currentTitle && currentMessages.length === 0) {
      newTitle = currentInput.slice(0, 30);
      setTitle(newTitle);
      titleRef.current = newTitle;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      text: currentInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...currentMessages, userMessage];
    setMessages(newMessages);
    messagesRef.current = newMessages;
    setIsStreaming(true);
    setStreamingText('');

    let accumulated = '';

    try {
      const response = await generateResponse(currentInput, token => {
        accumulated += token;
        setStreamingText(accumulated);
        scrollViewRef.current?.scrollToEnd?.({ animated: false });
      });

      if (abortRef.current) return;

      const finalText = response || accumulated || 'No response generated.';

      const aiMessage = {
        id: `${Date.now()}-ai`,
        text: finalText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      messagesRef.current = finalMessages;
      setStreamingText('');

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: currentInput },
        { role: 'assistant', content: finalText },
      ].slice(-(MAX_HISTORY * 2));

      const updatedGroups = currentGroups.map(g =>
        g.id === currentGrpId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChtId
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
      groupsRef.current = updatedGroups;
      debouncedSave(updatedGroups);
    } catch (e) {
      if (!abortRef.current) {
        console.error('Generation error:', e);
        Alert.alert('Hata', e.message);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [inputText, isStreaming, modelLoaded, generateResponse, debouncedSave]);

  // Durdur butonu
  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    stopGeneration();
    setIsStreaming(false);
    setStreamingText('');
  }, [stopGeneration]);

  // Grup ve chat yükleme
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
        groupsRef.current = [defaultGroup];
        setCurrentGroupId(defaultGroup.id);
        setCurrentGroupName(defaultGroup.name);
        await saveGroups([defaultGroup]);
        return;
      }

      setGroups(parsed);
      groupsRef.current = parsed;

      if (groupId && chatId) {
        const group = parsed.find(g => g.id === groupId);
        const chatItem = group?.chats.find(c => c.id === chatId);
        if (group && chatItem) {
          setCurrentGroupId(groupId);
          setCurrentGroupName(group.name);
          setCurrentChatId(chatId);

          const loadedMessages = chatItem.messages || [];
          setMessages(loadedMessages);
          messagesRef.current = loadedMessages;
          setTitle(chatItem.title || '');
          titleRef.current = chatItem.title || '';

          // History oluştur
          const history = [];
          for (let i = 0; i < loadedMessages.length - 1; i++) {
            if (
              loadedMessages[i].sender === 'user' &&
              loadedMessages[i + 1]?.sender === 'ai'
            ) {
              history.push({ role: 'user', content: loadedMessages[i].text });
              history.push({
                role: 'assistant',
                content: loadedMessages[i + 1].text,
              });
            }
          }
          historyRef.current = history.slice(-(MAX_HISTORY * 2));
        }
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }, [groupId, chatId, saveGroups]);

  const startNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const currentGrpId = currentGroupIdRef.current;

    const newChat = {
      id: newChatId,
      title: '',
      messages: [],
      startDate: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
    };

    const updatedGroups = groupsRef.current.map(g =>
      g.id === currentGrpId ? { ...g, chats: [...g.chats, newChat] } : g,
    );

    setGroups(updatedGroups);
    groupsRef.current = updatedGroups;
    setCurrentChatId(newChatId);
    setMessages([]);
    messagesRef.current = [];
    setTitle('');
    titleRef.current = '';
    historyRef.current = [];
    setStreamingText('');
    saveGroups(updatedGroups);
    navigation.setParams({ groupId: currentGrpId, chatId: newChatId });
  }, [navigation, saveGroups]);

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

    const updatedGroups = [...groupsRef.current, newGroup];
    setGroups(updatedGroups);
    groupsRef.current = updatedGroups;
    setCurrentGroupId(newGroupId);
    setCurrentGroupName('General');
    setCurrentChatId(newChatId);
    setMessages([]);
    messagesRef.current = [];
    setTitle('');
    titleRef.current = '';
    historyRef.current = [];
    setStreamingText('');
    saveGroups(updatedGroups);
    navigation.setParams({ groupId: newGroupId, chatId: newChatId });
  }, [navigation, saveGroups]);

  const updateGroupName = useCallback(() => {
    if (!newGroupName.trim()) return;
    const updatedGroups = groupsRef.current.map(g =>
      g.id === currentGroupIdRef.current ? { ...g, name: newGroupName } : g,
    );
    setGroups(updatedGroups);
    groupsRef.current = updatedGroups;
    setCurrentGroupName(newGroupName);
    setNewGroupName('');
    setGroupNameModalVisible(false);
    saveGroups(updatedGroups);
  }, [newGroupName, saveGroups]);

  const formatTime = useCallback(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, [seconds]);

  // Effects
  useEffect(() => {
    const resetStreamState = () => {
      abortRef.current = true;
      if (isGeneratingRef.current) stopGeneration();
      setIsStreaming(false);
      setStreamingText('');
    };

    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsFocused(true);
      loadGroups();
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      resetStreamState();
      setIsFocused(false);
      setSeconds(TIMER_SECONDS);
    });

    return () => {
      resetStreamState();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, loadGroups, stopGeneration]);

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
  }, [route.params?.groupId, route.params?.chatId]);

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
    isGenerating,
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
    stopStreaming,
    startNewChat,
    startNewGroup,
    updateGroupName,
    formatTime,
    isFocused,
  };
};
