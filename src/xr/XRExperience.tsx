// WebXR VR/AR Experience
// Immersive virtual and augmented reality garden experience

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  XR,
  useXR,
  createXRStore,
  useXRHitTest,
} from '@react-three/xr';
import * as THREE from 'three';
import { useGardenStore, useAudioFeatures, useEmotion } from '../hooks/useGarden';

// XR Store for session management
export const xrStore = createXRStore();

// XR Session Types
type XRSessionType = 'inline' | 'immersive-vr' | 'immersive-ar';

interface XRExperienceProps {
  children: React.ReactNode;
  onSessionStart?: (mode: XRSessionType) => void;
  onSessionEnd?: () => void;
}

// XR Context Provider
export function XRExperience({ children, onSessionStart, onSessionEnd }: XRExperienceProps) {
  return (
    <XR store={xrStore}>
      {children}
      <XRHUDElements />
    </XR>
  );
}

// VR HUD Elements
function XRHUDElements() {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const xrState = useXR();
  
  // Only show in XR session
  if (!xrState.session) return null;
  
  return (
    <group position={[0, 1.5, -2]}>
      {/* Audio Visualizer Ring */}
      <AudioVisualizerRing audioFeatures={audioFeatures} />
      
      {/* Emotion Indicator */}
      {emotion && (
        <EmotionIndicator emotion={emotion} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

// Circular Audio Visualizer for VR
export function AudioVisualizerRing({ audioFeatures }: { audioFeatures: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const barCount = 32;
  
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();
  
  useFrame(() => {
    if (!barsRef.current) return;
    
    const { bass, lowMids, mids, highMids, treble, energy } = audioFeatures;
    const bands = [bass, lowMids, mids, highMids, treble];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const bandIndex = Math.floor((i / barCount) * 5);
      const value = bands[bandIndex] || 0;
      
      const radius = 0.5;
      tempObject.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      tempObject.rotation.y = -angle;
      tempObject.scale.set(0.02, 0.1 + value * 0.3, 0.02);
      tempObject.updateMatrix();
      
      barsRef.current.setMatrixAt(i, tempObject.matrix);
      
      // Color based on energy
      tempColor.setHSL(0.3 + energy * 0.3, 0.8, 0.5 + value * 0.3);
      barsRef.current.setColorAt(i, tempColor);
    }
    
    barsRef.current.instanceMatrix.needsUpdate = true;
    if (barsRef.current.instanceColor) {
      barsRef.current.instanceColor.needsUpdate = true;
    }
    
    // Rotate with beat
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002 + (audioFeatures.beat ? 0.02 : 0);
    }
  });
  
  return (
    <group ref={groupRef}>
      <instancedMesh ref={barsRef} args={[undefined, undefined, barCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors emissive="#22c55e" emissiveIntensity={0.3} />
      </instancedMesh>
    </group>
  );
}

// Emotion Indicator Orb
export function EmotionIndicator({ emotion, position }: { emotion: any; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const emotionColors: Record<string, string> = {
    joy: '#fbbf24',
    sadness: '#3b82f6',
    anger: '#ef4444',
    fear: '#8b5cf6',
    surprise: '#ec4899',
    love: '#f472b6',
    neutral: '#6b7280',
  };
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial
        color={emotionColors[emotion.primary] || emotionColors.neutral}
        emissive={emotionColors[emotion.primary] || emotionColors.neutral}
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Interactive Seed Planter for VR
export function VRSeedPlanter() {
  const xrState = useXR();
  const { setSeed, reset } = useGardenStore();
  const [seeds, setSeeds] = useState<THREE.Vector3[]>([]);
  
  const plantSeed = useCallback((position: THREE.Vector3) => {
    setSeeds(prev => [...prev, position.clone()]);
    setSeed(`seed_${Date.now()}`);
    reset();
  }, [setSeed, reset]);
  
  useEffect(() => {
    if (!xrState.session) return;
    
    const handleSelectEnd = (event: XRInputSourceEvent) => {
      if (event.inputSource.hand) return;
      
      const frame = event.frame;
      const referenceSpace = xrState.originReferenceSpace;
      if (!referenceSpace || !event.inputSource.gripSpace) return;
      
      const pose = frame.getPose(event.inputSource.gripSpace, referenceSpace);
      if (pose) {
        const position = new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        plantSeed(position);
      }
    };
    
    xrState.session.addEventListener('selectend', handleSelectEnd);
    return () => {
      xrState.session?.removeEventListener('selectend', handleSelectEnd);
    };
  }, [xrState.session, xrState.originReferenceSpace, plantSeed]);
  
  return (
    <>
      {seeds.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

// AR Placement with Hit Testing
export function ARPlacement({ children }: { children: React.ReactNode }) {
  const [placed, setPlaced] = useState(false);
  const [placementPosition, setPlacementPosition] = useState<THREE.Vector3 | null>(null);
  const reticleRef = useRef<THREE.Mesh>(null);
  
  useXRHitTest((results, getWorldMatrix) => {
    if (!placed && results.length > 0 && reticleRef.current) {
      const matrix = new THREE.Matrix4();
      const success = getWorldMatrix(matrix, results[0]);
      if (success) {
        reticleRef.current.matrix.copy(matrix);
        reticleRef.current.matrix.decompose(
          reticleRef.current.position,
          reticleRef.current.quaternion,
          reticleRef.current.scale
        );
      }
    }
  }, 'viewer');
  
  const handlePlace = useCallback(() => {
    if (!placed && reticleRef.current) {
      setPlacementPosition(reticleRef.current.position.clone());
      setPlaced(true);
    }
  }, [placed]);
  
  return (
    <>
      {!placed && (
        <mesh ref={reticleRef} rotation-x={-Math.PI / 2} onClick={handlePlace}>
          <ringGeometry args={[0.1, 0.12, 32]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}
      
      {placed && placementPosition && (
        <group position={placementPosition}>
          {children}
        </group>
      )}
    </>
  );
}

// VR Teleport Movement
export function VRTeleport() {
  const xrState = useXR();
  const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
  
  return (
    <>
      {targetPosition && (
        <mesh position={targetPosition}>
          <cylinderGeometry args={[0.3, 0.3, 0.01, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
      )}
    </>
  );
}

// Hand Tracking Gesture Detection
export function HandGestures() {
  return null;
}

// Spatial Audio Manager
export function SpatialAudioManager() {
  const { camera } = useThree();
  const listenerRef = useRef<THREE.AudioListener | null>(null);
  
  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    listenerRef.current = listener;
    
    return () => {
      camera.remove(listener);
    };
  }, [camera]);
  
  return null;
}

// VR/AR Entry Buttons Component
export function XRButtons() {
  const [vrSupported, setVrSupported] = useState(false);
  const [arSupported, setArSupported] = useState(false);
  const xrState = useXR();
  
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(setVrSupported);
      navigator.xr.isSessionSupported('immersive-ar').then(setArSupported);
    }
  }, []);
  
  const enterVR = async () => {
    try {
      await xrStore.enterVR();
    } catch (error) {
      console.error('Failed to enter VR:', error);
    }
  };
  
  const enterAR = async () => {
    try {
      await xrStore.enterAR();
    } catch (error) {
      console.error('Failed to enter AR:', error);
    }
  };
  
  if (xrState.session) return null;
  
  return (
    <div className="fixed bottom-4 left-4 flex gap-2 z-50">
      {vrSupported && (
        <button
          onClick={enterVR}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          🥽 VR Modu
        </button>
      )}
      
      {arSupported && (
        <button
          onClick={enterAR}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          📱 AR Modu
        </button>
      )}
    </div>
  );
}

// XR Settings/Config
export interface XRConfig {
  referenceSpace: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  optionalFeatures: string[];
  requiredFeatures: string[];
}

export const defaultXRConfig: XRConfig = {
  referenceSpace: 'local-floor',
  optionalFeatures: ['hand-tracking', 'layers', 'depth-sensing'],
  requiredFeatures: ['local-floor'],
};

export { XRHUDElements };
