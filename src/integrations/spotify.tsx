// Spotify Integration
// Connect to Spotify Web Playback SDK for audio visualization

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGardenStore } from '../hooks/useGarden';

// Spotify Auth Config
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;
const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

// Spotify Types
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

interface SpotifyAudioFeatures {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
}

interface SpotifyAudioAnalysis {
  bars: { start: number; duration: number; confidence: number }[];
  beats: { start: number; duration: number; confidence: number }[];
  sections: {
    start: number;
    duration: number;
    loudness: number;
    tempo: number;
    key: number;
    mode: number;
  }[];
  segments: {
    start: number;
    duration: number;
    loudness_start: number;
    loudness_max: number;
    pitches: number[];
    timbre: number[];
  }[];
}

// Generate auth URL
export function getSpotifyAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'token',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    show_dialog: 'true',
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Parse token from URL
export function parseSpotifyToken(): string | null {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  
  if (token) {
    // Clear hash from URL
    window.history.replaceState(null, '', window.location.pathname);
    // Store token
    localStorage.setItem('spotify_token', token);
    return token;
  }
  
  return localStorage.getItem('spotify_token');
}

// Spotify API Wrapper
class SpotifyAPI {
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }
  
  private async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getCurrentTrack(): Promise<SpotifyTrack | null> {
    try {
      const data = await this.fetch('/me/player/currently-playing');
      return data?.item || null;
    } catch {
      return null;
    }
  }
  
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    return this.fetch(`/audio-features/${trackId}`);
  }
  
  async getAudioAnalysis(trackId: string): Promise<SpotifyAudioAnalysis> {
    return this.fetch(`/audio-analysis/${trackId}`);
  }
  
  async play() {
    await this.fetch('/me/player/play', { method: 'PUT' });
  }
  
  async pause() {
    await this.fetch('/me/player/pause', { method: 'PUT' });
  }
  
  async next() {
    await this.fetch('/me/player/next', { method: 'POST' });
  }
  
  async previous() {
    await this.fetch('/me/player/previous', { method: 'POST' });
  }
}

// Main Spotify Hook
export function useSpotify() {
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<SpotifyAudioFeatures | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<SpotifyAudioAnalysis | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  const apiRef = useRef<SpotifyAPI | null>(null);
  const setAudioFeatures_store = useGardenStore((state) => state.setAudioFeatures);
  
  // Initialize
  useEffect(() => {
    const storedToken = parseSpotifyToken();
    if (storedToken) {
      setToken(storedToken);
      apiRef.current = new SpotifyAPI(storedToken);
      setIsConnected(true);
    }
  }, []);
  
  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!token) return;
    
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new (window as any).Spotify.Player({
        name: 'Echo Garden',
        getOAuthToken: (cb: (token: string) => void) => cb(token),
        volume: 0.5,
      });
      
      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Ready with Device ID:', device_id);
        setDeviceId(device_id);
      });
      
      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (state) {
          setCurrentTrack(state.track_window.current_track);
        }
      });
      
      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };
    
    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [token]);
  
  // Poll current track
  useEffect(() => {
    if (!isConnected || !apiRef.current) return;
    
    const pollInterval = setInterval(async () => {
      const track = await apiRef.current!.getCurrentTrack();
      if (track && track.id !== currentTrack?.id) {
        setCurrentTrack(track);
        
        // Fetch audio features
        const features = await apiRef.current!.getAudioFeatures(track.id);
        setAudioFeatures(features);
        
        // Fetch audio analysis
        const analysis = await apiRef.current!.getAudioAnalysis(track.id);
        setAudioAnalysis(analysis);
        
        // Map to garden audio features
        if (features) {
          setAudioFeatures_store({
            bass: features.energy * 0.5,
            lowMids: features.acousticness,
            mids: features.speechiness,
            highMids: features.danceability,
            treble: features.instrumentalness,
            energy: features.energy,
            beat: false, // Will be handled separately
            silence: features.energy < 0.1,
            spectralCentroid: features.valence,
            spectralFlux: features.tempo / 200,
            zeroCrossingRate: features.speechiness * 100,
            bpm: features.tempo,
            frequencyData: new Float32Array(0),
            waveformData: new Float32Array(0),
          } as any);
        }
      }
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [isConnected, currentTrack?.id, setAudioFeatures_store]);
  
  // Connect function
  const connect = useCallback(() => {
    window.location.href = getSpotifyAuthUrl();
  }, []);
  
  // Disconnect function
  const disconnect = useCallback(() => {
    localStorage.removeItem('spotify_token');
    setToken(null);
    setIsConnected(false);
    if (player) {
      player.disconnect();
    }
  }, [player]);
  
  // Playback controls
  const play = useCallback(() => apiRef.current?.play(), []);
  const pause = useCallback(() => apiRef.current?.pause(), []);
  const next = useCallback(() => apiRef.current?.next(), []);
  const previous = useCallback(() => apiRef.current?.previous(), []);
  
  return {
    isConnected,
    currentTrack,
    audioFeatures,
    audioAnalysis,
    deviceId,
    connect,
    disconnect,
    play,
    pause,
    next,
    previous,
  };
}

// Map Spotify features to garden emotions
export function mapSpotifyToEmotion(features: SpotifyAudioFeatures): string {
  const { valence, energy, danceability } = features;
  
  if (valence > 0.7 && energy > 0.6) return 'joy';
  if (valence < 0.3 && energy < 0.4) return 'sadness';
  if (valence < 0.4 && energy > 0.7) return 'anger';
  if (valence > 0.4 && energy < 0.4) return 'calm';
  if (danceability > 0.7) return 'joy';
  
  return 'neutral';
}

// Spotify Now Playing Component
interface SpotifyNowPlayingProps {
  className?: string;
}

export function SpotifyNowPlaying({ className = '' }: SpotifyNowPlayingProps) {
  const {
    isConnected,
    currentTrack,
    audioFeatures,
    connect,
    disconnect,
    play,
    pause,
    next,
    previous,
  } = useSpotify();
  
  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className={`px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2 ${className}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Connect Spotify
      </button>
    );
  }
  
  return (
    <div className={`bg-black/70 backdrop-blur rounded-lg p-4 ${className}`}>
      {currentTrack ? (
        <div className="flex items-center gap-4">
          <img
            src={currentTrack.album.images[0]?.url}
            alt={currentTrack.album.name}
            className="w-16 h-16 rounded"
          />
          <div className="flex-1">
            <p className="text-white font-semibold truncate">{currentTrack.name}</p>
            <p className="text-gray-400 text-sm truncate">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
            {audioFeatures && (
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-green-400">
                  Energy: {Math.round(audioFeatures.energy * 100)}%
                </span>
                <span className="text-xs text-blue-400">
                  Valence: {Math.round(audioFeatures.valence * 100)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={previous} className="p-2 text-white hover:text-green-400">
              ⏮
            </button>
            <button onClick={play} className="p-2 text-white hover:text-green-400">
              ▶
            </button>
            <button onClick={pause} className="p-2 text-white hover:text-green-400">
              ⏸
            </button>
            <button onClick={next} className="p-2 text-white hover:text-green-400">
              ⏭
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No track playing</p>
      )}
      
      <button
        onClick={disconnect}
        className="mt-2 text-xs text-gray-500 hover:text-gray-300"
      >
        Disconnect
      </button>
    </div>
  );
}

export default useSpotify;
