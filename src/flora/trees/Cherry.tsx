// Cherry Blossom Tree - Joy emotion
// Flowering tree with petal particles

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useEmotion, useSeed } from '../../hooks/useGarden';

export function Cherry({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const petalsRef = useRef<THREE.Points>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate tree structure
  const { trunk, branches, blossomClusters } = useMemo(() => {
    const trunkHeight = 3.5 * (growth.stemGrowth ?? 1);
    const trunkWidth = 0.35;
    
    // Branches radiate outward and slightly upward
    const branches: Array<{
      startY: number;
      angle: number;
      length: number;
      tilt: number;
      subBranches: Array<{ offset: number; angle: number; length: number }>;
    }> = [];
    
    const branchCount = Math.floor(6 * (growth.branching ?? 1));
    
    for (let i = 0; i < branchCount; i++) {
      const startY = trunkHeight * 0.4 + random() * trunkHeight * 0.4;
      const angle = (i / branchCount) * Math.PI * 2 + random() * 0.4;
      const length = 1.5 + random() * 1;
      const tilt = 0.3 + random() * 0.4;
      
      // Sub-branches
      const subBranches = [];
      const subCount = 2 + Math.floor(random() * 2);
      
      for (let j = 0; j < subCount; j++) {
        subBranches.push({
          offset: 0.3 + random() * 0.5,
          angle: (random() - 0.5) * 0.8,
          length: 0.5 + random() * 0.5,
        });
      }
      
      branches.push({ startY, angle, length, tilt, subBranches });
    }
    
    // Blossom clusters at branch ends
    const blossomClusters: THREE.Vector3[] = [];
    const flowering = growth.flowering ?? 0.5;
    
    branches.forEach(branch => {
      // Main branch end
      const endX = Math.cos(branch.angle) * (branch.length + 0.5);
      const endZ = Math.sin(branch.angle) * (branch.length + 0.5);
      const endY = branch.startY + branch.length * Math.sin(branch.tilt);
      
      if (random() < flowering) {
        blossomClusters.push(new THREE.Vector3(endX, endY, endZ));
      }
      
      // Sub-branch ends
      branch.subBranches.forEach(sub => {
        if (random() < flowering) {
          blossomClusters.push(new THREE.Vector3(
            endX * sub.offset + Math.cos(branch.angle + sub.angle) * sub.length,
            endY - sub.length * 0.3,
            endZ * sub.offset + Math.sin(branch.angle + sub.angle) * sub.length
          ));
        }
      });
    });
    
    return { trunk: { height: trunkHeight, width: trunkWidth }, branches, blossomClusters };
  }, [actualSeed, growth]);
  
  // Falling petals
  const petalPositions = useMemo(() => {
    const positions = new Float32Array(300 * 3);
    
    for (let i = 0; i < 300; i++) {
      positions[i * 3] = (random() - 0.5) * 6;
      positions[i * 3 + 1] = random() * 8;
      positions[i * 3 + 2] = (random() - 0.5) * 6;
    }
    
    return positions;
  }, [actualSeed]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(time * 0.8) * 0.02;
    
    // Animate falling petals
    if (petalsRef.current && audioReactive) {
      const positions = petalsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Fall down
        positions[i + 1] -= 0.02 + energy * 0.03;
        
        // Drift sideways
        positions[i] += Math.sin(time + i) * 0.005 + treble * 0.01;
        positions[i + 2] += Math.cos(time * 0.7 + i) * 0.005;
        
        // Reset at bottom
        if (positions[i + 1] < -1) {
          positions[i + 1] = 8 + random() * 2;
          positions[i] = (random() - 0.5) * 6;
          positions[i + 2] = (random() - 0.5) * 6;
        }
      }
      
      petalsRef.current.geometry.attributes.position.needsUpdate = true;
      
      // More petals on beat
      if (beat) {
        const material = petalsRef.current.material as THREE.MeshBasicMaterial;
        if (material && 'opacity' in material) {
          material.opacity = Math.min(1, 0.6 + energy * 0.4);
        }
      }
    }
  });
  
  // Colors
  const colors = useMemo(() => {
    const isJoy = emotion?.primary === 'joy';
    return {
      bark: '#5d4037',
      branch: '#6d4c41',
      blossom: isJoy ? '#fce4ec' : '#f8bbd9',
      blossomCenter: isJoy ? '#ffeb3b' : '#ffc107',
      petal: isJoy ? '#f8bbd9' : '#f48fb1',
    };
  }, [emotion?.primary]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, trunk.height / 2, 0]}>
        <cylinderGeometry args={[trunk.width * 0.6, trunk.width, trunk.height, 8]} />
        <meshStandardMaterial color={colors.bark} roughness={0.9} />
      </mesh>
      
      {/* Branches */}
      {branches.map((branch, i) => (
        <group
          key={i}
          position={[0, branch.startY, 0]}
          rotation={[branch.tilt, branch.angle, 0]}
        >
          <mesh position={[branch.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.08, branch.length, 6]} />
            <meshStandardMaterial color={colors.branch} roughness={0.85} />
          </mesh>
          
          {/* Sub-branches */}
          {branch.subBranches.map((sub, j) => (
            <group
              key={j}
              position={[branch.length * sub.offset, 0, 0]}
              rotation={[0, sub.angle, -0.3]}
            >
              <mesh position={[sub.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.04, sub.length, 5]} />
                <meshStandardMaterial color={colors.branch} roughness={0.85} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      
      {/* Blossom clusters */}
      {blossomClusters.map((pos, i) => (
        <BlossomCluster
          key={i}
          position={[pos.x, pos.y, pos.z]}
          color={colors.blossom}
          centerColor={colors.blossomCenter}
          count={5 + Math.floor(random() * 4)}
        />
      ))}
      
      {/* Falling petals */}
      <points ref={petalsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={petalPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colors.petal}
          size={0.15}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Blossom cluster component
function BlossomCluster({
  position,
  color,
  centerColor,
  count,
}: {
  position: [number, number, number];
  color: string;
  centerColor: string;
  count: number;
}) {
  const flowers = useMemo(() => {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        offset: [
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.4,
        ],
        rotation: Math.random() * Math.PI * 2,
        scale: 0.1 + Math.random() * 0.08,
      });
    }
    return result;
  }, [count]);
  
  return (
    <group position={position}>
      {flowers.map((flower, i) => (
        <group
          key={i}
          position={flower.offset as [number, number, number]}
          rotation={[Math.random() * 0.5, flower.rotation, Math.random() * 0.5]}
          scale={flower.scale}
        >
          {/* Petals */}
          {[0, 1, 2, 3, 4].map((j) => (
            <mesh
              key={j}
              rotation={[0, (j / 5) * Math.PI * 2, 0.3]}
              position={[0.3, 0, 0]}
            >
              <circleGeometry args={[0.5, 8]} />
              <meshStandardMaterial
                color={color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.9}
              />
            </mesh>
          ))}
          
          {/* Center */}
          <mesh>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={centerColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default Cherry;
