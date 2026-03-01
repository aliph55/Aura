import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useChatLogic } from '../components/Chat/ChatLogic';
import MessageList from '../components/Chat/MessageList';
import ChatInput from '../components/Chat/ChatInput';
import GroupNameModal from '../components/Chat/GroupNameModal';
import styles from '../components/Chat/styles';

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

  const { isLoading } = require('../contexts/ModelContext').useModel();

  React.useLayoutEffect(() => {
    const timeString = formatTime();
    const remainingSeconds = timeString
      .split(':')
      .reduce(
        (acc, t, i) => acc + (i === 0 ? parseInt(t) * 60 : parseInt(t)),
        0,
      );
    const showAdWarning = remainingSeconds > 0 && remainingSeconds <= 30;

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navigationHeaderTitle}>
          <Text style={styles.navigationTitle}>{title || 'Chat'}</Text>
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
    });
  }, [navigation, title, formatTime, modelLoaded, isLoading, startNewGroup]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
    </KeyboardAvoidingView>
  );
};

export default Chat;
