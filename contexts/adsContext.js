import { createContext, useContext, useEffect, useState } from 'react';
import {
  initializeAds,
  showRewardedAd,
  showInterstitialAd,
  getAdsStatus,
} from '../components/adsService';

const AdsContext = createContext();

export const AdsProvider = ({ children }) => {
  const [adsStatus, setAdsStatus] = useState({
    isInitialized: false,
    interstitialLoaded: false,
    rewardedLoaded: false,
  });

  useEffect(() => {
    initializeAds();

    // Status'u periyodik olarak güncelle
    const interval = setInterval(() => {
      setAdsStatus(getAdsStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    showRewardedAd,
    showInterstitialAd,
    adsStatus,
  };

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
};

export const useAds = () => {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used within AdsProvider');
  }
  return context;
};
