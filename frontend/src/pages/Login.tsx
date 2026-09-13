import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入账号和密码');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password.trim());
      if (!success) {
        toast.error('账号或密码错误');
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: '#8B5CF6', filter: 'blur(120px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: '#EC4899', filter: 'blur(120px)' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">AI音创工坊</h1>
          <p className="text-[#94A3B8] mt-2">登录后开始创作</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">账号</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                autoComplete="username"
                className="w-full rounded-xl p-3 text-sm text-[#F8FAFC] placeholder-[#475569] outline-none transition-all"
                style={{ background: '#0F172A', border: '1px solid #334155' }}
                onFocus={(e) => (e.target.style.borderColor = '#8B5CF6')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full rounded-xl p-3 text-sm text-[#F8FAFC] placeholder-[#475569] outline-none transition-all"
                style={{ background: '#0F172A', border: '1px solid #334155' }}
                onFocus={(e) => (e.target.style.borderColor = '#8B5CF6')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #8B5CF6, #EC4899)' }}
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-center text-xs text-[#475569]">
              演示测试账号：admin / 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
