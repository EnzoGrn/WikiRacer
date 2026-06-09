'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import type { Player } from '@shared/types';

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
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <h2 className="font-semibold text-gray-500 text-sm uppercase tracking-wide">
        Players — {players.length}/8
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between border rounded-lg px-4 py-2"
          >
            <span className="font-medium">{player.name}</span>
            <div className="flex items-center gap-2">
              {player.id === hostId && (
                <span className="text-xs bg-black text-white rounded px-2 py-0.5">
                  Host
                </span>
              )}
              {player.id === socket.id && (
                <span className="text-xs text-gray-400">you</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}