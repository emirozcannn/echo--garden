// Volumetric Cloud System
// Ray marching based cloud rendering with audio reactivity

import { useRef, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { useAudioFeatures, useEmotion, useSeason } from '../hooks/useGarden';

// Cloud Shader Material
const CloudMaterial = shaderMaterial(
  {
    uTime: 0,
    uResolution: new THREE.Vector2(1, 1),
    uCameraPos: new THREE.Vector3(),
    uSunPosition: new THREE.Vector3(100, 100, 100),
    uCloudCoverage: 0.5,
    uCloudDensity: 0.3,
    uCloudSpeed: 0.02,
    uBass: 0,
    uEnergy: 0,
    uEmotion: 0, // 0: neutral, 1: calm, 2: angry, 3: sad
  },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  /* glsl */ `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uCameraPos;
    uniform vec3 uSunPosition;
    uniform float uCloudCoverage;
    uniform float uCloudDensity;
    uniform float uCloudSpeed;
    uniform float uBass;
    uniform float uEnergy;
    uniform float uEmotion;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    #define MAX_STEPS 64
    #define MAX_DIST 100.0
    #define CLOUD_MIN 5.0
    #define CLOUD_MAX 15.0
    
    // Noise functions
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }
    
    float fbm(vec3 p, int octaves) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value;
    }
    
    // Cloud density at point
    float cloudDensity(vec3 p) {
      // Audio-reactive movement
      vec3 offset = vec3(uTime * uCloudSpeed, 0.0, uBass * 2.0);
      
      // Base cloud shape
      float density = fbm(p * 0.1 + offset, 5);
      
      // Height falloff
      float heightFactor = smoothstep(CLOUD_MIN, CLOUD_MIN + 2.0, p.y) * 
                          smoothstep(CLOUD_MAX, CLOUD_MAX - 2.0, p.y);
      
      // Audio influence
      density += uEnergy * 0.2;
      
      // Emotion influence
      if (uEmotion > 1.5 && uEmotion < 2.5) {
        // Angry - turbulent clouds
        density += noise(p * 0.5 + uTime) * 0.3;
      } else if (uEmotion > 2.5) {
        // Sad - heavy, low clouds
        density *= 1.5;
      }
      
      return (density - (1.0 - uCloudCoverage)) * uCloudDensity * heightFactor;
    }
    
    // Ray march through clouds
    vec4 raymarchClouds(vec3 ro, vec3 rd) {
      vec4 color = vec4(0.0);
      
      // Find intersection with cloud layer
      float tMin = (CLOUD_MIN - ro.y) / rd.y;
      float tMax = (CLOUD_MAX - ro.y) / rd.y;
      
      if (tMin > tMax) {
        float temp = tMin;
        tMin = tMax;
        tMax = temp;
      }
      
      if (tMax < 0.0) return color;
      tMin = max(tMin, 0.0);
      
      float stepSize = (tMax - tMin) / float(MAX_STEPS);
      float t = tMin;
      
      // Sun direction for lighting
      vec3 sunDir = normalize(uSunPosition);
      
      for (int i = 0; i < MAX_STEPS; i++) {
        if (color.a > 0.95) break;
        
        vec3 p = ro + rd * t;
        float density = cloudDensity(p);
        
        if (density > 0.0) {
          // Simple lighting
          float lightDensity = cloudDensity(p + sunDir * 0.5);
          float shadow = exp(-lightDensity * 2.0);
          
          // Cloud color based on lighting and emotion
          vec3 cloudColor = vec3(1.0);
          
          if (uEmotion < 0.5) {
            // Neutral - white clouds
            cloudColor = mix(vec3(0.8, 0.85, 0.9), vec3(1.0), shadow);
          } else if (uEmotion < 1.5) {
            // Calm - soft pink/purple
            cloudColor = mix(vec3(0.7, 0.6, 0.8), vec3(1.0, 0.9, 0.95), shadow);
          } else if (uEmotion < 2.5) {
            // Angry - orange/red
            cloudColor = mix(vec3(0.4, 0.2, 0.1), vec3(1.0, 0.6, 0.3), shadow);
          } else {
            // Sad - gray/blue
            cloudColor = mix(vec3(0.3, 0.35, 0.4), vec3(0.6, 0.65, 0.7), shadow);
          }
          
          // Accumulate
          float alpha = density * stepSize * 2.0;
          color.rgb += cloudColor * alpha * (1.0 - color.a);
          color.a += alpha * (1.0 - color.a);
        }
        
        t += stepSize;
      }
      
      return color;
    }
    
    void main() {
      // Ray direction from camera
      vec3 ro = uCameraPos;
      vec3 rd = normalize(vWorldPosition - uCameraPos);
      
      // Raymarch clouds
      vec4 clouds = raymarchClouds(ro, rd);
      
      // Sky gradient
      float skyGradient = smoothstep(-0.1, 0.5, rd.y);
      vec3 skyColor = mix(vec3(0.6, 0.7, 0.9), vec3(0.3, 0.5, 0.8), skyGradient);
      
      // Emotion-based sky
      if (uEmotion > 0.5 && uEmotion < 1.5) {
        // Calm - sunset colors
        skyColor = mix(vec3(0.8, 0.6, 0.7), vec3(0.4, 0.3, 0.6), skyGradient);
      } else if (uEmotion > 1.5 && uEmotion < 2.5) {
        // Angry - red sky
        skyColor = mix(vec3(0.8, 0.3, 0.2), vec3(0.4, 0.1, 0.1), skyGradient);
      } else if (uEmotion > 2.5) {
        // Sad - gray sky
        skyColor = mix(vec3(0.5, 0.5, 0.55), vec3(0.3, 0.35, 0.4), skyGradient);
      }
      
      // Combine sky and clouds
      vec3 finalColor = mix(skyColor, clouds.rgb, clouds.a);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ CloudMaterial });

// Type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      cloudMaterial: any;
    }
  }
}

// Cloud Dome Component
interface VolumetricCloudsProps {
  coverage?: number;
  density?: number;
  speed?: number;
  sunPosition?: [number, number, number];
}

export function VolumetricClouds({
  coverage = 0.5,
  density = 0.3,
  speed = 0.02,
  sunPosition = [100, 100, 100],
}: VolumetricCloudsProps) {
  const materialRef = useRef<any>();
  const { camera, size } = useThree();
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const season = useSeason();
  
  // Get emotion index
  const emotionIndex = useMemo(() => {
    if (!emotion) return 0;
    switch (emotion.primary) {
      case 'calm': return 1;
      case 'anger': return 2;
      case 'sadness': return 3;
      default: return 0;
    }
  }, [emotion?.primary]);
  
  // Season-based coverage
  const seasonCoverage = useMemo(() => {
    if (!season) return coverage;
    switch (season.current) {
      case 'spring': return coverage * 0.8;
      case 'summer': return coverage * 0.6;
      case 'autumn': return coverage * 1.0;
      case 'winter': return coverage * 1.2;
      default: return coverage;
    }
  }, [season?.current, coverage]);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uTime = state.clock.getElapsedTime();
    mat.uCameraPos.copy(camera.position);
    mat.uResolution.set(size.width, size.height);
    mat.uCloudCoverage = seasonCoverage;
    mat.uCloudDensity = density;
    mat.uCloudSpeed = speed;
    mat.uBass = audioFeatures?.bass ?? 0;
    mat.uEnergy = audioFeatures?.energy ?? 0;
    mat.uEmotion = emotionIndex;
  });
  
  return (
    <mesh scale={[200, 200, 200]}>
      <sphereGeometry args={[1, 32, 32]} />
      <cloudMaterial
        ref={materialRef}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        uSunPosition={new THREE.Vector3(...sunPosition)}
      />
    </mesh>
  );
}

export default VolumetricClouds;
