// Audio Analyzer Engine
// Real-time audio feature extraction for reactive visuals

export interface AudioFeatures {
  // Frequency bands (0-1 normalized)
  bass: number;         // 20-250 Hz - trunk, roots, ground shake
  lowMids: number;      // 250-500 Hz - main branches
  mids: number;         // 500-2000 Hz - secondary branches
  highMids: number;     // 2000-4000 Hz - leaves
  treble: number;       // 4000-20000 Hz - particles, shimmer
  
  // Derived features
  energy: number;       // Overall energy (RMS)
  spectralCentroid: number;  // Brightness of sound
  spectralFlux: number; // Rate of change
  zeroCrossingRate: number;  // Noisiness
  silence: boolean;     // Is this a silent frame?
  
  // Rhythm
  bpm: number;
  beat: boolean;        // Is this a beat frame?
  
  // Raw data
  frequencyData: Float32Array;
  waveformData: Float32Array;
}

export interface AudioAnalyzerConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

const DEFAULT_CONFIG: AudioAnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
};

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private frequencyData: Float32Array = new Float32Array(0);
  private waveformData: Float32Array = new Float32Array(0);
  private previousSpectrum: Float32Array = new Float32Array(0);
  
  private config: AudioAnalyzerConfig;
  private isInitialized = false;
  
  // Beat detection
  private energyHistory: number[] = [];
  private lastBeatTime = 0;
  private bpmHistory: number[] = [];
  
  constructor(config: Partial<AudioAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  async initFromMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.setupAnalyser();
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }
  
  async initFromAudioElement(audioElement: HTMLAudioElement): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.audioContext.destination);
      this.setupAnalyser();
    } catch (error) {
      console.error('Failed to connect audio element:', error);
      throw error;
    }
  }
  
  private setupAnalyser(): void {
    if (!this.audioContext || !this.source) return;
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    this.analyser.minDecibels = this.config.minDecibels;
    this.analyser.maxDecibels = this.config.maxDecibels;
    
    this.source.connect(this.analyser);
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Float32Array(bufferLength);
    this.waveformData = new Float32Array(this.analyser.fftSize);
    this.previousSpectrum = new Float32Array(bufferLength);
    
    this.isInitialized = true;
  }
  
  getFeatures(): AudioFeatures {
    if (!this.isInitialized || !this.analyser) {
      return this.getEmptyFeatures();
    }
    
    // Get raw data
    this.analyser.getFloatFrequencyData(this.frequencyData as Float32Array<ArrayBuffer>);
    this.analyser.getFloatTimeDomainData(this.waveformData as Float32Array<ArrayBuffer>);
    
    // Calculate frequency bands
    const bass = this.getFrequencyRangeAverage(20, 250);
    const lowMids = this.getFrequencyRangeAverage(250, 500);
    const mids = this.getFrequencyRangeAverage(500, 2000);
    const highMids = this.getFrequencyRangeAverage(2000, 4000);
    const treble = this.getFrequencyRangeAverage(4000, 20000);
    
    // Calculate energy (RMS)
    const energy = this.calculateRMS();
    
    // Calculate spectral centroid
    const spectralCentroid = this.calculateSpectralCentroid();
    
    // Calculate spectral flux
    const spectralFlux = this.calculateSpectralFlux();
    
    // Calculate zero crossing rate
    const zeroCrossingRate = this.calculateZeroCrossingRate();
    
    // Beat detection
    const { beat, bpm } = this.detectBeat(energy);
    
    // Store previous spectrum for flux calculation
    this.previousSpectrum.set(this.frequencyData);
    
    return {
      bass,
      lowMids,
      mids,
      highMids,
      treble,
      energy,
      spectralCentroid,
      spectralFlux,
      zeroCrossingRate,
      silence: energy < 0.05,
      bpm,
      beat,
      frequencyData: this.frequencyData,
      waveformData: this.waveformData,
    };
  }
  
  private getFrequencyRangeAverage(lowFreq: number, highFreq: number): number {
    if (!this.analyser || !this.audioContext) return 0;
    
    const nyquist = this.audioContext.sampleRate / 2;
    const lowIndex = Math.round((lowFreq / nyquist) * this.frequencyData.length);
    const highIndex = Math.round((highFreq / nyquist) * this.frequencyData.length);
    
    let sum = 0;
    let count = 0;
    
    for (let i = lowIndex; i <= highIndex && i < this.frequencyData.length; i++) {
      // Convert from dB to linear (0-1)
      const normalized = (this.frequencyData[i] - this.config.minDecibels) / 
                        (this.config.maxDecibels - this.config.minDecibels);
      sum += Math.max(0, Math.min(1, normalized));
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }
  
  private calculateRMS(): number {
    let sum = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      sum += this.waveformData[i] * this.waveformData[i];
    }
    return Math.sqrt(sum / this.waveformData.length);
  }
  
  private calculateSpectralCentroid(): number {
    if (!this.audioContext) return 0;
    
    let weightedSum = 0;
    let sum = 0;
    const nyquist = this.audioContext.sampleRate / 2;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const amplitude = Math.pow(10, this.frequencyData[i] / 20); // dB to linear
      const frequency = (i / this.frequencyData.length) * nyquist;
      weightedSum += amplitude * frequency;
      sum += amplitude;
    }
    
    const centroid = sum > 0 ? weightedSum / sum : 0;
    // Normalize to 0-1 range
    return Math.min(1, centroid / 5000);
  }
  
  private calculateSpectralFlux(): number {
    let flux = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const diff = this.frequencyData[i] - this.previousSpectrum[i];
      // Only consider positive changes (onset detection)
      if (diff > 0) {
        flux += diff * diff;
      }
    }
    
    // Normalize
    return Math.min(1, Math.sqrt(flux) / 100);
  }
  
  private calculateZeroCrossingRate(): number {
    let crossings = 0;
    
    for (let i = 1; i < this.waveformData.length; i++) {
      if ((this.waveformData[i] >= 0 && this.waveformData[i - 1] < 0) ||
          (this.waveformData[i] < 0 && this.waveformData[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    // Normalize to 0-1
    return crossings / this.waveformData.length;
  }
  
  private detectBeat(energy: number): { beat: boolean; bpm: number } {
    const now = performance.now();
    const minBeatInterval = 200; // Min 300 BPM
    
    // Add to energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) { // ~1 second at 60fps
      this.energyHistory.shift();
    }
    
    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // Beat detection: energy spike above average
    const threshold = avgEnergy * 1.3;
    const isBeat = energy > threshold && (now - this.lastBeatTime) > minBeatInterval;
    
    if (isBeat) {
      // Calculate BPM from beat interval
      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        const instantBpm = 60000 / interval;
        
        if (instantBpm > 40 && instantBpm < 200) {
          this.bpmHistory.push(instantBpm);
          if (this.bpmHistory.length > 10) {
            this.bpmHistory.shift();
          }
        }
      }
      
      this.lastBeatTime = now;
    }
    
    // Average BPM
    const bpm = this.bpmHistory.length > 0
      ? this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length
      : 120;
    
    return { beat: isBeat, bpm };
  }
  
  private getEmptyFeatures(): AudioFeatures {
    return {
      bass: 0,
      lowMids: 0,
      mids: 0,
      highMids: 0,
      treble: 0,
      energy: 0,
      spectralCentroid: 0,
      spectralFlux: 0,
      zeroCrossingRate: 0,
      bpm: 120,
      beat: false,
      silence: true,
      frequencyData: new Float32Array(0),
      waveformData: new Float32Array(0),
    };
  }
  
  dispose(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
  
  get initialized(): boolean {
    return this.isInitialized;
  }
  
  get sampleRate(): number {
    return this.audioContext?.sampleRate || 44100;
  }
}

// Utility: Smooth value over time
export function smoothValue(
  current: number,
  target: number,
  smoothing: number = 0.1
): number {
  return current + (target - current) * smoothing;
}

// Utility: Map audio feature to garden parameter
export function mapAudioToGarden(
  features: AudioFeatures
): {
  trunkThickness: number;
  branchDensity: number;
  leafDensity: number;
  windStrength: number;
  particleIntensity: number;
  groundShake: number;
} {
  return {
    trunkThickness: 0.5 + features.bass * 1.5,
    branchDensity: 0.3 + features.mids * 0.7,
    leafDensity: 0.2 + features.highMids * 0.8,
    windStrength: features.treble * 2,
    particleIntensity: features.spectralFlux * 3,
    groundShake: features.beat ? features.bass * 0.5 : 0,
  };
}
