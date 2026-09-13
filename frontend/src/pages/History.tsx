import { useState } from 'react';
import { MusicTrack } from '@shared/types/api';
import AudioPlayer from '@/components/custom/AudioPlayer';
import { toast } from 'sonner';

interface HistoryProps {
  history: MusicTrack[];
  onClear: () => void;
}

const styleLabels: Record<string, string> = {
  pop: '流行', classical: '古典', electronic: '电子', jazz: '爵士', folk: '民谣',
};
const moodLabels: Record<string, string> = {
  happy: '欢快', calm: '平静', sad: '悲伤', energetic: '激昂',
};

export default function History({ history, onClear }: HistoryProps) {
  const [activeTrack, setActiveTrack] = useState<MusicTrack | null>(null);

  const handleDownload = (track: MusicTrack) => {
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.title}.mp3`;
    a.target = '_blank';
    a.click();
    toast.success('开始下载...');
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">历史记录</h1>
          <p className="text-[#94A3B8] text-sm mt-1">共 {history.length} 条生成记录</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定清空所有历史记录？')) {
                onClear();
                setActiveTrack(null);
                toast.success('历史记录已清空');
              }
            }}
            className="px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-[#EF4444] transition-colors"
            style={{ border: '1px solid #334155' }}
          >
            清空记录
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(139,92,246,0.1)' }}>
            <svg className="w-10 h-10" style={{ color: '#8B5CF6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2">还没有生成记录</h3>
          <p className="text-[#94A3B8] mb-6">回到创作中心，开始创作您的第一首 AI 音乐</p>
          <a
            href="#/"
            className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #8B5CF6, #EC4899)' }}
          >
            开始创作
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Track list */}
          <div className="lg:col-span-5 space-y-3">
            {history.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => setActiveTrack(track)}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  background: activeTrack?.id === track.id ? 'rgba(139,92,246,0.15)' : 'rgba(30,41,59,0.6)',
                  border: activeTrack?.id === track.id ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: activeTrack?.id === track.id ? '#8B5CF6' : '#1E293B',
                    color: activeTrack?.id === track.id ? 'white' : '#94A3B8',
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC] truncate">{track.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {styleLabels[track.style] || track.style} · {moodLabels[track.mood] || track.mood} · {track.duration}秒
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {new Date(track.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDownload(track); }}
                  className="p-2 rounded-full text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex-shrink-0"
                  title="下载"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Player */}
          <div className="lg:col-span-7">
            {activeTrack ? (
              <div className="sticky top-24">
                <AudioPlayer track={activeTrack} onDownload={() => handleDownload(activeTrack)} />
                <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #334155' }}>
                  <p className="text-xs text-[#94A3B8] font-medium mb-1">原始描述</p>
                  <p className="text-sm text-[#F8FAFC]">{activeTrack.prompt}</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                style={{ background: 'rgba(30,41,59,0.4)', border: '1px dashed #334155' }}
              >
                <p className="text-[#94A3B8]">点击左侧记录播放音乐</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
