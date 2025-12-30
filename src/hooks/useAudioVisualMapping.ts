// Audio-Visual Mapping System
// Connects audio features to visual parameters

import { useMemo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion, useGardenStore } from './useGarden';

// === Mapping Types ===

export type VisualTarget = 
  | 'trunk' | 'branches' | 'leaves' | 'flowers' | 'roots'
  | 'particles' | 'camera' | 'light' | 'fog' | 'sky'
  | 'growth' | 'color' | 'emission' | 'scale' | 'rotation';

export type VisualEffect = 
  | 'thickness' | 'count' | 'density' | 'bloom' | 'intensity'
  | 'shake' | 'pulse' | 'sway' | 'color' | 'brightness'
  | 'scale' | 'speed' | 'opacity' | 'position' | 'rotation';

export type AudioFeature = 
  | 'bass' | 'lowMids' | 'mids' | 'highMids' | 'treble'
  | 'energy' | 'beat' | 'silence' | 'spectralCentroid' | 'spectralFlux';

export interface AudioVisualMapping {
  source: AudioFeature;
  target: VisualTarget;
  effect: VisualEffect;
  multiplier: number;
  threshold?: number;
  duration?: number;
  smoothing?: number;
  invert?: boolean;
}

// === Default Mappings ===

export const DEFAULT_MAPPINGS: AudioVisualMapping[] = [
  // Frequency -> Flora
  { source: 'bass', target: 'trunk', effect: 'thickness', multiplier: 1.5 },
  { source: 'bass', target: 'roots', effect: 'scale', multiplier: 1.3 },
  { source: 'lowMids', target: 'branches', effect: 'count', multiplier: 1.2 },
  { source: 'mids', target: 'leaves', effect: 'density', multiplier: 1.3 },
  { source: 'highMids', target: 'flowers', effect: 'bloom', multiplier: 2.0 },
  { source: 'treble', target: 'particles', effect: 'intensity', multiplier: 3.0 },
  
  // Derived -> Effects
  { source: 'beat', target: 'camera', effect: 'shake', multiplier: 1.0, duration: 100 },
  { source: 'beat', target: 'flowers', effect: 'pulse', multiplier: 1.5, duration: 150 },
  { source: 'beat', target: 'leaves', effect: 'sway', multiplier: 2.0, duration: 200 },
  { source: 'energy', target: 'light', effect: 'intensity', multiplier: 1.5 },
  { source: 'energy', target: 'fog', effect: 'opacity', multiplier: 0.5, invert: true },
  { source: 'silence', target: 'growth', effect: 'speed', multiplier: 1.5 },
  
  // Spectral -> Atmosphere
  { source: 'spectralCentroid', target: 'light', effect: 'color', multiplier: 1.0 },
  { source: 'spectralFlux', target: 'particles', effect: 'speed', multiplier: 2.0 },
];

// === Mapping State ===

interface MappingState {
  [key: string]: {
    currentValue: number;
    targetValue: number;
    velocity: number;
    lastBeatTime: number;
    accumulated: number;
  };
}

// === Main Hook ===

