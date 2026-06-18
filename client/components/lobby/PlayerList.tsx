'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import type { Player } from '@shared/types';
import { Crown } from 'lucide-react';

interface PlayerListProps {
  initialPlayers: Player[];
  initialHostId: string;
}

export function PlayerList({ initialPlayers, initialHostId }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [hostId, setHostId] = useState<string>(initialHostId);

  useEffect(() => {
    socket.on('lobby:playerJoined', ({ players }: { players: Player[] }) => {
      setPlayers(players);
    });

    socket.on('lobby:playerLeft', ({ players, newHostId }: { players: Player[]; newHostId: string }) => {
      setPlayers(players);
      setHostId(newHostId);
    });

    return () => {
      socket.off('lobby:playerJoined');
      socket.off('lobby:playerLeft');
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="label">Players — {players.length}/8</p>
      <ul className="flex flex-col gap-1.5">
        {players.map((player) => (
          <li
            key={player.id}
            className={`card flex items-center justify-between py-2.5 ${
              player.id === socket.id ? 'border-accent' : ''
            }`}
            style={player.id === socket.id ? { borderColor: 'var(--accent)' } : {}}
          >
            <span className="font-medium text-sm">{player.name}</span>
            <div className="flex items-center gap-2">
              {player.id === hostId && (
                <span className="badge badge-default flex items-center gap-1">
                  <Crown size={11} />
                  Host
                </span>
              )}
              {player.id === socket.id && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>you</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}