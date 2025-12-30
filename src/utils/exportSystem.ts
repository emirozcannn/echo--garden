// Export System
// Screenshot, video recording, and 3D model export

import { useCallback, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Screenshot Export
export function useScreenshot() {
  const { gl, scene, camera } = useThree();
  
  const captureScreenshot = useCallback((
    options: {
      width?: number;
      height?: number;
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
      filename?: string;
    } = {}
  ) => {
    const {
      width = window.innerWidth * 2,
      height = window.innerHeight * 2,
      format = 'png',
      quality = 0.95,
      filename = `echo-garden-${Date.now()}`,
    } = options;
    
    // Store original size
    const originalSize = gl.getSize(new THREE.Vector2());
    
    // Create high-res render target
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    // Render to target
    gl.setRenderTarget(renderTarget);
    gl.render(scene, camera);
    
    // Read pixels
    const pixels = new Uint8Array(width * height * 4);
    gl.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels);
    
    // Flip vertically (WebGL renders upside down)
    const flippedPixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;
        flippedPixels[dstIdx] = pixels[srcIdx];
        flippedPixels[dstIdx + 1] = pixels[srcIdx + 1];
        flippedPixels[dstIdx + 2] = pixels[srcIdx + 2];
        flippedPixels[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }
    
    // Create canvas and draw
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(flippedPixels);
    ctx.putImageData(imageData, 0, 0);
    
    // Download
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      `image/${format}`,
      quality
    );
    
    // Cleanup
    gl.setRenderTarget(null);
    gl.setSize(originalSize.x, originalSize.y);
    renderTarget.dispose();
  }, [gl, scene, camera]);
  
  return { captureScreenshot };
}

// Video Recording
export function useVideoRecorder() {
  const { gl } = useThree();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const startRecording = useCallback((options: {
    fps?: number;
    videoBitsPerSecond?: number;
    mimeType?: string;
  } = {}) => {
    const {
      videoBitsPerSecond = 5000000, // 5 Mbps
      mimeType = 'video/webm;codecs=vp9',
    } = options;
    
    const canvas = gl.domElement;
    const stream = canvas.captureStream(30);
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });
    
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-garden-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms
    setIsRecording(true);
  }, [gl]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);
  
  return { startRecording, stopRecording, isRecording };
}

// GLTF Export (simplified - full implementation needs GLTFExporter)
export function useModelExport() {
  const { scene } = useThree();
  
  const exportGLTF = useCallback(async (options: {
    binary?: boolean;
    filename?: string;
  } = {}) => {
    const {
      binary = true,
      filename = `echo-garden-${Date.now()}`,
    } = options;
    
    // Dynamic import GLTFExporter
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    
    exporter.parse(
      scene,
      (result) => {
        let blob: Blob;
        let extension: string;
        
        if (binary) {
          blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
          extension = 'glb';
        } else {
          const json = JSON.stringify(result, null, 2);
          blob = new Blob([json], { type: 'application/json' });
          extension = 'gltf';
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('GLTF Export error:', error);
      },
      { binary }
    );
  }, [scene]);
  
  return { exportGLTF };
}

// Combined Export Panel Component
interface ExportPanelProps {
  onScreenshot?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onExportModel?: () => void;
  isRecording?: boolean;
}

export function ExportPanel({
  onScreenshot,
  onStartRecording,
  onStopRecording,
  onExportModel,
  isRecording = false,
}: ExportPanelProps) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 p-4 bg-black/50 backdrop-blur rounded-lg">
      <h3 className="text-white font-semibold mb-2">Export</h3>
      
      <button
        onClick={onScreenshot}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
      >
        📷 Screenshot (4K)
      </button>
      
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
        >
          🔴 Start Recording
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition animate-pulse"
        >
          ⏹️ Stop Recording
        </button>
      )}
      
      <button
        onClick={onExportModel}
        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition"
      >
        📦 Export 3D Model
      </button>
    </div>
  );
}

export default useScreenshot;
