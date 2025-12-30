// Main App Component
// Echo Garden - Audio Reactive 3D Ecosystem

import { useEffect } from 'react';
import { Garden } from './components/Garden';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel, Timeline } from './components/InfoPanel';
import { useGardenStore } from './hooks/useGarden';

function App() {
  const { showControls, showInfo, setShowControls, setShowInfo } = useGardenStore();
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'c':
          setShowControls(!showControls);
          break;
        case 'i':
          setShowInfo(!showInfo);
          break;
        case 'escape':
          setShowControls(true);
          setShowInfo(true);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, showInfo, setShowControls, setShowInfo]);
  
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="noise-overlay" />
      
      {/* 3D Garden Scene */}
      <Garden />
      
      {/* UI Overlays */}
      {showControls && <ControlPanel />}
      {showInfo && <InfoPanel />}
      
      {/* Timeline */}
      <Timeline />
      
      {/* Title */}
      <div className="fixed top-6 right-6 z-30 text-right">
        <h1 className="font-display text-xl font-semibold text-white/10">
          Echo Garden
        </h1>
        <p className="font-mono text-xs text-white/5 mt-1">
          Seed from Speech
        </p>
      </div>
      
      {/* Keyboard Hints */}
      <div className="fixed bottom-6 left-6 z-30 flex gap-2">
        <KeyHint letter="C" label="Kontroller" />
        <KeyHint letter="I" label="Bilgi" />
      </div>
    </div>
  );
}

// Keyboard hint badge
function KeyHint({ letter, label }: { letter: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/20">
      <span className="w-5 h-5 rounded border border-white/20 flex items-center justify-center text-xs font-mono">
        {letter}
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export default App;
