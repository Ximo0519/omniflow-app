import { useEffect, useState } from 'react';
import Navbar from '@/components/custom/Navbar';
import Footer from '@/components/custom/Footer';
import Home from './Home';
import Library from './Library';
import Plaza from './Plaza';
import { useAuth } from '@/contexts/AuthContext';

export type View = 'home' | 'library' | 'plaza';

function viewFromHash(): View {
  const hash = window.location.hash;
  if (hash.startsWith('#/plaza')) return 'plaza';
  if (hash.startsWith('#/library')) return 'library';
  return 'home';
}

const Index = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>(viewFromHash);

  // 监听浏览器前进/后退
  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigation = (path: string) => {
    const next: View =
      path === '/plaza' ? 'plaza' : path === '/library' ? 'library' : 'home';
    setView(next);
    window.location.hash = `#${path === '/' ? '/' : path}`;
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    if (confirm('确定退出登录？')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen flex flex-col grain" style={{ background: 'var(--sp-bg)' }}>
      <Navbar
        onNavigate={handleNavigation}
        currentView={view}
        username={user?.username}
        quotaRemaining={user?.quotaRemaining}
        onLogout={handleLogout}
      />
      <main className="flex-grow">
        {view === 'home' && <Home onNavigate={handleNavigation} />}
        {view === 'library' && <Library onNavigate={handleNavigation} />}
        {view === 'plaza' && <Plaza onNavigate={handleNavigation} />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
