// Control Panel Component
// UI for controlling the garden

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Settings,
  Eye,
  RotateCcw,
  Sparkles,
  Trees,
  Flower2,
  Leaf,
  Volume2,
  ChevronDown,
  ChevronUp,
  Sprout,
} from 'lucide-react';
import { useGardenStore, useIsListening, useAudioFeatures } from '../hooks/useGarden';
import { useAudio } from '../hooks/useAudio';
import { EMOTION_EMOJIS } from '../engine/SentimentEngine';
import { SEASON_EMOJIS, SEASON_NAMES } from '../engine/SeasonManager';

export function ControlPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    audioSource,
    setAudioSource,
    emotion,
    season,
    seed,
    setSeed,
    settings,
    updateSettings,
    reset,
  } = useGardenStore();
  
  const { startMicrophone, stop } = useAudio();
  const isListening = useIsListening();
  const audioFeatures = useAudioFeatures();
  
  // Create visualizer bars from audio features
  const getVisualizerBars = (count: number) => {
    const bars = [];
    const features = audioFeatures;
    const bands = [features.bass, features.lowMids, features.mids, features.highMids, features.treble];
    for (let i = 0; i < count; i++) {
      bars.push(bands[i % bands.length] * (0.5 + Math.random() * 0.5));
    }
    return bars;
  };
  
  const visualizerBars = getVisualizerBars(16);
  
  const handleMicToggle = async () => {
    if (isListening) {
      stop();
      setAudioSource('none');
    } else {
      setAudioSource('microphone');
      await startMicrophone();
    }
  };
  
  const handleSeedChange = (newSeed: string) => {
    setSeed(newSeed);
    reset();
  };
  
  return (
    <motion.div
      className="control-panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-spring/20 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-spring" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Echo Garden</h2>
              <p className="text-xs text-white/40">Ses ile Doğa Yarat</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Microphone Button */}
                <motion.button
                  onClick={handleMicToggle}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all ${
                    isListening
                      ? 'bg-anger-500/20 border border-anger-500/50 text-anger-300'
                      : 'bg-spring/20 border border-spring/50 text-spring'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <span className="font-medium">Dinlemeyi Durdur</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span className="font-medium">Mikrofonu Başlat</span>
                    </>
                  )}
                </motion.button>
                
                {/* Audio Visualizer */}
                {isListening && (
                  <div className="flex items-end justify-center gap-1 h-12 bg-void/50 rounded-lg p-2">
                    {visualizerBars.map((height, i) => (
                      <motion.div
                        key={i}
                        className="audio-bar"
                        style={{ height: `${Math.max(4, height * 100)}%` }}
                        animate={{ height: `${Math.max(4, height * 100)}%` }}
                        transition={{ duration: 0.05 }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Emotion & Season Display */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Emotion */}
                  <div className="glass-light rounded-xl p-3">
                    <p className="text-xs text-white/40 mb-2">Duygu</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {EMOTION_EMOJIS[emotion?.primary ?? 'neutral']}
                      </span>
                      <span
                        className={`emotion-badge emotion-${emotion?.primary ?? 'neutral'}`}
                      >
                        {emotion?.primary ?? 'neutral'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Season */}
                  <div className="glass-light rounded-xl p-3">
                    <p className="text-xs text-white/40 mb-2">Mevsim</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {SEASON_EMOJIS[season?.current ?? 'spring']}
                      </span>
                      <span className="text-sm font-medium">
                        {SEASON_NAMES[season?.current ?? 'spring']}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Seed Input */}
                <div className="space-y-2">
                  <label className="text-xs text-white/40 flex items-center gap-2">
                    <Sparkles size={12} />
                    Seed from Speech
                  </label>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => handleSeedChange(e.target.value)}
                    placeholder="İlk cümleniz..."
                    className="w-full px-4 py-3 rounded-xl bg-void/50 border border-white/10 text-white placeholder-white/30 focus:border-spring/50 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-white/30 italic">
                    "Merhaba Dünya" ve "Hello World" farklı ormanlar yaratır.
                  </p>
                </div>
                
                {/* Settings Toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass-light hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings size={16} className="text-white/60" />
                    <span className="text-sm">Ayarlar</span>
                  </span>
                  {showSettings ? (
                    <ChevronUp size={16} className="text-white/40" />
                  ) : (
                    <ChevronDown size={16} className="text-white/40" />
                  )}
                </button>
                
                {/* Settings Panel */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Tree Count */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-white/60 flex items-center gap-2">
                            <Trees size={12} />
                            Ağaç Sayısı
                          </label>
                          <span className="text-xs font-mono text-spring">
                            {settings.treeCount}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={15}
                          value={settings.treeCount}
                          onChange={(e) =>
                            updateSettings({ treeCount: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      
                      {/* Flower Density */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-white/60 flex items-center gap-2">
                            <Flower2 size={12} />
                            Çiçek Yoğunluğu
                          </label>
                          <span className="text-xs font-mono text-spring">
                            {Math.round(settings.flowerDensity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={settings.flowerDensity}
                          onChange={(e) =>
                            updateSettings({ flowerDensity: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      
                      {/* Grass Density */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-white/60 flex items-center gap-2">
                            <Leaf size={12} />
                            Çim Yoğunluğu
                          </label>
                          <span className="text-xs font-mono text-spring">
                            {Math.round(settings.grassDensity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={settings.grassDensity}
                          onChange={(e) =>
                            updateSettings({ grassDensity: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      
                      {/* Audio Sensitivity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-white/60 flex items-center gap-2">
                            <Volume2 size={12} />
                            Ses Hassasiyeti
                          </label>
                          <span className="text-xs font-mono text-spring">
                            {settings.audioSensitivity.toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={settings.audioSensitivity}
                          onChange={(e) =>
                            updateSettings({ audioSensitivity: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      
                      {/* Toggles */}
                      <div className="space-y-2">
                        <ToggleOption
                          label="Parçacıklar"
                          icon={<Sparkles size={14} />}
                          enabled={settings.showParticles}
                          onChange={(v) => updateSettings({ showParticles: v })}
                        />
                        <ToggleOption
                          label="Gölgeler"
                          icon={<Eye size={14} />}
                          enabled={settings.showShadows}
                          onChange={(v) => updateSettings({ showShadows: v })}
                        />
                        <ToggleOption
                          label="Otomatik Döndür"
                          icon={<RotateCcw size={14} />}
                          enabled={settings.autoRotate}
                          onChange={(v) => updateSettings({ autoRotate: v })}
                        />
                      </div>
                      
                      {/* Quality */}
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Kalite</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
                            <button
                              key={q}
                              onClick={() => updateSettings({ quality: q })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                settings.quality === q
                                  ? 'bg-spring text-void'
                                  : 'glass-light text-white/60 hover:text-white'
                              }`}
                            >
                              {q.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Reset Button */}
                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass-light hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                >
                  <RotateCcw size={16} />
                  <span className="text-sm">Bahçeyi Sıfırla</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Toggle option component
function ToggleOption({
  label,
  icon,
  enabled,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
        enabled
          ? 'bg-spring/20 border border-spring/30'
          : 'glass-light'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={enabled ? 'text-spring' : 'text-white/40'}>{icon}</span>
        <span className={`text-xs ${enabled ? 'text-white' : 'text-white/60'}`}>
          {label}
        </span>
      </span>
      <div
        className={`w-8 h-4 rounded-full transition-all ${
          enabled ? 'bg-spring' : 'bg-white/10'
        }`}
      >
        <motion.div
          className="w-3 h-3 bg-white rounded-full mt-0.5"
          animate={{ x: enabled ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
