import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles';

const StreamingMessage = ({ isStreaming, streamingText }) => {
  if (!isStreaming || !streamingText) return null;
  return (
    <View style={[styles.messageBubble, styles.aiBubble]}>
      <Text style={styles.messageText}>
        {streamingText}
        <Text style={styles.cursor}>▊</Text>
      </Text>
    </View>
  );
};

export default StreamingMessage;
