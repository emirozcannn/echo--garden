// Pine Tree - Standard conifer
// Conical shape with needle clusters

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Pine({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate pine structure
  const { trunk, layers } = useMemo(() => {
    const trunkHeight = 4.5 * (growth.stemGrowth ?? 1);
    const trunkWidth = 0.25;
    
    // Conical needle layers
    const layers: Array<{
      y: number;
      radius: number;
      segments: number;
    }> = [];
    
    const layerCount = Math.floor(6 * (growth.branching ?? 1));
    
    for (let i = 0; i < layerCount; i++) {
      const t = i / (layerCount - 1);
      const y = trunkHeight * 0.2 + t * trunkHeight * 0.75;
      const radius = (1 - t * 0.8) * 1.5 + random() * 0.2;
      const segments = 8 + Math.floor(random() * 4);
      
      layers.push({ y, radius, segments });
    }
    
    return {
      trunk: { height: trunkHeight, width: trunkWidth },
      layers,
    };
  }, [actualSeed, growth]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const bass = audioFeatures?.bass ?? 0;
    
    // Minimal sway - pines are stiff
    groupRef.current.rotation.z = Math.sin(time * 0.3) * 0.01;
    groupRef.current.rotation.x = Math.cos(time * 0.2) * 0.005 + bass * 0.02;
  });
  
  const colors = {
    bark: '#4a3728',
    needle: '#1a472a',
    needleLight: '#2d5a27',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, trunk.height / 2, 0]}>
        <cylinderGeometry args={[trunk.width * 0.7, trunk.width, trunk.height, 8]} />
        <meshStandardMaterial color={colors.bark} roughness={0.9} />
      </mesh>
      
      {/* Needle layers */}
      {layers.map((layer, i) => (
        <group key={i} position={[0, layer.y, 0]}>
          <mesh rotation={[0, (i * Math.PI) / 4, 0]}>
            <coneGeometry args={[layer.radius, 0.8, layer.segments]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? colors.needle : colors.needleLight}
              roughness={0.8}
              flatShading
            />
          </mesh>
        </group>
      ))}
      
      {/* Top cone */}
      <mesh position={[0, trunk.height + 0.3, 0]}>
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshStandardMaterial color={colors.needle} roughness={0.8} />
      </mesh>
    </group>
  );
}

export default Pine;
