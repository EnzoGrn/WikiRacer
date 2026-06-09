'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { PlayerList } from '@/components/lobby/PlayerList';
import { Player } from '@shared/types';

interface Lobby {
  code: string;
  hostId: string;
  players: Player[];
}

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('lobby:get', { code }, (res: { ok: boolean; lobby?: Lobby }) => {
      if (res.ok && res.lobby) setLobby(res.lobby);
    });
  }, [code]);

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">Lobby</h1>
        <p className="text-gray-500 text-sm">Share this code with your friends</p>
        <span className="text-4xl font-mono tracking-widest font-bold">{code}</span>
      </div>

      <PlayerList initialPlayers={lobby.players} initialHostId={lobby.hostId} />
    </main>
  );
}