import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { plazaApi, type SharePost } from '@/lib/api';
import CoverArt from '@/components/custom/CoverArt';
import MiniPlayer from '@/components/custom/MiniPlayer';

interface PlazaProps {
  onNavigate?: (path: string) => void;
}

export default function Plaza({ onNavigate }: PlazaProps) {
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [loading, setLoading] = useState(true);

  /** 当前展开 MiniPlayer 的帖子 id（单例） */
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const playedIds = useRef<Set<string>>(new Set());

  // 提示词分享弹窗
  const [showPromptShare, setShowPromptShare] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pPrompt, setPPrompt] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [sharing, setSharing] = useState(false);

  // 展开提示词的帖子
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await plazaApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载广场失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTogglePlay = useCallback(
    (post: SharePost) => {
      if (!post.audioUrl) return;
      setOpenPlayerId((prev) => (prev === post.id ? null : post.id));
      // 首次播放时计入播放数
      if (!playedIds.current.has(post.id)) {
        playedIds.current.add(post.id);
        plazaApi
          .play(post.id)
          .then(() =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === post.id ? { ...p, playsCount: p.playsCount + 1 } : p,
              ),
            ),
          )
          .catch(() => {});
      }
    },
    [],
  );

  const handleLike = useCallback(async (post: SharePost) => {
    // 乐观更新
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likesCount: p.likesCount + (p.likedByMe ? -1 : 1),
            }
          : p,
      ),
    );
    try {
      const result = await plazaApi.like(post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: result.liked, likesCount: result.likesCount }
            : p,
        ),
      );
    } catch (err) {
      // 失败回滚
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likedByMe: post.likedByMe,
                likesCount: post.likesCount,
              }
            : p,
        ),
      );
      toast.error(err instanceof Error ? err.message : '点赞失败');
    }
  }, []);

  const handleUsePrompt = useCallback(
    (post: SharePost) => {
      sessionStorage.setItem('aimusic_prefill_prompt', post.promptText);
      onNavigate?.('/');
      toast.success('提示词已填入创作中心');
    },
    [onNavigate],
  );

  const handlePromptShare = useCallback(async () => {
    if (!pTitle.trim() || !pPrompt.trim()) {
      toast.error('标题和提示词不能为空');
      return;
    }
    setSharing(true);
    try {
      await plazaApi.create({
        title: pTitle.trim(),
        promptText: pPrompt.trim(),
        description: pDesc.trim(),
      });
      toast.success('提示词已分享');
      setShowPromptShare(false);
      setPTitle('');
      setPPrompt('');
      setPDesc('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '分享失败');
    } finally {
      setSharing(false);
    }
  }, [pTitle, pPrompt, pDesc, load]);

  return (
    <div className="grain max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 编辑式页头 */}
      <div className="mb-8">
        <div className="index-no mb-2">PLAZA</div>
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-[var(--sp-ink)] tracking-tight">分享广场</h1>
            <p className="text-sm text-[var(--sp-ink-dim)] mt-2">聆听大家的作品，收藏好用的提示词</p>
          </div>
          <button
            onClick={() => setShowPromptShare(true)}
            className="px-5 py-2.5 rounded-md text-sm font-medium text-white"
            style={{ background: 'var(--sp-accent)' }}
          >
            分享提示词
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-[var(--sp-line)] border-t-[var(--sp-accent)] rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <svg className="w-14 h-14 mb-5 text-[var(--sp-ink-ghost)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="font-display text-2xl text-[var(--sp-ink)]">广场还是空的</p>
          <p className="text-sm text-[var(--sp-ink-dim)] mt-2">来做第一个分享的人</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {posts.map((post, i) => {
            const isOpen = openPlayerId === post.id;
            return (
              <div
                key={post.id}
                className="reveal-up rounded-md p-5 flex flex-col gap-4 transition-colors"
                style={{ background: 'var(--sp-surface)', border: `1px solid ${isOpen ? 'var(--sp-accent)' : 'var(--sp-line)'}`, ['--stagger' as any]: i }}
              >
                {/* 作者行 */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    <CoverArt seed={post.authorName} size={36} />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <p className="text-sm text-[var(--sp-ink)] truncate">{post.authorName}</p>
                    <p className="text-xs text-[var(--sp-ink-ghost)]">
                      {new Date(post.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {post.musicId ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ border: '1px solid var(--sp-accent)', color: 'var(--sp-accent)' }}>
                      音乐作品
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ border: '1px solid var(--sp-ink-ghost)', color: 'var(--sp-ink-ghost)' }}>
                      提示词
                    </span>
                  )}
                </div>

                {/* 标题与描述 */}
                <div>
                  <h3 className="font-display text-lg text-[var(--sp-ink)]">{post.title}</h3>
                  {post.description && (
                    <p className="text-sm text-[var(--sp-ink-dim)] mt-1 line-clamp-2">{post.description}</p>
                  )}
                </div>

                {/* 音乐播放区：点击展开 MiniPlayer */}
                {post.audioUrl && (
                  <>
                    <button
                      onClick={() => handleTogglePlay(post)}
                      className="surface-2 rounded-md p-3 flex items-center gap-3 text-left transition-colors"
                      style={{ border: `1px solid ${isOpen ? 'var(--sp-accent)' : 'var(--sp-line)'}` }}
                    >
                      <CoverArt seed={post.title} size={56} pulsing={isOpen} />
                      <div className="min-w-0 flex-grow">
                        <p className="text-sm text-[var(--sp-ink)] truncate">{isOpen ? '播放器已展开' : '点击播放'}</p>
                        <p className="text-xs text-[var(--sp-ink-dim)] font-mono mt-0.5">♪ {post.playsCount} 次播放</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink)' }}>
                        {isOpen ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </div>
                    </button>
                    <MiniPlayer
                      src={post.audioUrl}
                      open={isOpen}
                      shouldPlay={isOpen}
                      onClose={() => setOpenPlayerId(null)}
                    />
                  </>
                )}

                {/* 提示词折叠展示 */}
                {post.promptText && (
                  <div className="rounded-md" style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}>
                    <button
                      onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[var(--sp-ink-dim)] hover:text-[var(--sp-ink)] transition-colors"
                    >
                      <span className="text-xs font-mono">查看提示词</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${expandedId === post.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedId === post.id && (
                      <div className="px-3 pb-3">
                        <div className="pl-3 py-2 text-xs text-[var(--sp-ink-dim)] font-mono leading-relaxed break-words" style={{ borderLeft: '2px solid var(--sp-accent)' }}>
                          {post.promptText}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 底部操作 */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button
                    onClick={() => handleLike(post)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
                    style={{
                      border: post.likedByMe ? '1px solid var(--sp-accent)' : '1px solid var(--sp-line)',
                      color: post.likedByMe ? 'var(--sp-accent)' : 'var(--sp-ink-dim)',
                      background: 'transparent',
                    }}
                  >
                    <svg className="w-4 h-4" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-mono">{post.likesCount}</span>
                  </button>
                  {post.promptText && (
                    <button
                      onClick={() => handleUsePrompt(post)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ml-auto transition-colors"
                      style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--sp-accent)';
                        e.currentTarget.style.color = 'var(--sp-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--sp-line)';
                        e.currentTarget.style.color = 'var(--sp-ink-dim)';
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      用此提示词创作
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 提示词分享弹窗 */}
      {showPromptShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowPromptShare(false)}>
          <div
            className="w-full max-w-md rounded-md p-6"
            style={{ background: 'var(--sp-surface-2)', border: '1px solid var(--sp-line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-[var(--sp-ink)] mb-4">分享提示词</h3>
            <div className="space-y-3 mb-4">
              <input
                value={pTitle}
                onChange={(e) => setPTitle(e.target.value)}
                maxLength={100}
                placeholder="标题，例如：黄昏爵士氛围"
                className="w-full rounded-md p-3 text-sm text-[var(--sp-ink)] placeholder-[var(--sp-ink-ghost)] outline-none"
                style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
              />
              <textarea
                rows={4}
                value={pPrompt}
                onChange={(e) => setPPrompt(e.target.value)}
                maxLength={2000}
                placeholder="提示词内容，例如：relaxing lofi jazz with soft saxophone, warm cafe ambience..."
                className="w-full rounded-md p-3 text-sm text-[var(--sp-ink)] placeholder-[var(--sp-ink-ghost)] outline-none resize-none"
                style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
              />
              <textarea
                rows={2}
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                maxLength={500}
                placeholder="简单描述（可选）..."
                className="w-full rounded-md p-3 text-sm text-[var(--sp-ink)] placeholder-[var(--sp-ink-ghost)] outline-none resize-none"
                style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)' }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPromptShare(false)}
                className="flex-1 py-2.5 rounded-md text-sm"
                style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
              >
                取消
              </button>
              <button
                onClick={handlePromptShare}
                disabled={sharing}
                className="flex-1 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--sp-accent)' }}
              >
                {sharing ? '分享中...' : '确认分享'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
