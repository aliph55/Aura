import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import TypingIndicator from './Typingindicator';
import styles from './styles';

const WORD_INTERVAL_MS = 55;
const BLINK_INTERVAL_MS = 530;

const StreamingMessage = ({ isStreaming, streamingText }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [dotVisible, setDotVisible] = useState(true);
  const pendingRef = useRef([]);
  const prevTextRef = useRef('');
  const intervalRef = useRef(null);
  const blinkRef = useRef(null);

  // --- Yeni streaming basladiginda sifirla ---
  useEffect(() => {
    if (isStreaming) {
      setDisplayedText('');
      setDotVisible(true);
      prevTextRef.current = '';
      pendingRef.current = [];
    }
  }, [isStreaming]);

  // --- streamingText degisince yeni parcalari queue'ya ekle ---
  useEffect(() => {
    if (!streamingText) return;
    const prev = prevTextRef.current;
    if (streamingText.length <= prev.length) return;
    const newChunk = streamingText.slice(prev.length);
    prevTextRef.current = streamingText;
    const parts = newChunk.split(/(\s+)/).filter(Boolean);
    pendingRef.current.push(...parts);
  }, [streamingText]);

  // --- Kelime kelime goster ---
  useEffect(() => {
    if (!isStreaming) {
      clearInterval(intervalRef.current);
      if (pendingRef.current.length > 0) {
        const remaining = pendingRef.current.join('');
        pendingRef.current = [];
        setDisplayedText(prev => prev + remaining);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (pendingRef.current.length === 0) return;
      const part = pendingRef.current.shift();
      setDisplayedText(prev => prev + part);
    }, WORD_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [isStreaming]);

  // --- Nokta blink ---
  useEffect(() => {
    if (!isStreaming) {
      clearInterval(blinkRef.current);
      setDotVisible(false);
      return;
    }
    blinkRef.current = setInterval(() => {
      setDotVisible(prev => !prev);
    }, BLINK_INTERVAL_MS);
    return () => clearInterval(blinkRef.current);
  }, [isStreaming]);

  if (!isStreaming) return null;
  if (!displayedText) return <TypingIndicator />;

  return (
    <View style={[styles.messageBubble, styles.aiBubble]}>
      <Text style={styles.messageText}>
        {displayedText}
        <Text
          style={{
            opacity: dotVisible ? 1 : 0,
            color: 'rgba(160, 120, 255, 1)',
          }}
        >
          {' ●'}
        </Text>
      </Text>
    </View>
  );
};

export default StreamingMessage;
