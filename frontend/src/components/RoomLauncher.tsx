import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Room from './Room';

interface RoomData {
  id: string;
  name: string;
  created_by: string;
  is_active: number;
  created_at: string;
}

interface Props {
  onClose: () => void;
}

export default function RoomLauncher({ onClose }: Props) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch {}
    setLoading(false);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const roomName = newRoomName.trim().toLowerCase().replace(/\s+/g, '-');
    setActiveRoom(roomName);
    setNewRoomName('');
  };

  const joinRoom = (name: string) => {
    setActiveRoom(name);
  };

  if (activeRoom) {
    return <Room roomName={activeRoom} onClose={() => { setActiveRoom(null); loadRooms(); }} />;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Аудио/Видео комнаты</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-white/[0.03]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()}
              placeholder="Название новой комнаты..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              onClick={createRoom}
              disabled={!newRoomName.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-40 hover:brightness-110 transition-all"
            >
              Создать
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-sm opacity-40">Загрузка...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎙️</div>
              <p className="text-sm opacity-40">Активных комнат нет</p>
              <p className="text-xs opacity-30 mt-1">Создайте первую комнату выше</p>
            </div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)]/20">
                    <span className="text-lg">🎙️</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{room.name}</p>
                    <p className="text-[11px] opacity-40">{new Date(room.created_at + 'Z').toLocaleTimeString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => joinRoom(room.name)}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/30 transition-all"
                >
                  Войти
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
