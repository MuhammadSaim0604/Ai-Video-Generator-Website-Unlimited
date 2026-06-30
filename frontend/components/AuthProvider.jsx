'use client';
import { useEffect } from 'react';
import { useUserAuthStore } from '../stores/user/user.auth.store';
import { setToken } from '../lib/api';
import { reinitSocket } from '../lib/socket';

export default function AuthProvider({ children }) {
  useEffect(() => {
    useUserAuthStore.getState().initAuth().then((token) => {
      setToken(token);
      if (token) reinitSocket(token);
    });
  }, []);

  return children;
}
