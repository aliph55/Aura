import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
} from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const Signin = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigation();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '53852373022-th52gtqcb9bah24899cunbl5i6n1bol1.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      console.log(
        'Auth state changed:',
        firebaseUser ? 'Logged in' : 'Logged out',
      );
      setUser(firebaseUser);

      if (firebaseUser) {
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

        setTimeout(() => {
          navigate.navigate('Download');
        }, 500);
      } else {
        dispatch(resetUserInfo());
      }

      if (initializing) {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [dispatch, initializing, navigate]);

  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);
      console.log('Google Sign-In başlatılıyor...');

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log('Play Services mevcut');

      // Google Sign In - signIn() zaten önceki oturumu otomatik yönetir
      console.log('Google Sign-In popup açılıyor...');
      const signInResult = await GoogleSignin.signIn();
      console.log('Google Sign-In başarılı');

      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        console.error('ID Token bulunamadı:', signInResult);
        throw new Error('ID Token alınamadı. Lütfen tekrar deneyin.');
      }
      console.log('ID Token alındı');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, googleCredential);
      console.log('Firebase giriş başarılı:', userCredential.user.email);
      navigate.navigate('Download');

      Alert.alert(
        'Hoş Geldiniz! 🎉',
        `Başarıyla giriş yaptınız: ${userCredential.user.displayName}`,
        [{ text: 'Tamam' }],
      );
    } catch (error) {
      console.error('Google Sign-In HATA:', error);
      console.error('Hata kodu:', error.code);
      console.error('Hata mesajı:', error.message);

      let errorTitle = 'Giriş Hatası';
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorTitle = 'İptal Edildi';
        errorMessage = 'Google ile giriş iptal edildi.';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorTitle = 'İşlem Devam Ediyor';
        errorMessage = 'Giriş işlemi zaten devam ediyor.';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorTitle = 'Google Play Services Hatası';
        errorMessage =
          'Google Play Services bu cihazda kullanılamıyor.\n\n' +
          '📱 Fiziksel bir cihazda test edin veya\n' +
          "⚙️ Google Play Services'li bir emülatör kullanın.";
      } else if (error.code === 'auth/invalid-credential') {
        errorTitle = 'Geçersiz Kimlik Bilgileri';
        errorMessage =
          'Firebase yapılandırması hatalı olabilir.\n\n' +
          "🔑 SHA-1 parmak izlerini Firebase Console'da kontrol edin.";
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = 'Bağlantı Hatası';
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      } else if (
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        errorTitle = 'Hesap Mevcut';
        errorMessage =
          'Bu e-posta adresi farklı bir giriş yöntemi ile kayıtlı.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: 'Tamam', style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Çıkış yapılıyor...');

      await GoogleSignin.signOut();

      const auth = getAuth();
      await auth.signOut();

      console.log('Çıkış başarılı');
      Alert.alert('Başarılı', 'Çıkış yapıldı', [{ text: 'Tamam' }]);
    } catch (error) {
      console.error('Sign-Out hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </LinearGradient>
    );
  }

  if (user) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.welcomeText}>Hoş geldin,</Text>
          <Text style={styles.userName}>{user.displayName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Sohbet</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Mesaj</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Gün</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={signOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.logoutText}>Çıkış Yap</Text>
                <Text style={styles.logoutIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <View style={styles.content}>
        <View style={styles.header}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>Z</Text>
          </LinearGradient>
          <Text style={styles.title}>Aura</Text>
          <Text style={styles.subtitle}>Akıllı AI asistanınız</Text>
        </View>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>✨</Text>
              <Text style={styles.featureTitle}>Akıllı AI</Text>
              <Text style={styles.featureDesc}>Gelişmiş zeka</Text>
            </LinearGradient>
          </View>
          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>🔒</Text>
              <Text style={styles.featureTitle}>Güvenli</Text>
              <Text style={styles.featureDesc}>Gizlilik öncelik</Text>
            </LinearGradient>
          </View>
          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>⚡</Text>
              <Text style={styles.featureTitle}>Hızlı</Text>
              <Text style={styles.featureDesc}>Anında yanıt</Text>
            </LinearGradient>
          </View>
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.googleButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#1E293B" size="small" />
            ) : (
              <>
                <View style={styles.googleIconWrapper}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              🔧 {Platform.OS === 'android' ? 'Android' : 'iOS'} - Debug Mode
            </Text>
          </View>
        )}

        <Text style={styles.termsText}>
          Devam ederek{'\n'}
          <Text style={styles.termsLink}>Kullanım Şartları</Text> ve{' '}
          <Text style={styles.termsLink}>Gizlilik Politikası</Text>'nı kabul
          etmiş olursunuz
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  blob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    top: -150,
    right: -100,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    bottom: -100,
    left: -80,
    opacity: 0.6,
  },
  blob3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    top: height * 0.4,
    right: -50,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    width: '100%',
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  googleButton: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  googleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleG: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  debugInfo: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  debugText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  profileCard: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(20px)',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    borderWidth: 4,
    borderColor: 'rgba(30, 41, 59, 0.9)',
  },
  welcomeText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
  },
  userEmail: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 32,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  logoutIcon: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default Signin;
