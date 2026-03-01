import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const Profile = ({ navigation }) => {
  const userInfo = useSelector(state => state.userInfo.user);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const handleLogout = () => {
    AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Signin' }] });
  };

  const menu = [
    {
      icon: 'shield',
      title: 'Privacy Policy',
      subtitle: 'How we protect your data',
      gradient: ['#8B5CF6', '#7C3AED'],
      onPress: () => setPrivacyVisible(true),
    },
    {
      icon: 'info',
      title: 'About ZenAI',
      subtitle: 'Learn more about us',
      gradient: ['#EC4899', '#DB2777'],
      onPress: () => setAboutVisible(true),
    },
    {
      icon: 'settings',
      title: 'Settings',
      subtitle: 'Preferences & options',
      gradient: ['#3B82F6', '#2563EB'],
      onPress: () => {},
    },
    {
      icon: 'help-outline',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      gradient: ['#10B981', '#059669'],
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      edges={['bottom']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Decorative Blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Header Card */}
          <View style={styles.headerCard}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Image source={{ uri: userInfo?.photo }} style={styles.avatar} />
            </LinearGradient>

            <View style={styles.onlineBadge} />

            <Text style={styles.name}>{userInfo?.name || 'ZenAI User'}</Text>
            <Text style={styles.email}>{userInfo?.email}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>24</Text>
                <Text style={styles.statLabel}>Chats</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>156</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>12d</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menu.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={item.onPress}
                style={styles.menuItem}
              >
                <LinearGradient
                  colors={item.gradient}
                  style={styles.menuIconGradient}
                >
                  <MaterialIcons name={item.icon} size={22} color="#fff" />
                </LinearGradient>

                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>

                <MaterialIcons name="chevron-right" size={24} color="#64748B" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <MaterialIcons name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>ZenAI v1.0 • Made with ❤️</Text>
        </ScrollView>
      </LinearGradient>

      {/* Privacy Modal */}
      <Modal visible={privacyVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.modalHeader}
            >
              <MaterialIcons name="shield" size={32} color="#fff" />
              <Text style={styles.modalHeaderText}>Privacy Policy</Text>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                <Text style={styles.modalBold}>100% On-Device AI{'\n\n'}</Text>
                ZenAI works completely on your phone. Nothing is saved on any
                server.
                {'\n\n'}
                <Text style={styles.modalBold}>What We Store:{'\n'}</Text>• Your
                chats (locally){'\n'}• Voice recordings (locally){'\n'}• Photos
                (locally){'\n\n'}
                <Text style={styles.modalBold}>What We Don't Store:{'\n'}</Text>
                • No cloud backup{'\n'}• No analytics{'\n'}• No tracking{'\n'}•
                No ads{'\n\n'}
                <Text style={styles.modalBold}>Google Sign-In:{'\n'}</Text>
                Only used for name, email, and photo. We don't collect anything
                else.
                {'\n\n'}
                Your data never leaves your phone. 🔒
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setPrivacyVisible(false)}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.modalHeader}
            >
              <MaterialIcons name="favorite" size={32} color="#fff" />
              <Text style={styles.modalHeaderText}>About ZenAI</Text>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                <Text style={styles.modalBold}>
                  Your Local AI Assistant{'\n\n'}
                </Text>
                ZenAI is a privacy-first AI that runs 100% on your device after
                sign-in.
                {'\n\n'}
                <Text style={styles.modalBold}>Features:{'\n'}</Text>✨ Smart
                conversations{'\n'}
                🔒 Complete privacy{'\n'}⚡ Fast responses{'\n'}
                📱 Works offline{'\n\n'}
                <Text style={styles.modalBold}>No Compromises:{'\n'}</Text>• No
                cloud processing{'\n'}• No data collection{'\n'}• No training on
                your chats{'\n\n'}
                Built for people who want real AI without sacrificing privacy.
                {'\n\n'}
                <Text style={styles.modalBold}>
                  Made with ❤️ by Ayhan Group{'\n'}
                </Text>
                ayhan.group2019@gmail.com
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAboutVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Decorative Blobs
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    top: 0,
    right: -50,
  },
  blob2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    bottom: 100,
    left: -40,
  },

  // Header Card
  headerCard: {
    marginHorizontal: 20,
    marginTop: 60,
    marginBottom: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#1E293B',
  },
  onlineBadge: {
    position: 'absolute',
    top: 36,
    right: width / 2 - 32,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: 'rgba(30, 41, 59, 0.9)',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 24,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },

  // Menu Section
  menuSection: {
    marginHorizontal: 20,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuIconGradient: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: '#475569',
    marginTop: 24,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  modalHeaderText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  modalBody: {
    padding: 24,
    maxHeight: 400,
  },
  modalText: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 24,
  },
  modalBold: {
    fontWeight: '800',
    color: '#fff',
    fontSize: 16,
  },
  modalCloseButton: {
    margin: 20,
    marginTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default Profile;
