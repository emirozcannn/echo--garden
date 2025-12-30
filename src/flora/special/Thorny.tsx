// Thorny Plant - Anger emotion
// Aggressive spiky structure

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Thorny({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const thornRefs = useRef<THREE.Mesh[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate thorny structure
  const { stems, thorns } = useMemo(() => {
    const stems: Array<{
      angle: number;
      height: number;
      lean: number;
    }> = [];
    
    const thorns: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      size: number;
    }> = [];
    
    // Main stems
    const stemCount = 3 + Math.floor(random() * 3);
    for (let i = 0; i < stemCount; i++) {
      const angle = (i / stemCount) * Math.PI * 2 + random() * 0.5;
      stems.push({
        angle,
        height: 0.8 + random() * 0.6,
        lean: 0.2 + random() * 0.3,
      });
      
      // Thorns on each stem
      const thornCount = 8 + Math.floor(random() * 6);
      for (let j = 0; j < thornCount; j++) {
        const t = j / thornCount;
        const stemX = Math.cos(angle) * 0.15 * t;
        const stemZ = Math.sin(angle) * 0.15 * t;
        const stemY = stems[i].height * t;
        
        thorns.push({
          position: [
            stemX + (random() - 0.5) * 0.1,
            stemY,
            stemZ + (random() - 0.5) * 0.1,
          ],
          rotation: [
            (random() - 0.5) * 1,
            random() * Math.PI * 2,
            (random() - 0.5) * 0.5,
          ],
          size: 0.05 + random() * 0.05,
        });
      }
    }
    
    return { stems, thorns };
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const bass = audioFeatures?.bass ?? 0;
    const energy = audioFeatures?.energy ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Aggressive shake on high energy
    if (energy > 0.5) {
      groupRef.current.rotation.z = (Math.random() - 0.5) * energy * 0.1;
      groupRef.current.rotation.x = (Math.random() - 0.5) * energy * 0.05;
    } else {
      groupRef.current.rotation.z *= 0.95;
      groupRef.current.rotation.x *= 0.95;
    }
    
    // Thorns extend on beat
    thornRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const thorn = thorns[i];
      const extendFactor = beat ? 1.3 + bass * 0.3 : 1;
      ref.scale.y = THREE.MathUtils.lerp(ref.scale.y, thorn.size * extendFactor, 0.2);
    });
  });
  
  const colors = {
    stem: '#2d2d2d',
    thorn: '#dc2626',
    thornTip: '#f97316',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={colors.stem} roughness={0.9} />
      </mesh>
      
      {/* Stems */}
      {stems.map((stem, i) => (
        <group
          key={i}
          rotation={[stem.lean, stem.angle, 0]}
        >
          <mesh position={[0, stem.height / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.04, stem.height, 6]} />
            <meshStandardMaterial color={colors.stem} roughness={0.85} />
          </mesh>
        </group>
      ))}
      
      {/* Thorns */}
      {thorns.map((thorn, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) thornRefs.current[i] = el; }}
          position={thorn.position}
          rotation={thorn.rotation}
          scale={[thorn.size, thorn.size, thorn.size]}
        >
          <coneGeometry args={[0.3, 1.5, 4]} />
          <meshStandardMaterial
            color={colors.thorn}
            emissive={colors.thornTip}
            emissiveIntensity={0.2}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Thorny;
