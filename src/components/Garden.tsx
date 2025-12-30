// Garden Component
// Main 3D scene that combines all elements

import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

import { Tree } from './Tree';
import { Terrain, GrassPatches } from './Terrain';
import { Particles, ParticleType } from './Particles';
import { Sky, Stars, CelestialLight } from './Sky';
import { FlowerField, Mushroom } from './Flower';
import { useGardenStore, useSeed, useAudioFeatures, useEmotion, useSeason } from '../hooks/useGarden';
import { TreePresetName, TREE_PRESETS } from '../utils/lsystem';

// Audio Visualizer - Merkezdeki büyük reaktif küre
function AudioVisualizer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const audioFeatures = useAudioFeatures();
  const settings = useGardenStore((state) => state.settings);
  
  useFrame((_, delta) => {
    if (!meshRef.current || !ringRef.current) return;
    
    const bass = (audioFeatures?.bass ?? 0) * settings.audioSensitivity;
    const mids = (audioFeatures?.mids ?? 0) * settings.audioSensitivity;
    const treble = (audioFeatures?.treble ?? 0) * settings.audioSensitivity;
    const energy = (audioFeatures?.energy ?? 0) * settings.audioSensitivity;
    
    // Küre boyutu ses enerjisine göre değişir
    const targetScale = 1 + energy * 2 + bass * 1.5;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.2
    );
    
    // Küre rengi frekans dağılımına göre değişir
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.5 + energy * 3;
    material.color.setHSL(
      0.3 + bass * 0.3 - treble * 0.2, // Hue: yeşilden maviye veya turuncuya
      0.7 + mids * 0.3,                 // Saturation
      0.4 + energy * 0.4                // Lightness
    );
    material.emissive.setHSL(
      0.3 + bass * 0.3,
      0.8,
      0.3 + energy * 0.5
    );
    
    // Küre rotasyonu
    meshRef.current.rotation.y += delta * (0.2 + energy);
    meshRef.current.rotation.x += delta * (0.1 + bass * 0.5);
    
    // Ring pulse
    const ringScale = 2 + bass * 3 + Math.sin(Date.now() * 0.005) * 0.3;
    ringRef.current.scale.set(ringScale, ringScale, ringScale);
    ringRef.current.rotation.z += delta * 0.5;
    
    const ringMaterial = ringRef.current.material as THREE.MeshBasicMaterial;
    ringMaterial.opacity = 0.3 + energy * 0.5;
  });
  
  return (
    <group position={[0, 5, 0]}>
      {/* Ana reaktif küre - basitleştirildi */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshBasicMaterial
          color="#68d391"
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Pulse ring - basitleştirildi */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 16]} />
        <meshBasicMaterial
          color="#68d391"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Ses reaktif zemin halkaları
