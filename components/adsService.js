import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
  MobileAds,
} from 'react-native-google-mobile-ads';
import { Alert, AppState } from 'react-native';

// ─────────────────────────────────────────
// Ad Unit ID'leri
// ─────────────────────────────────────────
const adUnitIds = {
  interstitial: TestIds.INTERSTITIAL, // 'ca-app-pub-3940256099942544/1033173712'
  rewarded: 'ca-app-pub-6721519204185712/5624007829', // 'ca-app-pub-3940256099942544/5224354917'
};

// ─────────────────────────────────────────
// Global State
// ─────────────────────────────────────────
let interstitial = null;
let rewarded = null;
let interstitialLoaded = false;
let rewardedLoaded = false;
let isInitialized = false;
let rewardCallback = null;
let initializationPromise = null;

// ─────────────────────────────────────────
// Interstitial Reklam
// ─────────────────────────────────────────
const createInterstitialAd = () => {
  try {
    interstitial = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
      console.log('✅ Interstitial loaded');
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🔁 Interstitial closed — yeniden yükleniyor...');
      interstitialLoaded = false;
      setTimeout(() => {
        if (interstitial) interstitial.load();
      }, 1000);
    });

    interstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('❌ Interstitial error:', error.message);
      interstitialLoaded = false;
      // Hata durumunda 5 saniye sonra tekrar dene
      setTimeout(() => {
        if (interstitial) interstitial.load();
      }, 5000);
    });

    // İlk yüklemeyi başlat
    interstitial.load();
    console.log('📡 Interstitial ilk yükleme başladı');
  } catch (error) {
    console.error('❌ Interstitial oluşturma hatası:', error);
  }
};

// ─────────────────────────────────────────
// Rewarded Reklam
// ─────────────────────────────────────────
const createRewardedAd = () => {
  try {
    rewarded = RewardedAd.createForAdRequest(adUnitIds.rewarded, {
      requestNonPersonalizedAdsOnly: true,
    });

    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
      console.log('✅ Rewarded ad loaded');
    });

    rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      console.log('💰 Kullanıcı ödül kazandı:', reward);
      if (rewardCallback) {
        rewardCallback(reward);
        rewardCallback = null;
      }
    });

    rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🔁 Rewarded closed — yeniden yükleniyor...');
      rewardedLoaded = false;
      if (rewardCallback) {
        rewardCallback(null);
        rewardCallback = null;
      }
      setTimeout(() => {
        if (rewarded) rewarded.load();
      }, 1000);
    });

    rewarded.addAdEventListener(AdEventType.ERROR, error => {
      console.log('❌ Rewarded error:', error.message);
      rewardedLoaded = false;
      if (rewardCallback) {
        rewardCallback(null);
        rewardCallback = null;
      }
      // Hata durumunda 5 saniye sonra tekrar dene
      setTimeout(() => {
        if (rewarded) rewarded.load();
      }, 5000);
    });

    // İlk yüklemeyi başlat
    rewarded.load();
    console.log('📡 Rewarded ilk yükleme başladı');
  } catch (error) {
    console.error('❌ Rewarded oluşturma hatası:', error);
  }
};

// ─────────────────────────────────────────
// Manuel Yükleme (dışarıdan çağrılabilir)
// ─────────────────────────────────────────
export const loadInterstitialAd = () => {
  if (interstitial && !interstitialLoaded) {
    console.log('📡 Manuel Interstitial yükleniyor...');
    interstitial.load();
  } else {
    console.log('ℹ️ Interstitial zaten yüklü veya mevcut değil');
  }
};

export const loadRewardedAd = () => {
  if (rewarded && !rewardedLoaded) {
    console.log('📡 Manuel Rewarded yükleniyor...');
    rewarded.load();
  } else {
    console.log('ℹ️ Rewarded zaten yüklü veya mevcut değil');
  }
};

// ─────────────────────────────────────────
// SDK Başlatma
// ─────────────────────────────────────────
const initializeAdsInternal = async () => {
  try {
    const adapterStatuses = await MobileAds().initialize();
    console.log('✅ AdMob SDK initialized:', adapterStatuses);
    isInitialized = true;

    createInterstitialAd();
    createRewardedAd();

    return true;
  } catch (error) {
    console.error('❌ AdMob başlatma hatası:', error);
    return false;
  }
};

