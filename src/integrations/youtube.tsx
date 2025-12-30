// YouTube Music Integration
// Extract audio from YouTube videos for visualization

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGardenStore } from '../hooks/useGarden';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeVideoInfo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number;
}

// Load YouTube IFrame API
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}

// Extract video ID from URL
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Main YouTube Hook
export function useYouTube() {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  
  const setAudioFeatures = useGardenStore((state) => state.setAudioFeatures);
  
  // Initialize player
  const initPlayer = useCallback(async (containerId: string) => {
    await loadYouTubeAPI();
    
    const ytPlayer = new window.YT.Player(containerId, {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          setIsReady(true);
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          
          if (event.data === window.YT.PlayerState.PLAYING) {
            // Start audio analysis
            startAudioAnalysis();
          } else {
            stopAudioAnalysis();
          }
        },
      },
    });
    
    setPlayer(ytPlayer);
  }, []);
  
  // Load video
  const loadVideo = useCallback((videoIdOrUrl: string) => {
    if (!player) return;
    
    const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    player.loadVideoById(videoId);
    
    // Get video info (simplified - would need API key for full info)
    setCurrentVideo({
      id: videoId,
      title: 'YouTube Video',
      channelTitle: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0,
    });
  }, [player]);
  
  // Playback controls
  const play = useCallback(() => player?.playVideo(), [player]);
  const pause = useCallback(() => player?.pauseVideo(), [player]);
  const stop = useCallback(() => player?.stopVideo(), [player]);
  const seekTo = useCallback((seconds: number) => player?.seekTo(seconds, true), [player]);
  const setVolume = useCallback((volume: number) => player?.setVolume(volume * 100), [player]);
  
  // Audio analysis using Web Audio API
  // Note: YouTube doesn't allow direct audio access, so we simulate based on video
  const startAudioAnalysis = useCallback(() => {
    // Since we can't access YouTube audio directly,
    // we'll use the microphone or create simulated data
    // For real implementation, you'd need to use a server-side solution
    
    const analyze = () => {
      if (!player || !isPlaying) return;
      
      // Simulated audio features based on playback
      const time = player.getCurrentTime();
      const duration = player.getDuration();
      const progress = time / duration;
      
      // Create pseudo-random but consistent features based on time
      const pseudoRandom = (seed: number) => {
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return x - Math.floor(x);
      };
      
      setAudioFeatures({
        bass: 0.3 + pseudoRandom(time) * 0.4,
        lowMids: 0.3 + pseudoRandom(time + 1) * 0.3,
        mids: 0.4 + pseudoRandom(time + 2) * 0.3,
        highMids: 0.3 + pseudoRandom(time + 3) * 0.4,
        treble: 0.2 + pseudoRandom(time + 4) * 0.3,
        energy: 0.4 + pseudoRandom(time + 5) * 0.4,
        beat: pseudoRandom(time * 10) > 0.8,
        silence: false,
        spectralCentroid: 0.5 + pseudoRandom(time + 6) * 0.3,
        spectralFlux: pseudoRandom(time + 7) * 0.5,
      });
      
      setCurrentTime(time);
      setDuration(duration);
      
      animationRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, [player, isPlaying, setAudioFeatures]);
  
  const stopAudioAnalysis = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      if (player) {
        player.destroy();
      }
    };
  }, [player, stopAudioAnalysis]);
  
  return {
    initPlayer,
    loadVideo,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    isReady,
    isPlaying,
    currentVideo,
    currentTime,
    duration,
    containerRef,
  };
}

// YouTube Player Component
interface YouTubePlayerProps {
  className?: string;
  onVideoLoad?: (video: YouTubeVideoInfo) => void;
}

export function YouTubePlayer({ className = '', onVideoLoad }: YouTubePlayerProps) {
  const [url, setUrl] = useState('');
  const containerId = 'youtube-player';
  
  const {
    initPlayer,
    loadVideo,
    play,
    pause,
    isReady,
    isPlaying,
    currentVideo,
    currentTime,
    duration,
  } = useYouTube();
  
  useEffect(() => {
    initPlayer(containerId);
  }, [initPlayer]);
  
  const handleLoad = () => {
    if (url) {
      loadVideo(url);
      if (currentVideo && onVideoLoad) {
        onVideoLoad(currentVideo);
      }
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`bg-black/70 backdrop-blur rounded-lg p-4 ${className}`}>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube URL or Video ID"
          className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-red-500 outline-none"
        />
        <button
          onClick={handleLoad}
          disabled={!isReady}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white rounded transition"
        >
          Load
        </button>
      </div>
      
      {currentVideo && (
        <div className="flex items-center gap-4">
          <img
            src={currentVideo.thumbnail}
            alt={currentVideo.title}
            className="w-20 h-12 rounded object-cover"
          />
          <div className="flex-1">
            <p className="text-white font-semibold truncate">{currentVideo.title}</p>
            <p className="text-gray-400 text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          <div className="flex gap-2">
            {!isPlaying ? (
              <button onClick={play} className="p-2 text-white hover:text-red-400">
                ▶
              </button>
            ) : (
              <button onClick={pause} className="p-2 text-white hover:text-red-400">
                ⏸
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Hidden player container */}
      <div id={containerId} className="hidden" />
    </div>
  );
}

export default useYouTube;
