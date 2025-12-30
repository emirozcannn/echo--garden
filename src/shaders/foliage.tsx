// Foliage Shader Material - React Three Fiber integration
// Wind-reactive leaves and grass

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { useAudioFeatures } from '../hooks/useGarden';

// Vertex Shader
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec3 uWindDirection;
  uniform float uBassIntensity;
  uniform float uTrebleIntensity;
  uniform float uEnergy;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vWindAmount;
  
  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
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
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
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
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 pos = position;
    
    // Wind noise
    float windNoise = snoise(vec3(
      pos.x * 0.1 + uTime * 0.5,
      pos.y * 0.1,
      pos.z * 0.1 + uTime * 0.3
    ));
    
    // Height factor (more movement at top)
    float heightFactor = smoothstep(0.0, 1.0, uv.y);
    
    // Calculate wind displacement
    float windAmount = windNoise * uWindStrength * heightFactor;
    windAmount += uBassIntensity * 0.3 * heightFactor;
    windAmount += sin(uTime * 8.0) * uTrebleIntensity * 0.1 * heightFactor;
    
    vec3 displacement = uWindDirection * windAmount;
    displacement.y += sin(uTime * 4.0 + pos.x) * uEnergy * 0.1 * heightFactor;
    
    pos += displacement;
    vWindAmount = windAmount;
    
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment Shader
const fragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uOpacity;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vWindAmount;
  
  void main() {
    // Gradient from base to tip
    vec3 color = mix(uBaseColor, uTipColor, vUv.y);
    
    // Wind-based color variation
    color = mix(color, color * 1.2, abs(vWindAmount) * 0.5);
    
    // Subsurface scattering (backlit glow)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float subsurface = max(0.0, dot(-vNormal, lightDir));
    color += vec3(0.2, 0.4, 0.1) * subsurface * 0.3;
    
    // Energy brightness
    color += color * uEnergy * 0.2;
    
    // Basic lighting
    float diffuse = max(0.0, dot(vNormal, lightDir));
    float ambient = 0.4;
    
    vec3 finalColor = color * (ambient + diffuse * 0.6);
    
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

// Create custom shader material
const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindStrength: 0.3,
    uWindDirection: new THREE.Vector3(1, 0, 0.5).normalize(),
    uBassIntensity: 0,
    uTrebleIntensity: 0,
    uEnergy: 0,
    uBaseColor: new THREE.Color('#2d5a27'),
    uTipColor: new THREE.Color('#48bb78'),
    uOpacity: 1,
  },
  vertexShader,
  fragmentShader
);

// Extend for use in JSX
extend({ FoliageMaterial });

// TypeScript declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      foliageMaterial: any;
    }
  }
}

// Hook for audio-reactive foliage material
export function useFoliageMaterial(baseColor: string = '#2d5a27', tipColor: string = '#48bb78') {
  const materialRef = useRef<any>(null);
  const audioFeatures = useAudioFeatures();
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    materialRef.current.uTime = state.clock.elapsedTime;
    materialRef.current.uBassIntensity = audioFeatures?.bass ?? 0;
    materialRef.current.uTrebleIntensity = audioFeatures?.treble ?? 0;
    materialRef.current.uEnergy = audioFeatures?.energy ?? 0;
    
    // Increase wind on beats
    if (audioFeatures?.beat) {
      materialRef.current.uWindStrength = Math.min(1, materialRef.current.uWindStrength + 0.3);
    } else {
      materialRef.current.uWindStrength = THREE.MathUtils.lerp(
        materialRef.current.uWindStrength,
        0.3,
        0.05
      );
    }
  });
  
  return (
    <foliageMaterial
      ref={materialRef}
      uBaseColor={new THREE.Color(baseColor)}
      uTipColor={new THREE.Color(tipColor)}
      transparent
      side={THREE.DoubleSide}
    />
  );
}

// Grass Blade component with wind shader
interface GrassBladeProps {
  position: [number, number, number];
  height?: number;
  color?: string;
}

export function GrassBlade({ position, height = 0.5, color = '#48bb78' }: GrassBladeProps) {
  const materialRef = useRef<any>(null);
  const audioFeatures = useAudioFeatures();
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.05, height, 1, 4);
    
    // Bend the grass blade
    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const normalizedY = (y + height / 2) / height;
      positions[i] += Math.sin(normalizedY * Math.PI * 0.5) * 0.02;
    }
    geo.attributes.position.needsUpdate = true;
    
    return geo;
  }, [height]);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    materialRef.current.uTime = state.clock.elapsedTime;
    materialRef.current.uBassIntensity = audioFeatures?.bass ?? 0;
    materialRef.current.uTrebleIntensity = audioFeatures?.treble ?? 0;
    materialRef.current.uEnergy = audioFeatures?.energy ?? 0;
  });
  
  const darkerColor = useMemo(() => {
    const c = new THREE.Color(color);
    c.multiplyScalar(0.6);
    return c;
  }, [color]);
  
  return (
    <mesh geometry={geometry} position={position}>
      <foliageMaterial
        ref={materialRef}
        uBaseColor={darkerColor}
        uTipColor={new THREE.Color(color)}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Instanced grass field for performance
export function GrassField({ 
  count = 1000, 
  area = 30,
  color = '#48bb78'
}: { 
  count?: number; 
  area?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const audioFeatures = useAudioFeatures();
  
  // Generate grass positions
  const { matrix, positions } = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const positions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * area;
      const z = (Math.random() - 0.5) * area;
      const y = 0;
      const scale = 0.5 + Math.random() * 0.5;
      const rotation = Math.random() * Math.PI;
      
      positions.push(new THREE.Vector3(x, y, z));
    }
    
    return { matrix, positions };
  }, [count, area]);
  
  // Create blade geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.05, 0.6, 1, 4);
    
    // Bend blade
    const posAttr = geo.attributes.position.array;
    for (let i = 0; i < posAttr.length; i += 3) {
      const y = posAttr[i + 1];
      const normalizedY = (y + 0.3) / 0.6;
      posAttr[i] += Math.sin(normalizedY * Math.PI * 0.5) * 0.02;
    }
    
    return geo;
  }, []);
  
  // Initialize instances
  useMemo(() => {
    if (!meshRef.current) return;
    
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    positions.forEach((pos, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
      scale.set(1, 0.5 + Math.random() * 0.5, 1);
      
      matrix.compose(pos, quaternion, scale);
      meshRef.current!.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  
  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent
        alphaTest={0.5}
      />
    </instancedMesh>
  );
}

export { FoliageMaterial };
export default FoliageMaterial;
