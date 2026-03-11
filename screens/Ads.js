import { StyleSheet, Text, View, Button } from 'react-native';
import React from 'react';
import { useAds } from '../contexts/adsContext';
import { loadInterstitialAd, loadRewardedAd } from '../components/adsService';

const Home = () => {
  const { showInterstitialAd, showRewardedAd, adsStatus } = useAds();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZenPro AI</Text>

      <Text style={styles.status}>
        SDK: {adsStatus.isInitialized ? '✅' : '⏳'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interstitial Reklam</Text>
        <Text style={styles.statusText}>
          {adsStatus.interstitialLoaded ? '✅ Hazır' : '❌ Hazır değil'}
        </Text>
        <Button title="Interstitial Yükle" onPress={loadInterstitialAd} />
        <Button
          title="Interstitial Göster"
          onPress={showInterstitialAd}
          disabled={!adsStatus.interstitialLoaded}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewarded Reklam</Text>
        <Text style={styles.statusText}>
          {adsStatus.rewardedLoaded ? '✅ Hazır' : '❌ Hazır değil'}
        </Text>
        <Button title="Rewarded Yükle" onPress={loadRewardedAd} />
        <Button
          title="Rewarded Göster"
          onPress={() => {
            showRewardedAd()
              .then(reward => console.log('Ödül kazanıldı:', reward))
              .catch(err => console.log('Hata:', err.message));
          }}
          disabled={!adsStatus.rewardedLoaded}
        />
      </View>
    </View>
  );
};
export default Home;

const styles = StyleSheet.create({});
