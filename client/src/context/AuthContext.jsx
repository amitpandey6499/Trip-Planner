import { createContext, useContext, useState, useEffect } from 'react';

// TEMPORARY (Parts 1-3): browser-only demo session.
// Part 4 replaces this file with real JWT login (register / login / logout / me).
// Pages only use: user, isSignedIn, loading, login, logout.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check saved local user session
    const savedUser = localStorage.getItem('trip_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('trip_user');
      }
    } else {
      // Default initial demo user for seamless evaluation
      const defaultUser = {
        id: 'user_demo_123',
        name: 'Aarav Sharma',
        email: 'demo@tripplanner.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: 'Traveler'
      };
      setUser(defaultUser);
      localStorage.setItem('trip_user', JSON.stringify(defaultUser));
      localStorage.setItem('trip_auth_token', 'demo_user_token');
    }
    setLoading(false);
  }, []);

  const login = (email, _password) => {
    const newUser = {
      id: `user_${Date.now()}`,
      name: email.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase()),
      email: email,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      role: 'Traveler'
    };
    setUser(newUser);
    localStorage.setItem('trip_user', JSON.stringify(newUser));
    localStorage.setItem('trip_auth_token', `demo_token_${Date.now()}`);
    return newUser;
  };

  const loginWithGoogle = () => {
    const googleUser = {
      id: 'user_google_778',
      name: 'Priya Patel',
      email: 'priya.patel@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      role: 'Traveler'
    };
    setUser(googleUser);
    localStorage.setItem('trip_user', JSON.stringify(googleUser));
    localStorage.setItem('trip_auth_token', 'demo_google_token');
    return googleUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('trip_user');
    localStorage.removeItem('trip_auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        loading,
        login,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
