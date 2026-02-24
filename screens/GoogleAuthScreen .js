import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Uygulamanın başında bir kez çalıştır (örn. App.tsx içinde)
GoogleSignin.configure({
  webClientId:
    '799076129257-lj6b7jfpu8hsu9o9bme39ehh4742n26m.apps.googleusercontent.com', // Web Application tipindeki client ID
});

const GoogleAuthScreen = () => {
  const [userInfo, setUserInfo] = React.useState(null);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const user = await GoogleSignin.signIn();
      setUserInfo(user.data);
      console.log('Kullanıcı:', user);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Kullanıcı iptal etti');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Giriş zaten devam ediyor');
      } else {
        console.log('Hata:', error);
      }
    }
  };

  const signOut = async () => {
    await GoogleSignin.signOut();
    setUserInfo(null);
  };

  return (
    <View style={styles.container}>
      {userInfo ? (
        <>
          <Text style={styles.text}>Hoşgeldin, {userInfo?.user?.name}!</Text>
          <Text style={styles.email}>{userInfo?.user?.email}</Text>
          <Button title="Çıkış Yap" onPress={signOut} />
        </>
      ) : (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={signIn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  email: { fontSize: 14, color: 'gray', marginBottom: 20 },
});

export default GoogleAuthScreen;
