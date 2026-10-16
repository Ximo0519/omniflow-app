import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { musicApi, plazaApi, type MusicRecord } from '@/lib/api';
import CoverArt from '@/components/custom/CoverArt';
import MiniPlayer from '@/components/custom/MiniPlayer';

type Filter = 'all' | 'generating' | 'completed' | 'failed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'generating', label: '生成中' },
  { id: 'completed', label: '已完成' },
  { id: 'failed', label: '失败' },
];

const STATUS_BADGE: Record<string, { text: string; color: string }> = {
  generating: { text: '生成中', color: 'var(--sp-generating)' },
  completed: { text: '已完成', color: 'var(--sp-success)' },
  failed: { text: '失败', color: 'var(--sp-error)' },
};

/** 播放中指示器：三根跳动竖线 */
function PlayingBars() {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-2 pointer-events-none">
      <span className="w-[2px] bg-[var(--sp-accent)] animate-pulse" style={{ height: '60%' }} />
      <span className="w-[2px] bg-[var(--sp-accent)] animate-pulse" style={{ height: '90%', animationDelay: '150ms' }} />
      <span className="w-[2px] bg-[var(--sp-accent)] animate-pulse" style={{ height: '45%', animationDelay: '300ms' }} />
    </div>
  );
}

interface LibraryProps {
  onNavigate?: (path: string) => void;
}

