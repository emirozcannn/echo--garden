// useAudio Hook
// Manages audio analysis and emotion detection

import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyzer, AudioFeatures } from '../engine/AudioAnalyzer';
import { detectEmotion, EmotionSmoother, EmotionState } from '../engine/SentimentEngine';
import { useGardenStore } from './useGarden';

export function useAudio() {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const emotionSmootherRef = useRef<EmotionSmoother>(new EmotionSmoother('neutral', 0.15));
  const animationFrameRef = useRef<number>(0);
  const featuresHistoryRef = useRef<AudioFeatures[]>([]);
  
  const {
    audioSource,
    isListening,
    setIsListening,
    setAudioFeatures,
    setEmotion,
    settings,
  } = useGardenStore();
  
  // Start microphone listening
  const startMicrophone = useCallback(async () => {
    try {
      analyzerRef.current = new AudioAnalyzer({
        smoothingTimeConstant: settings.smoothing,
      });
      await analyzerRef.current.initFromMicrophone();
      setIsListening(true);
      startAnalysis();
    } catch (error) {
      console.error('Failed to start microphone:', error);
      setIsListening(false);
    }
  }, [settings.smoothing, setIsListening]);
  
  // Start file analysis
  const startFromFile = useCallback(async (audioElement: HTMLAudioElement) => {
    try {
      analyzerRef.current = new AudioAnalyzer({
        smoothingTimeConstant: settings.smoothing,
      });
      await analyzerRef.current.initFromAudioElement(audioElement);
      setIsListening(true);
      startAnalysis();
    } catch (error) {
      console.error('Failed to connect audio file:', error);
      setIsListening(false);
    }
  }, [settings.smoothing, setIsListening]);
  
  // Stop listening
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (analyzerRef.current) {
      analyzerRef.current.dispose();
      analyzerRef.current = null;
    }
    setIsListening(false);
    setAudioFeatures(null);
    featuresHistoryRef.current = [];
  }, [setIsListening, setAudioFeatures]);
  
  // Analysis loop
  const startAnalysis = useCallback(() => {
    const analyze = () => {
      if (!analyzerRef.current?.initialized) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }
      
      // Get audio features
      const features = analyzerRef.current.getFeatures();
      
      // Apply sensitivity
      const adjustedFeatures: AudioFeatures = {
        ...features,
        bass: features.bass * settings.audioSensitivity,
        lowMids: features.lowMids * settings.audioSensitivity,
        mids: features.mids * settings.audioSensitivity,
        highMids: features.highMids * settings.audioSensitivity,
        treble: features.treble * settings.audioSensitivity,
        energy: features.energy * settings.audioSensitivity,
      };
      
      // Store in history for emotion detection
      featuresHistoryRef.current.push(adjustedFeatures);
      if (featuresHistoryRef.current.length > 30) {
        featuresHistoryRef.current.shift();
      }
      
      // Detect emotion
      const rawEmotion = detectEmotion(adjustedFeatures, featuresHistoryRef.current);
      const smoothedEmotion = emotionSmootherRef.current.update(rawEmotion);
      
      // Update store
      setAudioFeatures(adjustedFeatures);
      setEmotion(smoothedEmotion);
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [settings.audioSensitivity, setAudioFeatures, setEmotion]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);
  
  // Auto-start based on source
  useEffect(() => {
    if (audioSource === 'microphone' && !isListening) {
      startMicrophone();
    } else if (audioSource === 'none') {
      stop();
    }
  }, [audioSource, isListening, startMicrophone, stop]);
  
  return {
    startMicrophone,
    startFromFile,
    stop,
    isListening,
  };
}

// Hook for visualizer data
export function useAudioVisualizer() {
  const audioFeatures = useGardenStore((state) => state.audioFeatures);
  
  // Create bar heights for visualizer (32 bars)
  const getVisualizerBars = useCallback((barCount: number = 32): number[] => {
    if (!audioFeatures?.frequencyData) {
      return new Array(barCount).fill(0);
    }
    
    const data = audioFeatures.frequencyData;
    const step = Math.floor(data.length / barCount);
    const bars: number[] = [];
    
    for (let i = 0; i < barCount; i++) {
      const start = i * step;
      const end = start + step;
      let sum = 0;
      
      for (let j = start; j < end && j < data.length; j++) {
        // Convert from dB (-90 to -10) to 0-1
        const normalized = (data[j] + 90) / 80;
        sum += Math.max(0, Math.min(1, normalized));
      }
      
      bars.push(sum / step);
    }
    
    return bars;
  }, [audioFeatures]);
  
  return {
    features: audioFeatures,
    getVisualizerBars,
  };
}
