import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  Chat,
  ControlBar,
  RoomAudioRenderer,
  ConnectionStateToast,
  useLocalParticipant,
  useParticipants,
  ParticipantTile,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from '../api/client';

interface Props {
  roomName: string;
  onClose: () => void;
}

export default function Room({ roomName, onClose }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    api.getRoomToken(roomName)
      .then((data) => {
        setToken(data.token);
        setUrl(data.url);
      })
      .catch((err) => setError(err.message));
  }, [roomName]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Ошибка подключения</h2>
          <p className="text-sm opacity-60 mb-6">{error}</p>
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-[var(--accent)] text-white">Закрыть</button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="glass-strong rounded-3xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm opacity-60">Подключение к комнате...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0c0c16] z-50 flex flex-col">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={onClose}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="font-semibold">{roomName}</h2>
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm">
              Покинуть комнату
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <VideoConference />
          </div>

          <ControlBar />
        </div>

        <RoomAudioRenderer />
        <ConnectionStateToast />
      </LiveKitRoom>
    </div>
  );
}
