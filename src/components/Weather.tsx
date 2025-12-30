// Weather System
// Rain, snow, fog with audio reactivity

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion, useSeason } from '../hooks/useGarden';

// Rain Particle System
interface RainProps {
  count?: number;
  area?: number;
  speed?: number;
  intensity?: number;
}

export function Rain({
  count = 5000,
  area = 50,
  speed = 15,
  intensity = 1,
}: RainProps) {
  const meshRef = useRef<THREE.Points>(null);
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      velocities[i] = 0.5 + Math.random() * 0.5;
    }
    
    return { positions, velocities };
  }, [count, area]);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const geometry = meshRef.current.geometry;
    const posArray = geometry.attributes.position.array as Float32Array;
    
    const energy = audioFeatures?.energy ?? 0;
    const bass = audioFeatures?.bass ?? 0;
    const isSad = emotion?.primary === 'sadness';
    
    // Intensity multiplier
    const currentIntensity = intensity * (isSad ? 1.5 : 1) * (1 + energy * 0.5);
    const currentSpeed = speed * (1 + bass * 0.3);
    
    for (let i = 0; i < count; i++) {
      // Fall with slight wind
      posArray[i * 3 + 1] -= velocities[i] * currentSpeed * delta;
      posArray[i * 3] += Math.sin(posArray[i * 3 + 1] * 0.1) * delta * bass * 2;
      
      // Reset when below ground
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = 30;
        posArray[i * 3] = (Math.random() - 0.5) * area;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * area;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8899aa"
        transparent
        opacity={0.6 * intensity}
        sizeAttenuation
      />
    </points>
  );
}

// Snow Particle System
interface SnowProps {
  count?: number;
  area?: number;
  speed?: number;
}

export function Snow({
  count = 3000,
  area = 50,
  speed = 2,
}: SnowProps) {
  const meshRef = useRef<THREE.Points>(null);
  const audioFeatures = useAudioFeatures();
  
  const { positions, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      sizes[i] = 0.02 + Math.random() * 0.08;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions, sizes, phases };
  }, [count, area]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const geometry = meshRef.current.geometry;
    const posArray = geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();
    
    const treble = audioFeatures?.treble ?? 0;
    const mids = audioFeatures?.mids ?? 0;
    
    for (let i = 0; i < count; i++) {
      // Gentle fall with swaying
      posArray[i * 3 + 1] -= sizes[i] * speed * delta;
      posArray[i * 3] += Math.sin(time + phases[i]) * delta * (1 + treble);
      posArray[i * 3 + 2] += Math.cos(time * 0.7 + phases[i]) * delta * (1 + mids);
      
      // Reset when below ground
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = 30;
        posArray[i * 3] = (Math.random() - 0.5) * area;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * area;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Fog System
interface FogProps {
  color?: string;
  near?: number;
  far?: number;
  density?: number;
}

export function DynamicFog({
  color = '#aabbcc',
  near = 10,
  far = 50,
  density = 0.02,
}: FogProps) {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const season = useSeason();
  
  useFrame(({ scene }) => {
    if (!scene.fog) {
      scene.fog = new THREE.FogExp2(color, density);
    }
    
    const fog = scene.fog as THREE.FogExp2;
    
    // Base density
    let currentDensity = density;
    
    // Season influence
    if (season?.current === 'autumn') currentDensity *= 1.5;
    if (season?.current === 'winter') currentDensity *= 1.3;
    
    // Emotion influence
    if (emotion?.primary === 'sadness') currentDensity *= 1.8;
    if (emotion?.primary === 'calm') currentDensity *= 1.2;
    
    // Audio influence - bass clears fog
    const bass = audioFeatures?.bass ?? 0;
    currentDensity *= (1 - bass * 0.3);
    
    // Smooth transition
    fog.density = THREE.MathUtils.lerp(fog.density, currentDensity, 0.05);
    
    // Color based on emotion
    let fogColor = new THREE.Color(color);
    if (emotion?.primary === 'anger') {
      fogColor = new THREE.Color('#553322');
    } else if (emotion?.primary === 'calm') {
      fogColor = new THREE.Color('#aabbdd');
    } else if (emotion?.primary === 'sadness') {
      fogColor = new THREE.Color('#667788');
    }
    
    fog.color.lerp(fogColor, 0.02);
  });
  
  return null;
}

// Weather Manager
interface WeatherProps {
  type?: 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
  intensity?: number;
  autoFromEmotion?: boolean;
}

export function Weather({
  type = 'clear',
  intensity = 1,
  autoFromEmotion = true,
}: WeatherProps) {
  const emotion = useEmotion();
  const season = useSeason();
  
  // Auto-determine weather from emotion/season
  const currentWeather = useMemo(() => {
    if (!autoFromEmotion) return type;
    
    // Emotion-based
    if (emotion?.primary === 'sadness') return 'rain';
    if (emotion?.primary === 'anger') return 'storm';
    if (emotion?.primary === 'calm') return 'fog';
    
    // Season-based fallback
    if (season?.current === 'winter') return 'snow';
    if (season?.current === 'autumn') return 'fog';
    
    return type;
  }, [emotion?.primary, season?.current, type, autoFromEmotion]);
  
  return (
    <>
      {currentWeather === 'rain' && <Rain intensity={intensity} />}
      {currentWeather === 'snow' && <Snow />}
      {currentWeather === 'storm' && (
        <>
          <Rain count={8000} intensity={intensity * 1.5} speed={20} />
          <DynamicFog density={0.03} />
        </>
      )}
      {(currentWeather === 'fog' || currentWeather === 'storm') && (
        <DynamicFog />
      )}
    </>
  );
}

export default Weather;
