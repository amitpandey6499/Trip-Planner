import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, SESSION_EXPIRED_EVENT } from '../services/api';

/**
 * Login state for the whole app (Part 4: real JWT sessions).
 *
 * The session itself is an httpOnly cookie set by the server — JavaScript cannot read it,
 * so on start-up we simply ask the server "who am I?" (GET /api/auth/me).
 * Nothing about the user is kept in localStorage.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the first /auth/me answer

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Any API call that gets 401 means the session is gone: show the user as logged out.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  /** Each of these throws on failure; err.message / err.fields come from the server. */
  const login = useCallback(
    async ({ email, password, rememberMe = true }) => {
      await authApi.login({ email, password, rememberMe });
      return refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      await authApi.register({ name, email, password });
      return refreshUser();
    },
    [refreshUser],
  );

  const loginDemo = useCallback(async () => {
    await authApi.loginDemo();
    return refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isSignedIn: Boolean(user), loading, login, register, loginDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
