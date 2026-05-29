'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth, tokenStore } from '@/lib/api';
import type { UserPublic } from '@/types/api';

export function useAuth() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(tokenStore.getUser());
    setReady(true);
    const onAuth = () => setUser(tokenStore.getUser());
    window.addEventListener('polymind:auth', onAuth);
    window.addEventListener('storage', onAuth);
    return () => {
      window.removeEventListener('polymind:auth', onAuth);
      window.removeEventListener('storage', onAuth);
    };
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return { user, ready, isAuthed: !!user, logout };
}
