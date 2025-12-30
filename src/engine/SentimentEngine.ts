// Sentiment Engine
// Audio-based emotion detection for flora generation

import { AudioFeatures } from './AudioAnalyzer';

export type Emotion = 'calm' | 'anger' | 'joy' | 'sadness' | 'neutral' | 'thought';

export interface EmotionState {
  primary: Emotion;
  intensity: number; // 0-1
  confidence: number; // 0-1
  
  // Individual emotion scores
  scores: {
    calm: number;
    anger: number;
    joy: number;
    sadness: number;
    thought: number;
    neutral: number;
  };
}

export interface EmotionVisuals {
  // Flora
  floraType: 'mossy' | 'thorny' | 'flowering' | 'willow' | 'crystal' | 'standard';
  floraColors: string[];
  
  // Atmosphere
  skyColors: string[];
  fogDensity: number;
  fogColor: string;
  
  // Particles
  particleType: 'fireflies' | 'sparks' | 'pollen' | 'rain' | 'snow' | 'dust';
  particleColor: string;
  particleIntensity: number;
  
  // Lighting
  ambientColor: string;
  sunColor: string;
  sunIntensity: number;
}

// Emotion detection based on audio features
export function detectEmotion(features: AudioFeatures, history: AudioFeatures[] = []): EmotionState {
  const scores = {
    calm: 0,
    anger: 0,
    joy: 0,
    sadness: 0,
    thought: 0,
    neutral: 0,
  };
  
  // === CALM Detection ===
  // Low energy, smooth spectral content, low ZCR
  if (features.energy < 0.3 && features.zeroCrossingRate < 0.3) {
    scores.calm += 0.4;
  }
  // Emphasis on mid frequencies (voice/music), low variation
  if (features.mids > features.bass && features.mids > features.treble) {
    scores.calm += 0.2;
  }
  // Low spectral flux = stable sound
  if (features.spectralFlux < 0.2) {
    scores.calm += 0.2;
  }
  
  // === ANGER Detection ===
  // High energy, high bass, high ZCR (harsh sounds)
  if (features.energy > 0.6) {
    scores.anger += 0.3;
  }
  if (features.bass > 0.5 && features.zeroCrossingRate > 0.4) {
    scores.anger += 0.3;
  }
  // High spectral flux = rapid changes (shouting)
  if (features.spectralFlux > 0.5) {
    scores.anger += 0.3;
  }
  // Low spectral centroid but high energy = rumbling/aggressive
  if (features.spectralCentroid < 0.3 && features.energy > 0.5) {
    scores.anger += 0.2;
  }
  
  // === JOY Detection ===
  // Medium-high energy, bright sound (high centroid), rhythmic
  if (features.energy > 0.4 && features.energy < 0.8) {
    scores.joy += 0.2;
  }
  if (features.spectralCentroid > 0.5) {
    scores.joy += 0.3;
  }
  // High mids and treble = bright, happy sound
  if (features.highMids > 0.4 && features.treble > 0.3) {
    scores.joy += 0.3;
  }
  // Beat presence indicates rhythm/music
  if (features.beat) {
    scores.joy += 0.2;
  }
  
  // === SADNESS Detection ===
  // Low energy, low frequency emphasis, slow tempo
  if (features.energy < 0.4 && features.bass > features.treble) {
    scores.sadness += 0.3;
  }
  // Low spectral centroid = dark, muffled sound
  if (features.spectralCentroid < 0.3) {
    scores.sadness += 0.3;
  }
  // Low ZCR = smooth, legato sounds
  if (features.zeroCrossingRate < 0.2) {
    scores.sadness += 0.2;
  }
  // Slow tempo
  if (features.bpm < 80) {
    scores.sadness += 0.2;
  }
  
  // === THOUGHT Detection ===
  // Moderate, stable features (speaking/narration)
  if (features.energy > 0.2 && features.energy < 0.5) {
    scores.thought += 0.3;
  }
  // Voice frequency range emphasis
  if (features.mids > 0.3 && features.lowMids > 0.3) {
    scores.thought += 0.3;
  }
  // Low spectral flux = continuous speech
  if (features.spectralFlux < 0.3 && features.spectralFlux > 0.1) {
    scores.thought += 0.2;
  }
  
  // === NEUTRAL ===
  // Default when nothing stands out
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 0.3) {
    scores.neutral = 0.5;
  }
  
  // Normalize scores
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  for (const key of Object.keys(scores) as Emotion[]) {
    scores[key] /= total;
  }
  
  // Find primary emotion
  let primary: Emotion = 'neutral';
  let maxVal = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxVal) {
      maxVal = score;
      primary = emotion as Emotion;
    }
  }
  
  // Calculate confidence based on how dominant the primary emotion is
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const confidence = sortedScores[0] - (sortedScores[1] || 0);
  
  return {
    primary,
    intensity: maxVal,
    confidence,
    scores,
  };
}

