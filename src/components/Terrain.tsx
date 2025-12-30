// Terrain Component
// Perlin noise based procedural terrain

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fbm } from '../utils/perlin';
import { useSeed, useAudioFeatures, useEmotion, useSeason } from '../hooks/useGarden';

interface TerrainProps {
  size?: number;
  segments?: number;
  heightScale?: number;
  audioReactive?: boolean;
}

export function Terrain({
  size = 50,
  segments = 64,
  heightScale = 3,
  audioReactive = true,
}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const season = useSeason();
  
  // Generate terrain geometry - SIMPLIFIED
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position.array as Float32Array;
    
    // Apply Perlin noise - single octave for performance
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1];
      
      const noiseX = (x + size / 2) / size + seedNumber * 0.001;
      const noiseZ = (z + size / 2) / size + seedNumber * 0.001;
      
      // Single octave, no additional variation
      const height = fbm(noiseX * 2, noiseZ * 2, 3) * heightScale;
      
      positions[i + 2] = height;
    }
    
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    
    return geo;
  }, [size, segments, heightScale, seedNumber]);
  
  // Audio reactive ripples - DISABLED for performance
  useFrame((state) => {
    // Removed for better performance
  });
  
  // Get ground color based on emotion and season
  const groundColor = useMemo(() => {
    if (emotion?.primary === 'anger') return '#2d1515';
    if (emotion?.primary === 'sadness') return '#374151';
    if (emotion?.primary === 'joy') return '#4a5d23';
    
    if (season?.current === 'winter') return '#e2e8f0';
    if (season?.current === 'autumn') return '#5c4033';
    if (season?.current === 'summer') return '#4a3728';
    
    return '#3d2817'; // spring default
  }, [emotion?.primary, season?.current]);
  
  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={groundColor}
        roughness={0.9}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

// Grass patches
export function GrassPatches({
  count = 500,
  spread = 40,
}: {
  count?: number;
  spread?: number;
}) {
  const { seedNumber } = useSeed();
  const emotion = useEmotion();
  const season = useSeason();
  const audioFeatures = useAudioFeatures();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Generate grass positions
  const { positions, rotations, scales } = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const rotations: number[] = [];
    const scales: number[] = [];
    
    const random = seededRandom(seedNumber);
    
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * spread;
      const z = (random() - 0.5) * spread;
      const y = fbm((x + spread) / spread * 3, (z + spread) / spread * 3, 4) * 3;
      
      positions.push(new THREE.Vector3(x, y, z));
      rotations.push(random() * Math.PI * 2);
      scales.push(0.3 + random() * 0.7);
    }
    
    return { positions, rotations, scales };
  }, [count, spread, seedNumber]);
  
  // Get grass color
  const grassColor = useMemo(() => {
    if (emotion?.primary === 'anger') return '#6b2121';
    if (emotion?.primary === 'sadness') return '#6b7280';
    if (emotion?.primary === 'joy') return '#84cc16';
    
    if (season?.current === 'winter') return '#9ca3af';
    if (season?.current === 'autumn') return '#a3a355';
    if (season?.current === 'summer') return '#22c55e';
    
    return '#68d391'; // spring
  }, [emotion?.primary, season?.current]);
  
  // Update instance matrices - SIMPLIFIED for performance
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const treble = audioFeatures?.treble ?? 0;
    
    // Only update every 3rd frame for performance
    if (Math.floor(time * 60) % 3 !== 0) return;
    
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      const rot = rotations[i];
      const scale = scales[i];
      
      // Simplified wind sway
      const sway = Math.sin(time + pos.x) * (0.05 + treble * 0.2);
      
      dummy.position.copy(pos);
      dummy.rotation.set(sway, rot, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.05, 0.5, 4]} />
      <meshStandardMaterial color={grassColor} roughness={0.8} />
    </instancedMesh>
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999) * 10000;
    return s - Math.floor(s);
  };
}
