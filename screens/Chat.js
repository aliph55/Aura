import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useChatLogic } from '../components/Chat/ChatLogic';
import MessageList from '../components/Chat/MessageList';
import ChatInput from '../components/Chat/ChatInput';
import GroupNameModal from '../components/Chat/GroupNameModal';
import styles from '../components/Chat/styles';
import { useModel } from '../contexts/ModelContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Chat = ({ route, navigation }) => {
  const {
    messages,
    inputText,
    setInputText,
    isStreaming,
    streamingText,
    modelLoaded,
    title,
    isGroupNameModalVisible,
    setGroupNameModalVisible,
    newGroupName,
    setNewGroupName,
    scrollViewRef,
    startNewGroup,
    updateGroupName,
    sendMessage,
    formatTime,
  } = useChatLogic({ route, navigation });

  const insets = useSafeAreaInsets();
  const { isLoading } = useModel();

  React.useLayoutEffect(() => {
    const timeString = formatTime();

    // ✅ Kalan saniyeyi hesapla
    const parts = timeString.split(':');
    const remainingSeconds =
      parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0;
    const showAdWarning = remainingSeconds > 0 && remainingSeconds <= 30;

    // ✅ Başlık fallback zinciri
    let displayTitle = title;
    if (!displayTitle && messages.length > 0) {
      displayTitle = messages[0]?.text?.slice(0, 12);
    } else if (!displayTitle) {
      displayTitle = 'New Chat';
    }

    navigation.setOptions({
      headerLeft: () => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginLeft: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#f8fafc' }}>
            {displayTitle.slice(0, 12)}
          </Text>
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>{timeString}</Text>
        </View>
      ),

      headerTitle: () => null,

      // ✅ Bunu ekleyin — headerLeft'in genişlemesini sınırla
      headerLeftContainerStyle: { flex: 1, maxWidth: '60%' },
      headerRightContainerStyle: { flex: 0 },

      headerRight: () => (
        <View style={styles.navigationHeaderRight}>
          {modelLoaded ? (
            <View style={styles.navigationStatusBadge}>
              <View
                style={[
                  styles.navigationStatusDot,
                  styles.navigationStatusDotActive,
                ]}
              />
              <Text style={styles.navigationStatusText}>Ready</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.navigationStatusBadge}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.navigationStatusText}>Loading...</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.navigationNewButton}
            onPress={startNewGroup}
          >
            <Text style={styles.navigationNewButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      ),

      headerBackVisible: false,
    });
  }, [
    navigation,
    title,
    messages,
    formatTime,
    modelLoaded,
    isLoading,
    startNewGroup,
  ]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <MessageList
        messages={messages}
        modelLoaded={modelLoaded}
        isStreaming={isStreaming}
        streamingText={streamingText}
        scrollViewRef={scrollViewRef}
      />
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        modelLoaded={modelLoaded}
        isStreaming={isStreaming}
        sendMessage={sendMessage}
      />
      <GroupNameModal
        isGroupNameModalVisible={isGroupNameModalVisible}
        setGroupNameModalVisible={setGroupNameModalVisible}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        updateGroupName={updateGroupName}
      />
    </View>
  );
};

export default Chat;
