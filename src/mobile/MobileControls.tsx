// Mobile Controls and Touch Gestures
// Touch-optimized controls for mobile devices

import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGardenStore } from '../hooks/useGarden';

// Device Detection
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [hasTouch, setHasTouch] = useState(false);
  const [hasGyroscope, setHasGyroscope] = useState(false);
  
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    const tablet = /ipad|android(?!.*mobile)/.test(userAgent);
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    setIsMobile(mobile && !tablet);
    setIsTablet(tablet);
    setHasTouch(touch);
    
    // Check gyroscope
    if (window.DeviceOrientationEvent) {
      setHasGyroscope(true);
    }
  }, []);
  
  return { isMobile, isTablet, hasTouch, hasGyroscope };
}

// Touch Gesture Handler
interface TouchGestureState {
  isDragging: boolean;
  isPinching: boolean;
  isRotating: boolean;
  startDistance: number;
  startAngle: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  delta: { x: number; y: number };
  scale: number;
  rotation: number;
}

export function useTouchGestures(elementRef: React.RefObject<HTMLElement>) {
  const [gesture, setGesture] = useState<TouchGestureState>({
    isDragging: false,
    isPinching: false,
    isRotating: false,
    startDistance: 0,
    startAngle: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
  });
  
  const gestureRef = useRef(gesture);
  gestureRef.current = gesture;
  
  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getAngle = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    return Math.atan2(
      touches[1].clientY - touches[0].clientY,
      touches[1].clientX - touches[0].clientX
    );
  };
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 1) {
      setGesture(prev => ({
        ...prev,
        isDragging: true,
        startPosition: { x: touches[0].clientX, y: touches[0].clientY },
        currentPosition: { x: touches[0].clientX, y: touches[0].clientY },
        delta: { x: 0, y: 0 },
      }));
    } else if (touches.length === 2) {
      const distance = getDistance(touches);
      const angle = getAngle(touches);
      setGesture(prev => ({
        ...prev,
        isDragging: false,
        isPinching: true,
        isRotating: true,
        startDistance: distance,
        startAngle: angle,
        scale: 1,
        rotation: 0,
      }));
    }
  }, []);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1 && gestureRef.current.isDragging) {
      const x = touches[0].clientX;
      const y = touches[0].clientY;
      setGesture(prev => ({
        ...prev,
        currentPosition: { x, y },
        delta: {
          x: x - prev.startPosition.x,
          y: y - prev.startPosition.y,
        },
      }));
    } else if (touches.length === 2) {
      const distance = getDistance(touches);
      const angle = getAngle(touches);
      setGesture(prev => ({
        ...prev,
        scale: distance / prev.startDistance,
        rotation: angle - prev.startAngle,
      }));
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    setGesture(prev => ({
      ...prev,
      isDragging: false,
      isPinching: false,
      isRotating: false,
    }));
  }, []);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return gesture;
}

// Gyroscope Camera Control
export function useGyroscopeCamera(enabled: boolean = true) {
  const { camera } = useThree();
  const [hasPermission, setHasPermission] = useState(false);
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const initialOrientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  
  const requestPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        setHasPermission(permission === 'granted');
        return permission === 'granted';
      } catch (error) {
        console.warn('Gyroscope permission denied:', error);
        return false;
      }
    } else {
      setHasPermission(true);
      return true;
    }
  }, []);
  
  useEffect(() => {
    if (!enabled || !hasPermission) return;
    
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      
      if (alpha === null || beta === null || gamma === null) return;
      
      // Store initial orientation for relative movement
      if (!initialOrientationRef.current) {
        initialOrientationRef.current = { alpha, beta, gamma };
      }
      
      orientationRef.current = {
        alpha: alpha - (initialOrientationRef.current?.alpha || 0),
        beta: beta - (initialOrientationRef.current?.beta || 0),
        gamma: gamma - (initialOrientationRef.current?.gamma || 0),
      };
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [enabled, hasPermission]);
  
  useFrame(() => {
    if (!enabled || !hasPermission) return;
    
    const { alpha, beta, gamma } = orientationRef.current;
    
    // Convert to radians and apply to camera
    const alphaRad = THREE.MathUtils.degToRad(alpha);
    const betaRad = THREE.MathUtils.degToRad(beta);
    const gammaRad = THREE.MathUtils.degToRad(gamma);
    
    // Apply rotation (portrait mode)
    camera.rotation.x = betaRad * 0.1;
    camera.rotation.y = gammaRad * 0.1;
    camera.rotation.z = -alphaRad * 0.05;
  });
  
  return { hasPermission, requestPermission };
}

