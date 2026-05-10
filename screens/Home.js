import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

const Home = ({ navigation }) => {
  const [recentChats, setRecentChats] = useState([]);
  const insets = useSafeAreaInsets(); // ✅ iOS safe area

  const user = useSelector(state => state.userInfo?.user);

  const loadRecentChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (!savedGroups) {
        setRecentChats([]);
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

            const preview =
              lastMessage && lastMessage.sender === 'ai'
                ? lastMessage.text.slice(0, 50) +
                  (lastMessage.text.length > 50 ? '...' : '')
                : lastMessage && lastMessage.sender === 'user'
                ? `You: ${lastMessage.text.slice(0, 40)}...`
                : 'Start a conversation';

            return {
              id: chat.id,
              title: chat.title || 'New Chat',
              preview: preview,
              time: lastMessage
                ? new Date(lastMessage.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '',
              lastOpened: chat.lastOpened,
              groupId: group.id,
              chatId: chat.id,
            };
          }),
        )
        .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
        .slice(0, 6);

      setRecentChats(allChats);
    } catch (e) {
      console.error('Error loading chats:', e);
    }
  };

  const startNewChat = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      let groups = savedGroups ? JSON.parse(savedGroups) : [];

      let defaultGroup = groups.find(g => g.name === 'General');

      if (!defaultGroup) {
        defaultGroup = {
          id: Date.now().toString(),
          name: 'General',
          chats: [],
        };
        groups.push(defaultGroup);
      }

      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: '',
        startDate: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        messages: [],
      };

      groups = groups.map(g =>
        g.id === defaultGroup.id ? { ...g, chats: [...g.chats, newChat] } : g,
      );

      await AsyncStorage.setItem('groups', JSON.stringify(groups));
      loadRecentChats();
      navigation.navigate('Chat', {
        groupId: defaultGroup.id,
        chatId: newChatId,
      });
    } catch (e) {
      console.error('Error creating new chat:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadRecentChats);
    loadRecentChats();
    return unsubscribe;
  }, [navigation]);

  // ✅ iOS bottom safe area için dinamik padding
  const bottomNavHeight = 80 + insets.bottom;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Decorative Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Header — ✅ insets.top ile dinamik safe area */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.logo}>Aura</Text>
            <View style={styles.logoDot} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomNavHeight + 20 }, // ✅ nav yüksekliğine göre
        ]}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/*
            ✅ FIX: overflow: 'hidden' kaldırıldı — iOS'ta LinearGradient içindeki
            içeriği kırpıyordu. heroGlow için borderRadius yeterli.
          */}
          <View style={styles.heroCard}>
            {/* ✅ heroGlow artık overflow olmadan çalışır */}
            <View style={styles.heroGlow} />

            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                Hey {user?.user?.givenName || 'There'}
              </Text>
              <Text style={styles.waveEmoji}>👋</Text>
            </View>

            <Text style={styles.subtitle}>
              Your AI assistant is ready to help
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Icon name="zap" size={16} color="#FCD34D" />
                <Text style={styles.statText}>Fast</Text>
              </View>
              <View style={styles.statBox}>
                <Icon name="shield" size={16} color="#34D399" />
                <Text style={styles.statText}>Secure</Text>
              </View>
              <View style={[styles.statBox, { marginRight: 0 }]}>
                <Icon name="cpu" size={16} color="#60A5FA" />
                <Text style={styles.statText}>Smart</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startNewChat}
              activeOpacity={0.9}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonIconBg}>
                  <Icon name="plus" size={18} color="#6366F1" />
                </View>
                <Text style={styles.primaryButtonText}>
                  Start New Conversation
                </Text>
                <Icon name="arrow-right" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Chats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Chats</Text>
              <Text style={styles.sectionSubtitle}>
                Pick up where you left off
              </Text>
            </View>
            {recentChats.length > 0 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <Icon name="arrow-right" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>

          {recentChats.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Icon name="message-square" size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start your first chat to see it here
              </Text>
            </View>
          ) : (
            <View style={styles.chatList}>
              {recentChats.map((chat, index) => (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.chatItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      groupId: chat.groupId,
                      chatId: chat.chatId,
                    })
                  }
                >
                  <View style={styles.chatIconContainer}>
                    <View style={styles.chatIcon}>
                      <Icon name="message-circle" size={20} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatTitle} numberOfLines={1}>
                        {chat.title}
                      </Text>
                      <View style={styles.chatTimeBadge}>
                        <Icon
                          name="clock"
                          size={10}
                          color="#94A3B8"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.chatTime}>{chat.time}</Text>
                      </View>
                    </View>
                    <Text style={styles.chatPreview} numberOfLines={2}>
                      {chat.preview}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation — ✅ insets.bottom ile iOS home indicator boşluğu */}
      <View
        style={[
          styles.bottomNavContainer,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItemActive} activeOpacity={0.8}>
            <Icon name="home" size={24} color="#6366F1" />
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={startNewChat}
            activeOpacity={0.8}
          >
            <Icon name="plus-circle" size={24} color="#64748B" />
            <Text style={styles.navLabel}>New Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <Icon name="clock" size={24} color="#64748B" />
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('About')}
            activeOpacity={0.8}
          >
            <Icon name="book-open" size={24} color="#64748B" />
            <Text style={styles.navLabel}>About</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Background Elements
  bgCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    top: -200,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    top: 100,
    left: -150,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    bottom: 200,
    right: -50,
  },

  // Header
  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  logoDot: {
    position: 'absolute',
    right: -8,
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },

  // Scroll Content
  scrollContent: {
    // paddingBottom dinamik olarak inject ediliyor
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  heroCard: {
    borderRadius: 32,
    padding: 28,
    backgroundColor: '#6366F1',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  waveEmoji: {
    fontSize: 32,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
  },
  statText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Primary Button
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 12,
    letterSpacing: 0.3,
  },

  // Section
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#334155',
  },
  emptyText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Chat List
  chatList: {
    gap: 12,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chatIconContainer: {
    marginRight: 14,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  chatContent: {
    flex: 1,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  chatTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chatPreview: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Bottom Navigation
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    // paddingBottom dinamik inject ediliyor (insets.bottom)
    backgroundColor: 'transparent',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    flex: 1,
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 16,
  },
  navLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  navLabelActive: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '700',
  },
});

export default Home;
