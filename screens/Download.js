import React, { useState, useEffect } from 'react';
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
import RNFS from 'react-native-fs';
import { useModel } from '../contexts/ModelContext';

const { width, height } = Dimensions.get('window');

const MODEL_URL =
  'https://media.githubusercontent.com/media/aliph55/qwen-model/refs/heads/master/qwen-int8.onnx';
const MODEL_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/model.onnx`;
const EXPECTED_MODEL_SIZE = 649048012;
const MIN_VALID_SIZE = 600000000;

const Download = ({ onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Checking model...');

  const { loadModel, loadVocab } = useModel();

  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setStatusMessage('Checking model...');

      const exists = await RNFS.exists(MODEL_LOCAL_PATH);
      if (exists) {
        console.log('✅ Model file found, validating...');
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Current model size:', stat.size, 'bytes');
        console.log('📊 Expected size:', EXPECTED_MODEL_SIZE, 'bytes');

        if (stat.size >= MIN_VALID_SIZE) {
          console.log('✅ Model is valid, skipping download.');
          setStatusMessage('Model is ready!');

          await loadModel();
          await loadVocab();

          if (typeof onDownloadComplete === 'function') {
            onDownloadComplete(MODEL_LOCAL_PATH);
          } else {
            console.error('❌ onDownloadComplete function is not defined.');
            setError('Application configuration error.');
          }
          setIsDownloading(false);
          return;
        } else {
          console.log('⚠️ Model file is incomplete or corrupted!');
          console.log(
            `📊 Current: ${stat.size} bytes, Expected: ${EXPECTED_MODEL_SIZE} bytes`,
          );
          console.log('🗑️ Deleting old file...');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          console.log('✅ Old file deleted, starting download...');
        }
      }

      console.log('📥 Downloading model...');
      console.log('🔗 URL:', MODEL_URL);
      setStatusMessage('Downloading model...');

      const downloadOptions = {
        fromUrl: MODEL_URL,
        toFile: MODEL_LOCAL_PATH,
        background: false,
        progressDivider: 1,
        connectionTimeout: 30000,
        readTimeout: 30000,
        begin: res => {
          console.log('🚀 Download started');
          console.log('📊 Total size:', res.contentLength, 'bytes');
          console.log('📊 Status code:', res.statusCode);

          if (res.contentLength && res.contentLength < MIN_VALID_SIZE) {
            console.warn('⚠️ Server response size is smaller than expected!');
          }
        },
        progress: res => {
          const progressPercent =
            res.contentLength > 0
              ? (res.bytesWritten / res.contentLength) * 100
              : (res.bytesWritten / EXPECTED_MODEL_SIZE) * 100;

          setDownloadProgress(progressPercent);

          if (Math.floor(progressPercent) % 5 === 0) {
            console.log(
              `📥 Downloaded: ${progressPercent.toFixed(1)}% (${(
                res.bytesWritten /
                1024 /
                1024
              ).toFixed(1)} MB / ${(res.contentLength / 1024 / 1024).toFixed(
                1,
              )} MB)`,
            );
          }

          setStatusMessage(`Downloading: ${progressPercent.toFixed(0)}%`);
        },
      };

      const result = await RNFS.downloadFile(downloadOptions).promise;

      console.log('✅ Download completed, status code:', result.statusCode);
      console.log('📊 Bytes written:', result.bytesWritten);

      if (result.statusCode === 200) {
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Downloaded file size:', stat.size, 'bytes');
        console.log('📊 Expected size:', EXPECTED_MODEL_SIZE, 'bytes');

        if (stat.size < MIN_VALID_SIZE) {
          console.error('❌ Downloaded file is too small!');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error(
            `Downloaded file is incomplete! Downloaded: ${(
              stat.size /
              1024 /
              1024
            ).toFixed(1)} MB, Expected: ${(
              EXPECTED_MODEL_SIZE /
              1024 /
              1024
            ).toFixed(1)} MB`,
          );
        }

        if (stat.size === 0) {
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error('Downloaded file is empty!');
        }

        try {
          const firstBytes = await RNFS.read(
            MODEL_LOCAL_PATH,
            100,
            0,
            'base64',
          );
          const decoded = Buffer.from(firstBytes, 'base64').toString('utf8');

          console.log(
            '📄 File beginning (first 50 characters):',
            decoded.substring(0, 50),
          );

          if (
            decoded.includes('<!DOCTYPE html>') ||
            decoded.includes('<html')
          ) {
            console.error('❌ HTML page downloaded! (Probably an error page)');
            await RNFS.unlink(MODEL_LOCAL_PATH);
            throw new Error(
              'Server returned an error page. Please check the URL.',
            );
          }
        } catch (readError) {
          console.log('ℹ️ File is in binary format (expected)');
        }

        console.log('✅ Model successfully downloaded and validated!');
        setStatusMessage('Model downloaded successfully!');

        await loadModel();
        await loadVocab();

        if (typeof onDownloadComplete === 'function') {
          onDownloadComplete(MODEL_LOCAL_PATH);
        } else {
          console.error('❌ onDownloadComplete function is not defined.');
          setError('Application configuration error.');
        }
      } else {
        throw new Error(`Download error, status code: ${result.statusCode}`);
      }
    } catch (err) {
      console.error('❌ Model download error:', err);
      console.error('Error detail:', err.stack);

      const errorMessage = `Model download failed: ${err.message}

