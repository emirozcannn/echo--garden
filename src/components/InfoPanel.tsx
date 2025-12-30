// Info Panel Component
// Displays real-time stats and information

import { motion } from 'framer-motion';
import { Info, Activity, Waves, Heart, Timer } from 'lucide-react';
import { useAudioFeatures, useEmotion, useSeason, useSeed } from '../hooks/useGarden';
import { EMOTION_COLORS, EMOTION_EMOJIS } from '../engine/SentimentEngine';

export function InfoPanel() {
  const audioFeatures = useAudioFeatures();
  const emotion = useEmotion();
  const season = useSeason();
  const { seed } = useSeed();
  
  return (
    <motion.div
      className="info-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="glass rounded-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-wider">
            Canlı Veriler
          </span>
        </div>
        
        {/* Audio Levels */}
        <div className="space-y-2">
          <AudioLevel label="Bass" value={audioFeatures?.bass ?? 0} color="#f43f5e" />
          <AudioLevel label="Mid" value={audioFeatures?.mids ?? 0} color="#eab308" />
          <AudioLevel label="Treble" value={audioFeatures?.treble ?? 0} color="#14b8a6" />
        </div>
        
        {/* Emotion Scores */}
        <div className="space-y-2">
          <p className="text-xs text-white/40 flex items-center gap-2">
            <Heart size={12} />
            Duygu Skorları
          </p>
          <div className="grid grid-cols-3 gap-1">
            {emotion && Object.entries(emotion.scores).map(([key, value]) => (
              <div
                key={key}
                className="text-center p-1 rounded"
                style={{
                  backgroundColor: `${EMOTION_COLORS[key as keyof typeof EMOTION_COLORS]?.primary}20`,
                }}
              >
                <span className="text-xs">{EMOTION_EMOJIS[key as keyof typeof EMOTION_EMOJIS]}</span>
                <span className="text-xs text-white/60 ml-1">
                  {Math.round(value * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* BPM */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 flex items-center gap-2">
            <Activity size={12} />
            BPM
          </span>
          <span className="font-mono text-sm text-spring">
            {Math.round(audioFeatures?.bpm ?? 120)}
          </span>
        </div>
        
        {/* Energy */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 flex items-center gap-2">
            <Waves size={12} />
            Enerji
          </span>
          <span className="font-mono text-sm text-spring">
            {Math.round((audioFeatures?.energy ?? 0) * 100)}%
          </span>
        </div>
        
        {/* Progress */}
        {season && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 flex items-center gap-2">
                <Timer size={12} />
                İlerleme
              </span>
              <span className="font-mono text-sm text-spring">
                {Math.round(season.totalProgress * 100)}%
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #68d391, #f6ad55, #ed8936, #90cdf4)',
                }}
                animate={{ width: `${season.totalProgress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}
        
        {/* Current Seed */}
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs text-white/30 truncate">
            🌱 {seed}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Audio level bar
function AudioLevel({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
      <span className="text-xs font-mono text-white/40 w-8">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

// Timeline component
export function Timeline() {
  const season = useSeason();
  
  if (!season) return null;
  
  return (
    <div className="timeline">
      <div className="glass rounded-full p-3">
        <div className="timeline-track">
          <motion.div
            className="timeline-progress"
            animate={{ width: `${season.totalProgress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="timeline-seasons">
          <span className={season.current === 'spring' ? 'text-spring' : ''}>
            🌸 İlkbahar
          </span>
          <span className={season.current === 'summer' ? 'text-summer' : ''}>
            ☀️ Yaz
          </span>
          <span className={season.current === 'autumn' ? 'text-autumn' : ''}>
            🍂 Sonbahar
          </span>
          <span className={season.current === 'winter' ? 'text-winter' : ''}>
            ❄️ Kış
          </span>
        </div>
      </div>
    </div>
  );
}
