import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux'; // ✅ Eklendi
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserInfo, resetUserInfo } from '../redux/userInfo'; // ✅ Import edin

// ===== GOOGLE SIGN-IN CONFIG =====
const WEB_CLIENT_ID =
  '53852373022-th52gtqcb9bah24899cunbl5i6n1bol1.apps.googleusercontent.com';

const ExpoAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useDispatch();
  const navigation = useNavigation(); // ✅ Düzeltildi: navigate değil navigation

  useEffect(() => {
    // Google Sign-In yapılandırması
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    // Firebase auth durumunu dinle
    const subscriber = auth().onAuthStateChanged(firebaseUser => {
      console.log(
        'Auth state changed:',
        firebaseUser ? 'Logged in' : 'Logged out',
      );

      setUser(firebaseUser); // ✅ State'i güncelle

      if (firebaseUser) {
        // Redux'a kullanıcı bilgilerini kaydet
        dispatch(
          setUserInfo({
            givenName: firebaseUser.displayName?.split(' ')[0] || '',
            familyName:
              firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: firebaseUser.email || '',
            photo: firebaseUser.photoURL || '',
            name: firebaseUser.displayName || '',
            id: firebaseUser.uid || '',
          }),
        );

        // Download ekranına yönlendir
        setTimeout(() => {
          navigation.navigate('Download'); // ✅ Düzeltildi
        }, 500);
      } else {
        dispatch(resetUserInfo());
      }

      if (initializing) setInitializing(false); // ✅ Initializing'i kapat
    });

    return subscriber; // ✅ Cleanup
  }, [dispatch, navigation, initializing]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      console.log('🔄 Starting Google sign-in...');

      const userInfo = await GoogleSignin.signIn();

      console.log('📦 User info received:', {
        hasIdToken: !!userInfo?.data?.idToken,
        email: userInfo?.data?.user?.email,
      });

      const idToken = userInfo?.data?.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In idToken alınamadı');
      }

      console.log('🎫 Google ID Token received');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(
        googleCredential,
      );

      console.log('✅ Firebase sign-in successful');
      console.log('👤 User:', userCredential.user.email);

      Alert.alert(
        'Başarılı! 🎉',
        `Hoş geldin ${userCredential.user.displayName}!`,
      );
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled sign-in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign-in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Hata', 'Google Play Services kullanılamıyor');
      } else {
        Alert.alert('Hata', error.message || 'Giriş yapılamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    try {
      const userCredential = await auth().signInAnonymously();

      // Redux'a misafir kullanıcı bilgilerini kaydet
      dispatch(
        setUserInfo({
          id: userCredential.user.uid,
          name: 'Misafir',
          email: 'misafir@zenai.app',
          givenName: 'Misafir',
          familyName: '',
          photo: '',
        }),
      );

      console.log('✅ Anonymous sign-in successful');
      Alert.alert('Başarılı! ✨', 'Misafir olarak giriş yaptınız!');

      // Download ekranına yönlendir
      setTimeout(() => {
        navigation.navigate('Download');
      }, 500);
    } catch (error) {
      console.error('❌ Anonymous sign-in error:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');

      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }

      await auth().signOut();
      await AsyncStorage.removeItem('zenai_user');

      dispatch(resetUserInfo()); // ✅ Redux'tan temizle
      setUser(null);

      console.log('✅ Sign-out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  // Giriş yapılmışsa
  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Text style={styles.checkmark}>✓</Text>
          <Text
            style={[
              styles.welcomeText,
              { color: __DEV__ ? '#FFD700' : '#4285F4' },
            ]}
          >
            Hoş geldin!
          </Text>
          <Text style={styles.emailText}>
            {user.isAnonymous ? '🎭 Misafir' : user.displayName || user.email}
          </Text>
          {user.photoURL && !user.isAnonymous && (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.profileImage}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Giriş ekranı
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: __DEV__ ? '#FFD700' : '#4285F4' }]}
        >
          ZenAi
        </Text>
        <Text style={styles.subtitle}>Yapay Zeka Asistanınız</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Google ile devam et</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.guestButton]}
          onPress={handleAnonymousSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>⚡</Text>
              <Text style={styles.buttonText}>Misafir olarak devam et</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Google ile giriş yaptığında profilin kaydedilir.{'\n'}
          Misafir girişte veriler kalıcı olmaz.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    marginTop: 20,
    maxWidth: 200,
    alignSelf: 'center',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3a3a4e',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  successBox: {
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 64,
    color: '#4CAF50',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
  },
});

export default ExpoAuth;
