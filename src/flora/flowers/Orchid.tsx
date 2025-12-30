// Orchid - Elegant, exotic flower
// Delicate structure with unique shape

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Orchid({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flowersRef = useRef<THREE.Group[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  const stemHeight = 1.5 * (growth.stemGrowth ?? 1);
  
  // Generate flower positions along stem
  const flowers = useMemo(() => {
    const count = Math.floor(3 + random() * 3);
    return Array.from({ length: count }).map((_, i) => ({
      y: stemHeight * 0.4 + (i / count) * stemHeight * 0.55,
      angle: i * 0.8 + random() * 0.3,
      size: 0.2 + random() * 0.1,
    }));
  }, [actualSeed, stemHeight]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const highMids = audioFeatures?.highMids ?? 0;
    
    // Gentle stem curve
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.03;
    
    // Flower movements
    flowersRef.current.forEach((ref, i) => {
      if (!ref) return;
      
      const offset = i * 0.5;
      ref.rotation.x = Math.sin(time + offset) * 0.05 * (1 + highMids);
      ref.rotation.z = Math.cos(time * 0.7 + offset) * 0.03;
    });
  });
  
  const colors = {
    stem: '#228b22',
    petal: '#e879f9',
    petalInner: '#f0abfc',
    lip: '#a855f7',
    center: '#fde047',
    spots: '#86198f',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Curved stem */}
      <mesh position={[0, stemHeight / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.02, stemHeight, 6]} />
        <meshStandardMaterial color={colors.stem} roughness={0.7} />
      </mesh>
      
      {/* Aerial roots */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (random() - 0.5) * 0.15,
            0.1,
            (random() - 0.5) * 0.15,
          ]}
          rotation={[0.3, i * 2, -0.5]}
        >
          <cylinderGeometry args={[0.008, 0.012, 0.4, 4]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.8} />
        </mesh>
      ))}
      
      {/* Leaves at base */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh
          key={`leaf-${i}`}
          position={[0, 0.05, 0]}
          rotation={[0.7, (i / 4) * Math.PI * 2, 0]}
        >
          <planeGeometry args={[0.08, 0.4]} />
          <meshStandardMaterial
            color={colors.stem}
            side={THREE.DoubleSide}
            roughness={0.6}
          />
        </mesh>
      ))}
      
      {/* Flowers */}
      {flowers.map((flower, i) => (
        <group
          key={i}
          ref={(el) => { if (el) flowersRef.current[i] = el; }}
          position={[
            Math.sin(flower.angle) * 0.1,
            flower.y,
            Math.cos(flower.angle) * 0.1,
          ]}
          rotation={[0, flower.angle, 0]}
        >
          <OrchidFlower size={flower.size} colors={colors} />
        </group>
      ))}
    </group>
  );
}

// Individual orchid flower
function OrchidFlower({
  size,
  colors,
}: {
  size: number;
  colors: {
    petal: string;
    petalInner: string;
    lip: string;
    center: string;
    spots: string;
  };
}) {
  // Outer petals (sepals)
  const sepals = [
    { angle: 0, tilt: -0.3 },
    { angle: Math.PI * 2 / 3, tilt: 0.3 },
    { angle: Math.PI * 4 / 3, tilt: 0.3 },
  ];
  
  // Inner petals
  const petals = [
    { angle: Math.PI / 3, tilt: 0.2 },
    { angle: Math.PI * 5 / 3, tilt: 0.2 },
  ];
  
  return (
    <group scale={size}>
      {/* Sepals */}
      {sepals.map((sepal, i) => (
        <mesh
          key={`sepal-${i}`}
          position={[
            Math.cos(sepal.angle) * 0.3,
            0,
            Math.sin(sepal.angle) * 0.15,
          ]}
          rotation={[sepal.tilt, sepal.angle, 0]}
        >
          <planeGeometry args={[0.3, 0.5]} />
          <meshStandardMaterial
            color={colors.petal}
            side={THREE.DoubleSide}
            roughness={0.4}
          />
        </mesh>
      ))}
      
      {/* Inner petals */}
      {petals.map((petal, i) => (
        <mesh
          key={`petal-${i}`}
          position={[
            Math.cos(petal.angle) * 0.2,
            0.05,
            Math.sin(petal.angle) * 0.1,
          ]}
          rotation={[petal.tilt, petal.angle, 0]}
        >
          <planeGeometry args={[0.25, 0.4]} />
          <meshStandardMaterial
            color={colors.petalInner}
            side={THREE.DoubleSide}
            roughness={0.4}
          />
        </mesh>
      ))}
      
      {/* Lip (labellum) */}
      <mesh position={[0, -0.1, 0.15]} rotation={[0.5, 0, 0]}>
        <planeGeometry args={[0.3, 0.35]} />
        <meshStandardMaterial
          color={colors.lip}
          side={THREE.DoubleSide}
          roughness={0.3}
        />
      </mesh>
      
      {/* Column (center) */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.15, 8]} />
        <meshStandardMaterial color={colors.center} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default Orchid;
