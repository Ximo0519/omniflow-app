import { Fragment, useState } from 'react';

interface NavbarProps {
  onNavigate?: (path: string) => void;
  currentView?: string;
  username?: string | null;
  quotaRemaining?: number;
  onLogout?: () => void;
}

const NAV_ITEMS: { path: string; label: string }[] = [
  { path: '/', label: '创作中心' },
  { path: '/library', label: '我的音乐库' },
  { path: '/plaza', label: '分享广场' },
];

export default function Navbar({
  onNavigate,
  currentView,
  username,
  quotaRemaining,
  onLogout,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate?.(path);
    setMenuOpen(false);
  };

  const isActive = (path: string) =>
    path === '/' ? currentView === 'home' : currentView === path.slice(1);

  return (
    <nav className="sticky top-0 z-50 line-warm border-b" style={{ background: 'var(--sp-bg)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/')}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--sp-accent)' }}>
            <svg className="w-5 h-5" fill="none" stroke="#14120E" strokeWidth={2.2} strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg leading-none" style={{ color: 'var(--sp-ink)' }}>拾音社</span>
            <span className="index-no hidden sm:inline">SoundPick</span>
          </div>
        </div>

        <div className="hidden md:flex items-stretch h-16 gap-7">
          {NAV_ITEMS.map((item, i) => (
            <Fragment key={item.path}>
              {i > 0 && (
                <span className="self-center select-none" style={{ color: 'var(--sp-ink-ghost)' }} aria-hidden>~</span>
              )}
              <button
                onClick={() => handleNav(item.path)}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`relative flex items-center text-sm transition-colors ${
                  isActive(item.path)
                    ? 'text-[var(--sp-accent)]'
                    : 'text-[var(--sp-ink-dim)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5"
                    style={{ background: 'var(--sp-accent)' }}
                  />
                )}
              </button>
            </Fragment>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <div className="hidden md:flex items-center gap-4">
              {typeof quotaRemaining === 'number' && (
                <span
                  className="px-2.5 py-1 rounded-md text-xs font-mono"
                  style={{ border: '1px solid var(--sp-line)', color: 'var(--sp-ink-dim)' }}
                  title="每日生成额度，次日自动重置"
                >
                  今日 <span style={{ color: 'var(--sp-accent)' }}>{quotaRemaining}</span> 次
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--sp-ink-dim)' }}>{username}</span>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-md text-sm border line-warm transition-colors text-[var(--sp-ink-dim)] hover:text-[var(--sp-ink)]"
              >
                退出
              </button>
            </div>
          )}
          <button
            className="md:hidden p-2 transition-colors text-[var(--sp-ink-dim)] hover:text-[var(--sp-ink)]"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden line-warm border-t px-4 py-3 space-y-1 surface">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`block w-full text-left py-2 text-sm transition-colors ${
                isActive(item.path) ? 'text-[var(--sp-accent)]' : 'text-[var(--sp-ink-dim)]'
              }`}
            >
              {item.label}
            </button>
          ))}
          {username && (
            <div className="pt-3 mt-2 border-t line-subtle flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--sp-ink-dim)' }}>
                {username}
                {typeof quotaRemaining === 'number' && (
                  <> · 今日 <span style={{ color: 'var(--sp-accent)' }}>{quotaRemaining}</span> 次</>
                )}
              </span>
              <button
                onClick={onLogout}
                className="text-sm transition-colors text-[var(--sp-ink-dim)] hover:text-[var(--sp-accent)]"
              >
                退出
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