// Get visual parameters based on emotion
export function getEmotionVisuals(emotion: EmotionState): EmotionVisuals {
  const visualPresets: Record<Emotion, EmotionVisuals> = {
    calm: {
      floraType: 'mossy',
      floraColors: ['#2d5a27', '#4a7c4e', '#6b8f6b', '#8fb28f'],
      skyColors: ['#1a1a2e', '#16213e', '#0f3460'],
      fogDensity: 0.02,
      fogColor: '#1a2a3a',
      particleType: 'fireflies',
      particleColor: '#fde047',
      particleIntensity: 0.5,
      ambientColor: '#4a5568',
      sunColor: '#90cdf4',
      sunIntensity: 0.6,
    },
    anger: {
      floraType: 'thorny',
      floraColors: ['#4a1515', '#6b2121', '#8b2c2c', '#2d2d2d'],
      skyColors: ['#2d1515', '#4a1a1a', '#1a0a0a'],
      fogDensity: 0.04,
      fogColor: '#2d1515',
      particleType: 'sparks',
      particleColor: '#f97316',
      particleIntensity: 1.2,
      ambientColor: '#7f1d1d',
      sunColor: '#f97316',
      sunIntensity: 1.2,
    },
    joy: {
      floraType: 'flowering',
      floraColors: ['#68d391', '#fde047', '#f472b6', '#a78bfa'],
      skyColors: ['#fef3c7', '#fed7aa', '#fecaca'],
      fogDensity: 0.01,
      fogColor: '#fffbeb',
      particleType: 'pollen',
      particleColor: '#fde047',
      particleIntensity: 1.0,
      ambientColor: '#fef3c7',
      sunColor: '#fbbf24',
      sunIntensity: 1.5,
    },
    sadness: {
      floraType: 'willow',
      floraColors: ['#374151', '#4b5563', '#6b7280', '#2d3748'],
      skyColors: ['#1f2937', '#374151', '#1a202c'],
      fogDensity: 0.06,
      fogColor: '#374151',
      particleType: 'rain',
      particleColor: '#93c5fd',
      particleIntensity: 0.8,
      ambientColor: '#4b5563',
      sunColor: '#9ca3af',
      sunIntensity: 0.4,
    },
    thought: {
      floraType: 'crystal',
      floraColors: ['#818cf8', '#a78bfa', '#c4b5fd', '#e0e7ff'],
      skyColors: ['#1e1b4b', '#312e81', '#3730a3'],
      fogDensity: 0.03,
      fogColor: '#1e1b4b',
      particleType: 'dust',
      particleColor: '#c4b5fd',
      particleIntensity: 0.6,
      ambientColor: '#4c1d95',
      sunColor: '#a78bfa',
      sunIntensity: 0.8,
    },
    neutral: {
      floraType: 'standard',
      floraColors: ['#4a7c4e', '#5a8a5e', '#6b9b6b', '#7cac7c'],
      skyColors: ['#0a0a0f', '#12121a', '#1a1a24'],
      fogDensity: 0.02,
      fogColor: '#1a1a24',
      particleType: 'dust',
      particleColor: '#a0aec0',
      particleIntensity: 0.3,
      ambientColor: '#4a5568',
      sunColor: '#e2e8f0',
      sunIntensity: 0.7,
    },
  };
  
  return visualPresets[emotion.primary];
}

// Smooth emotion transition over time
export class EmotionSmoother {
  private currentState: EmotionState;
  private targetState: EmotionState;
  private smoothingFactor: number;
  
  constructor(initialEmotion: Emotion = 'neutral', smoothing: number = 0.1) {
    this.smoothingFactor = smoothing;
    this.currentState = this.createEmotionState(initialEmotion);
    this.targetState = this.currentState;
  }
  
  private createEmotionState(emotion: Emotion): EmotionState {
    const scores = {
      calm: 0,
      anger: 0,
      joy: 0,
      sadness: 0,
      thought: 0,
      neutral: 0,
    };
    scores[emotion] = 1;
    
    return {
      primary: emotion,
      intensity: 1,
      confidence: 1,
      scores,
    };
  }
  
  update(newState: EmotionState): EmotionState {
    this.targetState = newState;
    
    // Smooth each score
    for (const key of Object.keys(this.currentState.scores) as Emotion[]) {
      this.currentState.scores[key] += 
        (this.targetState.scores[key] - this.currentState.scores[key]) * this.smoothingFactor;
    }
    
    // Recalculate primary emotion
    let maxScore = 0;
    let primary: Emotion = 'neutral';
    for (const [emotion, score] of Object.entries(this.currentState.scores)) {
      if (score > maxScore) {
        maxScore = score;
        primary = emotion as Emotion;
      }
    }
    
    this.currentState.primary = primary;
    this.currentState.intensity += 
      (this.targetState.intensity - this.currentState.intensity) * this.smoothingFactor;
    this.currentState.confidence += 
      (this.targetState.confidence - this.currentState.confidence) * this.smoothingFactor;
    
    return this.currentState;
  }
  
  get state(): EmotionState {
    return this.currentState;
  }
}

// Emotion color palette
export const EMOTION_COLORS: Record<Emotion, { primary: string; secondary: string; accent: string }> = {
  calm: { primary: '#14b8a6', secondary: '#5eead4', accent: '#99f6e4' },
  anger: { primary: '#f43f5e', secondary: '#fb7185', accent: '#fda4af' },
  joy: { primary: '#eab308', secondary: '#facc15', accent: '#fde047' },
  sadness: { primary: '#0ea5e9', secondary: '#38bdf8', accent: '#7dd3fc' },
  thought: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd' },
  neutral: { primary: '#64748b', secondary: '#94a3b8', accent: '#cbd5e1' },
};

// Get emoji for emotion
export const EMOTION_EMOJIS: Record<Emotion, string> = {
  calm: '😌',
  anger: '😤',
  joy: '😄',
  sadness: '😢',
  thought: '🤔',
  neutral: '😐',
};
