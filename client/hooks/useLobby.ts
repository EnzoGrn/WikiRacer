'use client';

import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';

export function useLobby() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createLobby = (playerName: string) => {
    setLoading(true);
    setError(null);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('lobby:create', { playerName }, (res: { ok: boolean; lobby?: any; error?: string }) => {
      setLoading(false);
      if (res.ok) {
        router.push(`/lobby/${res.lobby.code}`);
      } else {
        setError(res.error || 'Unknown error');
      }
    });
  };

  const joinLobby = (code: string, playerName: string) => {
    setLoading(true);
    setError(null);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('lobby:join', { code, playerName }, (res: { ok: boolean; lobby?: any; error?: string }) => {
      setLoading(false);
      if (res.ok) {
        router.push(`/lobby/${res.lobby.code}`);
      } else {
        setError(res.error || 'Unknown error');
      }
    });
  };

  return { createLobby, joinLobby, loading, error };
}