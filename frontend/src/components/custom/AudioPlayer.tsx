import { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '@shared/types/api';

interface AudioPlayerProps {
  track: MusicTrack;
  onDownload?: () => void;
}

export default function AudioPlayer({ track, onDownload }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('waiting', onWaiting);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
    };
  }, [track.audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const styleLabels: Record<string, string> = {
    pop: '流行', classical: '古典', electronic: '电子', jazz: '爵士', folk: '民谣',
  };
  const moodLabels: Record<string, string> = {
    happy: '欢快', calm: '平静', sad: '悲伤', energetic: '激昂',
  };

  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Album art */}
        <div className="w-36 h-36 md:w-44 md:h-44 flex-shrink-0 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <svg className="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        {/* Info & controls */}
        <div className="flex-grow w-full">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-[#F8FAFC]">{track.title}</h3>
              <p className="text-[#94A3B8] text-sm mt-1">
                风格：{styleLabels[track.style] || track.style} | 情绪：{moodLabels[track.mood] || track.mood}
              </p>
              <p className="text-[#94A3B8] text-xs mt-1 line-clamp-2">{track.description}</p>
            </div>
            <button
              onClick={onDownload}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#94A3B8] hover:text-[#F8FAFC] flex-shrink-0"
              title="下载"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 mb-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 ${progress}%, #334155 ${progress}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-[#94A3B8]">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              onClick={() => {
                if (audioRef.current) { audioRef.current.currentTime = Math.max(0, currentTime - 10); }
              }}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 text-[#0F172A]"
              style={{ background: '#F8FAFC' }}
            >
              {loading ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isPlaying ? (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              onClick={() => {
                if (audioRef.current) { audioRef.current.currentTime = Math.min(duration, currentTime + 10); }
              }}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 18h2V6h-2zm-8.5-6L16 6v12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
