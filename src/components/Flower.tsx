// Flower Component
// Procedural flowers that bloom based on audio

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion, useSeed } from '../hooks/useGarden';

interface FlowerProps {
  position?: [number, number, number];
  petalCount?: number;
  scale?: number;
  seed?: number;
  audioReactive?: boolean;
}

export function Flower({
  position = [0, 0, 0],
  petalCount = 5,
  scale = 1,
  seed,
  audioReactive = true,
}: FlowerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed + position[0] * 100 + position[2] * 10);
  
  // Generate petal configuration
  const petals = useMemo(() => {
    const config = [];
    const angleStep = (Math.PI * 2) / petalCount;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = i * angleStep + random() * 0.2;
      const length = 0.3 + random() * 0.2;
      const width = 0.15 + random() * 0.1;
      const curl = random() * 0.3;
      
      config.push({ angle, length, width, curl });
    }
    
    return config;
  }, [petalCount, actualSeed]);
  
  // Get colors based on emotion
  const colors = useMemo(() => {
    const emotionColors: Record<string, { petal: string; center: string }> = {
      anger: { petal: '#dc2626', center: '#7f1d1d' },
      calm: { petal: '#5eead4', center: '#0d9488' },
      joy: { petal: '#fde047', center: '#f59e0b' },
      sadness: { petal: '#93c5fd', center: '#3b82f6' },
      thought: { petal: '#c4b5fd', center: '#8b5cf6' },
      neutral: { petal: '#f472b6', center: '#ec4899' },
    };
    
    return emotionColors[emotion?.primary ?? 'neutral'];
  }, [emotion?.primary]);
  
  // Bloom animation state
  const bloomRef = useRef(0);
  
  // Animation - SIMPLIFIED for performance
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioReactive ? (audioFeatures?.energy ?? 0) : 0;
    
    // Simple bloom based on energy
    bloomRef.current = 0.7 + energy * 0.3;
    
    // Simplified rotation
    groupRef.current.rotation.y = time * 0.1;
    groupRef.current.scale.setScalar(scale * bloomRef.current);
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Stem - simplified */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.6, 4]} />
        <meshBasicMaterial color="#228b22" />
      </mesh>
      
      {/* Center - simplified */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={colors.center} />
      </mesh>
      
      {/* Petals */}
      {petals.map((petal, i) => (
        <Petal
          key={i}
          angle={petal.angle}
          length={petal.length}
          width={petal.width}
          curl={petal.curl}
          color={colors.petal}
        />
      ))}
    </group>
  );
}

// Individual petal
function Petal({
  angle,
  length,
  width,
  curl,
  color,
}: {
  angle: number;
  length: number;
  width: number;
  curl: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create petal shape
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Petal outline
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(width, length * 0.3, width * 0.8, length * 0.7);
    shape.quadraticCurveTo(0, length * 1.1, -width * 0.8, length * 0.7);
    shape.quadraticCurveTo(-width, length * 0.3, 0, 0);
    
    const geo = new THREE.ShapeGeometry(shape);
    return geo;
  }, [length, width]);
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2 - curl, angle, 0]}
    >
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.7}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

// Flower field generator
export function FlowerField({
  count = 50,
  spread = 30,
  minScale = 0.5,
  maxScale = 1.5,
}: {
  count?: number;
  spread?: number;
  minScale?: number;
  maxScale?: number;
}) {
  const { seedNumber } = useSeed();
  
  // Generate flower positions
  const flowers = useMemo(() => {
    const random = seededRandom(seedNumber + 999);
    const positions: { pos: [number, number, number]; scale: number; petals: number; seed: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * spread;
      const z = (random() - 0.5) * spread;
      // Add some height variation based on position
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5;
      
      positions.push({
        pos: [x, y, z],
        scale: minScale + random() * (maxScale - minScale),
        petals: Math.floor(random() * 4) + 4, // 4-7 petals
        seed: seedNumber + i,
      });
    }
    
    return positions;
  }, [count, spread, minScale, maxScale, seedNumber]);
  
  return (
    <group>
      {flowers.map((flower, i) => (
        <Flower
          key={i}
          position={flower.pos}
          scale={flower.scale}
          petalCount={flower.petals}
          seed={flower.seed}
        />
      ))}
    </group>
  );
}

// Mushroom component for variety
export function Mushroom({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const emotion = useEmotion();
  const audioFeatures = useAudioFeatures();
  
  const capColor = useMemo(() => {
    if (emotion?.primary === 'anger') return '#8b0000';
    if (emotion?.primary === 'calm') return '#20b2aa';
    if (emotion?.primary === 'joy') return '#ffd700';
    if (emotion?.primary === 'thought') return '#9370db';
    return '#cd853f';
  }, [emotion?.primary]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const bass = audioFeatures?.bass ?? 0;
    const time = state.clock.elapsedTime;
    
    // Gentle bob
    meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.02;
    
    // Pulse with bass
    meshRef.current.scale.setScalar(scale * (1 + bass * 0.2));
  });
  
  return (
    <group ref={meshRef} position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.2, 12]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.9} />
      </mesh>
      
      {/* Cap */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={capColor} roughness={0.7} />
      </mesh>
      
      {/* Spots */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const r = 0.1;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * r,
              0.25 + Math.random() * 0.05,
              Math.sin(angle) * r,
            ]}
          >
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
    </group>
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999) * 10000;
    return s - Math.floor(s);
  };
}
