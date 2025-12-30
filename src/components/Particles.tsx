// Particles Component
// Various particle effects: fireflies, pollen, rain, snow, sparks

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion, useSeason } from '../hooks/useGarden';

export type ParticleType = 'fireflies' | 'pollen' | 'rain' | 'snow' | 'sparks' | 'leaves' | 'dust';

interface ParticlesProps {
  type?: ParticleType;
  count?: number;
  spread?: number;
  color?: string;
  audioReactive?: boolean;
}

export function Particles({
  type = 'fireflies',
  count = 100,
  spread = 30,
  color,
  audioReactive = true,
}: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const season = useSeason();
  
  // Get particle color based on type and emotion
  const particleColor = useMemo(() => {
    if (color) return color;
    
    const emotionColors: Record<string, string> = {
      anger: '#f97316',
      joy: '#fde047',
      sadness: '#93c5fd',
      calm: '#5eead4',
      thought: '#c4b5fd',
      neutral: '#a0aec0',
    };
    
    if (emotion?.primary && emotionColors[emotion.primary]) {
      return emotionColors[emotion.primary];
    }
    
    const typeColors: Record<ParticleType, string> = {
      fireflies: '#fde047',
      pollen: '#fef3c7',
      rain: '#93c5fd',
      snow: '#ffffff',
      sparks: '#f97316',
      leaves: '#f59e0b',
      dust: '#d1d5db',
    };
    
    return typeColors[type];
  }, [type, color, emotion?.primary]);
  
  // Generate initial particle positions
  const { positions, velocities, phases, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = Math.random() * spread * 0.5;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;
      
      // Different velocity patterns per type
      switch (type) {
        case 'rain':
          velocities[i3] = (Math.random() - 0.5) * 0.5;
          velocities[i3 + 1] = -5 - Math.random() * 5;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
          break;
        case 'snow':
          velocities[i3] = (Math.random() - 0.5) * 0.5;
          velocities[i3 + 1] = -0.5 - Math.random() * 0.5;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
          break;
        case 'sparks':
          velocities[i3] = (Math.random() - 0.5) * 3;
          velocities[i3 + 1] = 2 + Math.random() * 3;
          velocities[i3 + 2] = (Math.random() - 0.5) * 3;
          break;
        case 'leaves':
          velocities[i3] = (Math.random() - 0.5) * 1;
          velocities[i3 + 1] = -0.3 - Math.random() * 0.3;
          velocities[i3 + 2] = (Math.random() - 0.5) * 1;
          break;
        default: // fireflies, pollen, dust
          velocities[i3] = (Math.random() - 0.5) * 0.2;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
      }
      
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 0.5 + Math.random() * 0.5;
    }
    
    return { positions, velocities, phases, sizes };
  }, [count, spread, type]);
  
  // Animation
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    const bass = audioReactive ? (audioFeatures?.bass ?? 0) : 0;
    const treble = audioReactive ? (audioFeatures?.treble ?? 0) : 0;
    const beat = audioReactive ? (audioFeatures?.beat ?? false) : false;
    
    const speedMultiplier = 1 + (beat ? bass * 2 : 0);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update positions based on type
      switch (type) {
        case 'fireflies':
          // Floating, glowing motion
          posArray[i3] += Math.sin(time * 0.5 + phases[i]) * 0.02;
          posArray[i3 + 1] += Math.sin(time * 0.3 + phases[i] * 1.5) * 0.01;
          posArray[i3 + 2] += Math.cos(time * 0.4 + phases[i] * 0.8) * 0.02;
          
          // Audio reactive burst
          if (beat) {
            posArray[i3] += (Math.random() - 0.5) * bass * 0.5;
            posArray[i3 + 1] += Math.random() * bass * 0.3;
            posArray[i3 + 2] += (Math.random() - 0.5) * bass * 0.5;
          }
          break;
          
        case 'pollen':
          // Gentle floating
          posArray[i3] += velocities[i3] * delta * 10 + Math.sin(time + phases[i]) * 0.01;
          posArray[i3 + 1] += Math.sin(time * 0.5 + phases[i]) * 0.02 + treble * 0.1;
          posArray[i3 + 2] += velocities[i3 + 2] * delta * 10 + Math.cos(time + phases[i]) * 0.01;
          break;
          
        case 'rain':
          posArray[i3] += velocities[i3] * delta * speedMultiplier;
          posArray[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier;
          posArray[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier;
          
          // Reset when below ground
          if (posArray[i3 + 1] < 0) {
            posArray[i3 + 1] = spread * 0.5;
            posArray[i3] = (Math.random() - 0.5) * spread;
            posArray[i3 + 2] = (Math.random() - 0.5) * spread;
          }
          break;
          
        case 'snow':
          // Swaying fall
          posArray[i3] += velocities[i3] * delta + Math.sin(time + phases[i]) * 0.02;
          posArray[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier;
          posArray[i3 + 2] += velocities[i3 + 2] * delta + Math.cos(time + phases[i]) * 0.02;
          
          // Reset when below ground
          if (posArray[i3 + 1] < 0) {
            posArray[i3 + 1] = spread * 0.5;
          }
          break;
          
        case 'sparks':
          posArray[i3] += velocities[i3] * delta * speedMultiplier;
          posArray[i3 + 1] += velocities[i3 + 1] * delta - delta * 3; // gravity
          posArray[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier;
          
          // Reset when below ground or audio burst
          if (posArray[i3 + 1] < 0 || (beat && Math.random() < bass)) {
            posArray[i3] = (Math.random() - 0.5) * 2;
            posArray[i3 + 1] = 0;
            posArray[i3 + 2] = (Math.random() - 0.5) * 2;
          }
          break;
          
        case 'leaves':
          // Tumbling fall
          posArray[i3] += velocities[i3] * delta * speedMultiplier + Math.sin(time * 2 + phases[i]) * 0.05;
          posArray[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier;
          posArray[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier + Math.cos(time * 1.5 + phases[i]) * 0.03;
          
          if (posArray[i3 + 1] < 0) {
            posArray[i3 + 1] = spread * 0.5;
            posArray[i3] = (Math.random() - 0.5) * spread;
            posArray[i3 + 2] = (Math.random() - 0.5) * spread;
          }
          break;
          
        case 'dust':
          // Slow drift
          posArray[i3] += Math.sin(time * 0.2 + phases[i]) * 0.01;
          posArray[i3 + 1] += Math.sin(time * 0.1 + phases[i] * 2) * 0.005;
          posArray[i3 + 2] += Math.cos(time * 0.15 + phases[i]) * 0.01;
          break;
      }
      
      // Bounds check
      if (Math.abs(posArray[i3]) > spread / 2) posArray[i3] *= -0.9;
      if (Math.abs(posArray[i3 + 2]) > spread / 2) posArray[i3 + 2] *= -0.9;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  // Point size based on type
  const pointSize = useMemo(() => {
    const typeSizes: Record<ParticleType, number> = {
      fireflies: 0.15,
      pollen: 0.05,
      rain: 0.03,
      snow: 0.08,
      sparks: 0.1,
      leaves: 0.12,
      dust: 0.04,
    };
    return typeSizes[type];
  }, [type]);
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        color={particleColor}
        transparent
        opacity={type === 'rain' ? 0.3 : 0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
