// Multiplayer Garden - Real-time Collaborative Experience
// WebSocket-based synchronization for shared gardens

import { useRef, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGardenStore, useAudioFeatures } from '../hooks/useGarden';

// Types
interface Player {
  id: string;
  name: string;
  color: string;
  position: THREE.Vector3Tuple;
  rotation: THREE.Vector3Tuple;
  avatar: string;
  isHost: boolean;
  emotion?: string;
  audioEnergy?: number;
  lastUpdate: number;
}

interface RoomState {
  id: string;
  name: string;
  host: string;
  players: Player[];
  maxPlayers: number;
  seed: string;
  season: string;
  settings: Record<string, any>;
  createdAt: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

interface MultiplayerState {
  isConnected: boolean;
  isHost: boolean;
  room: RoomState | null;
  localPlayer: Player | null;
  players: Player[];
  messages: ChatMessage[];
  latency: number;
}

// WebSocket Message Types
type WSMessage = 
  | { type: 'join'; roomId: string; player: Partial<Player> }
  | { type: 'leave'; roomId: string }
  | { type: 'player_update'; player: Partial<Player> }
  | { type: 'room_update'; room: Partial<RoomState> }
  | { type: 'chat'; message: Partial<ChatMessage> }
  | { type: 'sync_garden'; seed: string; season: string }
  | { type: 'plant_seed'; position: THREE.Vector3Tuple; seed: string }
  | { type: 'emoji_react'; emoji: string; position: THREE.Vector3Tuple }
  | { type: 'ping' }
  | { type: 'pong'; timestamp: number };

// Multiplayer Context
const MultiplayerContext = createContext<{
  state: MultiplayerState;
  actions: {
    connect: (serverUrl: string) => void;
    disconnect: () => void;
    createRoom: (name: string) => Promise<string>;
    joinRoom: (roomId: string, playerName: string) => Promise<void>;
    leaveRoom: () => void;
    updatePosition: (position: THREE.Vector3Tuple, rotation: THREE.Vector3Tuple) => void;
    sendChat: (content: string) => void;
    sendEmoji: (emoji: string, position: THREE.Vector3Tuple) => void;
    syncGarden: (seed: string, season: string) => void;
    plantSeed: (position: THREE.Vector3Tuple, seed: string) => void;
  };
} | null>(null);

// Hook to use multiplayer
export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
}

