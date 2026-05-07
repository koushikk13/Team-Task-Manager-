import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('taskflow-token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('taskflow-user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('taskflow-token', nextToken);
    localStorage.setItem('taskflow-user', JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('taskflow-token');
    localStorage.removeItem('taskflow-user');
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest('/api/auth/me', {}, token)
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        localStorage.setItem('taskflow-user', JSON.stringify(currentUser));
      })
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout, token]);

  const login = useCallback(
    async (credentials) => {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: credentials
      });
      persistSession(data.token, data.user);
    },
    [persistSession]
  );

  const signup = useCallback(
    async (payload) => {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: payload
      });
      persistSession(data.token, data.user);
    },
    [persistSession]
  );

  const value = useMemo(
    () => ({ token, user, loading, login, signup, logout }),
    [loading, login, logout, signup, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
