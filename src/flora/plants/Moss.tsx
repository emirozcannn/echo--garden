// Moss - Ground cover
// Soft, fuzzy texture cluster

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Moss({
  position = [0, 0, 0],
  scale = 1,
  seed,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate moss clumps
  const clumps = useMemo(() => {
    return Array.from({ length: 15 + Math.floor(random() * 10) }).map(() => ({
      x: (random() - 0.5) * 0.4,
      z: (random() - 0.5) * 0.4,
      size: 0.05 + random() * 0.08,
      height: 0.02 + random() * 0.04,
      shade: 0.7 + random() * 0.3,
    }));
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const energy = audioFeatures?.energy ?? 0;
    
    // Subtle breathing
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02 * energy;
    groupRef.current.scale.y = scale * breathe;
  });
  
  const baseColor = new THREE.Color('#228b22');
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {clumps.map((clump, i) => {
        const color = baseColor.clone().multiplyScalar(clump.shade);
        
        return (
          <mesh
            key={i}
            position={[clump.x, clump.height / 2, clump.z]}
          >
            <sphereGeometry args={[clump.size, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={color}
              roughness={0.95}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default Moss;
