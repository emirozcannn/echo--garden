// Vine - Climbing plant
// Wrapping tendrils with leaves

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Vine({
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
  
  // Generate vine path
  const { points, leaves } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const leaves: Array<{ position: THREE.Vector3; rotation: number }> = [];
    
    const segments = 20;
    let x = 0, y = 0, z = 0;
    let angle = 0;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      
      // Spiral upward
      angle += 0.3 + random() * 0.2;
      x = Math.cos(angle) * 0.3 * (1 + t);
      z = Math.sin(angle) * 0.3 * (1 + t);
      y = t * 2;
      
      points.push(new THREE.Vector3(x, y, z));
      
      // Add leaves periodically
      if (i > 2 && i % 3 === 0) {
        leaves.push({
          position: new THREE.Vector3(x, y, z),
          rotation: angle,
        });
      }
    }
    
    return { points, leaves };
  }, [actualSeed]);
  
  // Create tube geometry from points
  const tubeGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 32, 0.02, 6, false);
  }, [points]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;
    groupRef.current.rotation.x = Math.cos(time * 0.3) * 0.03 * energy;
  });
  
  const colors = {
    vine: '#166534',
    leaf: '#22c55e',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main vine */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color={colors.vine} roughness={0.8} />
      </mesh>
      
      {/* Leaves */}
      {leaves.map((leaf, i) => (
        <group
          key={i}
          position={leaf.position}
          rotation={[0, leaf.rotation, Math.PI / 6]}
        >
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -0.3]}>
            <planeGeometry args={[0.15, 0.1]} />
            <meshStandardMaterial
              color={colors.leaf}
              side={THREE.DoubleSide}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
      
      {/* Tendrils */}
      {leaves.slice(0, 3).map((leaf, i) => (
        <VineTendril
          key={i}
          position={[leaf.position.x, leaf.position.y, leaf.position.z]}
          color={colors.vine}
        />
      ))}
    </group>
  );
}

// Curling tendril
function VineTendril({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const turns = 2;
    const segments = 20;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const radius = 0.05 * (1 - t);
      
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        t * 0.15,
        Math.sin(angle) * radius
      ));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 16, 0.005, 4, false);
  }, []);
  
  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

export default Vine;
