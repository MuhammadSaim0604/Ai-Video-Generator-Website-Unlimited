'use client';
import { useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { reinitSocket } from '../lib/socket';

export default function AuthProvider({ children }) {
  useEffect(() => {
    useAuthStore.getState().initAuth().then((token) => {
      if (token) reinitSocket(token);
    });
  }, []);

  return children;
}
