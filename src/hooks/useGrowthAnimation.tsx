// Growth Animation System
// Real-time procedural growth with audio influence

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GrowthState, DEFAULT_GROWTH, interpolateGrowth } from '../flora/types';
import { useAudioFeatures, useEmotion } from './useGarden';

export interface GrowthConfig {
  // Speed
  baseSpeed: number;        // Base growth speed (0-1 per second)
  audioSpeedMultiplier: number;  // How much audio affects speed
  
  // Stages
  germinationDuration: number;   // Seconds
  stemGrowthDuration: number;
  branchingDuration: number;
  leafingDuration: number;
  floweringDuration: number;
  
  // Audio influence
  bassInfluence: number;    // Bass -> trunk/stems
  midsInfluence: number;    // Mids -> branches/leaves
  trebleInfluence: number;  // Treble -> flowers/particles
  energyInfluence: number;  // Overall energy -> growth speed
  
  // Triggers
  bloomOnBeat: boolean;     // Sudden flower bloom on beat
  silenceGrowth: boolean;   // Accelerate during silence
}

const DEFAULT_GROWTH_CONFIG: GrowthConfig = {
  baseSpeed: 0.05,
  audioSpeedMultiplier: 2,
  germinationDuration: 2,
  stemGrowthDuration: 4,
  branchingDuration: 3,
  leafingDuration: 3,
  floweringDuration: 5,
  bassInfluence: 0.8,
  midsInfluence: 0.6,
  trebleInfluence: 0.4,
  energyInfluence: 1.0,
  bloomOnBeat: true,
  silenceGrowth: true,
};

// Hook for managing growth animation
export function useGrowthAnimation(config: Partial<GrowthConfig> = {}) {
  const fullConfig = { ...DEFAULT_GROWTH_CONFIG, ...config };
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const growthRef = useRef<GrowthState>({ ...DEFAULT_GROWTH });
  const targetGrowthRef = useRef<GrowthState>({ ...DEFAULT_GROWTH });
  const timeRef = useRef(0);
  const lastBeatRef = useRef(false);
  
  // Calculate growth speed based on audio
  const getGrowthSpeed = useCallback(() => {
    const energy = audioFeatures?.energy ?? 0;
    const bass = audioFeatures?.bass ?? 0;
    
    let speed = fullConfig.baseSpeed;
    
    // Audio influence
    speed *= 1 + energy * fullConfig.energyInfluence;
    
    // Silence boost
    if (fullConfig.silenceGrowth && energy < 0.1) {
      speed *= 1.5;
    }
    
    // Emotion influence
    if (emotion?.primary === 'calm') {
      speed *= 0.8; // Slower, more peaceful growth
    } else if (emotion?.primary === 'anger') {
      speed *= 1.3; // Faster, aggressive growth
    } else if (emotion?.primary === 'joy') {
      speed *= 1.2; // Lively growth
    }
    
    return speed;
  }, [audioFeatures, emotion, fullConfig]);
  
  // Update function to call in useFrame
  const updateGrowth = useCallback((delta: number) => {
    const speed = getGrowthSpeed();
    timeRef.current += delta * speed;
    
    const bass = audioFeatures?.bass ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const beat = audioFeatures?.beat ?? false;
    const energy = audioFeatures?.energy ?? 0;
    
    const time = timeRef.current;
    const config = fullConfig;
    
    // Calculate target growth stages based on time
    const germinationEnd = config.germinationDuration;
    const stemEnd = germinationEnd + config.stemGrowthDuration;
    const branchEnd = stemEnd + config.branchingDuration;
    const leafEnd = branchEnd + config.leafingDuration;
    const flowerEnd = leafEnd + config.floweringDuration;
    
    // Update target growth state
    targetGrowthRef.current = {
      germination: Math.min(1, time / germinationEnd),
      stemGrowth: time > germinationEnd 
        ? Math.min(1, (time - germinationEnd) / config.stemGrowthDuration)
        : 0,
      branching: time > stemEnd 
        ? Math.min(1, (time - stemEnd) / config.branchingDuration)
        : 0,
      leafing: time > branchEnd 
        ? Math.min(1, (time - branchEnd) / config.leafingDuration)
        : 0,
      flowering: time > leafEnd 
        ? Math.min(1, (time - leafEnd) / config.floweringDuration)
        : 0,
      withering: 0,
      audioInfluence: energy,
    };
    
    // Apply audio modulation to growth
    const target = targetGrowthRef.current;
    
    // Bass boosts stem and trunk
    target.stemGrowth = Math.min(1, target.stemGrowth * (1 + bass * config.bassInfluence));
    
    // Mids boost branching and leaves
    target.branching = Math.min(1, target.branching * (1 + mids * config.midsInfluence));
    target.leafing = Math.min(1, target.leafing * (1 + mids * config.midsInfluence));
    
    // Treble boosts flowering
    target.flowering = Math.min(1, target.flowering * (1 + treble * config.trebleInfluence));
    
    // Beat triggers instant bloom
    if (config.bloomOnBeat && beat && !lastBeatRef.current && target.flowering > 0.5) {
      target.flowering = 1;
    }
    lastBeatRef.current = beat;
    
    // Smooth interpolation
    growthRef.current = interpolateGrowth(growthRef.current, target, 0.1);
    
    return growthRef.current;
  }, [audioFeatures, fullConfig, getGrowthSpeed]);
  
  // Reset growth
  const resetGrowth = useCallback(() => {
    timeRef.current = 0;
    growthRef.current = { ...DEFAULT_GROWTH };
    targetGrowthRef.current = { ...DEFAULT_GROWTH };
  }, []);
  
  // Skip to specific stage
  const skipToStage = useCallback((stage: keyof GrowthState) => {
    const config = fullConfig;
    
    switch (stage) {
      case 'germination':
        timeRef.current = 0;
        break;
      case 'stemGrowth':
        timeRef.current = config.germinationDuration;
        break;
      case 'branching':
        timeRef.current = config.germinationDuration + config.stemGrowthDuration;
        break;
      case 'leafing':
        timeRef.current = config.germinationDuration + config.stemGrowthDuration + config.branchingDuration;
        break;
      case 'flowering':
        timeRef.current = config.germinationDuration + config.stemGrowthDuration + 
                         config.branchingDuration + config.leafingDuration;
        break;
    }
  }, [fullConfig]);
  
  return {
    growth: growthRef.current,
    updateGrowth,
    resetGrowth,
    skipToStage,
    getGrowthSpeed,
  };
}

