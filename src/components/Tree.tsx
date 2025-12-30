// Tree Component
// L-System based procedural tree with audio reactivity

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  generateLSystem,
  interpretLSystem,
  TREE_PRESETS,
  TreePresetName,
  LSystemConfig,
  Branch,
} from '../utils/lsystem';
import { useAudioFeatures, useEmotion, useSeed } from '../hooks/useGarden';

interface TreeProps {
  position?: [number, number, number];
  preset?: TreePresetName;
  scale?: number;
  seed?: number;
  audioReactive?: boolean;
}

export function Tree({
  position = [0, 0, 0],
  preset = 'oak',
  scale = 1,
  seed,
  audioReactive = true,
}: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const actualSeed = seed ?? seedNumber;
  
  // Generate tree structure
  const { branches, leafPositions, config } = useMemo(() => {
    const baseConfig = { ...TREE_PRESETS[preset] };
    
    // Modify based on emotion
    if (emotion) {
      switch (emotion.primary) {
        case 'anger':
          baseConfig.angle *= 1.3;
          baseConfig.randomness *= 2;
          break;
        case 'calm':
          baseConfig.angle *= 0.8;
          baseConfig.randomness *= 0.5;
          break;
        case 'joy':
          baseConfig.lengthFactor *= 1.1;
          break;
        case 'sadness':
          baseConfig.angle *= 1.2;
          baseConfig.lengthFactor *= 0.9;
          break;
      }
    }
    
    const lsystemString = generateLSystem(baseConfig as unknown as LSystemConfig, actualSeed);
    const branches = interpretLSystem(lsystemString, baseConfig as unknown as LSystemConfig, 0.3, actualSeed);
    
    // Generate leaf positions
    const leafPositions: THREE.Vector3[] = [];
    const maxDepth = Math.max(...branches.map(b => b.depth));
    
    branches.forEach(branch => {
      if (branch.depth >= maxDepth * 0.6) {
        const numLeaves = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < numLeaves; i++) {
          leafPositions.push(
            branch.end.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.5
              )
            )
          );
        }
      }
    });
    
    return { branches, leafPositions, config: baseConfig };
  }, [preset, actualSeed, emotion?.primary]);
  
  // Audio reactive animation
  useFrame((state) => {
    if (!groupRef.current || !audioReactive) return;
    
    const bass = audioFeatures?.bass ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Sway with treble
    const time = state.clock.elapsedTime;
    const swayAmount = 0.02 + treble * 0.05;
    groupRef.current.rotation.z = Math.sin(time * 2) * swayAmount;
    groupRef.current.rotation.x = Math.cos(time * 1.5) * swayAmount * 0.5;
    
    // Scale pulse on beat
    if (beat) {
      groupRef.current.scale.setScalar(scale * (1 + bass * 0.1));
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });
  
  // Get bark color based on emotion
  const barkColor = useMemo(() => {
    if (!emotion) return '#4a3728';
    
    switch (emotion.primary) {
      case 'anger': return '#3d1515';
      case 'sadness': return '#374151';
      case 'thought': return '#312e81';
      default: return '#4a3728';
    }
  }, [emotion?.primary]);
  
  // Get leaf color based on emotion
  const leafColor = useMemo(() => {
    if (!emotion) return '#48bb78';
    
    switch (emotion.primary) {
      case 'anger': return '#dc2626';
      case 'joy': return '#fde047';
      case 'sadness': return '#6b7280';
      case 'calm': return '#5eead4';
      case 'thought': return '#a78bfa';
      default: return '#48bb78';
    }
  }, [emotion?.primary]);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Branches */}
      {branches.map((branch, i) => (
        <BranchMesh
          key={i}
          branch={branch}
          color={barkColor}
          maxDepth={Math.max(...branches.map(b => b.depth))}
        />
      ))}
      
      {/* Leaves */}
      {leafPositions.map((pos, i) => (
        <Leaf
          key={`leaf-${i}`}
          position={[pos.x, pos.y, pos.z]}
          color={leafColor}
          audioReactive={audioReactive}
        />
      ))}
    </group>
  );
}

// Individual branch mesh
function BranchMesh({ 
  branch, 
  color,
  maxDepth,
}: { 
  branch: Branch; 
  color: string;
  maxDepth: number;
}) {
  const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
  const length = direction.length();
  
  if (length < 0.01) return null;
  
  const midpoint = new THREE.Vector3()
    .addVectors(branch.start, branch.end)
    .multiplyScalar(0.5);
  
  // Color gradient from trunk to tips
  const depthFactor = branch.depth / maxDepth;
  const tipColor = new THREE.Color(color).lerp(new THREE.Color('#2d5a27'), depthFactor);
  
  return (
    <mesh position={midpoint}>
      <cylinderGeometry args={[
        branch.width * 0.7,  // top radius
        branch.width,         // bottom radius
        length,
        6
      ]} />
      <meshStandardMaterial 
        color={tipColor}
        roughness={0.9}
        metalness={0.1}
      />
      <group quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      )} />
    </mesh>
  );
}

// Leaf component
function Leaf({
  position,
  color,
  audioReactive,
}: {
  position: [number, number, number];
  color: string;
  audioReactive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const audioFeatures = useAudioFeatures();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const treble = audioReactive ? (audioFeatures?.treble ?? 0) : 0;
    
    // Natural sway + audio reactive shake
    meshRef.current.rotation.z = Math.sin(time * 3 + position[0] * 10) * (0.1 + treble * 0.3);
    meshRef.current.rotation.x = Math.cos(time * 2 + position[2] * 10) * (0.05 + treble * 0.2);
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial 
        color={color}
        roughness={0.8}
        metalness={0.1}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}
