import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Animated API kullanilmiyor (NativeAnimatedNodesManager crash'i onlemek icin).
// Bunun yerine setInterval ile aktif dot indeksi dondurulur.
const TypingIndicator = () => {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveDot(prev => (prev + 1) % 3);
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wrapper}>
      {/* Aura etiketi */}
      {/* Balon */}
      <View style={styles.bubble}>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                styles.dot,
                activeDot === i ? styles.dotActive : styles.dotIdle,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    marginHorizontal: 12,
    marginVertical: 6,
    maxWidth: '75%',
  },
  label: {
    fontSize: 11,
    color: 'rgba(180, 160, 255, 0.7)',
    marginBottom: 4,
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  bubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotIdle: {
    backgroundColor: 'rgba(180, 160, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: 'rgba(160, 120, 255, 1)',
    // Aktif dot biraz buyuk gorunsun
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: -1, // dikey hizayi koru
  },
});

export default TypingIndicator;
