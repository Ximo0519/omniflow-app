import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import AudioPlayer from '@/components/custom/AudioPlayer';
import { MusicTrack } from '@shared/types/api';
import { API_BASE_URL } from '@/config/constants';

const STYLES = [
  { id: 'pop', label: '流行' },
  { id: 'classical', label: '古典' },
  { id: 'electronic', label: '电子' },
  { id: 'jazz', label: '爵士' },
  { id: 'folk', label: '民谣' },
];

const MOODS = [
  { value: 'happy', label: '欢快' },
  { value: 'calm', label: '平静' },
  { value: 'sad', label: '戒伤' },
  { value: 'energetic', label: '激昂' },
];

const DURATIONS = [
  { value: 30, label: '30 秒' },
  { value: 60, label: '60 秒' },
  { value: 90, label: '90 秒' },
];

interface HomeProps {
  history: MusicTrack[];
  onGenerated: (track: MusicTrack) => void;
  quotaRemaining: number;
}

export default function Home({ history, onGenerated, quotaRemaining }: HomeProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('pop');
  const [duration, setDuration] = useState(60);
  const [mood, setMood] = useState('calm');
  const [generating, setGenerating] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('请输入音乐描述');
      return;
    }
    if (quotaRemaining <= 0) {
      toast.error('生成额度已用完，请点击「重置」恢复额度');
      return;
    }
    setGenerating(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 800);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/generate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style: selectedStyle, duration, mood }),
      });

      clearInterval(interval);
      setProgress(100);

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Generation failed');

      const track: MusicTrack = data.data;
      setCurrentTrack(track);
      onGenerated(track);
      toast.success(`「${track.title}」生成成功！`);
    } catch (err) {
      clearInterval(interval);
      toast.error('生成失败，请重试');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  }, [prompt, selectedStyle, duration, mood, onGenerated, quotaRemaining]);

  const handleDownload = useCallback(() => {
    if (!currentTrack) return;
    const a = document.createElement('a');
    a.href = currentTrack.audioUrl;
    a.download = `${currentTrack.title}.mp3`;
    a.target = '_blank';
    a.click();
    toast.success('开始下载...');
  }, [currentTrack]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <section className="relative py-16 md:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: '#8B5CF6', filter: 'blur(120px)' }} />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: '#EC4899', filter: 'blur(120px)' }} />
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight text-[#F8FAFC]">
          让灵感{' '}
          <span style={{ background: 'linear-gradient(to right, #8B5CF6, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            随乐而动
          </span>
        </h1>
        <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
          只需一段文字描述，AI 即可为您创作独一无二的音乐作品。无需专业背景，释放您的无限创意。
        </p>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form panel */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl p-6 md:p-8" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#F8FAFC]">
              <svg className="w-5 h-5" style={{ color: '#8B5CF6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              创作参数
            </h2>

            <div className="space-y-5">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">音乐描述</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="例如：一段轻松的爵士风格，适合在午后咋啡馆播放，带有萨克斯风的旋律..."
                  className="w-full rounded-xl p-3 text-sm text-[#F8FAFC] placeholder-[#94A3B8] outline-none transition-all resize-none"
                  style={{ background: '#0F172A', border: '1px solid #334155' }}
                  onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
                  onBlur={e => (e.target.style.borderColor = '#334155')}
                />
              </div>

              {/* Style tags */}
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-3">风格标签</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStyle(s.id)}
                      className="px-4 py-1.5 rounded-full text-sm transition-all"
                      style={{
                        border: selectedStyle === s.id ? '1px solid #8B5CF6' : '1px solid #334155',
                        background: selectedStyle === s.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                        color: selectedStyle === s.id ? '#8B5CF6' : '#94A3B8',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Mood */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">时长</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg p-2.5 text-sm text-[#F8FAFC] outline-none"
                    style={{ background: '#0F172A', border: '1px solid #334155' }}
                  >
                    {DURATIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">情绪</label>
                  <select
                    value={mood}
                    onChange={e => setMood(e.target.value)}
                    className="w-full rounded-lg p-2.5 text-sm text-[#F8FAFC] outline-none"
                    style={{ background: '#0F172A', border: '1px solid #334155' }}
                  >
                    {MOODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || quotaRemaining <= 0}
                className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(to right, #8B5CF6, #EC4899)' }}
              >
                {generating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI 正在谱曲中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    立即生成
                  </>
                )}
              </button>

              {/* Progress bar */}
              {generating && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#334155' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: 'linear-gradient(to right, #8B5CF6, #EC4899)' }}
                    />
                  </div>
                  <p className="text-xs text-center text-[#94A3B8]">预计还需 {Math.max(1, Math.round((100 - progress) / 15))} 秒</p>
                </div>
              )}

              <p className="text-center text-xs text-[#94A3B8]">
                剩余生成次数：<span className="text-[#F8FAFC] font-medium">{quotaRemaining}/10</span>
                {quotaRemaining <= 0 && (
                  <span className="block mt-1 text-[#EF4444]">额度已用完，请在右上角点击「重置」</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Player or empty state */}
          {currentTrack ? (
            <AudioPlayer track={currentTrack} onDownload={handleDownload} />
          ) : (
            <div
              className="rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[200px]"
              style={{ background: 'rgba(30,41,59,0.4)', border: '1px dashed #334155' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <svg className="w-8 h-8" style={{ color: '#8B5CF6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-[#94A3B8] font-medium">输入描述并点击「立即生成」</p>
              <p className="text-[#94A3B8] text-sm mt-1">您的音乐作品将在这里展示</p>
            </div>
          )}

          {/* Recent history */}
          {history.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-[#F8FAFC]">最近生成</h4>
                <a href="#/history" className="text-sm hover:underline" style={{ color: '#8B5CF6' }}>查看全部</a>
              </div>
              <div className="space-y-2">
                {history.slice(0, 3).map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer group"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setCurrentTrack(track)}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-[#94A3B8] flex-shrink-0"
                      style={{ background: '#1E293B' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-[#F8FAFC] truncate">{track.title}</p>
                      <p className="text-xs text-[#94A3B8]">{new Date(track.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#94A3B8] hover:text-[#F8FAFC]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
