// Emotion to Flora Mapping
// Defines which flora types appear for each emotion

import { Emotion } from '../engine/SentimentEngine';
import { FloraType, FloraConfig } from './types';

export interface EmotionFloraSet {
  primary: FloraType[];
  secondary: FloraType[];
  accent: FloraType[];
  particles: 'fireflies' | 'sparks' | 'pollen' | 'rain' | 'snow' | 'petals' | 'spores';
  colorPalette: string[];
  specialEffect?: string;
}

export const FLORA_EMOTION_MAP: Record<Emotion, EmotionFloraSet> = {
  calm: {
    primary: ['willow', 'lotus'],
    secondary: ['moss', 'fern'],
    accent: ['bioluminescent'],
    particles: 'fireflies',
    colorPalette: ['#2d5a27', '#5eead4', '#0d9488', '#134e4a'],
    specialEffect: 'fireflies',
  },
  
  anger: {
    primary: ['baobab', 'thorny'],
    secondary: ['pine'],
    accent: ['mushroom'],
    particles: 'sparks',
    colorPalette: ['#dc2626', '#f97316', '#7f1d1d', '#2d2d2d'],
    specialEffect: 'lightning',
  },
  
  joy: {
    primary: ['cherry', 'sunflower'],
    secondary: ['rose', 'orchid'],
    accent: ['bioluminescent'],
    particles: 'pollen',
    colorPalette: ['#fde047', '#f472b6', '#fb923c', '#84cc16'],
    specialEffect: 'rainbow',
  },
  
  sadness: {
    primary: ['willow'],
    secondary: ['moss', 'fern'],
    accent: ['orchid'],
    particles: 'rain',
    colorPalette: ['#6b7280', '#93c5fd', '#3b82f6', '#1e3a5f'],
    specialEffect: 'rain',
  },
  
  thought: {
    primary: ['crystal'],
    secondary: ['lotus', 'fern'],
    accent: ['bioluminescent'],
    particles: 'spores',
    colorPalette: ['#a78bfa', '#8b5cf6', '#312e81', '#e0e7ff'],
    specialEffect: 'shimmer',
  },
  
  neutral: {
    primary: ['oak', 'pine'],
    secondary: ['fern', 'moss'],
    accent: ['rose'],
    particles: 'pollen',
    colorPalette: ['#4a3728', '#48bb78', '#68d391', '#9ca3af'],
    specialEffect: undefined,
  },
};

// Get flora configuration for an emotion
export function getFloraForEmotion(
  emotion: Emotion,
  intensity: number = 0.5
): {
  types: FloraType[];
  config: Partial<FloraConfig>;
} {
  const emotionSet = FLORA_EMOTION_MAP[emotion];
  
  // Mix primary and secondary based on intensity
  const types: FloraType[] = [];
  
  // Higher intensity = more primary flora
  const primaryCount = Math.ceil(intensity * 3);
  const secondaryCount = Math.ceil((1 - intensity) * 2);
  
  for (let i = 0; i < primaryCount && i < emotionSet.primary.length; i++) {
    types.push(emotionSet.primary[i]);
  }
  
  for (let i = 0; i < secondaryCount && i < emotionSet.secondary.length; i++) {
    types.push(emotionSet.secondary[i]);
  }
  
  // Always add one accent
  if (emotionSet.accent.length > 0) {
    types.push(emotionSet.accent[0]);
  }
  
  return {
    types,
    config: {
      colors: {
        primary: emotionSet.colorPalette[0],
        secondary: emotionSet.colorPalette[1],
        accent: emotionSet.colorPalette[2],
        highlight: emotionSet.colorPalette[3],
      },
      particle: {
        type: emotionSet.particles === 'fireflies' ? 'glow' :
              emotionSet.particles === 'sparks' ? 'sparkle' :
              emotionSet.particles === 'rain' ? 'sparkle' :
              emotionSet.particles === 'petals' ? 'petals' : 'pollen',
        color: emotionSet.colorPalette[2],
        rate: intensity,
      },
    },
  };
}

// Blend between two emotion states
export function blendEmotionFlora(
  fromEmotion: Emotion,
  toEmotion: Emotion,
  progress: number
): EmotionFloraSet {
  const from = FLORA_EMOTION_MAP[fromEmotion];
  const to = FLORA_EMOTION_MAP[toEmotion];
  
  // During transition, mix flora types
  const mixedPrimary = progress < 0.5 ? from.primary : to.primary;
  const mixedSecondary = [...from.secondary, ...to.secondary].slice(0, 2);
  
  // Blend colors
  const blendedPalette = from.colorPalette.map((color, i) => {
    // Simple color lerp (would need proper color interpolation)
    return progress < 0.5 ? color : to.colorPalette[i];
  });
  
  return {
    primary: mixedPrimary,
    secondary: mixedSecondary,
    accent: progress < 0.5 ? from.accent : to.accent,
    particles: progress < 0.5 ? from.particles : to.particles,
    colorPalette: blendedPalette,
    specialEffect: progress < 0.5 ? from.specialEffect : to.specialEffect,
  };
}

// Season modifiers for flora
export const SEASON_MODIFIERS: Record<string, {
  leafingMultiplier: number;
  floweringMultiplier: number;
  colorShift: string;
}> = {
  spring: {
    leafingMultiplier: 1.2,
    floweringMultiplier: 1.5,
    colorShift: '#84cc16', // Bright green
  },
  summer: {
    leafingMultiplier: 1.0,
    floweringMultiplier: 1.0,
    colorShift: '#22c55e', // Full green
  },
  autumn: {
    leafingMultiplier: 0.7,
    floweringMultiplier: 0.3,
    colorShift: '#f59e0b', // Orange/yellow
  },
  winter: {
    leafingMultiplier: 0.2,
    floweringMultiplier: 0,
    colorShift: '#94a3b8', // Grey
  },
};