📋 Solutions:

1️⃣ Check Internet Connection
   • Use Wi-Fi for better speed
   • Disable VPN if active
   • Try mobile data

2️⃣ Download Manually
   • URL: https://s3.eu-north-1.amazonaws.com/model.onnxugvjhb/model.onnx
   • Size: ~650 MB
   • Place in: android/app/src/main/assets/model.onnx
   • Rebuild app: npm run android

3️⃣ Use "Try Again" or "Load from Assets" button

⚠️ Note: Model file (model.onnx) is currently missing from assets folder.`;

      setError(errorMessage);
      setStatusMessage('Error occurred');
      Alert.alert('Model Download Error', errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    downloadModel();
  }, []);

  const handleRetry = () => {
    setError(null);
    setDownloadProgress(0);
    downloadModel();
  };

  const handleSkip = async () => {
    try {
      console.log('ℹ️ Trying to load from assets...');
      setIsDownloading(true);
      setStatusMessage('Loading from assets...');

      // Check if model exists in assets
      const assetPath = 'model.onnx';
      const exists = await RNFS.existsAssets(assetPath);

      if (!exists) {
        throw new Error(
          'Model file not found in assets folder. Please download the model from AWS S3 and place it in android/app/src/main/assets/model.onnx',
        );
      }

      console.log('✅ Model found in assets, copying to documents...');

      // Copy from assets to documents directory
      await RNFS.copyFileAssets(assetPath, MODEL_LOCAL_PATH);

      const stat = await RNFS.stat(MODEL_LOCAL_PATH);
      console.log('📊 Copied file size:', stat.size, 'bytes');

      if (stat.size < MIN_VALID_SIZE) {
        throw new Error('Model file in assets is too small or corrupted!');
      }

      console.log('✅ Model copied successfully from assets!');
      setStatusMessage('Model loaded from assets!');

      await loadModel();
      await loadVocab();

      if (typeof onDownloadComplete === 'function') {
        onDownloadComplete(MODEL_LOCAL_PATH);
      }
    } catch (err) {
      console.error('❌ Load from assets error:', err);

      const errorMessage = `Could not load model from assets: ${err.message}

To fix this:
1. Download model.onnx from: https://s3.eu-north-1.amazonaws.com/model.onnxugvjhb/model.onnx
2. Place it in: android/app/src/main/assets/model.onnx
3. Rebuild the app: npm run android