export const initializeAds = async () => {
  if (initializationPromise) return initializationPromise;
  if (isInitialized) return true;

  initializationPromise = new Promise(async resolve => {
    try {
      if (AppState.currentState !== 'active') {
        // Uygulama arka plandaysa aktif olana kadar bekle
        const subscription = AppState.addEventListener(
          'change',
          async nextAppState => {
            if (nextAppState === 'active') {
              subscription?.remove();
              const result = await initializeAdsInternal();
              resolve(result);
            }
          },
        );
      } else {
        // Activity hazır olması için 2 saniye bekle
        setTimeout(async () => {
          const result = await initializeAdsInternal();
          resolve(result);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ initializeAds hatası:', error);
      resolve(false);
    }
  });

  return initializationPromise;
};

// ─────────────────────────────────────────
// Interstitial Göster
// ─────────────────────────────────────────
export const showInterstitialAd = async () => {
  if (!isInitialized) {
    console.log('⏳ SDK hazır değil, başlatılıyor...');
    await initializeAds();
  }

  if (!isInitialized) {
    //  Alert.alert('Uyarı', 'Reklam sistemi henüz hazır değil.');
    return false;
  }

  if (interstitialLoaded && interstitial) {
    try {
      console.log('📺 Interstitial gösteriliyor...');
      await interstitial.show();
      return true;
    } catch (error) {
      console.error('❌ Interstitial gösterme hatası:', error);
      interstitialLoaded = false;
      return false;
    }
  } else {
    console.log('⚠️ Interstitial henüz hazır değil, yükleniyor...');
    //  Alert.alert('Uyarı', 'Reklam henüz yüklenmedi. Lütfen bekleyin.');
    if (interstitial) interstitial.load();
    return false;
  }
};

// ─────────────────────────────────────────
// Rewarded Göster
// ─────────────────────────────────────────
export const showRewardedAd = () => {
  return new Promise(async (resolve, reject) => {
    if (!isInitialized) {
      console.log('⏳ SDK hazır değil, başlatılıyor...');
      await initializeAds();
    }

    if (!isInitialized) {
      //  Alert.alert('Uyarı', 'Reklam sistemi henüz hazır değil.');
      return reject(new Error('Ads not initialized'));
    }

    if (rewardedLoaded && rewarded) {
      rewardCallback = reward => {
        if (reward) {
          resolve(reward);
        } else {
          reject(new Error('Ödül kazanılmadı'));
        }
      };

      try {
        // console.log('📺 Rewarded gösteriliyor...');
        //  await rewarded.show();
      } catch (error) {
        console.error('❌ Rewarded gösterme hatası:', error);
        rewardCallback = null;
        reject(error);
      }
    } else {
      console.log('⚠️ Rewarded henüz hazır değil, yükleniyor...');
      //  Alert.alert('Uyarı', 'Ödüllü reklam henüz yüklenmedi. Lütfen bekleyin.');
      if (rewarded) rewarded.load();
      reject(new Error('Ad not loaded'));
    }
  });
};

// ─────────────────────────────────────────
// Yardımcı Fonksiyonlar
// ─────────────────────────────────────────
export const getAdsStatus = () => ({
  isInitialized,
  interstitialLoaded,
  rewardedLoaded,
});

export const reloadAds = () => {
  if (AppState.currentState !== 'active') return;

  if (interstitial && !interstitialLoaded) {
    console.log('🔄 Interstitial yeniden yükleniyor...');
    interstitial.load();
  }
  if (rewarded && !rewardedLoaded) {
    console.log('🔄 Rewarded yeniden yükleniyor...');
    rewarded.load();
  }
};

// ─────────────────────────────────────────
// AppState Dinleyici — Uygulama Öne Gelince Yükle
// ─────────────────────────────────────────
AppState.addEventListener('change', nextAppState => {
  if (nextAppState === 'active' && isInitialized) {
    setTimeout(() => {
      reloadAds();
    }, 2000);
  }
});
