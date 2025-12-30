// Advanced Audio Analyzer with Meyda.js
// Professional audio feature extraction for reactive visuals

import Meyda from 'meyda';
type MeydaAnalyzer = ReturnType<typeof Meyda.createMeydaAnalyzer>;
type MeydaFeaturesObject = any;

export interface AdvancedAudioFeatures {
  // Basic frequency bands (0-1 normalized)
  bass: number;
  lowMids: number;
  mids: number;
  highMids: number;
  treble: number;
  
  // Meyda features
  rms: number;                    // Root mean square (loudness)
  energy: number;                 // Total energy
  spectralCentroid: number;       // Brightness
  spectralFlatness: number;       // Noise vs tonal
  spectralRolloff: number;        // High frequency content
  spectralFlux: number;           // Rate of change
  spectralSpread: number;         // Width of spectrum
  spectralKurtosis: number;       // Peakiness
  spectralSkewness: number;       // Asymmetry
  zcr: number;                    // Zero crossing rate
  loudness: {
    specific: Float32Array;
    total: number;
  };
  perceptualSpread: number;
  perceptualSharpness: number;
  
  // Chroma (pitch classes)
  chroma: number[];               // 12 pitch classes
  
  // MFCCs (timbre)
  mfcc: number[];                 // Mel-frequency cepstral coefficients
  
  // Beat detection
  beat: boolean;
  bpm: number;
  onsetDetected: boolean;
  
  // Derived
  mood: 'bright' | 'dark' | 'neutral';
  texture: 'smooth' | 'rough' | 'rhythmic';
  
  // Raw data
  amplitudeSpectrum: Float32Array;
  powerSpectrum: Float32Array;
  buffer: Float32Array;
}

export interface MeydaConfig {
  audioContext: AudioContext;
  source: AudioNode;
  bufferSize: 512 | 1024 | 2048 | 4096;
  hopSize?: number;
  sampleRate?: number;
  numberOfMFCCCoefficients?: number;
}

