// Garden State Store
// Centralized state management for the Echo Garden

import { create } from 'zustand';
import { AudioFeatures } from '../engine/AudioAnalyzer';
import { EmotionState, Emotion } from '../engine/SentimentEngine';
import { Season, SeasonState } from '../engine/SeasonManager';

export type AudioSource = 'none' | 'microphone' | 'file' | 'stream';

export interface GardenSettings {
  // Quality
  quality: 'low' | 'medium' | 'high' | 'ultra';
  showParticles: boolean;
  showShadows: boolean;
  
  // Visual
  autoRotate: boolean;
  showGrid: boolean;
  showStats: boolean;
  
  // Audio
  audioSensitivity: number;
  smoothing: number;
  
  // Garden
  treeCount: number;
  flowerDensity: number;
  grassDensity: number;
}

export interface GardenState {
  // Audio
  audioSource: AudioSource;
  isListening: boolean;
  audioFeatures: AudioFeatures | null;
  
  // Emotion
  emotion: EmotionState | null;
  
  // Season
  season: SeasonState | null;
  
  // Seed
  seed: string;
  seedNumber: number;
  
  // Settings
  settings: GardenSettings;
  
  // UI
  showControls: boolean;
  showInfo: boolean;
  
  // Actions
  setAudioSource: (source: AudioSource) => void;
  setIsListening: (listening: boolean) => void;
  setAudioFeatures: (features: AudioFeatures | null) => void;
  setEmotion: (emotion: EmotionState | null) => void;
  setSeason: (season: SeasonState | null) => void;
  setSeed: (seed: string) => void;
  updateSettings: (settings: Partial<GardenSettings>) => void;
  setShowControls: (show: boolean) => void;
  setShowInfo: (show: boolean) => void;
  reset: () => void;
}

// Convert string to seed number
function stringToSeedNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const DEFAULT_SETTINGS: GardenSettings = {
  quality: 'medium',
  showParticles: true,
  showShadows: false,
  autoRotate: false,
  showGrid: false,
  showStats: false,
  audioSensitivity: 2.5,
  smoothing: 0.6,
  treeCount: 3,
  flowerDensity: 0.3,
  grassDensity: 0.3,
};

const DEFAULT_EMOTION: EmotionState = {
  primary: 'neutral',
  intensity: 0,
  confidence: 0,
  scores: {
    calm: 0,
    anger: 0,
    joy: 0,
    sadness: 0,
    thought: 0,
    neutral: 1,
  },
};

const DEFAULT_SEASON: SeasonState = {
  current: 'spring',
  progress: 0,
  totalProgress: 0,
  transitioning: false,
  transitionProgress: 0,
};

export const useGardenStore = create<GardenState>((set) => ({
  // Initial state
  audioSource: 'none',
  isListening: false,
  audioFeatures: null,
  emotion: DEFAULT_EMOTION,
  season: DEFAULT_SEASON,
  seed: 'Echo Garden',
  seedNumber: stringToSeedNumber('Echo Garden'),
  settings: DEFAULT_SETTINGS,
  showControls: true,
  showInfo: true,
  
  // Actions
  setAudioSource: (source) => set({ audioSource: source }),
  
  setIsListening: (listening) => set({ isListening: listening }),
  
  setAudioFeatures: (features) => set({ audioFeatures: features }),
  
  setEmotion: (emotion) => set({ emotion }),
  
  setSeason: (season) => set({ season }),
  
  setSeed: (seed) => set({ 
    seed, 
    seedNumber: stringToSeedNumber(seed) 
  }),
  
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  
  setShowControls: (show) => set({ showControls: show }),
  
  setShowInfo: (show) => set({ showInfo: show }),
  
  reset: () => set({
    audioSource: 'none',
    isListening: false,
    audioFeatures: null,
    emotion: DEFAULT_EMOTION,
    season: DEFAULT_SEASON,
  }),
}));

// Default audio features when no audio is playing
const DEFAULT_AUDIO_FEATURES: AudioFeatures = {
  bass: 0,
  lowMids: 0,
  mids: 0,
  highMids: 0,
  treble: 0,
  energy: 0,
  spectralCentroid: 0,
  spectralFlux: 0,
  zeroCrossingRate: 0,
  bpm: 120,
  beat: false,
  silence: true,
  frequencyData: new Float32Array(0),
  waveformData: new Float32Array(0),
};

// Selector hooks - always return non-null values
export const useAudioFeatures = () => useGardenStore((state) => state.audioFeatures ?? DEFAULT_AUDIO_FEATURES);
export const useEmotion = () => useGardenStore((state) => state.emotion);
export const useSeason = () => useGardenStore((state) => state.season);
export const useSeed = () => useGardenStore((state) => ({ seed: state.seed, seedNumber: state.seedNumber }));
export const useSettings = () => useGardenStore((state) => state.settings);
export const useIsListening = () => useGardenStore((state) => state.isListening);