export default function Library({ onNavigate }: LibraryProps) {
  const [list, setList] = useState<MusicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  /** 当前展开 MiniPlayer 的条目 id（单例，同时只展开一个） */
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  /** 当前正在播放的条目 id（独立于展开状态） */
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<MusicRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [shareTarget, setShareTarget] = useState<MusicRecord | null>(null);
  const [shareDesc, setShareDesc] = useState('');
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await musicApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 有生成中的条目时自动刷新
  useEffect(() => {
    if (!list.some((m) => m.status === 'generating')) return;
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [list, load]);

  const handleTogglePlay = useCallback((record: MusicRecord) => {
    if (record.status !== 'completed' || !record.audioUrl) return;
    if (playingId === record.id) {
      // 正在播 → 暂停（不收起播放器）
      setPlayingId(null);
    } else if (openPlayerId === record.id) {
      // 已展开但暂停 → 继续播放
      setPlayingId(record.id);
    } else {
      // 切换到新条目 → 展开 + 开始播放
      setOpenPlayerId(record.id);
      setPlayingId(record.id);
    }
  }, [playingId, openPlayerId]);

  const handlePlayerEnded = useCallback((recordId: string) => {
    setPlayingId((cur) => (cur === recordId ? null : cur));
  }, []);

  const handleClosePlayer = useCallback(() => {
    setOpenPlayerId(null);
    setPlayingId(null);
  }, []);

  const handleDownload = useCallback(async (record: MusicRecord) => {
    try {
      const { url } = await musicApi.downloadUrl(record.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.title}.mp3`;
      a.target = '_blank';
      a.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取下载链接失败');
    }
  }, []);

  const handleRename = useCallback(async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      const updated = await musicApi.rename(renameTarget.id, renameValue.trim());
      setList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setRenameTarget(null);
      toast.success('重命名成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重命名失败');
    } finally {
      setRenaming(false);
    }
  }, [renameTarget, renameValue]);

  const handleDelete = useCallback(async (record: MusicRecord) => {
    if (!confirm(`确定删除「${record.title}」？音频文件将一并删除，不可恢复。`)) return;
    try {
      await musicApi.remove(record.id);
      setList((prev) => prev.filter((m) => m.id !== record.id));
      if (openPlayerId === record.id) setOpenPlayerId(null);
      if (playingId === record.id) setPlayingId(null);
      toast.success('已删除');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }, [openPlayerId, playingId]);

  const handleShare = useCallback(async () => {
    if (!shareTarget) return;
    setSharing(true);
    try {
      await plazaApi.create({ musicId: shareTarget.id, description: shareDesc.trim() });
      toast.success('已分享到广场');
      setShareTarget(null);
      setShareDesc('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '分享失败');
    } finally {
      setSharing(false);
    }
  }, [shareTarget, shareDesc]);

  const filtered = filter === 'all' ? list : list.filter((m) => m.status === filter);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 编辑式页头 */}
      <div className="mb-8">
        <div className="index-no mb-2">LIBRARY</div>
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-[var(--sp-ink)] tracking-tight">我的音乐库</h1>
            <p className="text-sm text-[var(--sp-ink-dim)] mt-2">管理你创作的所有音乐，支持播放、下载、重命名与分享</p>
          </div>
          <p className="text-xs text-[var(--sp-ink-ghost)] font-mono">共 {list.length} 件藏品</p>
        </div>
      </div>

      {/* 下划线筛选 Tab */}
      <div className="flex gap-6 mb-6 border-b border-[var(--sp-line)]">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`relative pb-3 text-sm transition-colors ${filter === f.id ? 'text-[var(--sp-accent)]' : 'text-[var(--sp-ink-dim)] hover:text-[var(--sp-ink)]'}`}
          >
            {f.label}
            <span
              className="absolute left-0 right-0 bottom-[-1px] h-[2px] transition-transform"
              style={{ background: 'var(--sp-accent)', transform: filter === f.id ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-[var(--sp-line)] border-t-[var(--sp-accent)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <svg className="w-14 h-14 mb-5 text-[var(--sp-ink-ghost)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          <p className="font-display text-2xl text-[var(--sp-ink)]">架上空空如也</p>
          <p className="text-sm text-[var(--sp-ink-dim)] mt-2">去创作你的第一张唱片，让它在架上占一席之地</p>
          <button
            onClick={() => onNavigate?.('/')}
            className="mt-6 px-6 py-2.5 rounded-md text-sm font-medium text-white"
            style={{ background: 'var(--sp-accent)' }}
          >
            去创作第一张
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, i) => {
            const badge = STATUS_BADGE[record.status] || STATUS_BADGE.generating;
            const isOpen = openPlayerId === record.id;
            const isPlaying = playingId === record.id;
            return (
              <div
                key={record.id}
                className="reveal-up rounded-md p-4 md:p-5 transition-colors"
                style={{ background: 'var(--sp-surface)', border: `1px solid ${isOpen ? 'var(--sp-accent)' : 'var(--sp-line)'}`, ['--stagger' as any]: i }}
              >
                <div className="flex flex-wrap items-center gap-4">
                  {/* 封面 */}
                  <div className="relative flex-shrink-0">
                    <CoverArt seed={record.title} size={72} pulsing={isPlaying} />
                    {isPlaying && <PlayingBars />}
                  </div>

                  {/* 播放按钮（唯一播放入口：play/pause 图标随 playingId 切换） */}
                  <button
                    onClick={() => record.status === 'completed' && handleTogglePlay(record)}
                    disabled={record.status !== 'completed'}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-colors"
                    style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink)' }}
                    title={isPlaying ? '暂停' : isOpen ? '继续播放' : '播放'}
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>

                  {/* 信息 */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-display text-[var(--sp-ink)] truncate">{record.title}</p>
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-mono"
                        style={{ border: `1px solid ${badge.color}`, color: badge.color }}
                      >
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--sp-ink-dim)] mt-1 truncate">
                      {record.status === 'failed'
                        ? `失败原因：${record.failReason || '未知'}`
                        : `${record.prompt} · ${new Date(record.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {record.status === 'completed' && (
                      <>
                        <IconButton title="下载" onClick={() => handleDownload(record)}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </IconButton>
                        <IconButton title="分享到广场" onClick={() => setShareTarget(record)}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      title="重命名"
                      onClick={() => {
                        setRenameTarget(record);
                        setRenameValue(record.title);
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </IconButton>
                    <IconButton title="删除" danger onClick={() => handleDelete(record)}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </IconButton>
                  </div>
                </div>

                {/* MiniPlayer（无内部播放按钮，外部按钮驱动） */}
                {record.audioUrl && (
                  <MiniPlayer
                    src={record.audioUrl}
                    open={isOpen}
                    shouldPlay={isPlaying}
                    onClose={handleClosePlayer}
                    onEnded={() => handlePlayerEnded(record.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 重命名弹窗 */}
      {renameTarget && (
        <Modal onClose={() => setRenameTarget(null)}>
          <h3 className="font-display text-lg text-[var(--sp-ink)] mb-4">重命名</h3>
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={100}
            className="w-full rounded-md p-3 text-sm text-[var(--sp-ink)] outline-none mb-4"
            style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <div className="flex gap-3">
            <button
              onClick={() => setRenameTarget(null)}
              className="flex-1 py-2.5 rounded-md text-sm"
              style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
            >
              取消
            </button>
            <button
              onClick={handleRename}
              disabled={renaming || !renameValue.trim()}
              className="flex-1 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--sp-accent)' }}
            >
              {renaming ? '保存中...' : '保存'}
            </button>
          </div>
        </Modal>
      )}

      {/* 分享弹窗 */}
      {shareTarget && (
        <Modal onClose={() => setShareTarget(null)}>
          <h3 className="font-display text-lg text-[var(--sp-ink)] mb-1">分享到广场</h3>
          <p className="text-sm text-[var(--sp-ink-dim)] mb-4">「{shareTarget.title}」— 音频与提示词将一起公开</p>
          <textarea
            rows={3}
            value={shareDesc}
            onChange={(e) => setShareDesc(e.target.value)}
            placeholder="简单介绍一下这首音乐（可选）..."
            className="w-full rounded-md p-3 text-sm text-[var(--sp-ink)] placeholder-[var(--sp-ink-ghost)] outline-none resize-none mb-4"
            style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShareTarget(null)}
              className="flex-1 py-2.5 rounded-md text-sm"
              style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
            >
              取消
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--sp-accent)' }}
            >
              {sharing ? '分享中...' : '确认分享'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** 小图标按钮 */
function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-2 rounded-md transition-colors hover:bg-[var(--sp-line)]"
      style={{ color: danger ? 'var(--sp-error)' : 'var(--sp-ink-dim)' }}
    >
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </button>
  );
}

/** 通用弹窗容器 */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-md p-6"
        style={{ background: 'var(--sp-surface-2)', border: '1px solid var(--sp-line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
