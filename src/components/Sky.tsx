// Sky Component
// Dynamic sky with emotion and season based atmospheres

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEmotion, useSeason, useAudioFeatures } from '../hooks/useGarden';

interface SkyProps {
  audioReactive?: boolean;
}

export function Sky({ audioReactive = true }: SkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const emotion = useEmotion();
  const season = useSeason();
  const audioFeatures = useAudioFeatures();
  
  // Get sky colors based on emotion and season
  const skyColors = useMemo(() => {
    // Default colors
    let topColor = '#0a0a1a';
    let midColor = '#1a1a2e';
    let bottomColor = '#2d2d44';
    
    // Season-based
    if (season?.current) {
      switch (season.current) {
        case 'spring':
          topColor = '#1a1a2e';
          midColor = '#2d3a4a';
          bottomColor = '#4a5a6a';
          break;
        case 'summer':
          topColor = '#1a2a4a';
          midColor = '#3a4a6a';
          bottomColor = '#6a7a9a';
          break;
        case 'autumn':
          topColor = '#2a1a1a';
          midColor = '#4a2a2a';
          bottomColor = '#6a4a3a';
          break;
        case 'winter':
          topColor = '#1a1a2a';
          midColor = '#2a3a4a';
          bottomColor = '#4a5a6a';
          break;
      }
    }
    
    // Emotion override
    if (emotion?.primary) {
      switch (emotion.primary) {
        case 'anger':
          topColor = '#1a0505';
          midColor = '#3a1515';
          bottomColor = '#5a2525';
          break;
        case 'calm':
          topColor = '#051a1a';
          midColor = '#153a3a';
          bottomColor = '#255a5a';
          break;
        case 'joy':
          topColor = '#1a1a05';
          midColor = '#3a3a15';
          bottomColor = '#5a5a25';
          break;
        case 'sadness':
          topColor = '#0a0a1a';
          midColor = '#1a1a2a';
          bottomColor = '#2a2a3a';
          break;
        case 'thought':
          topColor = '#0a051a';
          midColor = '#1a153a';
          bottomColor = '#2a255a';
          break;
      }
    }
    
    return { topColor, midColor, bottomColor };
  }, [emotion?.primary, season?.current]);
  
  // Create gradient shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(skyColors.topColor) },
        midColor: { value: new THREE.Color(skyColors.midColor) },
        bottomColor: { value: new THREE.Color(skyColors.bottomColor) },
        time: { value: 0 },
        audioEnergy: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float time;
        uniform float audioEnergy;
        
        varying vec3 vWorldPosition;
        
        // Simple noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          float height = normalize(vWorldPosition).y;
          
          // Gradient mixing
          vec3 color;
          if (height > 0.0) {
            color = mix(midColor, topColor, height);
          } else {
            color = mix(midColor, bottomColor, -height);
          }
          
          // Add subtle noise for atmosphere
          vec2 uv = vWorldPosition.xz * 0.01 + time * 0.01;
          float n = noise(uv) * 0.05;
          color += n * audioEnergy;
          
          // Aurora effect on high energy
          if (audioEnergy > 0.5) {
            float aurora = sin(vWorldPosition.x * 0.1 + time) * 0.5 + 0.5;
            aurora *= smoothstep(0.3, 0.8, height);
            color += vec3(0.1, 0.3, 0.2) * aurora * (audioEnergy - 0.5) * 2.0;
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, [skyColors]);
  
  // Update uniforms
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.time.value = state.clock.elapsedTime;
    
    if (audioReactive && audioFeatures) {
      material.uniforms.audioEnergy.value = audioFeatures.energy;
    }
    
    // Smooth color transitions
    material.uniforms.topColor.value.lerp(new THREE.Color(skyColors.topColor), 0.02);
    material.uniforms.midColor.value.lerp(new THREE.Color(skyColors.midColor), 0.02);
    material.uniforms.bottomColor.value.lerp(new THREE.Color(skyColors.bottomColor), 0.02);
  });
  
  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[100, 32, 32]} />
    </mesh>
  );
}

// Stars for night sky
export function Stars({ count = 500 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const audioFeatures = useAudioFeatures();
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Distribute on hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // Upper hemisphere
      const radius = 90 + Math.random() * 5;
      
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.cos(phi);
      pos[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    
    return pos;
  }, [count]);
  
  // Twinkle animation
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.elapsedTime;
    const treble = audioFeatures?.treble ?? 0;
    
    // Modulate size for twinkle
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.size = 0.3 + Math.sin(time * 2) * 0.1 + treble * 0.2;
  });
  
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
      <pointsMaterial
        size={0.3}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation={false}
      />
    </points>
  );
}

// Sun/Moon light source
export function CelestialLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const season = useSeason();
  const emotion = useEmotion();
  
  // Get light properties based on state
  const lightProps = useMemo(() => {
    let color = '#ffeedd';
    let intensity = 1;
    let position: [number, number, number] = [10, 20, 10];
    
    if (season?.current) {
      switch (season.current) {
        case 'spring':
          color = '#fff5e6';
          intensity = 1.0;
          position = [15, 25, 15];
          break;
        case 'summer':
          color = '#fffff0';
          intensity = 1.5;
          position = [0, 30, 0];
          break;
        case 'autumn':
          color = '#ffddaa';
          intensity = 0.9;
          position = [-10, 15, 10];
          break;
        case 'winter':
          color = '#e0e8f0';
          intensity = 0.6;
          position = [-15, 10, -15];
          break;
      }
    }
    
    if (emotion?.primary) {
      switch (emotion.primary) {
        case 'anger':
          color = '#ff6644';
          intensity *= 1.2;
          break;
        case 'calm':
          color = '#88ddee';
          intensity *= 0.8;
          break;
        case 'joy':
          color = '#ffee44';
          intensity *= 1.3;
          break;
        case 'sadness':
          color = '#8899aa';
          intensity *= 0.5;
          break;
      }
    }
    
    return { color, intensity, position };
  }, [season?.current, emotion?.primary]);
  
  // Smooth light movement
  useFrame(() => {
    if (!lightRef.current) return;
    
    lightRef.current.position.lerp(
      new THREE.Vector3(...lightProps.position),
      0.02
    );
    lightRef.current.intensity += (lightProps.intensity - lightRef.current.intensity) * 0.02;
  });
  
  return (
    <>
      <directionalLight
        ref={lightRef}
        color={lightProps.color}
        intensity={lightProps.intensity}
        position={lightProps.position}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <ambientLight color="#404060" intensity={0.3} />
    </>
  );
}
