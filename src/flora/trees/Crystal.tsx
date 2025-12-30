// Crystal Tree - Thought/Contemplation emotion
// Geometric crystalline structure with shimmer effects

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useEmotion, useSeed } from '../../hooks/useGarden';

export function CrystalTree({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const crystalRefs = useRef<THREE.Mesh[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate crystal formation
  const { base, crystals, sparkles } = useMemo(() => {
    const baseHeight = 0.8 * (growth.stemGrowth ?? 1);
    
    // Main crystals
    const crystals: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      color: string;
      emissive: string;
    }> = [];
    
    const crystalCount = Math.floor(8 * (growth.branching ?? 1));
    const colors = ['#a78bfa', '#c4b5fd', '#818cf8', '#e0e7ff', '#8b5cf6'];
    
    for (let i = 0; i < crystalCount; i++) {
      const angle = (i / crystalCount) * Math.PI * 2 + random() * 0.5;
      const radius = 0.3 + random() * 0.5;
      const height = 1.5 + random() * 2.5;
      const width = 0.15 + random() * 0.2;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = baseHeight + height / 2;
      
      const tilt = (random() - 0.5) * 0.5;
      const lean = (random() - 0.5) * 0.3;
      
      const colorIndex = Math.floor(random() * colors.length);
      
      crystals.push({
        position: [x, y, z],
        rotation: [tilt, angle + Math.PI / 2, lean],
        scale: [width, height, width],
        color: colors[colorIndex],
        emissive: colors[colorIndex],
      });
    }
    
    // Inner glow crystals
    for (let i = 0; i < 4; i++) {
      const height = 2 + random() * 1.5;
      crystals.push({
        position: [
          (random() - 0.5) * 0.3,
          baseHeight + height / 2,
          (random() - 0.5) * 0.3,
        ],
        rotation: [(random() - 0.5) * 0.2, random() * Math.PI, 0],
        scale: [0.3, height, 0.3],
        color: '#f0f9ff',
        emissive: '#a78bfa',
      });
    }
    
    // Sparkle positions
    const sparkles: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      sparkles.push(new THREE.Vector3(
        (random() - 0.5) * 2,
        baseHeight + random() * 4,
        (random() - 0.5) * 2
      ));
    }
    
    return {
      base: { height: baseHeight },
      crystals,
      sparkles,
    };
  }, [actualSeed, growth]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Slow rotation
    groupRef.current.rotation.y = time * 0.05;
    
    // Crystal pulse on audio
    crystalRefs.current.forEach((crystal, i) => {
      if (!crystal) return;
      
      const material = crystal.material as THREE.MeshStandardMaterial;
      
      // Emissive intensity responds to treble
      const baseEmissive = 0.3 + treble * 0.7;
      material.emissiveIntensity = baseEmissive + (beat ? 0.5 : 0);
      
      // Scale pulse on mids
      const pulseScale = 1 + Math.sin(time * 2 + i * 0.5) * 0.02 + mids * 0.05;
      crystal.scale.y *= pulseScale;
      
      // Shimmer rotation
      crystal.rotation.z += Math.sin(time + i) * 0.001;
    });
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Base rock */}
      <mesh position={[0, base.height / 2, 0]}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color="#1e1b4b"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      
      {/* Crystals */}
      {crystals.map((crystal, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) crystalRefs.current[i] = el; }}
          position={crystal.position}
          rotation={crystal.rotation}
          scale={crystal.scale}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={crystal.color}
            emissive={crystal.emissive}
            emissiveIntensity={0.3}
            transparent
            opacity={0.85}
            roughness={0.1}
            metalness={0.8}
            envMapIntensity={1}
          />
        </mesh>
      ))}
      
      {/* Inner glow */}
      <pointLight
        position={[0, 2, 0]}
        color="#a78bfa"
        intensity={1}
        distance={5}
      />
      
      {/* Sparkle particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={sparkles.length}
            array={new Float32Array(sparkles.flatMap(v => [v.x, v.y, v.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#e0e7ff"
          size={0.08}
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export default CrystalTree;
