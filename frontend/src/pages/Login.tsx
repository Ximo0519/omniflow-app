import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const WAVE_BARS = [14, 32, 20, 44, 26, 56, 18, 40, 24, 50, 16, 34, 22, 46, 28, 38, 14, 30, 20, 42];

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入账号和密码');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }
      setLoading(true);
      try {
        await register(username.trim(), password);
        toast.success('注册成功，欢迎加入！');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '注册失败');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="grain min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--sp-bg)' }}>
      {/* 左侧品牌区（桌面端） */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 line-warm border-r">
        <div className="index-no reveal-up" style={{ ['--stagger' as any]: 0 }}>
          Late Night Records · AI Music
        </div>
        <div>
          <div className="index-no mb-6 reveal-up" style={{ ['--stagger' as any]: 1 }}>SoundPick</div>
          <h1
            className="font-display reveal-up"
            style={{ ['--stagger' as any]: 2, fontSize: 'clamp(4rem, 8vw, 7rem)', lineHeight: 1.05, color: 'var(--sp-ink)' }}
          >
            拾音社
          </h1>
          <p
            className="mt-6 max-w-md text-sm leading-relaxed reveal-up"
            style={{ ['--stagger' as any]: 3, color: 'var(--sp-ink-dim)' }}
          >
            拾取灵感，谱成声音。在深夜唱片行里，每一段旋律都由 AI 与你共同完成。
          </p>
        </div>
        <div className="reveal-up" style={{ ['--stagger' as any]: 4 }}>
          <div className="flex items-end gap-1.5 h-16" aria-hidden>
            {WAVE_BARS.map((h, i) => (
              <span
                key={i}
                className="w-1"
                style={{
                  height: h,
                  background: i % 6 === 0 ? 'var(--sp-accent)' : i % 2 === 0 ? 'var(--sp-ink-ghost)' : 'var(--sp-line)',
                }}
              />
            ))}
          </div>
          <p className="index-no mt-4" style={{ color: 'var(--sp-ink-ghost)' }}>Side A · 33⅓ RPM</p>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md reveal-up" style={{ ['--stagger' as any]: 1 }}>
          {/* 移动端品牌 */}
          <div className="lg:hidden mb-10">
            <div className="index-no mb-3">SoundPick</div>
            <h1 className="font-display text-5xl" style={{ color: 'var(--sp-ink)' }}>拾音社</h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--sp-ink-dim)' }}>拾取灵感，谱成声音。</p>
          </div>

          <div className="surface line-warm border rounded-lg p-8">
            <div className="index-no mb-5">{mode === 'login' ? 'Sign In' : 'Join Us'}</div>

            {/* 登录 / 注册 切换（下划线式） */}
            <div className="flex gap-8 mb-6 border-b line-subtle">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative pb-3 text-sm transition-colors ${
                    mode === m ? 'text-[var(--sp-ink)]' : 'text-[var(--sp-ink-ghost)] hover:text-[var(--sp-ink-dim)]'
                  }`}
                >
                  {m === 'login' ? '登录' : '注册'}
                  {mode === m && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: 'var(--sp-accent)' }} />
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs mb-6" style={{ color: 'var(--sp-ink-ghost)' }}>
              {mode === 'login' ? '登录后开始创作' : '注册新账号，每天 10 次生成额度'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block index-no mb-2">账号 Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'register' ? '2-20 位中英文、数字或下划线' : '请输入账号'}
                  autoComplete="username"
                  className="w-full rounded-md p-3 text-sm outline-none transition-colors placeholder:text-[var(--sp-ink-ghost)]"
                  style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)', color: 'var(--sp-ink)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sp-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sp-line)')}
                />
              </div>
              <div>
                <label className="block index-no mb-2">密码 Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full rounded-md p-3 text-sm outline-none transition-colors placeholder:text-[var(--sp-ink-ghost)]"
                  style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)', color: 'var(--sp-ink)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--sp-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sp-line)')}
                />
              </div>
              {mode === 'register' && (
                <div>
                  <label className="block index-no mb-2">确认密码 Confirm</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="w-full rounded-md p-3 text-sm outline-none transition-colors placeholder:text-[var(--sp-ink-ghost)]"
                    style={{ background: 'var(--sp-bg)', border: '1px solid var(--sp-line)', color: 'var(--sp-ink)' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--sp-accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--sp-line)')}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-md font-bold transition-all hover:-translate-y-0.5 hover:brightness-90 disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ background: 'var(--sp-accent)', color: '#14120E' }}
              >
                {loading
                  ? mode === 'login'
                    ? '登录中...'
                    : '注册中...'
                  : mode === 'login'
                    ? '登 录'
                    : '注 册'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
