// Camera Effects Hook
// Audio-reactive camera shake, pulse and movement

import { useRef, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion } from './useGarden';

interface ShakeConfig {
  intensity: number;      // Base shake intensity
  decay: number;          // How fast shake decays
  frequency: number;      // Shake speed
  maxOffset: number;      // Maximum position offset
  bassMultiplier: number; // Bass influence
  beatTrigger: boolean;   // Shake on beat
}

interface PulseConfig {
  strength: number;       // FOV pulse strength
  speed: number;          // Pulse speed
  bassInfluence: number;  // Bass -> FOV
  energyInfluence: number; // Energy -> zoom
}

const DEFAULT_SHAKE: ShakeConfig = {
  intensity: 0.5,
  decay: 0.95,
  frequency: 20,
  maxOffset: 0.1,
  bassMultiplier: 2,
  beatTrigger: true,
};

const DEFAULT_PULSE: PulseConfig = {
  strength: 5,
  speed: 1,
  bassInfluence: 0.5,
  energyInfluence: 0.3,
};

// Camera shake hook
export function useCameraShake(config: Partial<ShakeConfig> = {}) {
  const fullConfig = { ...DEFAULT_SHAKE, ...config };
  const audioFeatures = useAudioFeatures();
  const { camera } = useThree();
  
  const shakeRef = useRef({
    intensity: 0,
    offset: new THREE.Vector3(),
    originalPosition: camera.position.clone(),
  });
  
  const lastBeatRef = useRef(false);
  
  // Trigger shake
  const triggerShake = useCallback((intensity: number = 1) => {
    shakeRef.current.intensity = Math.min(
      fullConfig.intensity * intensity,
      1
    );
  }, [fullConfig.intensity]);
  
  // Update shake each frame
  useFrame((state, delta) => {
    const shake = shakeRef.current;
    const time = state.clock.getElapsedTime();
    const bass = audioFeatures?.bass ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Trigger on beat
    if (fullConfig.beatTrigger && beat && !lastBeatRef.current) {
      triggerShake(bass * fullConfig.bassMultiplier);
    }
    lastBeatRef.current = beat;
    
    // Decay shake
    shake.intensity *= fullConfig.decay;
    
    // Calculate shake offset
    if (shake.intensity > 0.001) {
      const freq = fullConfig.frequency;
      const max = fullConfig.maxOffset * shake.intensity;
      
      shake.offset.set(
        Math.sin(time * freq * 1.1) * max,
        Math.sin(time * freq * 1.3) * max,
        Math.sin(time * freq * 0.9) * max * 0.5
      );
      
      // Apply to camera (additive)
      camera.position.add(shake.offset);
    }
  });
  
  return { triggerShake };
}

// Camera FOV pulse hook
export function useCameraPulse(config: Partial<PulseConfig> = {}) {
  const fullConfig = { ...DEFAULT_PULSE, ...config };
  const audioFeatures = useAudioFeatures();
  const { camera } = useThree();
  
  const originalFOV = useRef(
    camera instanceof THREE.PerspectiveCamera ? camera.fov : 75
  );
  
  useFrame((state) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    
    const time = state.clock.getElapsedTime();
    const bass = audioFeatures?.bass ?? 0;
    const energy = audioFeatures?.energy ?? 0;
    
    // Calculate FOV offset
    const basePulse = Math.sin(time * fullConfig.speed * Math.PI * 2) * 0.5 + 0.5;
    const bassEffect = bass * fullConfig.strength * fullConfig.bassInfluence;
    const energyEffect = energy * fullConfig.strength * fullConfig.energyInfluence;
    
    // Apply to camera
    const targetFOV = originalFOV.current + basePulse * (bassEffect + energyEffect);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
    camera.updateProjectionMatrix();
  });
}

// Combined camera effects
export default function useCameraEffects(
  shakeConfig?: Partial<ShakeConfig>,
  pulseConfig?: Partial<PulseConfig>
) {
  const shake = useCameraShake(shakeConfig);
  useCameraPulse(pulseConfig);
  
  return shake;
}

// Camera follow hook for garden exploration
export function useCameraFollow(
  target: THREE.Vector3 | null,
  options: {
    offset?: THREE.Vector3;
    smoothing?: number;
    lookAt?: boolean;
  } = {}
) {
  const { camera } = useThree();
  const {
    offset = new THREE.Vector3(0, 5, 10),
    smoothing = 0.05,
    lookAt = true,
  } = options;
  
  useFrame(() => {
    if (!target) return;
    
    const targetPosition = target.clone().add(offset);
    camera.position.lerp(targetPosition, smoothing);
    
    if (lookAt) {
      camera.lookAt(target);
    }
  });
}

// Camera orbit with audio influence
export function useCameraOrbit(
  options: {
    radius?: number;
    speed?: number;
    audioInfluence?: number;
    heightVariation?: number;
  } = {}
) {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const { camera } = useThree();
  
  const {
    radius = 15,
    speed = 0.1,
    audioInfluence = 0.5,
    heightVariation = 2,
  } = options;
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy ?? 0;
    const bass = audioFeatures?.bass ?? 0;
    
    // Base orbit
    let currentSpeed = speed;
    
    // Audio-reactive speed
    currentSpeed *= 1 + energy * audioInfluence;
    
    // Emotion-based orbit
    if (emotion?.primary === 'calm') {
      currentSpeed *= 0.5;
    } else if (emotion?.primary === 'anger') {
      currentSpeed *= 1.5;
    }
    
    const angle = time * currentSpeed;
    const currentRadius = radius + bass * 2;
    const height = 5 + Math.sin(time * 0.5) * heightVariation;
    
    camera.position.set(
      Math.cos(angle) * currentRadius,
      height,
      Math.sin(angle) * currentRadius
    );
    
    camera.lookAt(0, 0, 0);
  });
}
