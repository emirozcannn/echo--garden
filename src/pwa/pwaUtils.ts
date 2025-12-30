// PWA (Progressive Web App) Configuration
// Service worker registration and offline support

// Register service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, notify user
              dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        }
      });
      
      console.log('ServiceWorker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
      throw error;
    }
  }
  return null;
}

// Request persistent storage
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('Persistent storage granted');
    }
    return granted;
  }
  return false;
}

// Check if app is installed
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Request install prompt
let deferredPrompt: any = null;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    dispatchEvent(new CustomEvent('install-available'));
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  return outcome === 'accepted';
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

// IndexedDB for offline garden storage
const DB_NAME = 'EchoGardenDB';
const DB_VERSION = 1;

interface GardenSave {
  id: string;
  name: string;
  seed: string;
  settings: Record<string, any>;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

class GardenStorage {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Gardens store
        if (!db.objectStoreNames.contains('gardens')) {
          const gardensStore = db.createObjectStore('gardens', { keyPath: 'id' });
          gardensStore.createIndex('createdAt', 'createdAt', { unique: false });
          gardensStore.createIndex('name', 'name', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Cache store for assets
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      };
    });
  }
  
  async saveGarden(garden: GardenSave): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gardens'], 'readwrite');
      const store = transaction.objectStore('gardens');
      
      garden.updatedAt = Date.now();
      if (!garden.createdAt) garden.createdAt = Date.now();
      
      const request = store.put(garden);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getGarden(id: string): Promise<GardenSave | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gardens'], 'readonly');
      const store = transaction.objectStore('gardens');
      
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }
  
  async getAllGardens(): Promise<GardenSave[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gardens'], 'readonly');
      const store = transaction.objectStore('gardens');
      const index = store.index('createdAt');
      
      const request = index.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async deleteGarden(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gardens'], 'readwrite');
      const store = transaction.objectStore('gardens');
      
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      const request = store.put({ key, value, updatedAt: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getSetting<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value ?? null);
    });
  }
}

export const gardenStorage = new GardenStorage();

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

// Import for hooks
import { useState, useEffect } from 'react';

// Battery status hook
export function useBatteryStatus() {
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
  } | null>(null);
  
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        const updateBattery = () => {
          setBattery({
            level: bat.level,
            charging: bat.charging,
          });
        };
        
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
        
        return () => {
          bat.removeEventListener('levelchange', updateBattery);
          bat.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);
  
  return battery;
}

// Push notification support
export async function requestNotificationPermission(): Promise<boolean> {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...options,
    });
  }
}

// Background sync for garden saves
export async function registerBackgroundSync(tag: string) {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
  }
}

export default {
  registerServiceWorker,
  requestPersistentStorage,
  isAppInstalled,
  setupInstallPrompt,
  promptInstall,
  canPromptInstall,
  gardenStorage,
  useNetworkStatus,
  useBatteryStatus,
  requestNotificationPermission,
  sendNotification,
  registerBackgroundSync,
};
