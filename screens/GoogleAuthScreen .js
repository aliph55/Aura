import React, { useEffect } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../redux/userInfo';

const GoogleAuthScreen = ({ navigation }) => {
  const [userInfo, setUser] = React.useState(null);
  const dispatch = useDispatch();
  // ✅ useEffect içine taşındı
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '799076129257-lj6b7jfpu8hsu9o9bme39ehh4742n26m.apps.googleusercontent.com',
    });
  }, []);

  const getCurrentUserInfo = async () => {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      console.log('getCurrentUserInfo ', userInfo?.data?.user);
      dispatch(setUserInfo(userInfo?.data));
      navigation.navigate('Download');
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        // user has not signed in yet
      } else {
        // some other error
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
      console.log('Kullanıcı:', user);
      navigation.navigate('Download');
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
