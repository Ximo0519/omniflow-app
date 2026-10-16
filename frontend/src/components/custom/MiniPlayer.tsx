import { useState, useRef, useEffect, useCallback } from 'react';

interface MiniPlayerProps {
  src: string;
  /** 是否展开显示（父级控制单例：同时只有一个展开） */
  open: boolean;
  /** 父级设置的"应该在播放"状态（用于切换条目时自动停旧开新） */
  shouldPlay: boolean;
  /** 关闭收起回调 */
  onClose: () => void;
  /** 首次播放触发（广场用来计数） */
  onFirstPlay?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

export default function MiniPlayer({
  src,
  open,
  shouldPlay,
  onClose,
  onFirstPlay,
}: MiniPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(false);
  const firstPlayFired = useRef(false);

  // 当 open 或 src 变化时重置
  useEffect(() => {
    if (!audioRef.current) return;
    if (!open) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setInternalPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      firstPlayFired.current = false;
    } else {
      audioRef.current.load();
    }
  }, [open, src]);

  // 当 shouldPlay 变为 true 时自动播放（父级切换条目）
  useEffect(() => {
    if (!open || !audioRef.current) return;
    if (shouldPlay && !internalPlaying) {
      const p = audioRef.current.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setInternalPlaying(true);
          if (!firstPlayFired.current) {
            firstPlayFired.current = true;
            onFirstPlay?.();
          }
        }).catch(() => {});
      }
    } else if (!shouldPlay && internalPlaying) {
      audioRef.current.pause();
    }
  }, [shouldPlay, open, internalPlaying, onFirstPlay]);

  // 同步倍速 / 音量
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = muted ? 0 : volume;
  }, [playbackRate, volume, muted]);

  const handleToggle = useCallback(async () => {
    if (!audioRef.current) return;
    if (internalPlaying) {
      audioRef.current.pause();
      setInternalPlaying(false);
    } else {
      setLoading(true);
      try {
        await audioRef.current.play();
        setInternalPlaying(true);
        if (!firstPlayFired.current) {
          firstPlayFired.current = true;
          onFirstPlay?.();
        }
      } catch {
        // 用户没交互时 play() 可能被拒，忽略
      } finally {
        setLoading(false);
      }
    }
  }, [internalPlaying, onFirstPlay]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const t = parseFloat(e.target.value);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const skip = useCallback((delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
  }, [duration]);

  const cycleRate = useCallback(() => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    setPlaybackRate(PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]);
  }, [playbackRate]);

  // 只有 open 时才渲染完整结构，否则占零高度
  if (!open) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="mt-3 rounded-md p-3"
      style={{ background: 'var(--sp-surface-2)', border: '1px solid var(--sp-line)' }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onDurationChange={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onLoadedMetadata={(e) => {
          const a = e.target as HTMLAudioElement;
          if (a.buffered.length > 0) {
            setBuffered(a.buffered.end(a.buffered.length - 1));
          }
        }}
        onProgress={(e) => {
          const a = e.target as HTMLAudioElement;
          if (a.buffered.length > 0) {
            setBuffered(a.buffered.end(a.buffered.length - 1));
          }
        }}
        onEnded={() => {
          setInternalPlaying(false);
          setCurrentTime(0);
          onClose();
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
      />

      {/* 进度条 */}
      <div
        className="relative h-5 flex items-center mb-2"
        onMouseEnter={() => setHoverProgress(true)}
        onMouseLeave={() => setHoverProgress(false)}
      >
        {/* 轨道 */}
        <div
          className="absolute inset-x-0 top-1/2 transition-all duration-150"
          style={{
            transform: 'translateY(-50%)',
            background: 'var(--sp-line)',
            height: hoverProgress ? 4 : 2,
          }}
        />
        {/* 已缓冲 */}
        <div
          className="absolute left-0 top-1/2 transition-all duration-150"
          style={{
            transform: 'translateY(-50%)',
            width: `${bufferedPct}%`,
            background: 'var(--sp-line)',
            opacity: 0.5,
            height: hoverProgress ? 4 : 2,
          }}
        />
        {/* 已播放 */}
        <div
          className="absolute left-0 top-1/2 transition-all duration-150"
          style={{
            transform: 'translateY(-50%)',
            width: `${progress}%`,
            background: 'var(--sp-accent)',
            height: hoverProgress ? 4 : 2,
          }}
        />
        {/* 播放头 */}
        <div
          className="absolute rounded-full transition-all duration-150"
          style={{
            left: `${progress}%`,
            top: '50%',
            transform: `translate(-50%,-50%) scale(${hoverProgress ? 1.2 : 1})`,
            background: 'var(--sp-accent)',
            width: hoverProgress ? 12 : 10,
            height: hoverProgress ? 12 : 10,
            boxShadow: hoverProgress ? '0 0 0 3px rgba(var(--sp-accent),0.2)' : 'none',
          }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="播放进度"
        />
      </div>

      {/* 时间 */}
      <div className="flex justify-between font-mono text-[10px] mb-2" style={{ color: 'var(--sp-ink-dim)' }}>
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-2">
        {/* 音量 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMuted(!muted)}
            className="p-1 rounded-sm transition-colors"
            style={{ color: muted || volume === 0 ? 'var(--sp-ink-ghost)' : 'var(--sp-ink-dim)' }}
            title={muted ? '取消静音' : '静音'}
          >
            {(muted || volume === 0) ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 8.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : volume < 0.5 ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 9v6h4l5 5V4l-5 5H7z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.03v7.94c1.48-.73 2.5-2.25 2.5-4.97zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0) setMuted(false);
            }}
            className="w-14 h-1 appearance-none cursor-pointer rounded-full"
            style={{
              background: `linear-gradient(to right, var(--sp-accent) 0%, var(--sp-accent) ${(muted ? 0 : volume) * 100}%, var(--sp-line) ${(muted ? 0 : volume) * 100}%, var(--sp-line) 100%)`,
            }}
            aria-label="音量"
          />
        </div>

        <div className="h-4 w-px" style={{ background: 'var(--sp-line)' }} />

        {/* 后退/前进 5s */}
        <button
          onClick={() => skip(-5)}
          className="p-1 rounded-sm transition-colors"
          style={{ color: 'var(--sp-ink-dim)' }}
          title="后退 5 秒"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={handleToggle}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform"
          style={{ background: 'var(--sp-accent)', color: '#14120E' }}
          title={internalPlaying ? '暂停' : '播放'}
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : internalPlaying ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button
          onClick={() => skip(5)}
          className="p-1 rounded-sm transition-colors"
          style={{ color: 'var(--sp-ink-dim)' }}
          title="前进 5 秒"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" /></svg>
        </button>

        <div className="h-4 w-px" style={{ background: 'var(--sp-line)' }} />

        {/* 倍速 */}
        <button
          onClick={cycleRate}
          className="px-1.5 py-0.5 rounded-sm font-mono text-[10px] transition-colors"
          style={{
            border: '1px solid var(--sp-line)',
            color: playbackRate !== 1 ? 'var(--sp-accent)' : 'var(--sp-ink-dim)',
          }}
          title="点击切换倍速"
        >
          {playbackRate}x
        </button>

        {/* 收起 */}
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded-sm transition-colors"
          style={{ color: 'var(--sp-ink-ghost)' }}
          title="收起"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
