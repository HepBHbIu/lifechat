import { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, Message, User } from '../types';
import { api } from '../api/client';
import { SoundEffects } from '../utils/sounds';
import MessageBubble from './MessageBubble';
import ForwardModal from './ForwardModal';
import GifPicker from './GifPicker';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  users: User[];
  onSendMessage: (chatId: string, text: string, replyToId?: string, isSpoiler?: boolean, autoDelete?: number) => void;
  onFileUploaded: (chatId: string, messageId: string) => void;
  onTyping: (chatId: string) => void;
  wsOn: (type: string, handler: (msg: any) => void) => () => void;
  typingUsers: string[];
  onBack?: () => void;
}

export default function ChatWindow({ chat, currentUser, users, onSendMessage, onFileUploaded, onTyping, wsOn, typingUsers, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatMembers, setChatMembers] = useState<any[]>([]);
  const typingSentRef = useRef(false);

  // Reply / Edit / Forward / Search
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // GIF / Spoiler / Auto-delete / Video note
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [autoDelete, setAutoDelete] = useState<number | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [videoRecordTime, setVideoRecordTime] = useState(0);
  const videoTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const [freqData, setFreqData] = useState<number[]>(new Array(32).fill(0));

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await api.getMessages(chat.id);
      setMessages(msgs);
      api.markAsRead(chat.id).catch(() => {});
    } catch {}
  }, [chat.id]);

  const loadMembers = useCallback(async () => {
    if (chat.type === 'group') {
      try { setChatMembers(await api.getChatMembers(chat.id)); } catch {}
    }
  }, [chat.id, chat.type]);

  useEffect(() => { loadMessages(); loadMembers(); }, [loadMessages, loadMembers]);

  useEffect(() => {
    const unsub = wsOn('new_message', (msg) => {
      if (msg.message?.chat_id === chat.id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.message.id)) return prev;
          return [...prev, msg.message];
        });
      }
    });
    return unsub;
  }, [wsOn, chat.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Attach stream to video preview when recording starts
  useEffect(() => {
    if (isRecordingVideo && videoStreamRef.current && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = videoStreamRef.current;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [isRecordingVideo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        setUploading(true);
        const result = await api.uploadFile(chat.id, file);
        onFileUploaded(chat.id, result.id);
        SoundEffects.whoosh();
      } catch {}
    }
    setUploading(false);
    await loadMessages();
  }, [chat.id, onFileUploaded]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMsg) {
      try {
        await api.editMessage(editingMsg.id, trimmed);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text: trimmed, edited_at: new Date().toISOString() } : m));
        setEditingMsg(null);
      } catch {}
    } else {
      onSendMessage(chat.id, trimmed, replyTo?.id, isSpoiler, autoDelete || undefined);
      SoundEffects.messageOut();
      setReplyTo(null);
      setIsSpoiler(false);
      setAutoDelete(null);
    }
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = '56px';
  };

  const handleSendGif = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `gif_${Date.now()}.gif`, { type: 'image/gif' });
      setUploading(true);
      const result = await api.uploadFile(chat.id, file);
      onFileUploaded(chat.id, result.id);
      SoundEffects.whoosh();
      await loadMessages();
    } catch {}
    setUploading(false);
  };

  const handleSendVideoNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 360, height: 360, facingMode: 'user' }, audio: true });
      videoStreamRef.current = stream;
      setIsRecordingVideo(true);
      setVideoRecordTime(0);

      // Timer
      videoTimerRef.current = setInterval(() => {
        setVideoRecordTime(prev => prev + 1);
      }, 1000);

      const chunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      videoRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        // Stop timer
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
        setIsRecordingVideo(false);

        // Stop stream AFTER processing
        if (chunks.length === 0) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });

        setUploading(true);
        try {
          const result = await api.uploadFile(chat.id, file);
          onFileUploaded(chat.id, result.id);
          await loadMessages();
        } catch (err: any) {
          console.error('Upload error:', err);
        } finally {
          setUploading(false);
          stream.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start(100);
      // Auto-stop after 60 seconds
      setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 60000);
    } catch (err: any) {
      console.error('Camera error:', err);
      alert('Не удалось получить доступ к камере. Разрешите доступ в настройках браузера.');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    }
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    // Stream is stopped in onstop callback
    videoRecorderRef.current = null;
  };

  const cancelVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.ondataavailable = null;
      videoRecorderRef.current.onstop = null;
      videoRecorderRef.current.stop();
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    setIsRecordingVideo(false);
    setVideoRecordTime(0);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const results = await api.searchMessages(chat.id, searchQuery.trim());
      setSearchResults(results);
    } catch {}
  };

  const handleForward = async (toChatId: string) => {
    if (!forwardMsg) return;
    try {
      await api.forwardMessage(forwardMsg.id, toChatId);
      setForwardMsg(null);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';

    // Detect @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);
    if (atMatch) {
      setMentionFilter(atMatch[1]);
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
    }

    onTyping(chat.id);
  };

  const handleMention = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const textBefore = text.substring(0, cursorPos);
    const textAfter = text.substring(cursorPos);
    const newText = textBefore.replace(/@\S*$/, `@${username} `) + textAfter;
    setText(newText);
    setShowMentionPicker(false);
    textareaRef.current?.focus();
  };

  const filteredUsers = users.filter(u => u.is_active && u.id !== currentUser.id && u.username.toLowerCase().includes(mentionFilter.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadFile(chat.id, file);
      onFileUploaded(chat.id, result.id);
      SoundEffects.whoosh();
      await loadMessages();
    } catch (err: any) { alert(err.message || 'Ошибка загрузки'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  // ===== VOICE RECORDING =====
  const updateFreqBars = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars: number[] = [];
    const step = Math.floor(data.length / 32);
    for (let i = 0; i < 32; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += data[i * step + j];
      bars.push(sum / step / 255);
    }
    setFreqData(bars);
    animFrameRef.current = requestAnimationFrame(updateFreqBars);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      streamRef.current = stream;

      // Set up Web Audio API for visualization
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      updateFreqBars();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        cancelAnimationFrame(animFrameRef.current);
        setFreqData(new Array(32).fill(0));
        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'wav';
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });

        setUploading(true);
        try {
          const result = await api.uploadFile(chat.id, file);
          onFileUploaded(chat.id, result.id);
          await loadMessages();
        } catch (err: any) { alert(err.message || 'Ошибка отправки'); }
        finally { setUploading(false); }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    cancelAnimationFrame(animFrameRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    setFreqData(new Array(32).fill(0));
  };

  const formatRecTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getChatTitle = () => chat.title || 'Личный чат';
  const hasText = text.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header — glass morphism */}
      <div className="glass-strong px-4 py-3 flex items-center gap-3 z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-1 hover:bg-white/5 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ background: chat.type === 'group' ? 'linear-gradient(135deg, #1a936f, #52b788)' : 'linear-gradient(135deg, #1a1a30, #2a2a40)' }}>
          {chat.type === 'group' ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          ) : (
            <span className="text-white font-bold text-sm">{getChatTitle()[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{getChatTitle()}</div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {chat.type === 'group' ? `${chatMembers.length} участников` : 'личный чат'}
          </div>
        </div>
        <button onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQuery(''); }}
          className={`p-2.5 rounded-xl transition-all ${showSearch ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`} title="Поиск">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </button>
      </div>

      {/* Pinned message banner */}
      {chat.pinned_message && (
        <div className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-all animate-slide-down"
          style={{ background: 'rgba(233,69,96,0.04)', borderBottom: '1px solid rgba(233,69,96,0.1)' }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>{chat.pinned_message.sender_name}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{chat.pinned_message.text || 'Медиа'}</div>
          </div>
        </div>
      )}

      {/* Search bar — slide down */}
      {showSearch && (
        <div className="px-4 py-3 border-b border-white/[0.03] animate-fade-in-up" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Найти в чате..." autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40" />
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 text-[11px] text-[var(--text-secondary)] px-1">Найдено: {searchResults.length} сообщений</div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 relative"
        style={{ background: 'var(--bg-secondary)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.1)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-strong rounded-3xl p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="text-sm font-medium">Отпустите файлы для загрузки</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="flex gap-2">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)', animation: `pulse 1.2s infinite ${d}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Загрузка сообщений...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center animate-fade-in-up">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 mb-5 rounded-3xl flex items-center justify-center relative"
                style={{ background: 'rgba(233,69,96,0.05)' }}>
                <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(circle, rgba(233,69,96,0.08), transparent)' }} />
                <svg className="w-12 h-12 relative z-10" style={{ color: 'var(--accent)', opacity: 0.25 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Начните переписку</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Отправьте первое сообщение</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mx-auto" style={{ maxWidth: '900px' }}>
            {(searchResults.length > 0 ? searchResults : messages).map((msg, idx, arr) => {
              const prevMsg = arr[idx - 1];
              const showDate = !prevMsg || new Date(msg.created_at + 'Z').toDateString() !== new Date(prevMsg.created_at + 'Z').toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <div className="px-4 py-1.5 rounded-full text-[11px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {new Date(msg.created_at + 'Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all animate-fade-in-up glass-card"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
                  <MessageBubble message={msg} isOwn={msg.sender_id === currentUser.id}
                    currentUserId={currentUser.id}
                    onDelete={async (id) => { try { await api.deleteMessage(id); setMessages(prev => prev.filter(m => m.id !== id)); setSearchResults(prev => prev.filter(m => m.id !== id)); } catch {} }}
                    onReply={(m) => { setReplyTo(m); setEditingMsg(null); setText(''); }}
                    onForward={(m) => setForwardMsg(m)}
                    onEdit={(m) => { setEditingMsg(m); setReplyTo(null); setText(m.text || ''); textareaRef.current?.focus(); }}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing — animated bubbles */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 animate-fade-in-up" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 px-3 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: 'var(--accent)',
                  animation: `typingBounce 1.4s infinite ${i * 0.2}s`,
                }} />
              ))}
            </div>
            <span className="text-xs">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'печатает' : 'печатают'}</span>
          </div>
        </div>
      )}

      {/* ===== INPUT / RECORDING ===== */}
      <div className="glass-strong" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        {isRecording ? (
          /* ---- RECORDING: equalizer inside input area ---- */
          <div className="px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2 mx-auto">
              {/* Cancel */}
              <button onClick={cancelRecording} className="p-2 rounded-xl hover:bg-white/5 text-[var(--text-secondary)] hover:text-red-400 transition-all flex-shrink-0" title="Отменить">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Equalizer bars + timer — inside the input field area */}
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: 'rgba(233, 69, 96, 0.06)', border: '1px solid rgba(233, 69, 96, 0.15)' }}>
                {/* Pulsing dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ animation: 'pulse 1s infinite' }} />
                </div>

                {/* Real equalizer */}
                <div className="flex items-end gap-[2px] h-7 flex-1">
                  {freqData.map((v, i) => (
                    <div key={i} className="flex-1 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(3, v * 28)}px`,
                        background: v > 0.6 ? '#e94560' : v > 0.3 ? '#ff6b81' : 'rgba(233, 69, 96, 0.3)',
                      }} />
                  ))}
                </div>

                {/* Timer */}
                <span className="text-xs font-mono text-red-400 tabular-nums flex-shrink-0">{formatRecTime(recordingTime)}</span>
              </div>

              {/* Send */}
              <button onClick={stopRecording}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all flex-shrink-0 active:scale-95 hover:shadow-lg hover:shadow-red-500/30"
                style={{ background: 'linear-gradient(135deg, #e94560, #d63851)' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        ) : (
          /* ---- NORMAL INPUT ---- */
          <div className="px-3 py-2.5">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleFileUpload} className="hidden" />

            {/* Reply / Edit indicator */}
            {(replyTo || editingMsg) && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl animate-fade-in-up"
                style={{ background: 'rgba(233,69,96,0.08)', borderLeft: '3px solid var(--accent)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>
                    {editingMsg ? '✏️ Редактирование' : `↩️ ${replyTo?.sender_name}`}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {editingMsg?.text || replyTo?.text || '...'}
                  </div>
                </div>
                <button onClick={() => { setReplyTo(null); setEditingMsg(null); setText(''); }}
                  className="p-1 rounded-lg hover:bg-white/5 transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Text input */}
              <div className="flex-1 relative">
                <textarea ref={textareaRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                  placeholder={isSpoiler ? "⚠ Спойлер..." : editingMsg ? "✏️ Редактирование..." : "Сообщение..."} rows={1}
                  className="w-full px-3.5 py-2.5 rounded-2xl resize-none transition-all glass-input"
                  style={{ minHeight: '40px', maxHeight: '140px', fontSize: '14px', lineHeight: '1.4', color: 'var(--text-primary)', boxSizing: 'border-box', overflow: 'auto', wordBreak: 'break-word', borderColor: isSpoiler ? 'rgba(233,69,96,0.3)' : undefined }} />
              </div>

              {/* Send / Mic */}
              {hasText ? (
                <button onClick={handleSend} disabled={uploading}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 transition-all duration-150 disabled:opacity-25 active:scale-90"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', boxShadow: '0 3px 12px var(--accent-glow)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              ) : (
                <button onClick={startRecording} disabled={uploading}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 flex-shrink-0 disabled:opacity-25 active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  title="Записать голосовое">
                  <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-0.5">
                <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Файл">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => imageInputRef.current?.click()} disabled={uploading} title="Фото">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                </ToolBtn>
                <ToolBtn onClick={() => setShowGifPicker(true)} disabled={uploading} title="GIF">
                  <span className="text-[9px] font-extrabold">GIF</span>
                </ToolBtn>
                <ToolBtn onClick={() => setShowStickerPicker(true)} disabled={uploading} title="Стикеры">
                  <span className="text-sm">🎨</span>
                </ToolBtn>
                <ToolBtn onClick={handleSendVideoNote} disabled={uploading || isRecordingVideo} title="Видеосообщение">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                </ToolBtn>
              </div>

              <div className="flex items-center gap-0.5">
                <ToolBtn onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={uploading} title="Эмодзи">
                  <span className="text-sm">😊</span>
                </ToolBtn>
                <button onClick={() => setIsSpoiler(!isSpoiler)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{ background: isSpoiler ? 'var(--accent)' : 'rgba(255,255,255,0.03)', color: isSpoiler ? 'white' : 'var(--text-secondary)', border: isSpoiler ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                  title="Спойлер">⚠</button>
                <select value={autoDelete || ''} onChange={e => setAutoDelete(e.target.value ? Number(e.target.value) : null)}
                  className="w-8 h-8 rounded-xl bg-white/[0.03] text-[10px] text-[var(--text-secondary)] border border-white/[0.05] focus:outline-none cursor-pointer text-center"
                  title="Автоудаление">
                  <option value="">∞</option>
                  <option value="30">30с</option>
                  <option value="60">1м</option>
                  <option value="300">5м</option>
                  <option value="3600">1ч</option>
                </select>
              </div>
            </div>

            {uploading && (
              <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(233,69,96,0.06)', border: '1px solid rgba(233,69,96,0.1)' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.15)' }}>
                  <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Загрузка...</div>
                  <div className="w-full h-0.5 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ background: 'var(--accent)', animation: 'shimmer 1.5s infinite', width: '60%' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal onClose={() => setForwardMsg(null)} onForward={handleForward} />
      )}

      {/* GIF picker */}
      {showGifPicker && (
        <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />
      )}

      {/* Sticker picker */}
      {showStickerPicker && (
        <StickerPicker onSelect={(sticker) => { setText(prev => prev + sticker); textareaRef.current?.focus(); }} onClose={() => setShowStickerPicker(false)} />
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-4 z-50">
          <EmojiPicker onSelect={(emoji) => { setText(prev => prev + emoji); textareaRef.current?.focus(); }} onClose={() => setShowEmojiPicker(false)} />
        </div>
      )}

      {/* @Mention picker */}
      {showMentionPicker && filteredUsers.length > 0 && (
        <div className="absolute bottom-full mb-2 left-14 w-56 max-h-48 overflow-y-auto rounded-2xl z-50 animate-fade-in-up"
          style={{ background: 'rgba(12,12,22,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {filteredUsers.slice(0, 8).map(u => (
            <button key={u.id} onClick={() => handleMention(u.username)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] transition-colors text-left">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a1a30, #2a2a40)' }}>
                {u.username[0].toUpperCase()}
              </div>
              <span className="text-sm truncate">@{u.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Video recording overlay */}
      {isRecordingVideo && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          {/* Camera preview */}
          <div className="relative mb-6">
            <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/20">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            </div>
            {/* Recording indicator */}
            <div className="absolute -top-1 -right-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ animation: 'pulse 1s infinite' }} />
              <span className="text-sm font-mono text-red-400 tabular-nums">{formatRecTime(videoRecordTime)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button onClick={cancelVideoRecording}
              className="w-14 h-14 rounded-full flex items-center justify-center glass-card transition-all hover:bg-white/10 active:scale-95"
              title="Отмена">
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button onClick={stopVideoRecording}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #e94560, #d63851)', boxShadow: '0 0 30px rgba(233,69,96,0.4)' }}
              title="Отправить">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>

          <p className="text-white/40 text-xs mt-4">Макс. 60 секунд</p>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-25 hover:bg-white/[0.08] active:scale-90"
      style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
      {children}
    </button>
  );
}
