import { useState } from 'react';

interface NavbarProps {
  onNavigate?: (path: string) => void;
  currentView?: string;
  username?: string | null;
  onReset?: () => void;
  onLogout?: () => void;
}

export default function Navbar({ onNavigate, currentView, username, onReset, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate?.(path);
    setMenuOpen(false);
  };

  const isHome = !currentView || currentView === 'home';
  const isHistory = currentView === 'history';

  return (
    <nav className="sticky top-0 z-50 border-b border-[#334155]" style={{ background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('/')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF6' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#F8FAFC]">AI音创工坊</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => handleNav('/')}
            aria-current={isHome ? 'page' : undefined}
            className="text-sm font-medium transition-colors"
            style={{ color: isHome ? '#8B5CF6' : '#94A3B8' }}
          >
            创作中心
          </button>
          <button
            onClick={() => handleNav('/history')}
            aria-current={isHistory ? 'page' : undefined}
            className="text-sm transition-colors"
            style={{ color: isHistory ? '#8B5CF6' : '#94A3B8' }}
          >
            历史记录
          </button>
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-[#94A3B8]">{username}</span>
              <button
                onClick={onReset}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
                title="清空历史并恢复额度"
              >
                重置
              </button>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid #334155', color: '#94A3B8' }}
              >
                退出
              </button>
            </div>
          )}
          <button
            className="md:hidden p-2 text-[#94A3B8] hover:text-[#F8FAFC]"
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
        <div className="md:hidden border-t border-[#334155] px-4 py-3 space-y-2" style={{ background: 'rgba(15,23,42,0.95)' }}>
          <button
            onClick={() => handleNav('/')}
            className="block w-full text-left py-2 text-sm"
            style={{ color: isHome ? '#8B5CF6' : '#F8FAFC' }}
          >
            创作中心
          </button>
          <button
            onClick={() => handleNav('/history')}
            className="block w-full text-left py-2 text-sm"
            style={{ color: isHistory ? '#8B5CF6' : '#94A3B8' }}
          >
            历史记录
          </button>
          {username && (
            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: '#334155' }}>
              <span className="text-sm text-[#94A3B8]">{username}</span>
              <div className="flex gap-2">
                <button onClick={onReset} className="text-sm text-[#94A3B8] hover:text-[#F8FAFC]">重置</button>
                <button onClick={onLogout} className="text-sm text-[#94A3B8] hover:text-[#EF4444]">退出</button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