// Component wrapper for growth animation
interface GrowingFloraProps {
  FloraComponent: React.ComponentType<any>;
  floraProps?: Record<string, any>;
  growthConfig?: Partial<GrowthConfig>;
  position?: [number, number, number];
  scale?: number;
  autoStart?: boolean;
  delay?: number;
}

export function GrowingFlora({
  FloraComponent,
  floraProps = {},
  growthConfig,
  position = [0, 0, 0],
  scale = 1,
  autoStart = true,
  delay = 0,
}: GrowingFloraProps) {
  const { growth, updateGrowth, resetGrowth } = useGrowthAnimation(growthConfig);
  const startedRef = useRef(false);
  const delayRef = useRef(delay);
  
  useFrame((_, delta) => {
    if (!autoStart) return;
    
    // Handle delay
    if (delayRef.current > 0) {
      delayRef.current -= delta;
      return;
    }
    
    if (!startedRef.current) {
      resetGrowth();
      startedRef.current = true;
    }
    
    updateGrowth(delta);
  });
  
  // Don't render until germination starts
  if (growth.germination < 0.1) {
    return null;
  }
  
  // Scale based on germination
  const currentScale = scale * Math.max(0.1, growth.germination);
  
  return (
    <FloraComponent
      {...floraProps}
      position={position}
      scale={currentScale}
      growth={growth}
    />
  );
}

// Staggered growth for multiple flora
export function useStaggeredGrowth(count: number, staggerDelay: number = 0.5) {
  const delays = useMemo(() => {
    return Array.from({ length: count }, (_, i) => i * staggerDelay);
  }, [count, staggerDelay]);
  
  return delays;
}

// Seasonal growth modifier
export function useSeasonalGrowth(season: 'spring' | 'summer' | 'autumn' | 'winter') {
  return useMemo(() => {
    switch (season) {
      case 'spring':
        return {
          germination: 1.2,
          stemGrowth: 1.1,
          leafing: 1.3,
          flowering: 1.5,
        };
      case 'summer':
        return {
          germination: 1.0,
          stemGrowth: 1.0,
          leafing: 1.0,
          flowering: 1.0,
        };
      case 'autumn':
        return {
          germination: 0.5,
          stemGrowth: 0.7,
          leafing: 0.6,
          flowering: 0.3,
          withering: 1.5,
        };
      case 'winter':
        return {
          germination: 0.2,
          stemGrowth: 0.3,
          leafing: 0.1,
          flowering: 0,
          withering: 2.0,
        };
    }
  }, [season]);
}

export default useGrowthAnimation;