Or try downloading again with "Try Again" button.`;

      setError(errorMessage);
      Alert.alert('Asset Load Error', errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/*  Background Gradients */}
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
        <View style={styles.bgGradient3} />

        {/* Floating Particles */}
        <View style={[styles.particle, styles.particle1]} />
        <View style={[styles.particle, styles.particle2]} />
        <View style={[styles.particle, styles.particle3]} />

        <View style={styles.card}>
          {/* Header with Icon */}
          <View style={[styles.headerContainer]}>
            <View style={styles.iconWrapper}>
              <View style={styles.iconGradient}>
                <Text style={styles.iconText}>🧠</Text>
              </View>
              <View style={styles.iconRing1} />
              <View style={styles.iconRing2} />
            </View>
          </View>

          <Text style={styles.title}>AI Model Setup</Text>
          <Text style={styles.subtitle}>
            Preparing your intelligent assistant
          </Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#818CF8" />
                <View style={styles.loaderGlow} />
              </View>

              <Text style={styles.statusText}>{statusMessage}</Text>

              {downloadProgress > 0 && (
                <View style={styles.progressSection}>
                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${downloadProgress}%` },
                        ]}
                      >
                        <View style={styles.progressShimmer} />
                      </View>
                    </View>

                    {/* Progress Percentage Badge */}
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressBadgeText}>
                        {downloadProgress.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  {/* Stats Grid */}
                </View>
              )}

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconBox}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                  </View>
                  <Text style={styles.infoTitle}>First Time Setup</Text>
                </View>
                <View style={styles.infoDivider} />
                <Text style={styles.infoText}>
                  • Model download required on first use{'\n'}• File size: ~650
                  MB
                  {'\n'}• One-time process{'\n'}• May take a few minutes
                </Text>
              </View>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              {/* Error Icon */}
              <View style={styles.errorIconWrapper}>
                <View style={styles.errorIconBg}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                </View>
                <View style={styles.errorIconGlow} />
              </View>

              <Text style={styles.errorTitle}>Download Failed</Text>
              <View style={styles.errorMessageBox}>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRetry}
                  activeOpacity={0.85}
                >
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>🔄</Text>
                    <Text style={styles.buttonText}>Try Again</Text>
                  </View>
                  <View style={styles.buttonGlow} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSkip}
                  activeOpacity={0.85}
                >
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>📁</Text>
                    <Text style={styles.secondaryButtonText}>
                      Load from Assets
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#818CF8" />
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1E',
    position: 'relative',
    overflow: 'hidden',
  },

  // Background Gradients
  bgGradient1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    top: -200,
    right: -200,
  },
  bgGradient2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    bottom: -150,
    left: -150,
  },
  bgGradient3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: '40%',
    right: -100,
  },

  // Floating Particles
  particle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
  },
  particle1: {
    width: 8,
    height: 8,
    top: '20%',
    left: '15%',
  },
  particle2: {
    width: 12,
    height: 12,
    top: '60%',
    right: '20%',
  },
  particle3: {
    width: 6,
    height: 6,
    bottom: '30%',
    left: '25%',
  },

  // Main Card
  card: {
    backgroundColor: '#1A1F35',
    borderRadius: 32,
    padding: 32,
    width: width * 0.9,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.1)',
    alignItems: 'center',
  },

  // Header & Icon
  headerContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 12,
    zIndex: 3,
  },
  iconText: {
    fontSize: 56,
  },
  iconRing1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    zIndex: 2,
  },
  iconRing2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    zIndex: 1,
  },

  // Typography
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -1,
    textAlign: 'center',
    textShadowColor: 'rgba(99, 102, 241, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#94A3B8',
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Progress Container
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loaderWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  loaderGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    zIndex: -1,
  },
  statusText: {
    fontSize: 17,
    color: '#F1F5F9',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    letterSpacing: 0.2,
  },

  // Progress Section
  progressSection: {
    width: '100%',
    marginBottom: 28,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  progressBarBg: {
    width: '100%',
    height: 18,
    backgroundColor: '#293548',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    position: 'relative',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
  },
  progressBadge: {
    position: 'absolute',
    right: -8,
    top: -32,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  progressBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#293548',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.1)',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Error Container
  errorContainer: {
    width: '100%',
    alignItems: 'center',
  },
  errorIconWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  errorIconBg: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    zIndex: 2,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorIconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    zIndex: 1,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  errorMessageBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorMessage: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },

  // Buttons
  buttonGroup: {
    width: '100%',
    gap: 14,
  },
  primaryButton: {
    position: 'relative',
    backgroundColor: '#6366F1',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 1,
  },
  buttonIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#293548',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3F4B63',
  },
  secondaryButtonText: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
