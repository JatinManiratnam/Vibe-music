import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: rehydrate user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('vibeUser');
    const token = localStorage.getItem('vibeToken');
    if (storedUser && token) {
      const parsed = JSON.parse(storedUser);
      // Fallback: existing sessions without role are treated as 'listener'
      // Ensure likedSongs defaults to an empty array
      setUser({ 
        ...parsed, 
        role: parsed.role ?? 'listener',
        likedSongs: parsed.likedSongs || []
      });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('vibeToken', data.token);
    const userData = { 
      _id: data._id, 
      name: data.name, 
      email: data.email, 
      role: data.role ?? 'listener',
      likedSongs: data.likedSongs || []
    };
    localStorage.setItem('vibeUser', JSON.stringify(userData));
    setUser(userData);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('vibeToken', data.token);
    const userData = { 
      _id: data._id, 
      name: data.name, 
      email: data.email, 
      role: data.role ?? 'listener',
      likedSongs: data.likedSongs || []
    };
    localStorage.setItem('vibeUser', JSON.stringify(userData));
    setUser(userData);
    return data;
  };
  const logout = () => {
    localStorage.removeItem('vibeToken');
    localStorage.removeItem('vibeUser');
    setUser(null);
  };

  const updateUser = (newUserData) => {
    const updated = { ...user, ...newUserData };
    localStorage.setItem('vibeUser', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
