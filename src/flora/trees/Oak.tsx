// Oak Tree - Neutral/Standard tree type
// Classic branching structure with full canopy

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloraProps, DEFAULT_GROWTH, seededRandom } from '../types';
import { useAudioFeatures, useSeed, useSeason } from '../../hooks/useGarden';

export function Oak({
  position = [0, 0, 0],
  scale = 1,
  seed,
  growth = DEFAULT_GROWTH,
  audioReactive = true,
  season = 'summer',
}: FloraProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const { seedNumber } = useSeed();
  const audioFeatures = useAudioFeatures();
  const seasonState = useSeason();
  
  const actualSeed = seed ?? seedNumber;
  const currentSeason = seasonState?.current ?? season;
  const random = seededRandom(actualSeed);
  
  // Generate oak structure
  const { trunk, branches, leafPositions } = useMemo(() => {
    const trunkHeight = 3 * (growth.stemGrowth ?? 1);
    const trunkWidth = 0.4;
    
    // Recursive branch generation
    const branches: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      width: number;
      depth: number;
    }> = [];
    
    const generateBranches = (
      start: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      width: number,
      depth: number,
      maxDepth: number
    ) => {
      if (depth > maxDepth || width < 0.02) return;
      
      const end = start.clone().add(direction.clone().multiplyScalar(length));
      branches.push({ start: start.clone(), end: end.clone(), width, depth });
      
      // Generate child branches
      const branchCount = depth === 0 ? 4 : 2 + Math.floor(random() * 2);
      
      for (let i = 0; i < branchCount; i++) {
        const newDir = direction.clone();
        const angle = (random() - 0.5) * 1.2;
        const elevation = random() * 0.4;
        
        newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        newDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), elevation);
        newDir.normalize();
        
        const newLength = length * (0.6 + random() * 0.2);
        const newWidth = width * 0.7;
        
        generateBranches(end, newDir, newLength, newWidth, depth + 1, maxDepth);
      }
    };
    
    // Start with main trunk going up
    const branchingFactor = growth.branching ?? 1;
    const maxDepth = Math.floor(3 + branchingFactor * 2);
    
    generateBranches(
      new THREE.Vector3(0, trunkHeight * 0.6, 0),
      new THREE.Vector3(0, 1, 0),
      trunkHeight * 0.4,
      trunkWidth * 0.5,
      0,
      maxDepth
    );
    
    // Generate leaf positions on outer branches
    const leafPositions: THREE.Vector3[] = [];
    const leafing = growth.leafing ?? 1;
    
    branches.forEach(branch => {
      if (branch.depth >= maxDepth - 1) {
        const leafCount = Math.floor(3 * leafing);
        for (let i = 0; i < leafCount; i++) {
          leafPositions.push(
            branch.end.clone().add(
              new THREE.Vector3(
                (random() - 0.5) * 0.5,
                random() * 0.3,
                (random() - 0.5) * 0.5
              )
            )
          );
        }
      }
    });
    
    return {
      trunk: { height: trunkHeight, width: trunkWidth },
      branches,
      leafPositions,
    };
  }, [actualSeed, growth]);
  
  // Season-based colors
  const colors = useMemo(() => {
    const seasonColors = {
      spring: { leaf: '#84cc16', bark: '#5d4037' },
      summer: { leaf: '#22c55e', bark: '#4a3728' },
      autumn: { leaf: '#f59e0b', bark: '#5d4037' },
      winter: { leaf: '#94a3b8', bark: '#6b7280' },
    };
    return seasonColors[currentSeason];
  }, [currentSeason]);
  
  // Initialize instanced leaves
  useMemo(() => {
    if (!leavesRef.current) return;
    
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scaleVec = new THREE.Vector3();
    
    leafPositions.forEach((pos, i) => {
      quaternion.setFromEuler(new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        0
      ));
      scaleVec.setScalar(0.2 + Math.random() * 0.15);
      
      matrix.compose(pos, quaternion, scaleVec);
      leavesRef.current!.setMatrixAt(i, matrix);
    });
    
    leavesRef.current.instanceMatrix.needsUpdate = true;
  }, [leafPositions]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const energy = audioFeatures?.energy ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.015 + treble * 0.02;
    groupRef.current.rotation.x = Math.cos(time * 0.3) * 0.01;
    
    // Animate leaves
    if (leavesRef.current && audioReactive) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      
      for (let i = 0; i < Math.min(leafPositions.length, 50); i++) {
        leavesRef.current.getMatrixAt(i, matrix);
        matrix.decompose(position, quaternion, scale);
        
        // Rustle leaves
        const offset = i * 0.1;
        position.x += Math.sin(time * 3 + offset) * 0.002 * (1 + energy);
        position.y += Math.cos(time * 2 + offset) * 0.001;
        
        matrix.compose(position, quaternion, scale);
        leavesRef.current.setMatrixAt(i, matrix);
      }
      
      leavesRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  
  // Leaf geometry
  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 0.2, 0.2, 0.5);
    shape.quadraticCurveTo(0, 0.6, -0.2, 0.5);
    shape.quadraticCurveTo(-0.3, 0.2, 0, 0);
    
    return new THREE.ShapeGeometry(shape);
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, trunk.height / 2, 0]}>
        <cylinderGeometry args={[trunk.width * 0.6, trunk.width, trunk.height, 8]} />
        <meshStandardMaterial color={colors.bark} roughness={0.9} />
      </mesh>
      
      {/* Branches */}
      {branches.map((branch, i) => {
        const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
        const length = direction.length();
        const midpoint = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5);
        
        return (
          <mesh
            key={i}
            position={midpoint}
            quaternion={new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              direction.normalize()
            )}
          >
            <cylinderGeometry args={[branch.width * 0.7, branch.width, length, 6]} />
            <meshStandardMaterial color={colors.bark} roughness={0.85} />
          </mesh>
        );
      })}
      
      {/* Instanced leaves */}
      {currentSeason !== 'winter' && (
        <instancedMesh
          ref={leavesRef}
          args={[leafGeometry, undefined, leafPositions.length]}
        >
          <meshStandardMaterial
            color={colors.leaf}
            side={THREE.DoubleSide}
            transparent
            opacity={currentSeason === 'autumn' ? 0.8 : 0.9}
          />
        </instancedMesh>
      )}
    </group>
  );
}

export default Oak;
