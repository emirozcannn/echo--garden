// Season Manager
// Controls seasonal transitions based on audio timeline

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonState {
  current: Season;
  progress: number; // 0-1 within current season
  totalProgress: number; // 0-1 of entire timeline
  transitioning: boolean;
  transitionProgress: number; // 0-1 of transition between seasons
}

export interface SeasonVisuals {
  // Colors
  groundColor: string;
  grassColor: string;
  leafColors: string[];
  skyGradient: string[];
  fogColor: string;
  
  // Environment
  sunPosition: { x: number; y: number; z: number };
  sunIntensity: number;
  ambientIntensity: number;
  fogDensity: number;
  
  // Particles
  particleType: 'pollen' | 'leaves' | 'snow' | 'rain' | 'none';
  particleColor: string;
  particleDensity: number;
  
  // Flora behavior
  leafDensity: number;
  flowerDensity: number;
  grassHeight: number;
}

const SEASON_VISUALS: Record<Season, SeasonVisuals> = {
  spring: {
    groundColor: '#3d2817',
    grassColor: '#68d391',
    leafColors: ['#48bb78', '#68d391', '#9ae6b4', '#c6f6d5'],
    skyGradient: ['#87ceeb', '#b0e0e6', '#98fb98'],
    fogColor: '#e0ffe0',
    sunPosition: { x: 50, y: 80, z: 50 },
    sunIntensity: 1.0,
    ambientIntensity: 0.6,
    fogDensity: 0.01,
    particleType: 'pollen',
    particleColor: '#fde047',
    particleDensity: 0.5,
    leafDensity: 0.7,
    flowerDensity: 0.8,
    grassHeight: 0.8,
  },
  summer: {
    groundColor: '#4a3728',
    grassColor: '#22c55e',
    leafColors: ['#166534', '#15803d', '#22c55e', '#4ade80'],
    skyGradient: ['#1e90ff', '#87ceeb', '#f0e68c'],
    fogColor: '#fffff0',
    sunPosition: { x: 0, y: 100, z: 0 },
    sunIntensity: 1.5,
    ambientIntensity: 0.8,
    fogDensity: 0.005,
    particleType: 'none',
    particleColor: '#ffffff',
    particleDensity: 0,
    leafDensity: 1.0,
    flowerDensity: 0.5,
    grassHeight: 1.0,
  },
  autumn: {
    groundColor: '#5c4033',
    grassColor: '#a3a355',
    leafColors: ['#dc2626', '#ea580c', '#f59e0b', '#eab308'],
    skyGradient: ['#ff6347', '#ffa500', '#4682b4'],
    fogColor: '#ffe4c4',
    sunPosition: { x: -50, y: 60, z: 50 },
    sunIntensity: 0.9,
    ambientIntensity: 0.5,
    fogDensity: 0.02,
    particleType: 'leaves',
    particleColor: '#f97316',
    particleDensity: 0.8,
    leafDensity: 0.5,
    flowerDensity: 0.1,
    grassHeight: 0.6,
  },
  winter: {
    groundColor: '#d1d5db',
    grassColor: '#9ca3af',
    leafColors: ['#4b5563', '#6b7280', '#9ca3af'],
    skyGradient: ['#4a5568', '#718096', '#a0aec0'],
    fogColor: '#e2e8f0',
    sunPosition: { x: -50, y: 40, z: -50 },
    sunIntensity: 0.5,
    ambientIntensity: 0.4,
    fogDensity: 0.03,
    particleType: 'snow',
    particleColor: '#ffffff',
    particleDensity: 1.0,
    leafDensity: 0.1,
    flowerDensity: 0,
    grassHeight: 0.3,
  },
};

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class SeasonManager {
  private currentSeasonIndex: number = 0;
  private totalDuration: number;
  private elapsedTime: number = 0;
  private seasonDuration: number;
  private transitionDuration: number = 5000; // 5 seconds transition
  
  constructor(totalDurationMs: number = 60000) {
    this.totalDuration = totalDurationMs;
    this.seasonDuration = totalDurationMs / 4;
  }
  
  update(deltaTime: number): SeasonState {
    this.elapsedTime += deltaTime;
    
    const totalProgress = Math.min(this.elapsedTime / this.totalDuration, 1);
    const currentSeasonIndex = Math.min(
      Math.floor(totalProgress * 4),
      SEASON_ORDER.length - 1
    );
    
    const seasonStartTime = currentSeasonIndex * this.seasonDuration;
    const seasonProgress = (this.elapsedTime - seasonStartTime) / this.seasonDuration;
    
    // Check if transitioning
    const transitionThreshold = 1 - (this.transitionDuration / this.seasonDuration);
    const transitioning = seasonProgress > transitionThreshold && currentSeasonIndex < 3;
    const transitionProgress = transitioning
      ? (seasonProgress - transitionThreshold) / (1 - transitionThreshold)
      : 0;
    
    this.currentSeasonIndex = currentSeasonIndex;
    
    return {
      current: SEASON_ORDER[currentSeasonIndex],
      progress: Math.min(seasonProgress, 1),
      totalProgress,
      transitioning,
      transitionProgress,
    };
  }
  
  reset(): void {
    this.elapsedTime = 0;
    this.currentSeasonIndex = 0;
  }
  
  setProgress(progress: number): void {
    this.elapsedTime = progress * this.totalDuration;
  }
  
  setDuration(durationMs: number): void {
    const currentProgress = this.elapsedTime / this.totalDuration;
    this.totalDuration = durationMs;
    this.seasonDuration = durationMs / 4;
    this.elapsedTime = currentProgress * durationMs;
  }
  
  getCurrentVisuals(): SeasonVisuals {
    return SEASON_VISUALS[SEASON_ORDER[this.currentSeasonIndex]];
  }
  
  getBlendedVisuals(state: SeasonState): SeasonVisuals {
    if (!state.transitioning) {
      return SEASON_VISUALS[state.current];
    }
    
    const currentVisuals = SEASON_VISUALS[state.current];
    const nextSeason = SEASON_ORDER[(this.currentSeasonIndex + 1) % 4];
    const nextVisuals = SEASON_VISUALS[nextSeason];
    
    return blendSeasonVisuals(currentVisuals, nextVisuals, state.transitionProgress);
  }
  
  get currentSeason(): Season {
    return SEASON_ORDER[this.currentSeasonIndex];
  }
  
  get progress(): number {
    return this.elapsedTime / this.totalDuration;
  }
}

