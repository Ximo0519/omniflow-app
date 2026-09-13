import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

const TEST_USERNAME = 'admin';
const TEST_PASSWORD = '123456';
const MAX_QUOTA = 10;

const AUTH_KEY = 'omniflow_auth';
const QUOTA_KEY = 'omniflow_quota_used';

interface AuthState {
  username: string;
  loginAt: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  quotaUsed: number;
  quotaRemaining: number;
  maxQuota: number;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  incrementQuota: () => void;
  resetAccount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [quotaUsed, setQuotaUsed] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(QUOTA_KEY);
      return raw ? JSON.parse(raw) : 0;
    } catch {
      return 0;
    }
  });

  const login = useCallback((username: string, password: string) => {
    if (username === TEST_USERNAME && password === TEST_PASSWORD) {
      const state = { username, loginAt: Date.now() };
      localStorage.setItem(AUTH_KEY, JSON.stringify(state));
      setAuthState(state);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuthState(null);
  }, []);

  const incrementQuota = useCallback(() => {
    setQuotaUsed((prev) => {
      const next = prev + 1;
      localStorage.setItem(QUOTA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAccount = useCallback(() => {
    localStorage.setItem(QUOTA_KEY, '0');
    localStorage.removeItem('ai-music-history');
    setQuotaUsed(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!authState,
        username: authState?.username ?? null,
        quotaUsed,
        quotaRemaining: Math.max(0, MAX_QUOTA - quotaUsed),
        maxQuota: MAX_QUOTA,
        login,
        logout,
        incrementQuota,
        resetAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
