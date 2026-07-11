import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  src: string;
  isOwn: boolean;
}

export default function Waveform({ src, isOwn }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>(new Array(32).fill(0.2));
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      generateBars(audio);
    };

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const generateBars = async (audio: HTMLAudioElement) => {
    try {
      const ctx = new AudioContext();
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 32;
      const blockSize = Math.floor(rawData.length / samples);
      const newBars: number[] = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        newBars.push(sum / blockSize);
      }

      const max = Math.max(...newBars);
      const normalized = newBars.map(b => Math.max(0.1, b / max));
      setBars(normalized);
      ctx.close();
    } catch {
      setBars(new Array(32).fill(0.5).map(() => 0.2 + Math.random() * 0.6));
    }
  };

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      cancelAnimationFrame(animRef.current);
    } else {
      audio.play();
      const animate = () => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    setPlaying(!playing);
  }, [playing]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3" style={{ minWidth: 200 }}>
      <audio ref={audioRef} preload="auto" className="hidden">
        <source src={src} />
      </audio>

      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
        style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(233,69,96,0.2)' }}
      >
        {playing ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isOwn ? 'white' : 'var(--accent)'}>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill={isOwn ? 'white' : 'var(--accent)'}>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-end gap-[2px] h-8 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = x / rect.width;
          if (audioRef.current && duration) {
            audioRef.current.currentTime = pct * duration;
            setProgress(pct);
          }
        }}>
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${h * 100}%`,
                  minHeight: 3,
                  background: isActive
                    ? (isOwn ? 'rgba(255,255,255,0.9)' : 'var(--accent)')
                    : (isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'),
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] opacity-50 tabular-nums">
          <span>{playing ? fmtTime(audioRef.current?.currentTime || 0) : fmtTime(duration)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
