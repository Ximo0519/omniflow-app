import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Navbar from '@/components/custom/Navbar';
import Footer from '@/components/custom/Footer';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import Home from './Home';
import History from './History';
import { MusicTrack } from '@shared/types/api';
import { useLocalStorage } from '@/hooks/use-localStorage';
import { useAuth } from '@/contexts/AuthContext';

type View = 'home' | 'history';

const Index = () => {
  const { quotaRemaining, incrementQuota, resetAccount, logout } = useAuth();
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash;
    if (hash === '#/history') return 'history';
    return 'home';
  });
  const [history, setHistory] = useLocalStorage<MusicTrack[]>('ai-music-history', []);

  const handleNavigation = (path: string) => {
    if (path === '/history') {
      setView('history');
      window.location.hash = '#/history';
    } else {
      setView('home');
      window.location.hash = '#/';
    }
  };

  const handleGenerated = (track: MusicTrack) => {
    setHistory((prev) => [track, ...prev].slice(0, 50));
    incrementQuota();
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleReset = () => {
    if (confirm('确定重置测试账号？将清空生成历史并恢复全部额度。')) {
      resetAccount();
      setHistory([]);
      toast.success('账号已重置，额度已恢复');
    }
  };

  const handleLogout = () => {
    if (confirm('确定退出登录？')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      <Navbar
        onNavigate={handleNavigation}
        currentView={view}
        username="admin"
        onReset={handleReset}
        onLogout={handleLogout}
      />
      <main className="flex-grow">
        {view === 'home' ? (
          <Home
            history={history}
            onGenerated={handleGenerated}
            quotaRemaining={quotaRemaining}
          />
        ) : (
          <History history={history} onClear={handleClearHistory} />
        )}
      </main>
      <Footer />
      <OmniflowBadge />
      <Toaster />
    </div>
  );
};

export default Index;