export class AdvancedAudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private source: AudioNode | null = null;
  private analyzer: MeydaAnalyzer | null = null;
  private isRunning = false;
  
  // Feature history for smoothing and beat detection
  private energyHistory: number[] = [];
  private onsetHistory: number[] = [];
  private lastBeatTime = 0;
  private bpmHistory: number[] = [];
  private features: AdvancedAudioFeatures | null = null;
  
  // Smoothing
  private smoothedFeatures: Partial<AdvancedAudioFeatures> = {};
  private smoothingFactor = 0.8;
  
  // Callbacks
  private onFeatures: ((features: AdvancedAudioFeatures) => void) | null = null;
  
  constructor(private config?: Partial<MeydaConfig>) {}
  
  async initFromMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(stream);
      
      this.setupMeyda();
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }
  
  async initFromAudioElement(audioElement: HTMLAudioElement): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(audioElement);
      source.connect(this.audioContext.destination);
      this.source = source;
      
      this.setupMeyda();
    } catch (error) {
      console.error('Failed to connect audio element:', error);
      throw error;
    }
  }
  
  private setupMeyda(): void {
    if (!this.audioContext || !this.source) {
      throw new Error('Audio context and source must be initialized');
    }
    
    // Meyda feature extraction
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: this.config?.bufferSize ?? 2048,
      featureExtractors: [
        'rms',
        'energy',
        'spectralCentroid',
        'spectralFlatness',
        'spectralRolloff',
        'spectralFlux',
        'spectralSpread',
        'spectralKurtosis',
        'spectralSkewness',
        'zcr',
        'loudness',
        'perceptualSpread',
        'perceptualSharpness',
        'chroma',
        'mfcc',
        'amplitudeSpectrum',
        'powerSpectrum',
        'buffer',
      ],
      numberOfMFCCCoefficients: this.config?.numberOfMFCCCoefficients ?? 13,
      callback: this.handleFeatures.bind(this),
    });
  }
  
  private handleFeatures(meydaFeatures: MeydaFeaturesObject): void {
    if (!meydaFeatures || !this.audioContext) return;
    
    const now = performance.now();
    
    // Extract frequency bands from amplitude spectrum
    const spectrum = meydaFeatures.amplitudeSpectrum as Float32Array;
    const bands = this.extractFrequencyBands(spectrum);
    
    // Onset detection using spectral flux
    const flux = ((meydaFeatures as any).spectralFlux as number) ?? 0;
    const onsetDetected = this.detectOnset(flux);
    
    // Beat detection
    const { beat, bpm } = this.detectBeat(meydaFeatures.energy as number, now);
    
    // Derive mood from spectral characteristics
    const mood = this.deriveMood(meydaFeatures);
    
    // Derive texture
    const texture = this.deriveTexture(meydaFeatures);
    
    // Build advanced features
    const features: AdvancedAudioFeatures = {
      // Frequency bands
      bass: bands.bass,
      lowMids: bands.lowMids,
      mids: bands.mids,
      highMids: bands.highMids,
      treble: bands.treble,
      
      // Meyda features
      rms: this.normalize(meydaFeatures.rms as number, 0, 1),
      energy: this.normalize(meydaFeatures.energy as number, 0, 100),
      spectralCentroid: this.normalize(meydaFeatures.spectralCentroid as number, 0, 5000),
      spectralFlatness: meydaFeatures.spectralFlatness as number,
      spectralRolloff: this.normalize(meydaFeatures.spectralRolloff as number, 0, 10000),
      spectralFlux: this.normalize(flux, 0, 1),
      spectralSpread: this.normalize(meydaFeatures.spectralSpread as number, 0, 2000),
      spectralKurtosis: meydaFeatures.spectralKurtosis as number,
      spectralSkewness: meydaFeatures.spectralSkewness as number,
      zcr: this.normalize(meydaFeatures.zcr as number, 0, 0.5),
      loudness: meydaFeatures.loudness as { specific: Float32Array; total: number },
      perceptualSpread: meydaFeatures.perceptualSpread as number,
      perceptualSharpness: meydaFeatures.perceptualSharpness as number,
      
      // Chroma and MFCC
      chroma: meydaFeatures.chroma as number[],
      mfcc: meydaFeatures.mfcc as number[],
      
      // Beat
      beat,
      bpm,
      onsetDetected,
      
      // Derived
      mood,
      texture,
      
      // Raw
      amplitudeSpectrum: spectrum,
      powerSpectrum: meydaFeatures.powerSpectrum as Float32Array,
      buffer: new Float32Array(meydaFeatures.buffer as number[] || []),
    };
    
    // Apply smoothing
    this.features = this.smoothFeatures(features);
    
    // Fire callback
    if (this.onFeatures) {
      this.onFeatures(this.features);
    }
  }
  
  private extractFrequencyBands(spectrum: Float32Array): {
    bass: number;
    lowMids: number;
    mids: number;
    highMids: number;
    treble: number;
  } {
    if (!this.audioContext) {
      return { bass: 0, lowMids: 0, mids: 0, highMids: 0, treble: 0 };
    }
    
    const nyquist = this.audioContext.sampleRate / 2;
    const binCount = spectrum.length;
    
    const getRange = (lowHz: number, highHz: number): number => {
      const lowBin = Math.floor((lowHz / nyquist) * binCount);
      const highBin = Math.min(Math.floor((highHz / nyquist) * binCount), binCount - 1);
      
      let sum = 0;
      let count = 0;
      
      for (let i = lowBin; i <= highBin; i++) {
        sum += spectrum[i];
        count++;
      }
      
      const avg = count > 0 ? sum / count : 0;
      return Math.min(1, avg / 100); // Normalize
    };
    
    return {
      bass: getRange(20, 250),
      lowMids: getRange(250, 500),
      mids: getRange(500, 2000),
      highMids: getRange(2000, 4000),
      treble: getRange(4000, 16000),
    };
  }
  
  private detectOnset(flux: number): boolean {
    this.onsetHistory.push(flux);
    if (this.onsetHistory.length > 20) {
      this.onsetHistory.shift();
    }
    
    const avg = this.onsetHistory.reduce((a, b) => a + b, 0) / this.onsetHistory.length;
    const threshold = avg * 1.5 + 0.1;
    
    return flux > threshold;
  }
  
  private detectBeat(energy: number, now: number): { beat: boolean; bpm: number } {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) { // ~1 second at 43 fps
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const threshold = avgEnergy * 1.3;
    
    const minBeatInterval = 200; // ms - max 300 BPM
    const isBeat = energy > threshold && (now - this.lastBeatTime) > minBeatInterval;
    
    if (isBeat) {
      const interval = now - this.lastBeatTime;
      if (interval > 0 && interval < 2000) {
        const instantBpm = 60000 / interval;
        this.bpmHistory.push(instantBpm);
        if (this.bpmHistory.length > 10) {
          this.bpmHistory.shift();
        }
      }
      this.lastBeatTime = now;
    }
    
    const avgBpm = this.bpmHistory.length > 0
      ? this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length
      : 120;
    
    return { beat: isBeat, bpm: Math.round(avgBpm) };
  }
  
  private deriveMood(features: MeydaFeaturesObject): 'bright' | 'dark' | 'neutral' {
    const centroid = features.spectralCentroid as number;
    const flatness = features.spectralFlatness as number;
    
    // High centroid = bright, low = dark
    if (centroid > 3000 && flatness < 0.3) {
      return 'bright';
    } else if (centroid < 1500) {
      return 'dark';
    }
    return 'neutral';
  }
  
  private deriveTexture(features: MeydaFeaturesObject): 'smooth' | 'rough' | 'rhythmic' {
    const zcr = features.zcr as number;
    const flux = (features as any).spectralFlux as number ?? 0;
    
    if (zcr > 0.3 || flux > 0.5) {
      return 'rough';
    } else if (flux > 0.2) {
      return 'rhythmic';
    }
    return 'smooth';
  }
  
  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  
  private smoothFeatures(features: AdvancedAudioFeatures): AdvancedAudioFeatures {
    const smooth = (key: keyof AdvancedAudioFeatures, value: number): number => {
      const prev = (this.smoothedFeatures[key] as number) ?? value;
      const smoothed = prev * this.smoothingFactor + value * (1 - this.smoothingFactor);
      (this.smoothedFeatures as any)[key] = smoothed;
      return smoothed;
    };
    
    return {
      ...features,
      bass: smooth('bass', features.bass),
      lowMids: smooth('lowMids', features.lowMids),
      mids: smooth('mids', features.mids),
      highMids: smooth('highMids', features.highMids),
      treble: smooth('treble', features.treble),
      rms: smooth('rms', features.rms),
      energy: smooth('energy', features.energy),
      spectralCentroid: smooth('spectralCentroid', features.spectralCentroid),
    };
  }
  
  start(): void {
    if (this.analyzer && !this.isRunning) {
      this.analyzer.start();
      this.isRunning = true;
    }
  }
  
  stop(): void {
    if (this.analyzer && this.isRunning) {
      this.analyzer.stop();
      this.isRunning = false;
    }
  }
  
  getFeatures(): AdvancedAudioFeatures | null {
    return this.features;
  }
  
  setSmoothing(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
  
  onFeaturesCallback(callback: (features: AdvancedAudioFeatures) => void): void {
    this.onFeatures = callback;
  }
  
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.analyzer = null;
    this.audioContext = null;
    this.source = null;
  }
}

