// Lotus Flower - Calm emotion
// Floating water flower with gentle petal movement

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Lotus({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const petalRefs = useRef<THREE.Mesh[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Petal configuration
  const petals = useMemo(() => {
    const config: Array<{
      layer: number;
      angle: number;
      openAngle: number;
      size: number;
    }> = [];
    
    const flowering = growth.flowering ?? 0.7;
    
    // Inner petals
    for (let i = 0; i < 5; i++) {
      config.push({
        layer: 0,
        angle: (i / 5) * Math.PI * 2,
        openAngle: 0.3 + flowering * 0.3,
        size: 0.3,
      });
    }
    
    // Middle petals
    for (let i = 0; i < 8; i++) {
      config.push({
        layer: 1,
        angle: (i / 8) * Math.PI * 2 + 0.2,
        openAngle: 0.5 + flowering * 0.4,
        size: 0.4,
      });
    }
    
    // Outer petals
    for (let i = 0; i < 12; i++) {
      config.push({
        layer: 2,
        angle: (i / 12) * Math.PI * 2 + 0.1,
        openAngle: 0.7 + flowering * 0.3,
        size: 0.5,
      });
    }
    
    return config;
  }, [growth.flowering]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    
    // Gentle floating motion
    groupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.05;
    groupRef.current.rotation.y = time * 0.1;
    
    // Petal breathing
    petalRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const petal = petals[i];
      const breathe = Math.sin(time + i * 0.2) * 0.03;
      const audioInfluence = mids * 0.1;
      
      ref.rotation.x = petal.openAngle + breathe + audioInfluence;
    });
  });
  
  const colors = {
    petal: '#fce4ec',
    petalInner: '#f8bbd9',
    center: '#ffc107',
    pad: '#2e7d32',
  };
  
  // Petal geometry
  const petalGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 0.3, 0.15, 0.8);
    shape.quadraticCurveTo(0, 1, -0.15, 0.8);
    shape.quadraticCurveTo(-0.3, 0.3, 0, 0);
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    
    return geometry;
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Lily pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial
          color={colors.pad}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Center */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={colors.center} roughness={0.6} />
      </mesh>
      
      {/* Stamens */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={`stamen-${i}`}
            position={[
              Math.cos(angle) * 0.08,
              0.15,
              Math.sin(angle) * 0.08,
            ]}
          >
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={0.3} />
          </mesh>
        );
      })}
      
      {/* Petals */}
      {petals.map((petal, i) => (
        <group
          key={i}
          position={[0, 0.05 + petal.layer * 0.03, 0]}
          rotation={[0, petal.angle, 0]}
        >
          <mesh
            ref={(el) => { if (el) petalRefs.current[i] = el; }}
            geometry={petalGeometry}
            rotation={[petal.openAngle, 0, 0]}
            scale={petal.size}
          >
            <meshStandardMaterial
              color={petal.layer === 0 ? colors.petalInner : colors.petal}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default Lotus;
