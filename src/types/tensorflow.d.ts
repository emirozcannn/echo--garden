// Type declarations for optional TensorFlow.js
// This module is optional and loaded dynamically

declare module '@tensorflow/tfjs' {
  export function tensor2d(values: number[][] | Float32Array[], shape?: number[]): any;
  export function sequential(): any;
  export function loadLayersModel(path: string): Promise<any>;
  export function ready(): Promise<void>;
  export function dispose(): void;
  
  export namespace layers {
    export function dense(config: {
      units: number;
      activation?: string;
      inputShape?: number[];
    }): any;
    export function dropout(config: { rate: number }): any;
  }
  
  export namespace train {
    export function adam(learningRate?: number): any;
  }
}
