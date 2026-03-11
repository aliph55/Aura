import React, { createContext, useState, useContext, useRef } from 'react';
import { InferenceSession } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';
import { Qwen2Tokenizer } from './Qwen2Tokenizer';

const ModelContext = createContext();

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) throw new Error('useModel must be used within ModelProvider');
  return context;
};

export const ModelProvider = ({ children }) => {
  const sessionRef = useRef(null);
  const tokenizerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  const loadTokenizer = async () => {
    if (tokenizerRef.current) return;
    try {
      console.log('📖 Loading Qwen2 tokenizer...');
      const json = await RNFS.readFileAssets('tokenizer.json', 'utf8');
      const parsed = JSON.parse(json);
      const tokenizer = new Qwen2Tokenizer();
      await tokenizer.load(parsed);
      tokenizerRef.current = tokenizer;
      console.log('✅ Tokenizer loaded');
    } catch (e) {
      console.error('❌ Tokenizer load error:', e);
      throw e;
    }
  };

  const loadModel = async (modelPath = null) => {
    if (modelLoaded && sessionRef.current) return sessionRef.current;
    if (isLoading) return null;

    setIsLoading(true);
    try {
      await loadTokenizer();

      const destPath = modelPath || `${RNFS.DocumentDirectoryPath}/model.onnx`;

      if (!modelPath) {
        const exists = await RNFS.exists(destPath);
        if (!exists) {
          console.log('📋 Copying model from assets...');
          await RNFS.copyFileAssets('model.onnx', destPath);
        }
      }

      const stat = await RNFS.stat(destPath);
      console.log('📊 Model size:', (stat.size / 1024 / 1024).toFixed(0), 'MB');

      console.log('🧠 Creating ONNX session...');
      sessionRef.current = await InferenceSession.create(destPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'basic',
        enableCpuMemArena: false,
        enableMemPattern: false,
      });

      setModelLoaded(true);
      console.log('✅ Model ready');
      return sessionRef.current;
    } catch (error) {
      console.error('❌ Model load failed:', error);
      setModelLoaded(false);
      Alert.alert('Model Error', `Failed to load model: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // backward compat
  const loadVocab = async () => {};

  return (
    <ModelContext.Provider
      value={{
        sessionRef,
        tokenizerRef,
        isLoading,
        modelLoaded,
        loadModel,
        loadVocab,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export default ModelContext;
