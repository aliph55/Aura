import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

const History = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const insets = useSafeAreaInsets();

  const loadChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (!savedGroups) {
        setChats([]);
        return;
      }

      const parsedGroups = JSON.parse(savedGroups);
      const allChats = parsedGroups
        .flatMap(group =>
          group.chats.map(chat => {
            const lastMessage =
              chat.messages && chat.messages.length > 0
                ? chat.messages[chat.messages.length - 1]
                : null;

            let preview = 'No messages yet';
            if (lastMessage) {
              if (lastMessage.sender === 'ai') {
                preview =
                  lastMessage.text.slice(0, 60) +
                  (lastMessage.text.length > 60 ? '...' : '');
              } else if (lastMessage.sender === 'user') {
                preview = `You: ${lastMessage.text.slice(0, 50)}${
                  lastMessage.text.length > 50 ? '...' : ''
                }`;
              }
            }

            return {
              id: chat.id,
              title: chat.title || 'New Chat',
              preview: preview,
              time: formatDate(chat.lastOpened),
              lastOpened: chat.lastOpened,
              groupId: group.id,
              messageCount: chat.messages ? chat.messages.length : 0,
            };
          }),
        )
        .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened));

      setChats(allChats);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const formatDate = isoString => {
    if (!isoString) return 'recently';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const deleteChat = (chatId, groupId) => {
    Alert.alert('Delete Chat', 'This chat will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const saved = await AsyncStorage.getItem('groups');
            if (!saved) return;

            let groups = JSON.parse(saved);
            groups = groups.map(g =>
              g.id === groupId
                ? { ...g, chats: g.chats.filter(c => c.id !== chatId) }
                : g,
            );

            groups = groups.filter(g => g.chats.length > 0);
            await AsyncStorage.setItem('groups', JSON.stringify(groups));
            setChats(prev => prev.filter(c => c.id !== chatId));
          } catch (err) {
            console.error('Failed to delete chat:', err);
            Alert.alert('Error', 'Chat could not be deleted.');
          }
        },
      },
    ]);
  };

  const startNewChat = async () => {
    try {
      const existing = await AsyncStorage.getItem('groups');
      let groups = existing ? JSON.parse(existing) : [];

      let generalGroup = groups.find(g => g.name === 'General');

      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: 'New Chat',
        startDate: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        messages: [],
      };

      if (generalGroup) {
        groups = groups.map(g =>
          g.id === generalGroup.id ? { ...g, chats: [...g.chats, newChat] } : g,
        );
        await AsyncStorage.setItem('groups', JSON.stringify(groups));
        loadChats();
        navigation.navigate('Chat', {
          groupId: generalGroup.id,
          chatId: newChatId,
        });
      } else {
        const newGroupId = Date.now().toString();
        const newGroup = {
          id: newGroupId,
          name: 'General',
          chats: [newChat],
        };
        groups.push(newGroup);
        await AsyncStorage.setItem('groups', JSON.stringify(groups));
        loadChats();
        navigation.navigate('Chat', {
          groupId: newGroupId,
          chatId: newChatId,
        });
      }
    } catch (err) {
      console.error('Failed to create new chat:', err);
      Alert.alert('Error', 'Failed to create new chat.');
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadChats);
    loadChats();
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.chatCard}
      activeOpacity={0.75}
      onPress={() =>
        navigation.navigate('Chat', {
          groupId: item.groupId,
          chatId: item.id,
        })
      }
    >
      <LinearGradient
        colors={['rgba(30, 41, 59, 0.88)', 'rgba(15, 23, 42, 0.94)']}
        style={styles.chatCardGradient}
      >
        <View
          style={[
            styles.colorAccent,
            index % 3 === 0
              ? { backgroundColor: 'rgba(139, 92, 246, 0.10)' }
              : index % 3 === 1
              ? { backgroundColor: 'rgba(236, 72, 153, 0.10)' }
              : { backgroundColor: 'rgba(59, 130, 246, 0.10)' },
          ]}
        />

        <View style={styles.chatMainRow}>
          <View
            style={[
              styles.chatIconWrapper,
              index % 3 === 0
                ? styles.purpleIcon
                : index % 3 === 1
                ? styles.pinkIcon
                : styles.blueIcon,
            ]}
          >
            <Icon name="message-circle" size={22} color="#ffffff" />
          </View>

          <View style={styles.chatContent}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.chatPreview} numberOfLines={2}>
              {item.preview}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            onPress={() => deleteChat(item.id, item.groupId)}
          >
            <Icon name="trash-2" size={20} color="#f87171" />
          </TouchableOpacity>
        </View>

        <View style={styles.chatMeta}>
          <Text style={styles.chatTime}>{item.time}</Text>
          <View style={styles.messageBadge}>
            <Icon name="message-square" size={12} color="#94a3b8" />
            <Text style={styles.messageCount}>{item.messageCount}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <LinearGradient
        colors={['#0f172a', '#0f172a', '#1e293b']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        {/* Decorative blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
          >
            <Icon name="arrow-left" size={26} color="#e2e8f0" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSubtitle}>
              {chats.length}{' '}
              {chats.length === 1 ? 'conversation' : 'conversations'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newChatButton}
            activeOpacity={0.82}
            onPress={startNewChat}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.newChatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="plus" size={22} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={['rgba(139,92,246,0.20)', 'rgba(139,92,246,0.06)']}
                  style={styles.emptyIconGradient}
                >
                  <Icon name="message-square" size={80} color="#8b5cf6" />
                </LinearGradient>
              </View>

              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>
                Your conversations will appear here.{'\n'}
                Start talking with ZenAI.
              </Text>

              <TouchableOpacity
                style={styles.emptyStartButton}
                activeOpacity={0.85}
                onPress={startNewChat}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name="plus" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>New Conversation</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  blob1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    top: -160,
    right: -140,
  },
  blob2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(236, 72, 153, 0.04)',
    bottom: 120,
    left: -110,
  },
  blob3: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 246, 0.035)',
    top: 320,
    right: -90,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 3,
  },
  newChatButton: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  newChatGradient: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  chatCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  chatCardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  colorAccent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  chatMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1.5,
  },
  purpleIcon: {
    backgroundColor: 'rgba(139,92,246,0.28)',
    borderColor: 'rgba(139,92,246,0.45)',
  },
  pinkIcon: {
    backgroundColor: 'rgba(236,72,153,0.28)',
    borderColor: 'rgba(236,72,153,0.45)',
  },
  blueIcon: {
    backgroundColor: 'rgba(59,130,246,0.28)',
    borderColor: 'rgba(59,130,246,0.45)',
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 5,
  },
  chatPreview: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    opacity: 0.92,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  chatTime: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  messageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  messageCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 40,
  },
  emptyIconGradient: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    fontWeight: '500',
  },
  emptyStartButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    gap: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default History;
