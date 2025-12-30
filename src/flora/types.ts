// Flora Type Definitions and Interfaces

import { Emotion } from '../engine/SentimentEngine';

export interface GrowthState {
  germination: number;    // 0-1 seed opening
  stemGrowth: number;     // 0-1 stem elongation
  branching: number;      // 0-1 branch formation
  leafing: number;        // 0-1 leaf growth
  flowering: number;      // 0-1 flower blooming
  withering: number;      // 0-1 decay state
  audioInfluence: number; // Audio effect multiplier
}

export interface FloraProps {
  position?: [number, number, number];
  scale?: number;
  seed?: number;
  growth?: Partial<GrowthState>;
  audioReactive?: boolean;
  emotion?: Emotion;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  onClick?: () => void;
}

export type FloraType = 
  // Trees
  | 'oak' | 'willow' | 'pine' | 'cherry' | 'baobab' | 'crystal'
  // Flowers
  | 'rose' | 'lotus' | 'sunflower' | 'orchid'
  // Plants
  | 'fern' | 'moss' | 'vine' | 'mushroom'
  // Special
  | 'bioluminescent' | 'thorny';

export interface FloraConfig {
  type: FloraType;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    highlight?: string;
  };
  growth: {
    speed: number;
    maxHeight: number;
    branchingFactor: number;
  };
  audio: {
    bassResponse: number;
    trebleResponse: number;
    beatResponse: number;
  };
  particle?: {
    type: 'pollen' | 'sparkle' | 'glow' | 'petals' | 'spores';
    color: string;
    rate: number;
  };
}

// Default growth state
export const DEFAULT_GROWTH: GrowthState = {
  germination: 1,
  stemGrowth: 1,
  branching: 1,
  leafing: 1,
  flowering: 0,
  withering: 0,
  audioInfluence: 1,
};

// Seeded random for consistent generation
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Interpolate growth over time
export function interpolateGrowth(
  from: GrowthState,
  to: GrowthState,
  progress: number
): GrowthState {
  const lerp = (a: number, b: number) => a + (b - a) * progress;
  
  return {
    germination: lerp(from.germination, to.germination),
    stemGrowth: lerp(from.stemGrowth, to.stemGrowth),
    branching: lerp(from.branching, to.branching),
    leafing: lerp(from.leafing, to.leafing),
    flowering: lerp(from.flowering, to.flowering),
    withering: lerp(from.withering, to.withering),
    audioInfluence: lerp(from.audioInfluence, to.audioInfluence),
  };
}
