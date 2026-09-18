import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, TOKEN_KEY, USER_KEY } from '@/api/client';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing session on app launch
  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token is still valid with /me
          apiClient
            .get('/me')
            .then((res) => {
              if (res.data?.user) {
                setUser(res.data.user);
                SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data.user));
              }
            })
            .catch(() => {
              // Token expired or invalid
              logout();
            });
        }
      } catch (err) {
        console.warn('Failed to load session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/login', { email, password });
    const { access_token, user: loggedUser } = res.data;

    await SecureStore.setItemAsync(TOKEN_KEY, access_token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedUser));

    setToken(access_token);
    setUser(loggedUser);
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout');
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
