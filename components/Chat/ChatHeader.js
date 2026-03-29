import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import styles from './styles';

const ChatHeader = ({
  title,
  formatTime,
  modelLoaded,
  isLoading,
  modelLoadError,
  startNewGroup,
}) => {
  // formatTime'dan kalan saniyeyi çıkar
  const timeString = formatTime();
  const timeMatch = timeString.match(/(\d+):(\d+)/);
  let remainingSeconds = 0;

  if (timeMatch) {
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    remainingSeconds = minutes * 60 + seconds;
  }

  // 30 saniye veya daha az kaldıysa uyarı göster
  const showAdWarning = remainingSeconds > 0 && remainingSeconds <= 30;

  return (
    <View style={styles.header}>
      {/* Sol taraf - Chat başlığı ile zaman ve uyarı yan yana */}
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title.slice(0, 8) || 'Chat'}</Text>
        <Text style={styles.headerSubtitle}>{timeString}</Text>
        {showAdWarning && (
          <View style={styles.adWarningBadge}>
            <Text style={styles.adWarningText}>Ad in {remainingSeconds}s</Text>
          </View>
        )}
      </View>

      {/* Sağ taraf - Status ve New button */}
      <View style={styles.headerRight}>
        {modelLoaded ? (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <Text style={styles.statusBadgeText}>Ready</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.statusBadgeText}>Loading...</Text>
          </View>
        ) : modelLoadError ? (
          <View style={[styles.statusBadge, styles.statusBadgeError]}>
            <View style={[styles.statusDot, styles.statusDotError]} />
            <Text style={styles.statusBadgeText}>Error</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.newGroupButton} onPress={startNewGroup}>
          <Text style={styles.newGroupButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatHeader;
