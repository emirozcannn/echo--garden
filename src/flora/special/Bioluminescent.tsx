// Bioluminescent Plant - Special glowing flora
// Emits soft light that pulses with audio

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Bioluminescent({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRefs = useRef<THREE.Mesh[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate glowing structures
  const structures = useMemo(() => {
    const items: Array<{
      type: 'bulb' | 'tendril' | 'cap';
      position: [number, number, number];
      scale: number;
      color: string;
      phaseOffset: number;
    }> = [];
    
    const colors = ['#00fff2', '#00ff88', '#88ff00', '#00ffcc'];
    
    // Main bulbs
    for (let i = 0; i < 5; i++) {
      items.push({
        type: 'bulb',
        position: [
          (random() - 0.5) * 0.5,
          0.3 + random() * 0.6,
          (random() - 0.5) * 0.5,
        ],
        scale: 0.1 + random() * 0.15,
        color: colors[Math.floor(random() * colors.length)],
        phaseOffset: random() * Math.PI * 2,
      });
    }
    
    // Tendrils
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      items.push({
        type: 'tendril',
        position: [
          Math.cos(angle) * 0.3,
          0.1,
          Math.sin(angle) * 0.3,
        ],
        scale: 0.05 + random() * 0.05,
        color: colors[Math.floor(random() * colors.length)],
        phaseOffset: random() * Math.PI * 2,
      });
    }
    
    // Glowing caps
    for (let i = 0; i < 3; i++) {
      items.push({
        type: 'cap',
        position: [
          (random() - 0.5) * 0.4,
          random() * 0.3,
          (random() - 0.5) * 0.4,
        ],
        scale: 0.15 + random() * 0.1,
        color: colors[Math.floor(random() * colors.length)],
        phaseOffset: random() * Math.PI * 2,
      });
    }
    
    return items;
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Pulse glow intensity
    glowRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const structure = structures[i];
      const material = ref.material as THREE.MeshStandardMaterial;
      
      // Base pulse
      const pulse = Math.sin(time * 2 + structure.phaseOffset) * 0.3 + 0.7;
      
      // Audio boost
      const audioBoost = 1 + treble * 0.5 + (beat ? 0.5 : 0);
      
      material.emissiveIntensity = pulse * audioBoost;
      
      // Scale wobble
      const wobble = 1 + Math.sin(time * 3 + structure.phaseOffset) * 0.05 * energy;
      ref.scale.setScalar(structure.scale * wobble);
    });
    
    // Point light intensity
    if (lightRef.current) {
      lightRef.current.intensity = 0.5 + energy * 0.5 + (beat ? 0.3 : 0);
    }
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      
      {/* Glowing structures */}
      {structures.map((structure, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) glowRefs.current[i] = el; }}
          position={structure.position}
          scale={structure.scale}
        >
          {structure.type === 'bulb' && (
            <sphereGeometry args={[1, 16, 16]} />
          )}
          {structure.type === 'tendril' && (
            <cylinderGeometry args={[0.3, 0.5, 3, 8]} />
          )}
          {structure.type === 'cap' && (
            <coneGeometry args={[1, 0.8, 12]} />
          )}
          <meshStandardMaterial
            color={structure.color}
            emissive={structure.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      
      {/* Central glow light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.4, 0]}
        color="#00ffaa"
        intensity={0.5}
        distance={3}
      />
      
      {/* Ambient particles */}
      <GlowParticles count={20} color="#00ffaa" />
    </group>
  );
}

// Floating glow particles
function GlowParticles({ count, color }: { count: number; color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1;
      pos[i * 3 + 1] = Math.random() * 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1;
    }
    return pos;
  }, [count]);
  
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.elapsedTime;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] += Math.sin(time + i) * 0.002;
      
      // Reset if too high
      if (posArray[i * 3 + 1] > 1.5) {
        posArray[i * 3 + 1] = 0;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
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
        color={color}
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default Bioluminescent;
