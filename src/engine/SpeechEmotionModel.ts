// TensorFlow.js Speech Emotion Recognition
// Deep learning based emotion detection from speech

// Note: Requires TensorFlow.js to be installed:
// npm install @tensorflow/tfjs

interface EmotionPrediction {
  emotion: 'anger' | 'calm' | 'joy' | 'sadness' | 'fear' | 'surprise' | 'disgust' | 'neutral';
  confidence: number;
}

interface SpeechEmotionResult {
  primary: EmotionPrediction;
  all: EmotionPrediction[];
  features: {
    arousal: number;      // Low (calm) to High (excited) 
    valence: number;      // Negative to Positive
    dominance: number;    // Submissive to Dominant
  };
}

// Simple emotion classifier using audio features
// (Fallback when TensorFlow model is not loaded)
export class SimpleEmotionClassifier {
  private history: SpeechEmotionResult[] = [];
  private smoothingWindow = 10;
  
  classify(audioFeatures: {
    energy: number;
    spectralCentroid: number;
    spectralFlux: number;
    zcr: number;
    mfcc?: number[];
    pitch?: number;
  }): SpeechEmotionResult {
    const scores: Record<string, number> = {
      anger: 0,
      calm: 0,
      joy: 0,
      sadness: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      neutral: 0,
    };
    
    const { energy, spectralCentroid, spectralFlux, zcr, pitch } = audioFeatures;
    
    // === Feature-based heuristics ===
    
    // High energy + high ZCR + high flux = Anger or Fear
    if (energy > 0.6 && zcr > 0.3) {
      if (spectralFlux > 0.5) {
        scores.anger += 0.4;
        scores.fear += 0.2;
      }
    }
    
    // High energy + high centroid (bright) = Joy or Surprise
    if (energy > 0.4 && spectralCentroid > 0.5) {
      scores.joy += 0.3;
      if (spectralFlux > 0.4) {
        scores.surprise += 0.3;
      }
    }
    
    // Low energy + low centroid = Sadness
    if (energy < 0.3 && spectralCentroid < 0.4) {
      scores.sadness += 0.4;
    }
    
    // Low energy + low flux = Calm
    if (energy < 0.4 && spectralFlux < 0.2) {
      scores.calm += 0.4;
    }
    
    // Neutral default
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < 0.3) {
      scores.neutral = 0.5;
    }
    
    // Pitch-based adjustments (if available)
    if (pitch !== undefined) {
      // High pitch variation = more emotional
      // Low, stable pitch = calm/sad
      const normalizedPitch = Math.min(1, pitch / 400);
      
      if (normalizedPitch > 0.6) {
        scores.joy += 0.1;
        scores.surprise += 0.1;
        scores.anger += 0.05;
      } else if (normalizedPitch < 0.3) {
        scores.sadness += 0.1;
        scores.calm += 0.1;
      }
    }
    
    // Normalize scores
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const predictions: EmotionPrediction[] = Object.entries(scores)
      .map(([emotion, score]) => ({
        emotion: emotion as EmotionPrediction['emotion'],
        confidence: score / total,
      }))
      .sort((a, b) => b.confidence - a.confidence);
    
    // Calculate dimensional emotions
    const arousal = (scores.anger + scores.joy + scores.fear + scores.surprise) / 2;
    const valence = (scores.joy + scores.calm - scores.anger - scores.sadness - scores.fear) / 2 + 0.5;
    const dominance = (scores.anger - scores.fear - scores.sadness) / 2 + 0.5;
    
    const result: SpeechEmotionResult = {
      primary: predictions[0],
      all: predictions,
      features: {
        arousal: Math.max(0, Math.min(1, arousal)),
        valence: Math.max(0, Math.min(1, valence)),
        dominance: Math.max(0, Math.min(1, dominance)),
      },
    };
    
    // Smooth results
    return this.smoothResult(result);
  }
  
  private smoothResult(result: SpeechEmotionResult): SpeechEmotionResult {
    this.history.push(result);
    if (this.history.length > this.smoothingWindow) {
      this.history.shift();
    }
    
    if (this.history.length < 2) return result;
    
    // Average confidence scores
    const avgScores: Record<string, number> = {};
    const emotions = result.all.map(p => p.emotion);
    
    emotions.forEach(emotion => {
      const scores = this.history.map(h => 
        h.all.find(p => p.emotion === emotion)?.confidence ?? 0
      );
      avgScores[emotion] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });
    
    const smoothedPredictions: EmotionPrediction[] = emotions
      .map(emotion => ({
        emotion,
        confidence: avgScores[emotion],
      }))
      .sort((a, b) => b.confidence - a.confidence);
    
    // Average features
    const avgFeatures = {
      arousal: this.history.reduce((a, h) => a + h.features.arousal, 0) / this.history.length,
      valence: this.history.reduce((a, h) => a + h.features.valence, 0) / this.history.length,
      dominance: this.history.reduce((a, h) => a + h.features.dominance, 0) / this.history.length,
    };
    
    return {
      primary: smoothedPredictions[0],
      all: smoothedPredictions,
      features: avgFeatures,
    };
  }
  
  reset(): void {
    this.history = [];
  }
}

// TensorFlow.js based emotion classifier
// Uses pre-trained model for more accurate predictions
export class TFEmotionClassifier {
  private model: any = null; // tf.LayersModel
  private isLoaded = false;
  private fallbackClassifier = new SimpleEmotionClassifier();
  
