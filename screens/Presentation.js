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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🤖',
    title: 'Welcome to Aura',
    description: 'Your personal AI assistant that works completely offline',
    color: '#6366f1',
  },
  {
    id: '2',
    icon: '🔒',
    title: 'Privacy First',
    description:
      'All conversations stay on your device. No data is sent to any server',
    color: '#8b5cf6',
  },
  {
    id: '3',
    icon: '⚡',
    title: 'Fast & Efficient',
    description:
      'Powered by local AI model for instant responses without internet',
    color: '#a855f7',
  },
  {
    id: '4',
    icon: '🌍',
    title: 'Multilingual',
    description:
      'This AI supports multiple languages including English and Turkish',
    color: '#c026d3',
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
      console.error('❌ Check error:', error);
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

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenPresentation', 'true');
      navigation.replace(userInfo ? 'Download' : 'Signin');
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.color }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  // Animated olmadan basit dot
  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: currentIndex === index ? 32 : 12,
              opacity: currentIndex === index ? 1 : 0.4,
            },
          ]}
        />
      ))}
    </View>
  );

  if (isChecking) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

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

      <View style={styles.buttonContainer}>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            currentIndex === slides.length - 1 && styles.getStartedButton,
          ]}
          onPress={handleNext}
        >
          <Text
            style={[
              styles.nextText,
              currentIndex === slides.length - 1 && styles.getStartedText,
            ]}
          >
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    marginBottom: 100,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 140,
    width: '100%',
  },
  dot: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedButton: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  getStartedText: {
    color: '#6366f1',
  },
});

export default Presentation;
