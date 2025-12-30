// Sunflower - Joy emotion
// Tall flower that tracks audio "sun"

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Sunflower({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  const stemHeight = 2.5 * (growth.stemGrowth ?? 1);
  const headSize = 0.5 * (growth.flowering ?? 1);
  
  // Generate petals
  const petals = useMemo(() => {
    const count = 20 + Math.floor(random() * 8);
    return Array.from({ length: count }).map((_, i) => ({
      angle: (i / count) * Math.PI * 2 + random() * 0.1,
      length: 0.4 + random() * 0.15,
      width: 0.1 + random() * 0.03,
      tilt: random() * 0.2,
    }));
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !headRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const highMids = audioFeatures?.highMids ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Head follows audio "direction"
    const targetRotX = -0.2 + energy * 0.3;
    const targetRotZ = Math.sin(time * 0.5) * 0.1;
    
    headRef.current.rotation.x = THREE.MathUtils.lerp(
      headRef.current.rotation.x,
      targetRotX,
      0.05
    );
    headRef.current.rotation.z = targetRotZ;
    
    // Stem sway
    groupRef.current.rotation.z = Math.sin(time) * 0.03;
    
    // Pulse on beat
    if (beat) {
      headRef.current.scale.setScalar(1.1);
    } else {
      headRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });
  
  const colors = {
    stem: '#228b22',
    petal: '#fde047',
    petalTip: '#f59e0b',
    center: '#78350f',
    seeds: '#92400e',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, stemHeight / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.06, stemHeight, 8]} />
        <meshStandardMaterial color={colors.stem} roughness={0.8} />
      </mesh>
      
      {/* Leaves on stem */}
      {[0.3, 0.55, 0.75].map((t, i) => (
        <group
          key={i}
          position={[0, stemHeight * t, 0]}
          rotation={[0, i * 1.5, (i % 2 === 0 ? 1 : -1) * 0.3]}
        >
          <mesh rotation={[0, 0, -0.5]}>
            <planeGeometry args={[0.5, 0.25]} />
            <meshStandardMaterial
              color={colors.stem}
              side={THREE.DoubleSide}
              roughness={0.7}
            />
          </mesh>
        </group>
      ))}
      
      {/* Flower head */}
      <group ref={headRef} position={[0, stemHeight + 0.1, 0]}>
        {/* Center disk */}
        <mesh>
          <cylinderGeometry args={[headSize * 0.6, headSize * 0.6, 0.15, 24]} />
          <meshStandardMaterial color={colors.center} roughness={0.9} />
        </mesh>
        
        {/* Seed pattern */}
        {Array.from({ length: 30 }).map((_, i) => {
          const t = i / 30;
          const radius = t * headSize * 0.5;
          const angle = i * 2.4; // Golden angle
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                0.08,
                Math.sin(angle) * radius,
              ]}
            >
              <sphereGeometry args={[0.02 + t * 0.015, 6, 6]} />
              <meshStandardMaterial color={colors.seeds} roughness={0.8} />
            </mesh>
          );
        })}
        
        {/* Petals */}
        {petals.map((petal, i) => (
          <group key={i} rotation={[0, petal.angle, 0]}>
            <mesh
              position={[headSize * 0.6 + petal.length / 2, 0, 0]}
              rotation={[petal.tilt, 0, Math.PI / 2]}
            >
              <planeGeometry args={[petal.length, petal.width]} />
              <meshStandardMaterial
                color={colors.petal}
                side={THREE.DoubleSide}
                roughness={0.5}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default Sunflower;