// Shake Detection for New Seed
export function useShakeDetection(onShake: () => void, threshold: number = 15) {
  const lastAccelerationRef = useRef({ x: 0, y: 0, z: 0 });
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration?.x || !acceleration?.y || !acceleration?.z) return;
      
      const { x, y, z } = acceleration;
      const lastAcc = lastAccelerationRef.current;
      
      const deltaX = Math.abs(x - lastAcc.x);
      const deltaY = Math.abs(y - lastAcc.y);
      const deltaZ = Math.abs(z - lastAcc.z);
      
      if (deltaX + deltaY + deltaZ > threshold) {
        if (!shakeTimeoutRef.current) {
          onShake();
          shakeTimeoutRef.current = setTimeout(() => {
            shakeTimeoutRef.current = null;
          }, 1000); // Debounce
        }
      }
      
      lastAccelerationRef.current = { x, y, z };
    };
    
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [onShake, threshold]);
}

// Mobile-Optimized Garden Controls Component
export function MobileControls() {
  const { setSeed, reset } = useGardenStore();
  const { isMobile, hasGyroscope } = useDeviceDetection();
  
  // Shake to generate new seed
  useShakeDetection(() => {
    const newSeed = `shake_${Date.now()}`;
    setSeed(newSeed);
    reset();
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  });
  
  if (!isMobile) return null;
  
  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center gap-4 z-40 px-4">
      <button
        onClick={() => {
          setSeed(`tap_${Date.now()}`);
          reset();
          navigator.vibrate?.(50);
        }}
        className="w-14 h-14 rounded-full bg-green-600/80 backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
  );
}

// Touch Camera Controller (React Three Fiber)
export function TouchCameraController() {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(5);
  
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
        const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
        
        targetRotationRef.current.y += deltaX * 0.01;
        targetRotationRef.current.x += deltaY * 0.01;
        targetRotationRef.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationRef.current.x));
        
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Store initial distance on first two-finger touch
        if (!(lastTouchRef.current as any).distance) {
          (lastTouchRef.current as any).distance = distance;
        }
        
        const delta = (lastTouchRef.current as any).distance - distance;
        zoomRef.current = Math.max(2, Math.min(20, zoomRef.current + delta * 0.01));
        (lastTouchRef.current as any).distance = distance;
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      (lastTouchRef.current as any).distance = undefined;
    };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl, isDragging]);
  
  useFrame(() => {
    // Smooth camera movement
    const { x, y } = targetRotationRef.current;
    const zoom = zoomRef.current;
    
    camera.position.x = Math.sin(y) * zoom;
    camera.position.z = Math.cos(y) * zoom;
    camera.position.y = 3 + Math.sin(x) * zoom * 0.5;
    camera.lookAt(0, 1, 0);
  });
  
  return null;
}

// Performance Optimizer for Mobile
export function useMobilePerformance() {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const { isMobile, isTablet } = useDeviceDetection();
  
  useEffect(() => {
    if (isMobile) {
      setQuality('low');
    } else if (isTablet) {
      setQuality('medium');
    }
    
    // Check battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2 && !battery.charging) {
          setQuality('low');
        }
      });
    }
  }, [isMobile, isTablet]);
  
  return { quality, setQuality };
}

// Export all mobile utilities
export default {
  useDeviceDetection,
  useTouchGestures,
  useGyroscopeCamera,
  useShakeDetection,
  MobileControls,
  TouchCameraController,
  useMobilePerformance,
};
