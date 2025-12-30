// Water Surface with Ripples
// Audio-reactive water simulation

import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { useAudioFeatures, useEmotion } from '../hooks/useGarden';

// Water Shader Material
const WaterMaterial = shaderMaterial(
  {
    uTime: 0,
    uBass: 0,
    uMids: 0,
    uTreble: 0,
    uEnergy: 0,
    uBeat: 0,
    uColor1: new THREE.Color('#1a4a6e'),
    uColor2: new THREE.Color('#2d7d9a'),
    uFoamColor: new THREE.Color('#ffffff'),
    uReflectionStrength: 0.5,
    uWaveHeight: 0.3,
    uWaveSpeed: 1.0,
  },
  // Vertex Shader
  /* glsl */ `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uEnergy;
    uniform float uBeat;
    uniform float uWaveHeight;
    uniform float uWaveSpeed;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying float vElevation;
    
    // Simplex noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      vUv = uv;
      
      vec3 pos = position;
      float time = uTime * uWaveSpeed;
      
      // Multi-layered waves
      float wave1 = snoise(vec3(pos.x * 0.5, pos.z * 0.5, time * 0.5)) * 0.5;
      float wave2 = snoise(vec3(pos.x * 1.0, pos.z * 1.0, time * 0.7)) * 0.25;
      float wave3 = snoise(vec3(pos.x * 2.0, pos.z * 2.0, time * 1.0)) * 0.125;
      
      // Audio-reactive waves
      float bassWave = snoise(vec3(pos.x * 0.3, pos.z * 0.3, time * 0.3)) * uBass * 2.0;
      float midsWave = snoise(vec3(pos.x * 1.5, pos.z * 1.5, time * 0.8)) * uMids * 0.5;
      
      // Beat impact ripple
      float beatRipple = 0.0;
      if (uBeat > 0.5) {
        float dist = length(pos.xz);
        beatRipple = sin(dist * 2.0 - uTime * 10.0) * uBeat * 0.3 * (1.0 / (dist + 1.0));
      }
      
      // Combine waves
      float elevation = (wave1 + wave2 + wave3 + bassWave + midsWave + beatRipple) * uWaveHeight;
      pos.y += elevation;
      
      vElevation = elevation;
      
      // Calculate normal
      float delta = 0.1;
      float elevationX = snoise(vec3((pos.x + delta) * 0.5, pos.z * 0.5, time * 0.5)) * uWaveHeight;
      float elevationZ = snoise(vec3(pos.x * 0.5, (pos.z + delta) * 0.5, time * 0.5)) * uWaveHeight;
      
      vec3 tangentX = normalize(vec3(delta, elevationX - elevation, 0.0));
      vec3 tangentZ = normalize(vec3(0.0, elevationZ - elevation, delta));
      vNormal = cross(tangentZ, tangentX);
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    uniform float uTime;
    uniform float uEnergy;
    uniform float uTreble;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uFoamColor;
    uniform float uReflectionStrength;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying float vElevation;
    
    void main() {
      // Base water color gradient
      vec3 waterColor = mix(uColor1, uColor2, vElevation * 2.0 + 0.5);
      
      // Fresnel effect
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
      
      // Foam on wave peaks
      float foam = smoothstep(0.15, 0.25, vElevation);
      foam *= (1.0 + uTreble * 2.0); // More foam with treble
      
      // Specular highlight
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
      
      // Audio-reactive shimmer
      float shimmer = sin(vUv.x * 50.0 + uTime * 5.0) * sin(vUv.y * 50.0 + uTime * 3.0);
      shimmer *= uEnergy * 0.1;
      
      // Combine
      vec3 finalColor = waterColor;
      finalColor = mix(finalColor, uFoamColor, foam * 0.5);
      finalColor += vec3(specular) * uReflectionStrength;
      finalColor += vec3(fresnel * 0.2);
      finalColor += vec3(shimmer);
      
      // Transparency based on depth
      float alpha = 0.8 + fresnel * 0.2;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ WaterMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      waterMaterial: any;
    }
  }
}

// Water Surface Component
interface WaterSurfaceProps {
  position?: [number, number, number];
  size?: number;
  segments?: number;
  color1?: string;
  color2?: string;
  waveHeight?: number;
  waveSpeed?: number;
}

export function WaterSurface({
  position = [0, -0.5, 0],
  size = 100,
  segments = 128,
  color1 = '#1a4a6e',
  color2 = '#2d7d9a',
  waveHeight = 0.3,
  waveSpeed = 1.0,
}: WaterSurfaceProps) {
  const materialRef = useRef<any>();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  
  // Emotion-based colors
  const colors = useMemo(() => {
    if (!emotion) return { color1, color2 };
    
    switch (emotion.primary) {
      case 'calm':
        return { color1: '#2a5a7e', color2: '#4d9dba' };
      case 'anger':
        return { color1: '#4a2a2e', color2: '#7d4d4a' };
      case 'sadness':
        return { color1: '#2a3a4e', color2: '#4d5d6a' };
      case 'joy':
        return { color1: '#2a6a5e', color2: '#4dbdaa' };
      default:
        return { color1, color2 };
    }
  }, [emotion?.primary, color1, color2]);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uTime = state.clock.getElapsedTime();
    mat.uBass = audioFeatures?.bass ?? 0;
    mat.uMids = audioFeatures?.mids ?? 0;
    mat.uTreble = audioFeatures?.treble ?? 0;
    mat.uEnergy = audioFeatures?.energy ?? 0;
    mat.uBeat = audioFeatures?.beat ? 1 : 0;
    
    // Lerp colors
    mat.uColor1.lerp(new THREE.Color(colors.color1), 0.05);
    mat.uColor2.lerp(new THREE.Color(colors.color2), 0.05);
  });
  
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, segments, segments]} />
      <waterMaterial
        ref={materialRef}
        transparent
        side={THREE.DoubleSide}
        uWaveHeight={waveHeight}
        uWaveSpeed={waveSpeed}
      />
    </mesh>
  );
}

// Pond Component (circular water)
interface PondProps {
  position?: [number, number, number];
  radius?: number;
  depth?: number;
}

export function Pond({
  position = [0, 0, 0],
  radius = 5,
  depth = 0.5,
}: PondProps) {
  return (
    <group position={position}>
      {/* Water surface */}
      <mesh position={[0, -depth / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial
          color="#2d7d9a"
          transparent
          opacity={0.8}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>
      
      {/* Pond bed */}
      <mesh position={[0, -depth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#3d4a3a" />
      </mesh>
      
      {/* Rim */}
      <mesh position={[0, -depth / 4, 0]}>
        <torusGeometry args={[radius, 0.2, 8, 64]} />
        <meshStandardMaterial color="#5a6a5a" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default WaterSurface;
