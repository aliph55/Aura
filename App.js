import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import GoogleAuthScreen from './screens/GoogleAuthScreen ';

const App = () => {
  return (
    <View style={{ flex: 1, alignContent: 'center' }}>
      <GoogleAuthScreen />
    </View>
  );
};

export default App;

const styles = StyleSheet.create({});
