import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Index from './pages/Index';

const ProtectedApp = () => {
  const { isAuthenticated, loading } = useAuth();

  // 启动时校验 token，避免闪登录页
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sp-bg)' }}>
        <div className="w-10 h-10 border-4 border-[var(--sp-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Index />;
};

const App = () => (
  <AuthProvider>
    <ProtectedApp />
    <Toaster />
  </AuthProvider>
);

export default App;
