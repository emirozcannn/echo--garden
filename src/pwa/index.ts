// PWA Module Exports
// Progressive Web App utilities

export {
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
} from './pwaUtils';
