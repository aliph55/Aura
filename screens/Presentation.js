import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🤖',
    title: 'Welcome to Aura',
    description: 'Your personal AI assistant that works completely offline',
    accent: '#a78bfa',
    bg1: '#0d0820',
    bg2: '#1a1040',
    bg3: '#0a0618',
  },
  {
    id: '2',
    icon: '🔒',
    title: 'Privacy First',
    description:
      'All conversations stay on your device. No data is sent to any server',
    accent: '#818cf8',
    bg1: '#080c20',
    bg2: '#101840',
    bg3: '#050a18',
  },
  {
    id: '3',
    icon: '⚡',
    title: 'Fast & Efficient',
    description:
      'Powered by local AI model for instant responses without internet',
    accent: '#c4b5fd',
    bg1: '#100820',
    bg2: '#1e0f40',
    bg3: '#080518',
  },
  {
    id: '4',
    icon: '🌍',
    title: 'Multilingual',
    description:
      'This AI supports multiple languages including English and Turkish',
    accent: '#a5b4fc',
    bg1: '#080d20',
    bg2: '#101a40',
    bg3: '#050818',
  },
];

const Presentation = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const flatListRef = useRef(null);
  const userInfo = useSelector(state => state.userInfo.user);

  useEffect(() => {
    checkIfSeen();
  }, []);

  const checkIfSeen = async () => {
    try {
      const hasSeen = await AsyncStorage.getItem('hasSeenPresentation');
      if (hasSeen === 'true') {
        navigation.replace(userInfo === null ? 'Signin' : 'Download');
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => handleComplete();

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenPresentation', 'true');
      navigation.replace(userInfo ? 'Download' : 'Signin');
    } catch (error) {
      console.error(error);
    }
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Solid dark gradient background */}
      <LinearGradient
        colors={[item.bg1, item.bg2, item.bg3]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Orb glow — solid colored circle, no transparency */}
      <View style={[styles.orbTop, { backgroundColor: item.accent + '22' }]} />
      <View style={[styles.orbBottom, { backgroundColor: '#6366f1' + '18' }]} />

      <View style={styles.content}>
        {/* Icon container — solid dark card */}
        <View style={styles.iconCard}>
          <LinearGradient
            colors={[item.bg2, item.bg1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            borderRadius={32}
          />
          <View style={[styles.iconInner, { borderColor: item.accent + '60' }]}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
        </View>

        {/* Slide number */}
        <View
          style={[styles.slideNumBadge, { borderColor: item.accent + '50' }]}
        >
          <Text style={[styles.slideNumText, { color: item.accent }]}>
            {item.id} / {slides.length}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {/* Accent line under title */}
        <View style={[styles.titleLine, { backgroundColor: item.accent }]} />

        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((slide, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: currentIndex === index ? 28 : 8,
              backgroundColor:
                currentIndex === index
                  ? slides[currentIndex].accent
                  : '#334155',
            },
          ]}
        />
      ))}
    </View>
  );

  if (isChecking) {
    return (
      <LinearGradient
        colors={['#0d0820', '#1a1040', '#0a0618']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#a78bfa" />
      </LinearGradient>
    );
  }

  const current = slides[currentIndex];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: current.accent }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}

        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>Next →</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleComplete}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.getStartedGradient}
            >
              <Text style={styles.getStartedText}>Get Started ✦</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0820',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slide
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbTop: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -120,
    left: -80,
  },
  orbBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: 60,
    right: -80,
  },

  // Content
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 120,
  },

  // Icon card
  iconCard: {
    width: 150,
    height: 150,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d2060',
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1050',
    borderWidth: 1.5,
  },
  icon: {
    fontSize: 52,
  },

  // Slide number badge
  slideNumBadge: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 18,
    backgroundColor: '#13103a',
  },
  slideNumText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: 18,
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
    paddingHorizontal: 10,
  },

  // Dots
  dotsContainer: {
    position: 'absolute',
    bottom: 130,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Buttons
  buttonContainer: {
    position: 'absolute',
    bottom: 44,
    width: '100%',
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  skipPlaceholder: {
    width: 60,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  nextGradient: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  getStartedButton: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  getStartedGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

export default Presentation;
