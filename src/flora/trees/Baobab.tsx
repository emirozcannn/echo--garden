// Baobab Tree - Anger emotion
// Thick, gnarled trunk with sparse branches

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed } from '../../hooks/useGarden';

export function Baobab({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  
  const actualSeed = seed ?? seedNumber;
  const random = seededRandom(actualSeed);
  
  // Generate baobab structure
  const { trunk, roots, branches } = useMemo(() => {
    const trunkHeight = 3.5 * (growth.stemGrowth ?? 1);
    const trunkWidth = 1.2;
    
    // Bulging trunk segments
    const trunkSegments: Array<{ y: number; radius: number }> = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const y = t * trunkHeight;
      // Bulge in middle
      const bulge = Math.sin(t * Math.PI) * 0.4;
      const taper = 1 - t * 0.5;
      const radius = trunkWidth * taper * (1 + bulge);
      trunkSegments.push({ y, radius });
    }
    
    // Exposed roots
    const roots: Array<{
      angle: number;
      length: number;
      thickness: number;
    }> = [];
    
    const rootCount = 5 + Math.floor(random() * 3);
    for (let i = 0; i < rootCount; i++) {
      roots.push({
        angle: (i / rootCount) * Math.PI * 2 + random() * 0.3,
        length: 1 + random() * 0.8,
        thickness: 0.15 + random() * 0.1,
      });
    }
    
    // Sparse, twisted branches at top
    const branches: Array<{
      angle: number;
      tilt: number;
      length: number;
      twist: number;
    }> = [];
    
    const branchCount = Math.floor(5 * (growth.branching ?? 1));
    for (let i = 0; i < branchCount; i++) {
      branches.push({
        angle: (i / branchCount) * Math.PI * 2 + random() * 0.5,
        tilt: 0.2 + random() * 0.6,
        length: 1 + random() * 1.5,
        twist: (random() - 0.5) * 0.8,
      });
    }
    
    return {
      trunk: { height: trunkHeight, width: trunkWidth, segments: trunkSegments },
      roots,
      branches,
    };
  }, [actualSeed, growth]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const time = state.clock.elapsedTime;
    const bass = audioFeatures?.bass ?? 0;
    const energy = audioFeatures?.energy ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Slow, heavy sway
    groupRef.current.rotation.z = Math.sin(time * 0.3) * 0.01 + bass * 0.03;
    
    // Shake on beat with high bass
    if (beat && bass > 0.5) {
      groupRef.current.position.x = position[0] + (Math.random() - 0.5) * 0.05;
      groupRef.current.position.z = position[2] + (Math.random() - 0.5) * 0.05;
    } else {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], 0.1);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], 0.1);
    }
  });
  
  // Colors for anger theme
  const colors = {
    bark: '#3d1515',
    darkBark: '#2d0f0f',
    branch: '#4a1a1a',
  };
  
  // Generate trunk geometry using lathe
  const trunkGeometry = useMemo(() => {
    const points: THREE.Vector2[] = trunk.segments.map(
      seg => new THREE.Vector2(seg.radius, seg.y)
    );
    return new THREE.LatheGeometry(points, 12);
  }, [trunk.segments]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main trunk */}
      <mesh geometry={trunkGeometry}>
        <meshStandardMaterial
          color={colors.bark}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
      
      {/* Roots */}
      {roots.map((root, i) => (
        <mesh
          key={`root-${i}`}
          position={[
            Math.cos(root.angle) * trunk.width * 0.5,
            0.2,
            Math.sin(root.angle) * trunk.width * 0.5,
          ]}
          rotation={[0.8, root.angle, 0.3]}
        >
          <cylinderGeometry args={[root.thickness * 0.5, root.thickness, root.length, 6]} />
          <meshStandardMaterial color={colors.darkBark} roughness={0.9} />
        </mesh>
      ))}
      
      {/* Branches */}
      {branches.map((branch, i) => (
        <group
          key={`branch-${i}`}
          position={[0, trunk.height, 0]}
          rotation={[branch.tilt, branch.angle, branch.twist]}
        >
          {/* Main branch */}
          <mesh position={[branch.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.12, branch.length, 6]} />
            <meshStandardMaterial color={colors.branch} roughness={0.9} />
          </mesh>
          
          {/* Branch end (no leaves - bare) */}
          <mesh position={[branch.length, 0, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={colors.branch} roughness={0.85} />
          </mesh>
          
          {/* Small twigs */}
          {[0.3, 0.6, 0.85].map((t, j) => (
            <mesh
              key={j}
              position={[branch.length * t, 0, 0]}
              rotation={[0, 0, -0.5 + random() * 0.3]}
            >
              <cylinderGeometry args={[0.015, 0.03, 0.3, 4]} />
              <meshStandardMaterial color={colors.branch} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Knots and texture details */}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 0.5 + random() * (trunk.height - 1);
        const angle = random() * Math.PI * 2;
        const segmentIndex = Math.floor((y / trunk.height) * trunk.segments.length);
        const radius = trunk.segments[Math.min(segmentIndex, trunk.segments.length - 1)].radius;
        
        return (
          <mesh
            key={`knot-${i}`}
            position={[
              Math.cos(angle) * radius * 0.95,
              y,
              Math.sin(angle) * radius * 0.95,
            ]}
            rotation={[0, angle + Math.PI, 0]}
          >
            <sphereGeometry args={[0.1 + random() * 0.1, 8, 8]} />
            <meshStandardMaterial color={colors.darkBark} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

export default Baobab;