// Pitch tracking using autocorrelation
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const size = buffer.length;
  const correlation = new Float32Array(size);
  
  // Autocorrelation
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlation[lag] = sum;
  }
  
  // Find first peak after initial decline
  let maxCorr = 0;
  let maxLag = 0;
  let foundPeak = false;
  
  for (let i = 1; i < size; i++) {
    if (!foundPeak && correlation[i] < correlation[i - 1]) {
      foundPeak = true;
    }
    if (foundPeak && correlation[i] > maxCorr) {
      maxCorr = correlation[i];
      maxLag = i;
    }
  }
  
  if (maxLag === 0) return null;
  
  const frequency = sampleRate / maxLag;
  
  // Filter unrealistic frequencies (20Hz - 4000Hz)
  if (frequency < 20 || frequency > 4000) return null;
  
  return frequency;
}

// Note detection from frequency
export function frequencyToNote(freq: number): { note: string; octave: number; cents: number } {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // MIDI note number
  const midiNote = 12 * (Math.log2(freq / 440)) + 69;
  const roundedNote = Math.round(midiNote);
  
  const noteIndex = roundedNote % 12;
  const octave = Math.floor(roundedNote / 12) - 1;
  const cents = Math.round((midiNote - roundedNote) * 100);
  
  return {
    note: noteNames[noteIndex],
    octave,
    cents,
  };
}

export default AdvancedAudioAnalyzer;
