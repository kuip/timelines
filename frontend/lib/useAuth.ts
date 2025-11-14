'use client';

import { useEffect, useState, useCallback } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isTwitterVerified: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((userId: string, userData: AuthUser) => {
    localStorage.setItem('auth_token', userId);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  }, []);

  const isTwitterVerified = user?.isTwitterVerified ?? false;
  const canEdit = isTwitterVerified;

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: user !== null,
    isTwitterVerified,
    canEdit,
  };
};
