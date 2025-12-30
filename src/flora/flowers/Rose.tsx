// Rose - Standard romantic flower
// Layered petals with thorny stem

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useEmotion, useSeed } from '../../hooks/useGarden';

export function Rose({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  const stemHeight = 1.2 * (growth.stemGrowth ?? 1);
  const bloomSize = 0.3 * (growth.flowering ?? 0.8);
  
  // Generate petal layers
  const petalLayers = useMemo(() => {
    const layers: Array<{
      count: number;
      radius: number;
      height: number;
      curl: number;
    }> = [];
    
    // Inner to outer
    layers.push({ count: 5, radius: 0.1, height: 0.15, curl: 0.2 });
    layers.push({ count: 8, radius: 0.18, height: 0.1, curl: 0.4 });
    layers.push({ count: 12, radius: 0.25, height: 0.05, curl: 0.6 });
    
    return layers;
  }, []);
  
  // Generate thorns
  const thorns = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      y: 0.2 + i * (stemHeight - 0.3) / 5,
      angle: random() * Math.PI * 2,
      size: 0.03 + random() * 0.02,
    }));
  }, [actualSeed, stemHeight]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(time + position[0]) * 0.05;
    groupRef.current.rotation.x = Math.cos(time * 0.7) * 0.03;
    
    // Scale pulse with energy
    const pulseScale = 1 + energy * 0.05;
    groupRef.current.scale.setScalar(scale * pulseScale);
  });
  
  // Color based on emotion
  const colors = useMemo(() => {
    if (emotion?.primary === 'anger') {
      return { petal: '#dc2626', stem: '#166534' };
    }
    if (emotion?.primary === 'joy') {
      return { petal: '#fda4af', stem: '#166534' };
    }
    return { petal: '#e11d48', stem: '#166534' };
  }, [emotion?.primary]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, stemHeight / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.025, stemHeight, 6]} />
        <meshStandardMaterial color={colors.stem} roughness={0.8} />
      </mesh>
      
      {/* Thorns */}
      {thorns.map((thorn, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(thorn.angle) * 0.025,
            thorn.y,
            Math.sin(thorn.angle) * 0.025,
          ]}
          rotation={[0, thorn.angle, -0.5]}
        >
          <coneGeometry args={[thorn.size * 0.3, thorn.size, 4]} />
          <meshStandardMaterial color={colors.stem} roughness={0.8} />
        </mesh>
      ))}
      
      {/* Leaves */}
      {[0.4, 0.7].map((t, i) => (
        <group
          key={i}
          position={[0, stemHeight * t, 0]}
          rotation={[0, i * 2.5, 0]}
        >
          <RoseLeaf size={0.15} />
        </group>
      ))}
      
      {/* Rose bloom */}
      <group position={[0, stemHeight + 0.05, 0]}>
        {/* Center bud */}
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={colors.petal} roughness={0.5} />
        </mesh>
        
        {/* Petal layers */}
        {petalLayers.map((layer, layerIndex) => (
          <group key={layerIndex}>
            {Array.from({ length: layer.count }).map((_, petalIndex) => {
              const angle = (petalIndex / layer.count) * Math.PI * 2 + layerIndex * 0.3;
              return (
                <group key={petalIndex} rotation={[0, angle, 0]}>
                  <mesh
                    position={[layer.radius, layer.height, 0]}
                    rotation={[-layer.curl, 0, 0]}
                  >
                    <sphereGeometry args={[0.06 * bloomSize * 3, 8, 8, 0, Math.PI]} />
                    <meshStandardMaterial
                      color={colors.petal}
                      roughness={0.4}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}
        
        {/* Sepals */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh
            key={`sepal-${i}`}
            position={[0, -0.02, 0]}
            rotation={[0.8, (i / 5) * Math.PI * 2, 0]}
          >
            <coneGeometry args={[0.03, 0.08, 4]} />
            <meshStandardMaterial color={colors.stem} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Rose leaf component
function RoseLeaf({ size }: { size: number }) {
  return (
    <group>
      {[-1, 0, 1].map((offset, i) => (
        <mesh
          key={i}
          position={[offset * size * 0.8, 0, 0]}
          rotation={[0.3, offset * 0.3, offset * 0.2]}
          scale={i === 1 ? 1.2 : 0.8}
        >
          <planeGeometry args={[size, size * 1.5]} />
          <meshStandardMaterial
            color="#166534"
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Rose;
