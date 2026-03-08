import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  View,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

const Home = ({ navigation }) => {
  const [recentChats, setRecentChats] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const userInfo = useSelector(state => state.userInfo.user);
  const userName = userInfo?.givenName || 'there';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadRecentChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (!savedGroups) {
        setRecentChats([]);
        return;
      }

      const parsedGroups = JSON.parse(savedGroups);

      // Get all chats from all groups
      const allChats = parsedGroups
        .flatMap(group =>
          group.chats.map(chat => {
            // Get last message for preview
            const lastMessage =
              chat.messages && chat.messages.length > 0
                ? chat.messages[chat.messages.length - 1]
                : null;

            // Show AI response preview (first 50 chars)
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
        title: '', // ← "New Chat" yerine BOŞ BIRAKIN
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Decorative Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.logo}>Aura</Text>
            <View style={styles.logoDot} />
          </View>
          {/**
           <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('About')}
          >
            <View style={styles.profileIconBg}>
              <Icon name="user" size={20} color="#6366F1" />
            </View>
          </TouchableOpacity>
           */}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroContent}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Hey {userName}</Text>
                <Text style={styles.waveEmoji}>👋</Text>
              </View>
              <Text style={styles.subtitle}>
                Your AI assistant is ready to help
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Icon name="zap" size={18} color="#FCD34D" />
                  <Text style={styles.statText}>Fast</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="shield" size={18} color="#34D399" />
                  <Text style={styles.statText}>Secure</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="cpu" size={18} color="#60A5FA" />
                  <Text style={styles.statText}>Smart</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={startNewChat}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconBg}>
                      <Icon name="plus" size={20} color="#6366F1" />
                    </View>
                    <Text style={styles.primaryButtonText}>
                      Start New Conversation
                    </Text>
                    <Icon name="arrow-right" size={18} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

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
                  style={[
                    styles.chatItem,
                    { animationDelay: `${index * 100}ms` },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      groupId: chat.groupId,
                      chatId: chat.chatId,
                    })
                  }
                >
                  <View style={styles.chatIconContainer}>
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6']}
                      style={styles.chatIcon}
                    >
                      <Icon name="message-circle" size={20} color="#fff" />
                    </LinearGradient>
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
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
    paddingTop: 50,
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
  profileButton: {
    padding: 4,
  },
  profileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },

  // Scroll Content
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  heroCard: {
    borderRadius: 32,
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
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
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Primary Button
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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

  // Quick Actions
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
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
    paddingBottom: 20,
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
