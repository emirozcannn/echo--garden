// Hooks Export Index

// Core state
export { 
  useGardenStore, 
  useAudioFeatures, 
  useEmotion, 
  useSeason, 
  useSeed, 
  useSettings, 
  useIsListening,
  type GardenState,
  type GardenSettings,
  type AudioSource,
} from './useGarden';

// Audio
export { useAudio } from './useAudio';

// Growth animation
export { 
  default as useGrowthAnimation,
  useGrowthAnimation as useGrowth,
  useStaggeredGrowth,
  useSeasonalGrowth,
  GrowingFlora,
  type GrowthConfig,
} from './useGrowthAnimation';

// Audio-visual mapping
export {
  default as useAudioVisualMapping,
  useFloraMapping,
  useEnvironmentMapping,
  MAPPING_PRESETS,
  DEFAULT_MAPPINGS,
  type AudioVisualMapping,
  type VisualTarget,
  type VisualEffect,
  type AudioFeature,
} from './useAudioVisualMapping';

// Camera effects
export {
  default as useCameraEffects,
  useCameraShake,
  useCameraPulse,
} from './useCameraEffects';
