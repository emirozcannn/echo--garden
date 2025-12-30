// Willow Tree - Calm/Sadness emotion
// Drooping branches that sway with audio

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useEmotion, useSeed } from '../../hooks/useGarden';

interface WillowProps extends FloraProps {
  droopFactor?: number;
}

export function Willow({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
  droopFactor = 0.8,
}: WillowProps) {
  const groupRef = useRef<THREE.Group>(null);
  const branchRefs = useRef<THREE.Group[]>([]);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate trunk and branches
  const { trunk, branches, leaves } = useMemo(() => {
    const trunkHeight = 4 * (growth.stemGrowth ?? 1);
    const trunkWidth = 0.4;
    
    // Main branches that droop
    const branches: Array<{
      startY: number;
      angle: number;
      length: number;
      droopAngle: number;
      strands: Array<{ length: number; offset: number }>;
    }> = [];
    
    const branchCount = Math.floor(8 * (growth.branching ?? 1));
    
    for (let i = 0; i < branchCount; i++) {
      const startY = trunkHeight * 0.5 + random() * trunkHeight * 0.4;
      const angle = (i / branchCount) * Math.PI * 2 + random() * 0.3;
      const length = 2 + random() * 1.5;
      const droopAngle = 0.5 + random() * droopFactor;
      
      // Hanging strands per branch
      const strandCount = Math.floor(5 + random() * 5);
      const strands = [];
      
      for (let j = 0; j < strandCount; j++) {
        strands.push({
          length: 2 + random() * 3,
          offset: random() * length,
        });
      }
      
      branches.push({ startY, angle, length, droopAngle, strands });
    }
    
    // Leaf positions along strands
    const leaves: THREE.Vector3[] = [];
    branches.forEach(branch => {
      branch.strands.forEach(strand => {
        const leafCount = Math.floor(3 + random() * 4);
        for (let i = 0; i < leafCount; i++) {
          const t = (i + 1) / (leafCount + 1);
          leaves.push(new THREE.Vector3(
            random() * 0.2 - 0.1,
            -strand.length * t,
            random() * 0.2 - 0.1
          ));
        }
      });
    });
    
    return {
      trunk: { height: trunkHeight, width: trunkWidth },
      branches,
      leaves,
    };
  }, [actualSeed, growth.stemGrowth, growth.branching, droopFactor]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    const bass = audioFeatures?.bass ?? 0;
    
    // Sway trunk slightly
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.02 + mids * 0.05;
    
    // Sway branches more dramatically
    branchRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const offset = i * 0.5;
      const swayAmount = 0.1 + energy * 0.15;
      
      ref.rotation.x = Math.sin(time + offset) * swayAmount;
      ref.rotation.z = Math.cos(time * 0.7 + offset) * swayAmount * 0.5;
      
      // Pulse on bass
      if (bass > 0.5) {
        ref.scale.y = 1 + (bass - 0.5) * 0.2;
      } else {
        ref.scale.y = THREE.MathUtils.lerp(ref.scale.y, 1, 0.1);
      }
    });
  });
  
  // Colors based on emotion
  const colors = useMemo(() => {
    if (emotion?.primary === 'sadness') {
      return {
        bark: '#4b5563',
        branch: '#6b7280',
        leaf: '#9ca3af',
      };
    }
    return {
      bark: '#5d4e37',
      branch: '#6b5b4a',
      leaf: '#22c55e',
    };
  }, [emotion?.primary]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, trunk.height / 2, 0]}>
        <cylinderGeometry args={[trunk.width * 0.7, trunk.width, trunk.height, 8]} />
        <meshStandardMaterial color={colors.bark} roughness={0.9} />
      </mesh>
      
      {/* Branches with hanging strands */}
      {branches.map((branch, i) => (
        <group
          key={i}
          ref={(el) => { if (el) branchRefs.current[i] = el; }}
          position={[
            Math.cos(branch.angle) * trunk.width * 0.5,
            branch.startY,
            Math.sin(branch.angle) * trunk.width * 0.5,
          ]}
          rotation={[branch.droopAngle * 0.3, branch.angle, -branch.droopAngle]}
        >
          {/* Main branch */}
          <mesh position={[branch.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.1, branch.length, 6]} />
            <meshStandardMaterial color={colors.branch} roughness={0.85} />
          </mesh>
          
          {/* Hanging strands */}
          {branch.strands.map((strand, j) => (
            <group key={j} position={[strand.offset + 0.5, 0, (j - branch.strands.length / 2) * 0.15]}>
              {/* Strand line */}
              <mesh position={[0, -strand.length / 2, 0]}>
                <cylinderGeometry args={[0.015, 0.02, strand.length, 4]} />
                <meshStandardMaterial color={colors.branch} roughness={0.8} />
              </mesh>
              
              {/* Leaves on strand */}
              {Array.from({ length: Math.floor(4 + Math.random() * 3) }).map((_, k) => {
                const leafY = -(k + 1) * (strand.length / 6);
                return (
                  <mesh
                    key={k}
                    position={[Math.random() * 0.1 - 0.05, leafY, Math.random() * 0.1 - 0.05]}
                    rotation={[Math.random() * 0.5, Math.random() * Math.PI, 0]}
                    scale={0.15 + Math.random() * 0.1}
                  >
                    <planeGeometry args={[0.3, 0.8]} />
                    <meshStandardMaterial
                      color={colors.leaf}
                      side={THREE.DoubleSide}
                      transparent
                      opacity={0.9}
                    />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export default Willow;
