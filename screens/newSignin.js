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
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo';
import { useNavigation } from '@react-navigation/native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== CLIENT ID AYARLARI =====

// Debug (Emülatör) → SHA-1: 14:0E:21:34:...
const DEBUG_ANDROID_CLIENT_ID =
  '53852373022-jhk4ot91ch3l5musjqcn83bt4j4ls15n.apps.googleusercontent.com';

// Release (Play Store) → SHA-1: C7:9D:4D:C9:...
const RELEASE_ANDROID_CLIENT_ID =
  '53852373022-hgsralhj8eefgb008euovummb14evg2v.apps.googleusercontent.com';

// Web Client ID (Firebase için)
const WEB_CLIENT_ID =
  '53852373022-th52gtqcb9bah24899cunbl5i6n1bol1.apps.googleusercontent.com';

const NewSignin = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  useEffect(() => {
    // Google Sign-In yapılandır
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID, // Firebase için gerekli
      offlineAccess: true,
    });
    console.log('✅ Google Sign-In yapılandırıldı');
    console.log('📱 Mod:', __DEV__ ? 'DEBUG' : 'RELEASE');

    // Firebase Auth state değişikliklerini dinle
    const unsubscribe = auth().onAuthStateChanged(firebaseUser => {
      console.log(
        'Auth state:',
        firebaseUser ? 'Giriş yapıldı' : 'Çıkış yapıldı',
      );
      setUser(firebaseUser);

      if (firebaseUser) {
        // Redux'a kaydet
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

        // Ana ekrana yönlendir
        setTimeout(() => {
          navigation.navigate('Download');
        }, 500);
      } else {
        dispatch(resetUserInfo());
      }

      if (initializing) {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [dispatch, initializing, navigation]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // 1. Play Services kontrolü
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // 2. Google ile giriş yap
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In Response:', userInfo);

      // 3. ID Token al
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        throw new Error('ID Token alınamadı!');
      }

      // 4. Firebase credential oluştur
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // 5. Firebase'e giriş yap
      await auth().signInWithCredential(googleCredential);

      console.log('✅ Firebase girişi başarılı!');
      Alert.alert('Başarılı! 🎉', 'Google ile giriş yapıldı!');
    } catch (error) {
      console.log('❌ Google Sign-In Error:', error);

      if (error.code === 'sign_in_cancelled') {
        Alert.alert('İptal', 'Giriş işlemi iptal edildi.');
      } else if (error.code === 'in_progress') {
        Alert.alert('İşlemde', 'Giriş zaten devam ediyor.');
      } else if (error.code === 'play_services_not_available') {
        Alert.alert('Hata', 'Google Play Hizmetleri kullanılamıyor.');
      } else {
        Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    try {
      await auth().signInAnonymously();
      console.log('✅ Misafir girişi başarılı!');
    } catch (error) {
      console.error('❌ Misafir giriş hatası:', error);
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Google Sign-Out
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }

      // Firebase Sign-Out
      await auth().signOut();

      console.log('✅ Çıkış yapıldı');
    } catch (error) {
      console.error('❌ Çıkış hatası:', error);
    }
  };

  // Loading state
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
          {user.photoURL && !user.isAnonymous ? (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.profileImage}
            />
          ) : (
            <Text style={styles.checkmark}>✓</Text>
          )}
          <Text style={styles.welcomeText}>Hoş geldin!</Text>
          <Text style={styles.emailText}>
            {user.isAnonymous ? '🎭 Misafir' : user.displayName || user.email}
          </Text>

          {__DEV__ && (
            <View style={styles.debugBadge}>
              <Text style={styles.debugBadgeText}>DEBUG MODE</Text>
            </View>
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
        <Text style={styles.title}>ZenAi</Text>
        <Text style={styles.subtitle}>Yapay Zeka Asistanınız</Text>

        {__DEV__ && (
          <View style={styles.debugBadge}>
            <Text style={styles.debugBadgeText}>DEBUG MODE</Text>
          </View>
        )}
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
              <Text style={styles.googleG}>G</Text>
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
          <Text style={styles.buttonText}>⚡ Misafir olarak devam et</Text>
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
  debugBadge: {
    marginTop: 10,
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debugBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
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
  googleG: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
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
    marginTop: 30,
    maxWidth: 200,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
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
    color: '#fff',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4285F4',
  },
});

export default NewSignin;
