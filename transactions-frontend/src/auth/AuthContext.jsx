import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

function safeJsonParse(storageKey) {
  const value = localStorage.getItem(storageKey);

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    // Prevent app crashes when stale/corrupted localStorage data exists.
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse('user'));
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    const { data } = await api.post('/api/auth/signup', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
