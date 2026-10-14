import { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '@shared/types/api';
import CoverArt from '@/components/custom/CoverArt';

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
    <div className="surface rounded-md p-6 md:p-8" style={{ border: '1px solid var(--sp-line)' }}>
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* 黑胶唱盘 + 封套 */}
        <div className="relative flex-shrink-0 w-52 h-44 md:w-64 md:h-56">
          {/* 封套：右半探出 */}
          <div
            className="surface-2 rounded-sm absolute top-0 right-0 h-full w-44 md:w-56"
            style={{ border: '1px solid var(--sp-line)' }}
          >
            <div className="absolute top-0 bottom-0 right-2 w-[2px]" style={{ background: 'var(--sp-accent)' }} />
            <div className="absolute top-0 bottom-0 right-4 w-px" style={{ background: 'var(--sp-line)' }} />
          </div>
          {/* 唱片：播放时旋转，暂停时停在原角度 */}
          <div
            className={`absolute top-0 left-0 w-44 h-44 md:w-56 md:h-56 rounded-full vinyl-spin${isPlaying ? '' : ' vinyl-paused'}`}
            style={{
              background:
                'conic-gradient(from 210deg, transparent 0deg, rgba(242,234,217,0.07) 25deg, transparent 70deg), repeating-radial-gradient(circle, #111110 0 2px, #1C1A16 2px 4px)',
              border: '1px solid var(--sp-line)',
              boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
            }}
          >
            {/* 中心圆形标签 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-[38%] aspect-square rounded-full overflow-hidden"
                style={{ border: '1px solid var(--sp-line)' }}
              >
                <CoverArt seed={track.title} size={100} className="w-full h-full" />
              </div>
            </div>
            {/* 轴心孔 */}
            <div
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ transform: 'translate(-50%,-50%)', background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
            />
          </div>
        </div>

        {/* 信息与控制 */}
        <div className="flex-grow w-full min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="index-no">STYLE · {styleLabels[track.style] || track.style}</span>
              <span className="index-no">MOOD · {moodLabels[track.mood] || track.mood}</span>
            </div>
            <button
              onClick={onDownload}
              className="p-2 rounded-sm transition-colors flex-shrink-0"
              style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sp-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--sp-ink-dim)')}
              title="下载"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>

          <h3 className="font-display text-2xl md:text-3xl mt-2" style={{ color: 'var(--sp-ink)' }}>
            {track.title}
          </h3>
          <p className="text-sm mt-1 mb-6 line-clamp-2" style={{ color: 'var(--sp-ink-dim)' }}>
            {track.description}
          </p>

          {/* 进度条：1px 细线 + accent 播放头 */}
          <div className="mb-5">
            <div className="relative h-5 flex items-center">
              <div
                className="absolute inset-x-0 top-1/2 h-px"
                style={{ transform: 'translateY(-50%)', background: 'var(--sp-line)' }}
              />
              <div
                className="absolute left-0 top-1/2 h-px"
                style={{ transform: 'translateY(-50%)', width: `${progress}%`, background: 'var(--sp-accent)' }}
              />
              <div
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{ left: `${progress}%`, top: '50%', transform: 'translate(-50%,-50%)', background: 'var(--sp-accent)' }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="播放进度"
              />
            </div>
            <div className="flex justify-between font-mono text-[11px] mt-1.5" style={{ color: 'var(--sp-ink-dim)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 播放控制 */}
          <div className="flex items-center justify-center gap-4">
            <button
              className="h-9 px-3 rounded-sm flex items-center gap-1.5 transition-colors"
              style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sp-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--sp-ink-dim)')}
              onClick={() => {
                if (audioRef.current) { audioRef.current.currentTime = Math.max(0, currentTime - 10); }
              }}
              title="后退 10 秒"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
              <span className="font-mono text-[10px]">10s</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--sp-accent)', color: '#14120E' }}
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
              className="h-9 px-3 rounded-sm flex items-center gap-1.5 transition-colors"
              style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sp-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--sp-ink-dim)')}
              onClick={() => {
                if (audioRef.current) { audioRef.current.currentTime = Math.min(duration, currentTime + 10); }
              }}
              title="前进 10 秒"
            >
              <span className="font-mono text-[10px]">10s</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 18h2V6h-2zm-8.5-6L16 6v12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
