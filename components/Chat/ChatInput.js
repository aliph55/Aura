import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import styles from './styles';

const ChatInput = ({
  inputText,
  setInputText,
  modelLoaded,
  isLoading,
  isStreaming,
  sendMessage,
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Type your message..."
        placeholderTextColor="#64748b"
        multiline
        maxHeight={120}
        editable={modelLoaded && !isLoading && !isStreaming}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!inputText.trim() || !modelLoaded || isLoading || isStreaming) &&
            styles.sendButtonDisabled,
        ]}
        onPress={sendMessage}
        disabled={!inputText.trim() || !modelLoaded || isLoading || isStreaming}
      >
        <Text style={styles.sendButtonText}>{isStreaming ? '●' : '↑'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChatInput;