export function useAudioVisualMapping(
  customMappings: AudioVisualMapping[] = [],
  options: { smoothing?: number; sensitivity?: number } = {}
) {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const settings = useGardenStore((state) => state.settings);
  
  const { smoothing = 0.1, sensitivity = 1 } = options;
  const stateRef = useRef<MappingState>({});
  const outputRef = useRef<Record<string, number>>({});
  
  // Combine default and custom mappings
  const allMappings = useMemo(() => {
    return [...DEFAULT_MAPPINGS, ...customMappings];
  }, [customMappings]);
  
  // Get audio feature value
  const getFeatureValue = useCallback((feature: AudioFeature): number => {
    if (!audioFeatures) return 0;
    
    switch (feature) {
      case 'bass': return audioFeatures.bass;
      case 'lowMids': return audioFeatures.lowMids;
      case 'mids': return audioFeatures.mids;
      case 'highMids': return audioFeatures.highMids;
      case 'treble': return audioFeatures.treble;
      case 'energy': return audioFeatures.energy;
      case 'beat': return audioFeatures.beat ? 1 : 0;
      case 'silence': return audioFeatures.energy < 0.05 ? 1 : 0;
      case 'spectralCentroid': return audioFeatures.spectralCentroid;
      case 'spectralFlux': return audioFeatures.spectralFlux;
      default: return 0;
    }
  }, [audioFeatures]);
  
  // Process mappings
  const processMapping = useCallback((mapping: AudioVisualMapping, delta: number) => {
    const key = `${mapping.source}-${mapping.target}-${mapping.effect}`;
    
    // Initialize state if needed
    if (!stateRef.current[key]) {
      stateRef.current[key] = {
        currentValue: 0,
        targetValue: 0,
        velocity: 0,
        lastBeatTime: 0,
        accumulated: 0,
      };
    }
    
    const state = stateRef.current[key];
    const now = performance.now();
    
    // Get raw feature value
    let featureValue = getFeatureValue(mapping.source);
    
    // Apply threshold
    if (mapping.threshold !== undefined && featureValue < mapping.threshold) {
      featureValue = 0;
    }
    
    // Apply inversion
    if (mapping.invert) {
      featureValue = 1 - featureValue;
    }
    
    // Apply multiplier and sensitivity
    const targetValue = featureValue * mapping.multiplier * sensitivity * settings.audioSensitivity;
    
    // Handle beat-triggered effects
    if (mapping.source === 'beat' && featureValue > 0.5) {
      state.lastBeatTime = now;
    }
    
    // Apply duration decay for beat effects
    if (mapping.duration && state.lastBeatTime > 0) {
      const elapsed = now - state.lastBeatTime;
      if (elapsed < mapping.duration) {
        const decay = 1 - (elapsed / mapping.duration);
        state.targetValue = targetValue * decay;
      } else {
        state.targetValue = 0;
      }
    } else {
      state.targetValue = targetValue;
    }
    
    // Smooth interpolation
    const effectiveSmoothing = mapping.smoothing ?? smoothing;
    state.currentValue = THREE.MathUtils.lerp(
      state.currentValue,
      state.targetValue,
      effectiveSmoothing
    );
    
    return state.currentValue;
  }, [getFeatureValue, sensitivity, settings.audioSensitivity, smoothing]);
  
  // Update all mappings
  const update = useCallback((delta: number) => {
    const output: Record<string, number> = {};
    
    allMappings.forEach((mapping) => {
      const key = `${mapping.target}_${mapping.effect}`;
      const value = processMapping(mapping, delta);
      
      // Accumulate values for same target/effect
      output[key] = (output[key] ?? 0) + value;
    });
    
    outputRef.current = output;
    return output;
  }, [allMappings, processMapping]);
  
  // Get specific mapping value
  const getValue = useCallback((target: VisualTarget, effect: VisualEffect): number => {
    const key = `${target}_${effect}`;
    return outputRef.current[key] ?? 0;
  }, []);
  
  // Get all values for a target
  const getTargetValues = useCallback((target: VisualTarget): Record<string, number> => {
    const result: Record<string, number> = {};
    
    Object.entries(outputRef.current).forEach(([key, value]) => {
      if (key.startsWith(`${target}_`)) {
        const effect = key.replace(`${target}_`, '');
        result[effect] = value;
      }
    });
    
    return result;
  }, []);
  
  return {
    update,
    getValue,
    getTargetValues,
    output: outputRef.current,
  };
}

// === Convenience Hooks ===

// Hook for flora-specific mappings
export function useFloraMapping() {
  const mapping = useAudioVisualMapping();
  
  useFrame((_, delta) => {
    mapping.update(delta);
  });
  
  return {
    trunk: mapping.getTargetValues('trunk'),
    branches: mapping.getTargetValues('branches'),
    leaves: mapping.getTargetValues('leaves'),
    flowers: mapping.getTargetValues('flowers'),
    roots: mapping.getTargetValues('roots'),
  };
}

// Hook for environment mappings
export function useEnvironmentMapping() {
  const mapping = useAudioVisualMapping();
  
  useFrame((_, delta) => {
    mapping.update(delta);
  });
  
  return {
    light: mapping.getTargetValues('light'),
    fog: mapping.getTargetValues('fog'),
    sky: mapping.getTargetValues('sky'),
    particles: mapping.getTargetValues('particles'),
    camera: mapping.getTargetValues('camera'),
  };
}

// === Preset Mappings ===

export const MAPPING_PRESETS = {
  subtle: {
    sensitivity: 0.5,
    smoothing: 0.2,
  },
  responsive: {
    sensitivity: 1.0,
    smoothing: 0.1,
  },
  intense: {
    sensitivity: 2.0,
    smoothing: 0.05,
  },
  musical: {
    sensitivity: 1.5,
    smoothing: 0.15,
    customMappings: [
      { source: 'beat', target: 'flowers', effect: 'pulse', multiplier: 2.5, duration: 200 },
      { source: 'bass', target: 'trunk', effect: 'scale', multiplier: 1.8 },
    ] as AudioVisualMapping[],
  },
  ambient: {
    sensitivity: 0.7,
    smoothing: 0.3,
    customMappings: [
      { source: 'energy', target: 'particles', effect: 'intensity', multiplier: 1.0 },
      { source: 'mids', target: 'leaves', effect: 'sway', multiplier: 0.5 },
    ] as AudioVisualMapping[],
  },
};

export default useAudioVisualMapping;
