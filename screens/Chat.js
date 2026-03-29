import React from 'react';
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
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
    const remainingSeconds = timeString
      .split(':')
      .reduce(
        (acc, t, i) => acc + (i === 0 ? parseInt(t) * 60 : parseInt(t)),
        0,
      );
    const showAdWarning = remainingSeconds > 0 && remainingSeconds <= 30;

    // Compute what to show – fallback chain
    let displayTitle = title;
    if (!displayTitle && messages.length > 0) {
      displayTitle = messages[0]?.text?.slice(0, 7); // İlk mesajın ilk 7 karakteri
    } else if (!displayTitle) {
      displayTitle = 'New Chat';
    }

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navigationHeaderTitle}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <MaterialIcons name="arrow-back" size={28} color="#e2e8f0" />
          </TouchableOpacity>

          <Text style={styles.navigationTitle}>{displayTitle.slice(0, 8)}</Text>

          <Text style={styles.navigationTime}>{timeString}</Text>

          {showAdWarning && (
            <View style={styles.navigationAdWarning}>
              <Text style={styles.navigationAdWarningText}>
                Ad in {remainingSeconds}s
              </Text>
            </View>
          )}
        </View>
      ),

      // ... headerRight, headerLeft vs. aynı kalabilir
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
      headerLeft: () => null,
      headerBackVisible: true,
      headerBackTitleVisible: false,
    });
  }, [
    navigation,
    title, // ← önemli: title değiştiğinde header güncellenir
    messages, // ← önemli: mesaj gelince fallback çalışsın
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
