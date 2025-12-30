// Fern - Ground cover plant
// Fronds with detailed leaflets

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Fern({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const frondRefs = useRef<THREE.Group[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate fronds
  const fronds = useMemo(() => {
    const count = 6 + Math.floor(random() * 4);
    return Array.from({ length: count }).map((_, i) => ({
      angle: (i / count) * Math.PI * 2 + random() * 0.3,
      length: 0.5 + random() * 0.3,
      curl: 0.3 + random() * 0.2,
      leaflets: 8 + Math.floor(random() * 4),
    }));
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    
    // Fronds sway
    frondRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const offset = i * 0.3;
      ref.rotation.x = -fronds[i].curl + Math.sin(time + offset) * 0.1 * (1 + mids);
      ref.rotation.z = Math.cos(time * 0.7 + offset) * 0.05;
    });
  });
  
  const colors = {
    stem: '#166534',
    leaf: '#22c55e',
    leafTip: '#84cc16',
  };
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Central rosette */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={colors.stem} roughness={0.8} />
      </mesh>
      
      {/* Fronds */}
      {fronds.map((frond, i) => (
        <group
          key={i}
          ref={(el) => { if (el) frondRefs.current[i] = el; }}
          rotation={[0, frond.angle, 0]}
        >
          <Frond
            length={frond.length}
            curl={frond.curl}
            leaflets={frond.leaflets}
            colors={colors}
          />
        </group>
      ))}
    </group>
  );
}

// Individual frond component
function Frond({
  length,
  curl,
  leaflets,
  colors,
}: {
  length: number;
  curl: number;
  leaflets: number;
  colors: { stem: string; leaf: string; leafTip: string };
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length * 0.5, length * 0.3, 0),
      new THREE.Vector3(length, length * 0.1, 0)
    );
    
    return new THREE.TubeGeometry(curve, 16, 0.01, 4, false);
  }, [length]);
  
  // Leaflet positions along curve
  const leafletPositions = useMemo(() => {
    return Array.from({ length: leaflets }).map((_, i) => {
      const t = (i + 1) / (leaflets + 1);
      return {
        t,
        size: 0.08 * (1 - t * 0.5),
        angle: (i % 2 === 0 ? 1 : -1) * 0.3,
      };
    });
  }, [leaflets]);
  
  return (
    <group rotation={[-curl, 0, 0]}>
      {/* Main stem */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color={colors.stem} roughness={0.7} />
      </mesh>
      
      {/* Leaflets */}
      {leafletPositions.map((leaflet, i) => {
        const x = leaflet.t * length;
        const y = leaflet.t * length * 0.2;
        
        return (
          <group
            key={i}
            position={[x, y, 0]}
            rotation={[0, 0, leaflet.angle]}
          >
            <mesh scale={[leaflet.size, leaflet.size * 2, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshStandardMaterial
                color={i < leaflets / 2 ? colors.leaf : colors.leafTip}
                side={THREE.DoubleSide}
                roughness={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default Fern;
