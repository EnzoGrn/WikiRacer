'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import type { Player } from '@shared/types';

interface PlayerState {
  id: string;
  name: string;
  clicks: number;
  currentPage: string;
  finishedAt: number | null;
  rank: number | null;
  time: number | null;
  path: string[];
  gaveUp: boolean;
}

interface RankingEntry {
  rank: number;
  id: string;
  name: string;
  clicks: number;
  time: number;
  path: string[];
}

interface UseGameProps {
  initialPlayers: Player[];
  source: string;
}

export function useGame({ initialPlayers, source }: UseGameProps) {
  const [players, setPlayers] = useState<PlayerState[]>(
    initialPlayers.map(p => ({
      id: p.id,
      name: p.name,
      clicks: p.clicks,
      currentPage: source,
      finishedAt: p.finishedAt,
      rank: p.rank,
      time: null,
      path: p.path,
      gaveUp: false,
    }))
  );
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'finished'>('playing');

  useEffect(() => {
    socket.on('game:playerMoved', ({ playerId, currentPage, clicks }: {
      playerId: string;
      currentPage: string;
      clicks: number;
    }) => {
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, currentPage, clicks } : p
      ));
    });

    socket.on('game:playerFinished', ({ playerId, rank, clicks, time, path }: {
      playerId: string;
      playerName: string;
      rank: number;
      clicks: number;
      time: number;
      path: string[];
    }) => {
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, rank, clicks, time, path, finishedAt: Date.now() } : p
      ));
    });

    socket.on('game:playerGaveUp', ({ playerId }: { playerId: string }) => {
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, gaveUp: true } : p
      ));
    });

    socket.on('game:finished', ({ rankings }: { rankings: RankingEntry[] }) => {
      setRankings(rankings);
      setGameStatus('finished');
    });

    return () => {
      socket.off('game:playerMoved');
      socket.off('game:playerFinished');
      socket.off('game:playerGaveUp');
      socket.off('game:finished');
    };
  }, []);

  return { players, rankings, gameStatus };
}