function AudioReactiveGround() {
  const ringsRef = useRef<THREE.Group>(null);
  const audioFeatures = useAudioFeatures();
  const settings = useGardenStore((state) => state.settings);
  
  useFrame(() => {
    if (!ringsRef.current) return;
    
    const bass = (audioFeatures?.bass ?? 0) * settings.audioSensitivity;
    const energy = (audioFeatures?.energy ?? 0) * settings.audioSensitivity;
    
    ringsRef.current.children.forEach((ring, i) => {
      const mesh = ring as THREE.Mesh;
      const baseScale = 3 + i * 4;
      const pulseScale = baseScale + bass * (5 - i) + Math.sin(Date.now() * 0.003 + i) * 0.5;
      mesh.scale.set(pulseScale, pulseScale, 1);
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + energy * 0.3 - i * 0.02;
    });
  });
  
  return (
    <group ref={ringsRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[3 + i * 5, 3.3 + i * 5, 24]} />
          <meshBasicMaterial
            color="#68d391"
            transparent
            opacity={0.12 - i * 0.03}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Camera shake on bass hits
function CameraShake() {
  const { camera } = useThree();
  const audioFeatures = useAudioFeatures();
  const originalPosition = useRef(new THREE.Vector3());
  
  useEffect(() => {
    originalPosition.current.copy(camera.position);
  }, [camera]);
  
  useFrame(() => {
    const bass = audioFeatures?.bass ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    if (beat && bass > 0.3) {
      const shake = bass * 0.3;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
    } else {
      // Return to stable position
      camera.position.lerp(originalPosition.current, 0.1);
    }
  });
  
  return null;
}

// Auto rotate camera
function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const angleRef = useRef(0);
  
  useFrame((_, delta) => {
    if (!enabled) return;
    
    angleRef.current += delta * 0.1;
    const radius = 25;
    const height = 15;
    
    camera.position.x = Math.sin(angleRef.current) * radius;
    camera.position.z = Math.cos(angleRef.current) * radius;
    camera.position.y = height + Math.sin(angleRef.current * 0.5) * 3;
    camera.lookAt(0, 5, 0);
  });
  
  return null;
}

// Forest of trees based on seed
function Forest() {
  const { seedNumber } = useSeed();
  const emotion = useEmotion();
  const settings = useGardenStore((state) => state.settings);
  
  // Generate tree positions
  const trees = [];
  const random = seededRandom(seedNumber);
  
  // Select tree presets based on emotion
  let presets: TreePresetName[] = ['oak', 'pine', 'willow'];
  if (emotion?.primary === 'anger') {
    presets = ['thorny', 'pine'];
  } else if (emotion?.primary === 'calm') {
    presets = ['willow', 'bonsai'];
  } else if (emotion?.primary === 'thought') {
    presets = ['crystal', 'bonsai'];
  }
  
  for (let i = 0; i < settings.treeCount; i++) {
    const angle = (i / settings.treeCount) * Math.PI * 2 + random() * 0.5;
    const radius = 5 + random() * 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = 0.8 + random() * 0.6;
    const preset = presets[Math.floor(random() * presets.length)];
    
    trees.push({ x, z, scale, preset, seed: seedNumber + i });
  }
  
  return (
    <group>
      {trees.map((tree, i) => (
        <Tree
          key={i}
          position={[tree.x, 0, tree.z]}
          scale={tree.scale}
          preset={tree.preset}
          seed={tree.seed}
        />
      ))}
    </group>
  );
}

// Particle system based on emotion - optimized
function EmotionParticles() {
  const emotion = useEmotion();
  const season = useSeason();
  
  // Determine particle type - MINIMAL counts
  let particleType: ParticleType = 'dust';
  let count = 10;
  
  if (emotion?.primary === 'anger') {
    particleType = 'sparks';
    count = 15;
  } else if (emotion?.primary === 'calm') {
    particleType = 'fireflies';
    count = 10;
  } else if (emotion?.primary === 'joy') {
    particleType = 'pollen';
    count = 20;
  } else if (emotion?.primary === 'sadness') {
    particleType = 'rain';
    count = 25;
  }
  
  // Season override
  if (season?.current === 'winter') {
    particleType = 'snow';
    count = 30;
  } else if (season?.current === 'autumn') {
    particleType = 'leaves';
    count = 15;
  }
  
  return <Particles type={particleType} count={count} />;
}

// Main scene content
function SceneContent() {
  const settings = useGardenStore((state) => state.settings);
  const { seedNumber } = useSeed();
  
  // Generate mushroom positions
  const mushrooms = [];
  const random = seededRandom(seedNumber + 500);
  for (let i = 0; i < 3; i++) {
    mushrooms.push({
      x: (random() - 0.5) * 30,
      z: (random() - 0.5) * 30,
      scale: 0.5 + random() * 1,
    });
  }
  
  return (
    <>
      {/* Lighting */}
      <CelestialLight />
      
      {/* Sky */}
      <Sky />
      <Stars count={30} />
      
      {/* AUDIO VISUALIZER - Merkez */}
      <AudioVisualizer />
      <AudioReactiveGround />
      
      {/* Terrain - agresif optimize */}
      <Terrain size={35} segments={16} heightScale={1.5} />
      
      {/* Grass - minimal */}
      {settings.grassDensity > 0 && (
        <GrassPatches count={Math.floor(15 * settings.grassDensity)} />
      )}
      
      {/* Trees */}
      <Forest />
      
      {/* Flowers */}
      {settings.flowerDensity > 0 && (
        <FlowerField count={Math.floor(20 * settings.flowerDensity)} />
      )}
      
      {/* Mushrooms */}
      {mushrooms.map((m, i) => (
        <Mushroom key={i} position={[m.x, 0, m.z]} scale={m.scale} />
      ))}
      
      {/* Particles */}
      {settings.showParticles && <EmotionParticles />}
      
      {/* Camera effects */}
      <AutoRotate enabled={settings.autoRotate} />
      
      {/* Fog */}
      <fog attach="fog" args={['#0a0a0f', 15, 50]} />
    </>
  );
}

// Loading fallback
function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#68d391" wireframe />
    </mesh>
  );
}

// Main Garden component
export function Garden() {
  const settings = useGardenStore((state) => state.settings);
  
  // Quality settings
  const pixelRatio = {
    low: 0.5,
    medium: 1,
    high: 1.5,
    ultra: 2,
  }[settings.quality];
  
  return (
    <div className="canvas-container">
      <Canvas
        shadows={false}
        dpr={Math.min(pixelRatio, 1)}
        performance={{ min: 0.3, max: 0.8 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[20, 15, 20]}
          fov={50}
          near={0.1}
          far={200}
        />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={false}
          minDistance={5}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, 5, 0]}
        />
        
        <Suspense fallback={<Loader />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999) * 10000;
    return s - Math.floor(s);
  };
}
