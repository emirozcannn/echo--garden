// Sky Component - SIMPLIFIED for performance
// Basic sky with emotion and season based colors

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useEmotion, useSeason } from '../hooks/useGarden';

interface SkyProps {
  audioReactive?: boolean;
}

export function Sky({ audioReactive = true }: SkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const emotion = useEmotion();
  const season = useSeason();
  
  // Simple sky color based on emotion
  const skyColor = useMemo(() => {
    if (emotion?.primary === 'anger') return '#1a0505';
    if (emotion?.primary === 'calm') return '#051a1a';
    if (emotion?.primary === 'joy') return '#1a1a05';
    if (emotion?.primary === 'sadness') return '#0a0a1a';
    if (emotion?.primary === 'thought') return '#0a051a';
    
    // Season default
    if (season?.current === 'summer') return '#1a2a4a';
    if (season?.current === 'autumn') return '#2a1a1a';
    if (season?.current === 'winter') return '#1a1a2a';
    
    return '#0a0a1a'; // spring default
  }, [emotion?.primary, season?.current]);
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[100, 16, 16]} />
      <meshBasicMaterial color={skyColor} side={THREE.BackSide} />
    </mesh>
  );
}

// Stars for night sky - SIMPLIFIED
export function Stars({ count = 50 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Distribute on hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2);
      const radius = 90;
      
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.cos(phi);
      pos[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    
    return pos;
  }, [count]);
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.4} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

// Sun/Moon light source - SIMPLIFIED
export function CelestialLight() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} color="#ffeedd" />
    </>
  );
}
