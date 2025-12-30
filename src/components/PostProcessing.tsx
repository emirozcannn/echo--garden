// Post-Processing Effects
// Bloom, SSAO, Depth of Field, and other visual enhancements

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  ChromaticAberration,
  Vignette,
  SSAO,
  ToneMapping,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useAudioFeatures, useEmotion, useGardenStore } from '../hooks/useGarden';

interface PostProcessingProps {
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export function PostProcessing({ quality = 'high' }: PostProcessingProps) {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const settings = useGardenStore((state) => state.settings);
  
  // Dynamic bloom intensity based on audio
  const bloomRef = useRef({ intensity: 0.5, threshold: 0.8 });
  
  useFrame(() => {
    const energy = audioFeatures?.energy ?? 0;
    const treble = audioFeatures?.treble ?? 0;
    const beat = audioFeatures?.beat ?? false;
    
    // Bloom responds to treble and beats
    const targetIntensity = 0.3 + treble * 0.7 + (beat ? 0.3 : 0);
    bloomRef.current.intensity = THREE.MathUtils.lerp(
      bloomRef.current.intensity,
      targetIntensity,
      0.1
    );
    
    // Lower threshold on beats for more glow
    bloomRef.current.threshold = beat ? 0.6 : 0.8;
  });
  
  // Quality-based settings
  const ssaoConfig = useMemo(() => {
    switch (quality) {
      case 'low':
        return { samples: 8, radius: 5, intensity: 15 };
      case 'medium':
        return { samples: 16, radius: 8, intensity: 18 };
      case 'high':
        return { samples: 32, radius: 10, intensity: 20 };
      case 'ultra':
        return { samples: 64, radius: 12, intensity: 22 };
    }
  }, [quality]);
  
  // Emotion-based chromatic aberration
  const chromaticOffset = useMemo(() => {
    if (!emotion) return [0.001, 0.001];
    
    switch (emotion.primary) {
      case 'anger':
        return [0.003, 0.003]; // More distortion
      case 'sadness':
        return [0.002, 0.002];
      case 'joy':
        return [0.0005, 0.0005]; // Less distortion
      default:
        return [0.001, 0.001];
    }
  }, [emotion?.primary]);
  
  // Skip heavy effects on low quality
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomRef.current.intensity}
          luminanceThreshold={bloomRef.current.threshold}
          luminanceSmoothing={0.9}
          height={300}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }
  
  return (
    <EffectComposer multisampling={quality === 'ultra' ? 8 : 4}>
      {/* Bloom - Glow effect on bright areas */}
      <Bloom
        intensity={bloomRef.current.intensity}
        luminanceThreshold={bloomRef.current.threshold}
        luminanceSmoothing={0.9}
        height={quality === 'ultra' ? 600 : 400}
        mipmapBlur
      />
      
      {/* SSAO - Ambient Occlusion for depth */}
      {(quality === 'medium' || quality === 'high' || quality === 'ultra') && (
        <SSAO
          samples={ssaoConfig.samples}
          radius={ssaoConfig.radius}
          intensity={ssaoConfig.intensity}
          luminanceInfluence={0.6}
          color={new THREE.Color('#000000')}
          worldDistanceThreshold={100}
          worldDistanceFalloff={100}
          worldProximityThreshold={0.5}
          worldProximityFalloff={0.5}
        />
      )}
      
      {/* Depth of Field - Focus blur */}
      {quality === 'high' || quality === 'ultra' ? (
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.05}
          bokehScale={quality === 'ultra' ? 4 : 2}
          height={480}
        />
      ) : null}
      
      {/* Chromatic Aberration - Color fringing */}
      <ChromaticAberration
        offset={new THREE.Vector2(chromaticOffset[0], chromaticOffset[1])}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0.5}
      />
      
      {/* Vignette - Darkened edges */}
      <Vignette
        offset={0.3}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Film Noise - Subtle grain */}
      {quality === 'ultra' && (
        <Noise
          premultiply
          blendFunction={BlendFunction.ADD}
          opacity={0.02}
        />
      )}
      
      {/* Tone Mapping - HDR to SDR */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

// Dynamic DOF that follows audio
export function AudioReactiveDOF() {
  const { camera } = useThree();
  const audioFeatures = useAudioFeatures();
  const focusRef = useRef(0.02);
  
  useFrame(() => {
    const energy = audioFeatures?.energy ?? 0;
    
    // Focus distance changes with energy
    // Low energy = close focus (intimate), High energy = far focus (expansive)
    const targetFocus = 0.01 + energy * 0.03;
    focusRef.current = THREE.MathUtils.lerp(focusRef.current, targetFocus, 0.05);
  });
  
  return (
    <DepthOfField
      focusDistance={focusRef.current}
      focalLength={0.05}
      bokehScale={3}
      height={480}
    />
  );
}

// Emotion-based color grading
export function EmotionColorGrade() {
  const emotion = useEmotion();
  
  // Would need custom shader for full color grading
  // This is a simplified version using existing effects
  
  const vignetteSettings = useMemo(() => {
    if (!emotion) return { darkness: 0.5, offset: 0.3 };
    
    switch (emotion.primary) {
      case 'anger':
        return { darkness: 0.8, offset: 0.2 };
      case 'sadness':
        return { darkness: 0.7, offset: 0.2 };
      case 'calm':
        return { darkness: 0.3, offset: 0.4 };
      case 'joy':
        return { darkness: 0.2, offset: 0.5 };
      default:
        return { darkness: 0.5, offset: 0.3 };
    }
  }, [emotion?.primary]);
  
  return (
    <Vignette
      offset={vignetteSettings.offset}
      darkness={vignetteSettings.darkness}
      blendFunction={BlendFunction.NORMAL}
    />
  );
}

export default PostProcessing;
