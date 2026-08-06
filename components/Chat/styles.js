import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  // styles.js
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // ← multiline olduğunda daha iyi hizalanır
    paddingHorizontal: 12, // ← SOL ve SAĞ boşluk (en önemli kısım)
    paddingTop: 10, // ↑ yukarıdan biraz nefes alma
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Android'de daha fazla alt boşluk
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10, // text input ile buton arası mesafe
    elevation: 10, // biraz daha belirgin gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  inputContainerAndroid: {
    padding: 0,
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Navigation header stilleri
  navigationHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
    overflow: 'hidden',
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  navigationTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  navigationAdWarning: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  navigationAdWarningText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  navigationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  navigationStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  navigationStatusBadgeError: {
    backgroundColor: '#7f1d1d',
  },
  navigationStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  navigationStatusDotActive: {
    backgroundColor: '#10b981',
  },
  navigationStatusDotError: {
    backgroundColor: '#ef4444',
  },
  navigationStatusText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  navigationNewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navigationNewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15, // 20'den 15'e düşürdüm
    paddingHorizontal: 16, // 24'ten 16'ya düşürdüm - daha kompakt
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row', // Yan yana dizmek için
    alignItems: 'center',
    gap: 10, // Aralarındaki boşluk
  },
  headerTitle: {
    fontSize: 18, // 24'ten 18'e küçülttüm
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },

  adWarningBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  adWarningText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeError: {
    backgroundColor: '#7f1d1d',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusDotError: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  newGroupButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newGroupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#7f1d1d',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  messagesContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 6,
    padding: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  streamingBubble: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#1e3a5f',
  },
  messageText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  cursor: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 18,
  },
  streamingComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  completingText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569', // biraz daha yumuşak gri
    borderRadius: 24,
    paddingHorizontal: 16, // ← içerde daha rahat yazı alanı
    paddingVertical: 12,
    paddingTop: 14, // ← üstten biraz daha ferah
    fontSize: 16,
    maxHeight: 140, // biraz daha büyüyebilsin
    minHeight: 48, // tek satırda bile çok küçülmesin
    color: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 44, // 48 → 44
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    // ...
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#f8fafc',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    color: '#f8fafc',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonSave: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
  },
});
