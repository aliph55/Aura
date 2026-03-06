import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const About = ({ navigation }) => {
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const clearAllChat = async () => {
    Alert.alert(
      'Clear All Chats',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Success', 'All chats have been cleared.');
          },
        },
      ],
    );
  };

  const menu = [
    {
      icon: 'shield',
      title: 'Privacy Policy',
      subtitle: 'How we protect your data',
      color: '#3b82f6',
      onPress: () => setPrivacyVisible(true),
    },
    {
      icon: 'info',
      title: 'About Aura',
      subtitle: 'Learn more about us',
      color: '#8b5cf6',
      onPress: () => setAboutVisible(true),
    },
    {
      icon: 'help-outline',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      color: '#10b981',
      onPress: () => {
        Alert.alert('Support', 'Contact: ayhan.group2019@gmail.com');
      },
    },
    {
      icon: 'delete-sweep',
      title: 'Clear All Chats',
      subtitle: 'Delete conversation history',
      color: '#ef4444',
      onPress: clearAllChat,
    },
  ];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={[styles.customHeader]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <MaterialIcons name="arrow-back" size={28} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.headerNavigation}>About Aura</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Animated Background */}
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
        <View style={styles.bgGradient3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 }, // ekstra rahatlık için +40
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="auto-awesome" size={40} color="#3b82f6" />
            </View>
            <Text style={styles.headerTitle}>Aura</Text>
            <Text style={styles.headerSubtitle}>Your Private AI Assistant</Text>
          </View>

          {/* Menu Section */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {menu.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={item.onPress}
                style={styles.menuItem}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: `${item.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                </View>

                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>

                <MaterialIcons name="chevron-right" size={22} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Aura v1.0.0</Text>
            <Text style={styles.footerSubtext}>
              Made with ❤️ by Ayhan Group
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Privacy Modal */}
      <Modal visible={privacyVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="shield" size={28} color="#3b82f6" />
              </View>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                onPress={() => setPrivacyVisible(false)}
                style={styles.modalClose}
              >
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  🔒 100% On-Device AI
                </Text>
                <Text style={styles.modalText}>
                  Aura works completely on your phone. Nothing is saved on any
                  server.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>✅ What We Store</Text>
                <Text style={styles.modalText}>
                  • Your chats (locally){'\n'}• Voice recordings (locally){'\n'}
                  • Photos (locally)
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  ❌ What We Don't Store
                </Text>
                <Text style={styles.modalText}>
                  • No cloud backup{'\n'}• No analytics{'\n'}• No tracking{'\n'}
                  • No ads
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>🔐 Google Sign-In</Text>
                <Text style={styles.modalText}>
                  Only used for name, email, and photo. We don't collect
                  anything else.
                </Text>
              </View>

              <View style={styles.modalFooterNote}>
                <MaterialIcons name="lock" size={16} color="#10b981" />
                <Text style={styles.modalFooterText}>
                  Your data never leaves your phone
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="favorite" size={28} color="#ec4899" />
              </View>
              <Text style={styles.modalTitle}>About Aura</Text>
              <TouchableOpacity
                onPress={() => setAboutVisible(false)}
                style={styles.modalClose}
              >
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  🤖 Your Local AI Assistant
                </Text>
                <Text style={styles.modalText}>
                  Aura is a privacy-first AI that runs 100% on your device after
                  sign-in.
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>✨ Features</Text>
                <Text style={styles.modalText}>
                  • Smart conversations{'\n'}• Complete privacy{'\n'}• Fast
                  responses{'\n'}• Works offline
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>🛡️ No Compromises</Text>
                <Text style={styles.modalText}>
                  • No cloud processing{'\n'}• No data collection{'\n'}• No
                  training on your chats
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalText}>
                  Built for people who want real AI without sacrificing privacy.
                </Text>
              </View>

              <View style={styles.modalFooterNote}>
                <MaterialIcons name="mail" size={16} color="#3b82f6" />
                <Text style={styles.modalFooterText}>
                  ayhan.group2019@gmail.com
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    zIndex: 10,
    paddingTop: 15,
  },
  headerNavigation: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  introSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  introTitle: {
    fontSize: 1,
    fontWeight: '900',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  // Animated Background
  bgGradient1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    top: -100,
    right: -100,
  },
  bgGradient2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    bottom: 100,
    left: -80,
  },
  bgGradient3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(236, 72, 153, 0.05)',
    top: 300,
    right: -50,
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 20, // ✅ 60'tan 20'ye düşürdüm
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },

  // Menu Section
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 24,
    fontWeight: '500',
  },
  modalFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 12,
  },
  modalFooterText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
});

export default About;
