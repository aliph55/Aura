import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import { useModel } from '../contexts/ModelContext';

const { width } = Dimensions.get('window');

// ✅ Gemma 3 1B-IT Q4_K_M (ggml-org resmi)
const MODEL_URL =
  'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf';

const HF_TOKEN = 'hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // ← BURAYA KENDİ TOKEN'INI YAZ

const MODEL_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/gemma-3-1b-it-Q4_K_M.gguf`;

const EXPECTED_MODEL_SIZE = 806_000_000; // ~806 MB
const MIN_VALID_SIZE = Math.floor(EXPECTED_MODEL_SIZE * 0.85); // ~685 MB

const Download = ({ onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Checking model...');

  const { loadModel, loadVocab } = useModel();
  const downloadTaskRef = useRef(null);

  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setDownloadProgress(0);
      setDownloadedMB(0);
      setTotalMB(0);
      setStatusMessage('Checking model...');

      // Mevcut dosyayı kontrol et
      const exists = await RNFS.exists(MODEL_LOCAL_PATH);
      if (exists) {
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        if (stat.size >= MIN_VALID_SIZE) {
          setStatusMessage('Model is ready!');
          await loadModel(MODEL_LOCAL_PATH);
          await loadVocab?.();
          onDownloadComplete?.(MODEL_LOCAL_PATH);
          setIsDownloading(false);
          return;
        } else {
          console.log('🗑️ Incomplete file found, deleting...');
          await RNFS.unlink(MODEL_LOCAL_PATH);
        }
      }

      setStatusMessage('Downloading model...');

      const downloadTask = RNFS.downloadFile({
        fromUrl: MODEL_URL,
        toFile: MODEL_LOCAL_PATH,
        background: false,
        progressDivider: 1,
        connectionTimeout: 30_000,
        readTimeout: 60_000,
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
        },
        begin: res => {
          const total =
            res.contentLength > 0 ? res.contentLength : EXPECTED_MODEL_SIZE;
          setTotalMB(Math.round(total / 1_000_000));
        },
        progress: res => {
          const total =
            res.contentLength > 0 ? res.contentLength : EXPECTED_MODEL_SIZE;
          const p = Math.min((res.bytesWritten / total) * 100, 100);
          setDownloadProgress(p);
          setDownloadedMB(Math.round(res.bytesWritten / 1_000_000));
          setStatusMessage(`Downloading: ${p.toFixed(0)}%`);
        },
      });

      downloadTaskRef.current = downloadTask;
      const result = await downloadTask.promise;

      // Authentication hatası kontrolü
      if (result.statusCode === 401 || result.statusCode === 403) {
        throw new Error(
          'Authentication failed!\n\nGemma modeli gated (korumalı). Lütfen:\n1. huggingface.co adresine gir\n2. Gemma model sayfasında lisansı kabul et\n3. https://huggingface.co/settings/tokens adresinden token oluştur\n4. Tokenı Download.js dosyasına yapıştır',
        );
      }

      if (result.statusCode !== 200) {
        throw new Error(`Download failed. Status: ${result.statusCode}`);
      }

      // İndirilen dosyanın boyut kontrolü
      const stat = await RNFS.stat(MODEL_LOCAL_PATH);
      if (stat.size < MIN_VALID_SIZE) {
        await RNFS.unlink(MODEL_LOCAL_PATH);
        throw new Error(
          `Downloaded file too small (${Math.round(stat.size / 1_000_000)} MB).`,
        );
      }

      setStatusMessage('Loading model...');
      await loadModel(MODEL_LOCAL_PATH);
      await loadVocab?.();
      setStatusMessage('Model ready!');
      onDownloadComplete?.(MODEL_LOCAL_PATH);
    } catch (err) {
      if (err?.message?.includes('cancelled')) return;
      console.error('Download error:', err);
      setError(err.message);
      setStatusMessage('Error occurred');
      Alert.alert('Model Download Error', err.message);
    } finally {
      downloadTaskRef.current = null;
      setIsDownloading(false);
    }
  };

  // Component yüklendiğinde otomatik indir
  useEffect(() => {
    downloadModel();

    // Component kapatılırsa indirmeyi iptal et
    return () => {
      downloadTaskRef.current?.stop?.();
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setDownloadProgress(0);
    setDownloadedMB(0);
    downloadModel();
  };

  const handleSkip = async () => {
    try {
      setIsDownloading(true);
      setStatusMessage('Loading from assets...');

      const exists = await RNFS.existsAssets('gemma-3-1b-it-Q4_K_M.gguf');
      if (!exists) throw new Error('Model not found in assets folder.');

      await RNFS.copyFileAssets('gemma-3-1b-it-Q4_K_M.gguf', MODEL_LOCAL_PATH);

      const stat = await RNFS.stat(MODEL_LOCAL_PATH);
      if (stat.size < MIN_VALID_SIZE)
        throw new Error('Asset model file is too small!');

      setStatusMessage('Loading model...');
      await loadModel(MODEL_LOCAL_PATH);
      await loadVocab?.();
      onDownloadComplete?.(MODEL_LOCAL_PATH);
    } catch (err) {
      setError(err.message);
      Alert.alert('Asset Load Error', err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0d0820', '#1a1040', '#0a1628', '#041020']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />

        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            borderRadius={28}
          />

          {/* Icon */}
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#a78bfa', '#6366f1', '#4f46e5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialIcons name="auto-awesome" size={52} color="#fff" />
            </LinearGradient>
            <View style={styles.iconRing1} />
            <View style={styles.iconRing2} />
          </View>

          <Text style={styles.title}>AI Model Setup</Text>
          <Text style={styles.subtitle}>
            Preparing your intelligent assistant
          </Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#a78bfa" />
                <View style={styles.loaderGlow} />
              </View>
              <Text style={styles.statusText}>{statusMessage}</Text>

              {downloadProgress > 0 && (
                <View style={styles.progressSection}>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6', '#a78bfa']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.progressBarFill,
                          { width: `${downloadProgress}%` },
                        ]}
                      >
                        <View style={styles.progressShimmer} />
                      </LinearGradient>
                    </View>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressBadgeText}>
                        {downloadProgress.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  {totalMB > 0 && (
                    <Text style={styles.mbText}>
                      {downloadedMB} MB / {totalMB} MB
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconBox}>
                    <MaterialIcons
                      name="info-outline"
                      size={20}
                      color="#60A5FA"
                    />
                  </View>
                  <Text style={styles.infoTitle}>First Time Setup</Text>
                </View>
                <View style={styles.infoDivider} />
                <Text style={styles.infoText}>
                  • Model: Gemma 3 1B-IT (Q4_K_M){'\n'}• File size: ~806 MB
                  {'\n'}• One-time download{'\n'}• May take a few minutes
                </Text>
              </View>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconWrapper}>
                <View style={styles.errorIconBg}>
                  <MaterialIcons
                    name="error-outline"
                    size={48}
                    color="#f87171"
                  />
                </View>
                <View style={styles.errorIconGlow} />
              </View>
              <Text style={styles.errorTitle}>Download Failed</Text>
              <View style={styles.errorMessageBox}>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRetry}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.primaryButtonGradient}
                  >
                    <MaterialIcons
                      name="refresh"
                      size={22}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.buttonText}>Try Again</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSkip}
                >
                  <MaterialIcons
                    name="folder-open"
                    size={22}
                    color="rgba(255,255,255,0.8)"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.secondaryButtonText}>
                    Load from Assets
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#a78bfa" />
                <View style={styles.loaderGlow} />
              </View>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default Download;

const styles = StyleSheet.create({
  // ... (stiller aynı kalıyor, aşağıda tamamı var)
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    backgroundColor: '#0d0820',
  },
  orb1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(139,92,246,0.15)',
    top: -140,
    right: -120,
  },
  orb2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99,102,241,0.12)',
    bottom: -100,
    left: -100,
  },
  orb3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(167,139,250,0.08)',
    top: '40%',
    right: -60,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    width: width * 0.9,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 108,
    height: 108,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  iconRing1: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  iconRing2: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.08)',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: { width: '100%', alignItems: 'center' },
  loaderWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loaderGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(167,139,250,0.12)',
    zIndex: -1,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  progressSection: { width: '100%', marginBottom: 24 },
  progressBarContainer: { width: '100%', position: 'relative', marginTop: 16 },
  progressBarBg: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  progressBadge: {
    position: 'absolute',
    right: 0,
    top: -36,
    backgroundColor: 'rgba(99,102,241,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  mbText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  infoTitle: { fontSize: 15, color: '#fff', fontWeight: '800' },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(59,130,246,0.15)',
    marginBottom: 14,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
    fontWeight: '500',
  },
  errorContainer: { width: '100%', alignItems: 'center' },
  errorIconWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIconBg: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(239,68,68,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    zIndex: 2,
  },
  errorIconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239,68,68,0.08)',
    zIndex: 1,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
    textAlign: 'center',
  },
  errorMessageBox: {
    borderRadius: 18,
    padding: 18,
    width: '100%',
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: '#f87171',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  errorMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonGroup: { width: '100%', gap: 12 },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