// Blend two season visuals
function blendSeasonVisuals(
  from: SeasonVisuals,
  to: SeasonVisuals,
  t: number
): SeasonVisuals {
  return {
    groundColor: lerpColor(from.groundColor, to.groundColor, t),
    grassColor: lerpColor(from.grassColor, to.grassColor, t),
    leafColors: from.leafColors.map((c, i) => 
      lerpColor(c, to.leafColors[i] || to.leafColors[0], t)
    ),
    skyGradient: from.skyGradient.map((c, i) =>
      lerpColor(c, to.skyGradient[i] || to.skyGradient[0], t)
    ),
    fogColor: lerpColor(from.fogColor, to.fogColor, t),
    sunPosition: {
      x: lerp(from.sunPosition.x, to.sunPosition.x, t),
      y: lerp(from.sunPosition.y, to.sunPosition.y, t),
      z: lerp(from.sunPosition.z, to.sunPosition.z, t),
    },
    sunIntensity: lerp(from.sunIntensity, to.sunIntensity, t),
    ambientIntensity: lerp(from.ambientIntensity, to.ambientIntensity, t),
    fogDensity: lerp(from.fogDensity, to.fogDensity, t),
    particleType: t < 0.5 ? from.particleType : to.particleType,
    particleColor: lerpColor(from.particleColor, to.particleColor, t),
    particleDensity: lerp(from.particleDensity, to.particleDensity, t),
    leafDensity: lerp(from.leafDensity, to.leafDensity, t),
    flowerDensity: lerp(from.flowerDensity, to.flowerDensity, t),
    grassHeight: lerp(from.grassHeight, to.grassHeight, t),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Season emojis
export const SEASON_EMOJIS: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

// Season display names
export const SEASON_NAMES: Record<Season, string> = {
  spring: 'İlkbahar',
  summer: 'Yaz',
  autumn: 'Sonbahar',
  winter: 'Kış',
};