  async loadModel(modelUrl?: string): Promise<void> {
    try {
      // Dynamic import to avoid loading TF when not needed
      const tf = await import(/* @vite-ignore */ '@tensorflow/tfjs').catch(() => null);
      
      if (!tf) {
        console.warn('TensorFlow.js not available, using fallback classifier');
        return;
      }
      
      if (modelUrl) {
        this.model = await tf.loadLayersModel(modelUrl);
      } else {
        // Use embedded simple model
        this.model = await this.createSimpleModel(tf);
      }
      
      this.isLoaded = true;
      console.log('Emotion model loaded');
    } catch (error) {
      console.warn('Failed to load TensorFlow model, using fallback:', error);
    }
  }
  
  private async createSimpleModel(tf: any): Promise<any> {
    // Simple MLP model for emotion classification
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      inputShape: [40], // 13 MFCCs + other features
      units: 128,
      activation: 'relu',
    }));
    
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
    }));
    
    model.add(tf.layers.dense({
      units: 8, // 8 emotions
      activation: 'softmax',
    }));
    
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    
    return model;
  }
  
  async classify(audioFeatures: {
    mfcc: number[];
    energy: number;
    spectralCentroid: number;
    spectralFlux: number;
    zcr: number;
    pitch?: number;
  }): Promise<SpeechEmotionResult> {
    // Use fallback if model not loaded
    if (!this.isLoaded || !this.model) {
      return this.fallbackClassifier.classify(audioFeatures);
    }
    
    try {
      const tf = await import(/* @vite-ignore */ '@tensorflow/tfjs').catch(() => null);
      if (!tf) {
        return this.fallbackClassifier.classify(audioFeatures);
      }
      
      // Prepare features
      const features = this.prepareFeatures(audioFeatures);
      const inputTensor = tf.tensor2d([features]);
      
      // Predict
      const predictions = this.model.predict(inputTensor) as any;
      const probabilities = await predictions.array();
      
      // Clean up
      inputTensor.dispose();
      predictions.dispose();
      
      const emotions: EmotionPrediction['emotion'][] = [
        'anger', 'calm', 'joy', 'sadness', 'fear', 'surprise', 'disgust', 'neutral'
      ];
      
      const results: EmotionPrediction[] = emotions
        .map((emotion, i) => ({
          emotion,
          confidence: probabilities[0][i],
        }))
        .sort((a, b) => b.confidence - a.confidence);
      
      // Calculate dimensional emotions
      const arousal = results[0].confidence * (
        ['anger', 'joy', 'fear', 'surprise'].includes(results[0].emotion) ? 1 : 0.3
      );
      const valence = (['joy', 'calm'].includes(results[0].emotion) ? 1 : 0) -
                     (['anger', 'sadness', 'fear'].includes(results[0].emotion) ? 1 : 0);
      
      return {
        primary: results[0],
        all: results,
        features: {
          arousal: Math.max(0, Math.min(1, arousal)),
          valence: Math.max(0, Math.min(1, (valence + 1) / 2)),
          dominance: 0.5,
        },
      };
    } catch (error) {
      console.error('TF prediction failed:', error);
      return this.fallbackClassifier.classify(audioFeatures);
    }
  }
  
  private prepareFeatures(audioFeatures: {
    mfcc: number[];
    energy: number;
    spectralCentroid: number;
    spectralFlux: number;
    zcr: number;
    pitch?: number;
  }): number[] {
    const features: number[] = [];
    
    // MFCCs (pad to 13 if needed)
    const mfcc = audioFeatures.mfcc || [];
    for (let i = 0; i < 13; i++) {
      features.push(mfcc[i] ?? 0);
    }
    
    // Delta MFCCs (placeholder - would compute from history)
    for (let i = 0; i < 13; i++) {
      features.push(0);
    }
    
    // Other features
    features.push(audioFeatures.energy);
    features.push(audioFeatures.spectralCentroid);
    features.push(audioFeatures.spectralFlux);
    features.push(audioFeatures.zcr);
    features.push(audioFeatures.pitch ?? 0);
    
    // Pad to 40 features
    while (features.length < 40) {
      features.push(0);
    }
    
    return features.slice(0, 40);
  }
  
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isLoaded = false;
  }
}

// Map TF emotions to garden emotions
export function mapToGardenEmotion(
  result: SpeechEmotionResult
): { primary: 'anger' | 'calm' | 'joy' | 'sadness' | 'thought' | 'neutral'; intensity: number } {
  const mapping: Record<string, 'anger' | 'calm' | 'joy' | 'sadness' | 'thought' | 'neutral'> = {
    anger: 'anger',
    calm: 'calm',
    joy: 'joy',
    sadness: 'sadness',
    fear: 'sadness', // Map fear to sadness
    surprise: 'joy', // Map surprise to joy
    disgust: 'anger', // Map disgust to anger
    neutral: 'neutral',
  };
  
  // If thinking detected (medium arousal, neutral valence)
  if (
    result.features.arousal > 0.3 && result.features.arousal < 0.6 &&
    result.features.valence > 0.4 && result.features.valence < 0.6
  ) {
    return { primary: 'thought', intensity: result.primary.confidence };
  }
  
  return {
    primary: mapping[result.primary.emotion] || 'neutral',
    intensity: result.primary.confidence,
  };
}

export { SimpleEmotionClassifier as FallbackEmotionClassifier };
export default TFEmotionClassifier;
