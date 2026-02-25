import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { AdsProvider } from './contexts/adsContext';
import Home from './screens/Home';

const App = () => {
  return (
    <AdsProvider>
      <View style={{ flex: 1, alignContent: 'center' }}>
        <Home />
      </View>
    </AdsProvider>
  );
};

export default App;

const styles = StyleSheet.create({});
