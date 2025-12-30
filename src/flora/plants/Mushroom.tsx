// Mushroom - Forest floor fungus
// Various cap shapes with audio reactivity

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, seededRandom } from '../types';
import { useAudioFeatures, useEmotion, useSeed } from '../../hooks/useGarden';

type MushroomVariant = 'toadstool' | 'chanterelle' | 'puffball' | 'bracket';

interface MushroomProps extends FloraProps {
  variant?: MushroomVariant;
}

export function Mushroom({
  position = [0, 0, 0],
  scale = 1,
  seed,
  variant,
  audioReactive = true,
}: MushroomProps) {
  const groupRef = useRef<THREE.Group>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Random variant if not specified
  const actualVariant = variant ?? (['toadstool', 'chanterelle', 'puffball'] as MushroomVariant[])[
    Math.floor(random() * 3)
  ];
  
  // Configuration based on variant
  const config = useMemo(() => {
    switch (actualVariant) {
      case 'toadstool':
        return {
          stemHeight: 0.2 + random() * 0.15,
          stemRadius: 0.03 + random() * 0.02,
          capRadius: 0.1 + random() * 0.08,
          capHeight: 0.08,
          capColor: '#dc2626',
          stemColor: '#f5f5f4',
          spots: true,
        };
      case 'chanterelle':
        return {
          stemHeight: 0.15 + random() * 0.1,
          stemRadius: 0.04,
          capRadius: 0.12 + random() * 0.05,
          capHeight: 0.06,
          capColor: '#f59e0b',
          stemColor: '#fbbf24',
          spots: false,
        };
      case 'puffball':
        return {
          stemHeight: 0.05,
          stemRadius: 0.02,
          capRadius: 0.08 + random() * 0.06,
          capHeight: 0.1,
          capColor: '#e7e5e4',
          stemColor: '#d6d3d1',
          spots: false,
        };
      default:
        return {
          stemHeight: 0.2,
          stemRadius: 0.03,
          capRadius: 0.1,
          capHeight: 0.08,
          capColor: '#a16207',
          stemColor: '#fef3c7',
          spots: false,
        };
    }
  }, [actualVariant, actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const bass = audioFeatures?.bass ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Wobble on bass
    groupRef.current.rotation.z = Math.sin(time * 2) * 0.03 * bass;
    
    // Cap pulse on beat
    if (capRef.current) {
      if (beat) {
        capRef.current.scale.y = 1.2;
      } else {
        capRef.current.scale.y = THREE.MathUtils.lerp(capRef.current.scale.y, 1, 0.1);
      }
    }
  });
  
  // Adjust colors for anger emotion (red/orange theme)
  const colors = useMemo(() => {
    if (emotion?.primary === 'anger') {
      return {
        cap: '#7f1d1d',
        stem: '#a16207',
      };
    }
    return {
      cap: config.capColor,
      stem: config.stemColor,
    };
  }, [emotion?.primary, config]);
  
  // Generate spot positions for toadstool
  const spots = useMemo(() => {
    if (!config.spots) return [];
    
    return Array.from({ length: 8 }).map(() => ({
      theta: random() * Math.PI * 2,
      phi: random() * 0.5 + 0.2,
      size: 0.01 + random() * 0.015,
    }));
  }, [config.spots, actualSeed]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, config.stemHeight / 2, 0]}>
        <cylinderGeometry args={[config.stemRadius * 0.8, config.stemRadius, config.stemHeight, 8]} />
        <meshStandardMaterial color={colors.stem} roughness={0.8} />
      </mesh>
      
      {/* Cap */}
      <mesh ref={capRef} position={[0, config.stemHeight, 0]}>
        {actualVariant === 'puffball' ? (
          <sphereGeometry args={[config.capRadius, 12, 12]} />
        ) : actualVariant === 'chanterelle' ? (
          <coneGeometry args={[config.capRadius, config.capHeight, 12, 1, true]} />
        ) : (
          <sphereGeometry args={[config.capRadius, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        )}
        <meshStandardMaterial
          color={colors.cap}
          roughness={0.7}
          side={actualVariant === 'chanterelle' ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      
      {/* Spots (toadstool) */}
      {spots.map((spot, i) => {
        const x = Math.sin(spot.phi) * Math.cos(spot.theta) * config.capRadius * 0.9;
        const y = Math.cos(spot.phi) * config.capRadius * 0.9 + config.stemHeight;
        const z = Math.sin(spot.phi) * Math.sin(spot.theta) * config.capRadius * 0.9;
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[spot.size, 6, 6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        );
      })}
      
      {/* Gills (underside detail) */}
      {actualVariant === 'toadstool' && (
        <mesh position={[0, config.stemHeight - 0.01, 0]} rotation={[Math.PI, 0, 0]}>
          <circleGeometry args={[config.capRadius * 0.9, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export default Mushroom;
