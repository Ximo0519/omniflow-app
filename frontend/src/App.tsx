import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Index from './pages/Index';
import Login from './pages/Login';

const ProtectedApp = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/*" element={<Index />} />
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <AuthProvider>
    <ProtectedApp />
  </AuthProvider>
);

export default App;
