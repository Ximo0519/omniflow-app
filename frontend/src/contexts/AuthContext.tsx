import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, getToken, setToken, isDevPreview, MOCK_USER, type User } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean; // 启动时校验 token 是否加载中
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, activationCode: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>; // 生成音乐后刷新配额
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 开发预览模式：无后端时直接以模拟用户进入内页（localStorage 设置 aimusic_dev_preview=1）
  const devPreview = isDevPreview();
  const [token, setTokenState] = useState<string | null>(
    devPreview ? 'dev-preview-token' : getToken(),
  );
  const [user, setUser] = useState<User | null>(devPreview ? MOCK_USER : null);
  const [loading, setLoading] = useState<boolean>(
    devPreview ? false : !!getToken(),
  );

  // 启动时校验已有 token
  useEffect(() => {
    if (devPreview) return;
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setTokenState(t);
      })
      .catch(() => {
        setToken(null);
        setTokenState(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token: newToken, user: newUser } = await authApi.login(
      username,
      password,
    );
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const register = useCallback(
    async (username: string, password: string, activationCode: string) => {
      const { token: newToken, user: newUser } = await authApi.register(
        username,
        password,
        activationCode,
      );
      setToken(newToken);
      setTokenState(newToken);
      setUser(newUser);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      // 忽略刷新失败（如网络抖动）
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return ctx;
}
