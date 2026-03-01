import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import styles from './styles';

const MessageList = ({
  messages,
  modelLoaded,
  isStreaming,
  scrollViewRef,
  currentStreamingMessage,
  streamingComplete,
}) => {
  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContent}
      onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
    >
      {messages.length === 0 && modelLoaded && !isStreaming && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Hi! How can I help you?</Text>
        </View>
      )}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <StreamingMessage
        isStreaming={isStreaming}
        currentStreamingMessage={currentStreamingMessage}
        streamingComplete={streamingComplete}
      />
    </ScrollView>
  );
};

export default MessageList;