// Multiplayer Provider Component
export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    isHost: false,
    room: null,
    localPlayer: null,
    players: [],
    messages: [],
    latency: 0,
  });
  
  // WebSocket connection
  const connect = useCallback((serverUrl: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true }));
      
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 5000);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    ws.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Attempt reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(serverUrl);
      }, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setState(prev => ({ ...prev, isConnected: false, room: null, players: [] }));
  }, []);
  
  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'room_joined':
        setState(prev => ({
          ...prev,
          room: message.room,
          localPlayer: message.player,
          isHost: message.player.isHost,
          players: message.room.players,
        }));
        break;
        
      case 'player_joined':
        setState(prev => ({
          ...prev,
          players: [...prev.players, message.player],
          messages: [...prev.messages, {
            id: `sys_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            content: `${message.player.name} joined the garden`,
            timestamp: Date.now(),
            type: 'system',
          }],
        }));
        break;
        
      case 'player_left':
        setState(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== message.playerId),
          messages: [...prev.messages, {
            id: `sys_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            content: `${message.playerName} left the garden`,
            timestamp: Date.now(),
            type: 'system',
          }],
        }));
        break;
        
      case 'player_update':
        setState(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === message.player.id ? { ...p, ...message.player } : p
          ),
        }));
        break;
        
      case 'chat':
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), message.message],
        }));
        break;
        
      case 'garden_sync':
        // Apply garden state from host
        const { setSeed } = useGardenStore.getState();
        setSeed(message.seed);
        break;
        
      case 'pong':
        setState(prev => ({
          ...prev,
          latency: Date.now() - message.timestamp,
        }));
        break;
    }
  }, []);
  
  // Actions
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  const createRoom = useCallback(async (name: string): Promise<string> => {
    // In a real implementation, this would call a REST API
    const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    return roomId;
  }, []);
  
  const joinRoom = useCallback(async (roomId: string, playerName: string) => {
    const player: Partial<Player> = {
      name: playerName,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      avatar: 'default',
    };
    send({ type: 'join', roomId, player });
  }, [send]);
  
  const leaveRoom = useCallback(() => {
    if (state.room) {
      send({ type: 'leave', roomId: state.room.id });
    }
    setState(prev => ({ ...prev, room: null, players: [], localPlayer: null }));
  }, [send, state.room]);
  
  const updatePosition = useCallback((position: THREE.Vector3Tuple, rotation: THREE.Vector3Tuple) => {
    if (state.localPlayer) {
      send({
        type: 'player_update',
        player: { id: state.localPlayer.id, position, rotation, lastUpdate: Date.now() },
      });
    }
  }, [send, state.localPlayer]);
  
  const sendChat = useCallback((content: string) => {
    if (state.localPlayer && state.room) {
      send({
        type: 'chat',
        message: {
          playerId: state.localPlayer.id,
          playerName: state.localPlayer.name,
          content,
          timestamp: Date.now(),
          type: 'message',
        },
      });
    }
  }, [send, state.localPlayer, state.room]);
  
  const sendEmoji = useCallback((emoji: string, position: THREE.Vector3Tuple) => {
    send({ type: 'emoji_react', emoji, position });
  }, [send]);
  
  const syncGarden = useCallback((seed: string, season: string) => {
    if (state.isHost) {
      send({ type: 'sync_garden', seed, season });
    }
  }, [send, state.isHost]);
  
  const plantSeed = useCallback((position: THREE.Vector3Tuple, seed: string) => {
    send({ type: 'plant_seed', position, seed });
  }, [send]);
  
  const actions = {
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    updatePosition,
    sendChat,
    sendEmoji,
    syncGarden,
    plantSeed,
  };
  
  return (
    <MultiplayerContext.Provider value={{ state, actions }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

// Player Avatar Component
export function PlayerAvatar({ player }: { player: Player }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioFeatures = useAudioFeatures();
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Smooth position interpolation
    const [tx, ty, tz] = player.position;
    groupRef.current.position.lerp(new THREE.Vector3(tx, ty, tz), 0.1);
    
    // Smooth rotation interpolation
    const [rx, ry, rz] = player.rotation;
    groupRef.current.rotation.set(rx, ry, rz);
  });
  
  return (
    <group ref={groupRef}>
      {/* Avatar body - flower sprite */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={player.color} />
      </mesh>
      
      {/* Audio energy indicator */}
      {player.audioEnergy && player.audioEnergy > 0.1 && (
        <mesh position={[0, 0.5, 0]}>
          <ringGeometry args={[0.4, 0.45 + player.audioEnergy * 0.2, 32]} />
          <meshBasicMaterial color={player.color} transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Name tag */}
      <sprite position={[0, 0.7, 0]} scale={[1, 0.3, 1]}>
        <spriteMaterial color="white" transparent opacity={0.8} />
      </sprite>
    </group>
  );
}

// Multiplayer Players Renderer
export function MultiplayerPlayers() {
  const { state } = useMultiplayer();
  
  return (
    <>
      {state.players
        .filter(p => p.id !== state.localPlayer?.id)
        .map(player => (
          <PlayerAvatar key={player.id} player={player} />
        ))}
    </>
  );
}

// Chat UI Component
export function MultiplayerChat() {
  const { state, actions } = useMultiplayer();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);
  
  const handleSend = () => {
    if (message.trim()) {
      actions.sendChat(message);
      setMessage('');
    }
  };
  
  if (!state.room) return null;
  
  return (
    <div className={`fixed right-4 bottom-4 z-50 transition-all ${isOpen ? 'w-80' : 'w-12'}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-0 right-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {state.messages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {Math.min(state.messages.length, 99)}
          </span>
        )}
      </button>
      
      {/* Chat panel */}
      {isOpen && (
        <div className="bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden mt-14">
          {/* Header */}
          <div className="p-3 border-b border-white/10">
            <h3 className="text-white font-medium">{state.room.name}</h3>
            <p className="text-white/60 text-sm">{state.players.length} gardeners</p>
          </div>
          
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {state.messages.map(msg => (
              <div key={msg.id} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
                {msg.type === 'system' ? (
                  <span className="text-white/40 text-xs">{msg.content}</span>
                ) : (
                  <div>
                    <span className="text-green-400 text-sm font-medium">{msg.playerName}: </span>
                    <span className="text-white text-sm">{msg.content}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Room Browser Component
export function RoomBrowser({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  
  // In production, fetch rooms from API
  useEffect(() => {
    // Mock rooms for demo
    setRooms([
      {
        id: 'room_demo1',
        name: 'Chill Garden 🌸',
        host: 'Alice',
        players: [],
        maxPlayers: 10,
        seed: 'demo_seed',
        season: 'spring',
        settings: {},
        createdAt: Date.now(),
      },
    ]);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">🌿 Garden Rooms</h2>
        
        {/* Player name input */}
        <div className="mb-4">
          <label className="block text-white/60 text-sm mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
          />
        </div>
        
        {/* Room list */}
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {rooms.map(room => (
            <div
              key={room.id}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors"
              onClick={() => playerName && onJoin(room.id)}
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{room.name}</span>
                <span className="text-white/40 text-sm">
                  {room.players.length}/{room.maxPlayers}
                </span>
              </div>
              <p className="text-white/40 text-sm">Host: {room.host}</p>
            </div>
          ))}
        </div>
        
        {/* Create room */}
        {showCreate ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newRoomName && playerName) {
                    // Create room logic
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium"
          >
            + Create New Garden
          </button>
        )}
      </div>
    </div>
  );
}

// Connection Status Indicator
export function ConnectionStatus() {
  const { state } = useMultiplayer();
  
  if (!state.room) return null;
  
  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
      <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-white text-sm">
        {state.players.length} gardener{state.players.length !== 1 ? 's' : ''}
      </span>
      <span className="text-white/40 text-xs">{state.latency}ms</span>
    </div>
  );
}

export default {
  MultiplayerProvider,
  useMultiplayer,
  PlayerAvatar,
  MultiplayerPlayers,
  MultiplayerChat,
  RoomBrowser,
  ConnectionStatus,
};
