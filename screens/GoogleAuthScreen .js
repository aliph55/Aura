import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../redux/userInfo';

const { width, height } = Dimensions.get('window');

const GoogleAuthScreen = ({ navigation }) => {
  const [userInfo, setUser] = React.useState(null);
  const dispatch = useDispatch();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '799076129257-lj6b7jfpu8hsu9o9bme39ehh4742n26m.apps.googleusercontent.com',
    });

    // Orb floating animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 5500,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 5500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // ✅ Silent sign-in — daha önce giriş yaptıysa direkt geç
  const getCurrentUserInfo = async () => {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn(); // ✅ önce kontrol et
      if (!isSignedIn) return; // giriş yoksa hiç deneme

      const info = await GoogleSignin.signInSilently();
      dispatch(setUserInfo(info?.data));
      navigation.replace('Download');
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        // normal
      } else {
        console.log('Silent sign-in error:', error);
      }
    }
  };

  useEffect(() => {
    getCurrentUserInfo();
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const user = await GoogleSignin.signIn();
      setUser(user.data);
      dispatch(setUserInfo(user.data));
      navigation.replace('Download');
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('In progress');
      } else {
        console.log('Error:', error);
      }
    }
  };

  // ✅ Sign out — state temizle, giriş ekranına dön
  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUser(null);
      dispatch(setUserInfo(null));
      navigation.replace('Signin');
    } catch (error) {
      console.log('Sign out error:', error);
    }
  };

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060811" />

      {/* Background orbs */}
      <Animated.View
        style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]}
      />
      <Animated.View
        style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]}
      />
      <View style={styles.orb3} />

      {/* Noise overlay */}
      <View style={styles.noiseOverlay} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo mark */}
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoGlyph}>✦</Text>
            </View>
          </View>
          <View style={styles.logoTagRow}>
            <View style={styles.tagLine} />
            <Text style={styles.logoTag}>AI ASSISTANT</Text>
            <View style={styles.tagLine} />
          </View>
        </View>

        {/* Headline */}
        <View style={styles.headlineArea}>
          <Text style={styles.title}>Aura</Text>
          <Text style={styles.subtitle}>Think deeper.{'\n'}Create faster.</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {['Private', 'On-Device', 'Instant'].map((label, i) => (
            <View key={i} style={styles.pill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* CTA Area */}
        <Animated.View
          style={[
            styles.ctaArea,
            {
              opacity: buttonAnim,
              transform: [
                {
                  translateY: buttonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {userInfo ? (
            <View style={styles.loggedInArea}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.welcomeName}>{userInfo?.user?.name}</Text>
              <Text style={styles.welcomeEmail}>{userInfo?.user?.email}</Text>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={signOut}
                activeOpacity={0.75}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.ctaLabel}>
                Continue with your Google account
              </Text>
              <View style={styles.googleBtnWrapper}>
                <GoogleSigninButton
                  size={GoogleSigninButton.Size.Wide}
                  color={GoogleSigninButton.Color.Dark}
                  onPress={signIn}
                  style={styles.googleBtn}
                />
              </View>
              <Text style={styles.legalText}>
                By continuing, you agree to our{' '}
                <Text style={styles.legalLink}>Terms</Text> &{' '}
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Text>
            </>
          )}
        </Animated.View>
      </Animated.View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060811',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    top: -60,
    left: -80,
  },
  orb2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    bottom: 40,
    right: -60,
  },
  orb3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(244, 63, 94, 0.07)',
    top: height * 0.45,
    left: -30,
  },
  noiseOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.03,
    backgroundColor: '#fff',
  },
  content: {
    width: width * 0.88,
    alignItems: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  logoInner: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlyph: {
    fontSize: 22,
    color: '#818cf8',
  },
  logoTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.3)',
  },
  logoTag: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#64748b',
    fontWeight: '600',
  },
  headlineArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 62,
    fontWeight: '900',
    color: '#f1f5f9',
    letterSpacing: -3,
    lineHeight: 66,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 48,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  pillText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ctaArea: {
    width: '100%',
    alignItems: 'center',
  },
  ctaLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  googleBtnWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    marginBottom: 16,
  },
  googleBtn: {
    width: '100%',
    height: 52,
  },
  legalText: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#6366f1',
    fontWeight: '600',
  },
  loggedInArea: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.8)',
  },
  welcomeText: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  welcomeEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
  },
  bottomBarLine: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

export default GoogleAuthScreen;
