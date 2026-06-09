'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { PlayerList } from '@/components/lobby/PlayerList';
import { GameConfig } from '@/components/lobby/GameConfig';
import type { Lobby, Rules } from '@shared/types';

const DEFAULT_RULES: Rules = {
  noCtrlF: false,
  noBack: false,
  noRightClick: false,
  noCategories: false,
  timeLimit: null,
};

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const isHost = lobby?.hostId === socket.id;

  const canStart = !!lobby?.source && !!lobby?.target;

  const router = useRouter();

  const handleStart = () => {
    socket.emit('game:start', { code: lobby?.code }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) console.error(res.error);
    });
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('lobby:get', { code }, (res: { ok: boolean; lobby?: Lobby }) => {
      if (res.ok && res.lobby) setLobby(res.lobby);
    });

    socket.on('lobby:configured', ({ source, target, rules }: { source: string; target: string; rules: Rules }) => {
      setLobby(prev => prev ? { ...prev, source, target, rules } : prev);
    });

    socket.on('game:countdown', ({ count }: { count: number }) => {
      console.log(`Starting in ${count}...`);
    });

    socket.on('game:started', () => {
      router.push(`/game/${code}`);
    });

    return () => {
      socket.off('lobby:configured');
      socket.off('game:countdown');
      socket.off('game:started');
    };
  }, [code, router]);

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

      {isHost && (
        <>
          <GameConfig
            lobbyCode={lobby.code}
            initialSource={lobby.source}
            initialTarget={lobby.target}
            initialRules={lobby.rules || DEFAULT_RULES}
          />

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full max-w-sm bg-black text-white rounded-lg px-4 py-3 font-semibold disabled:opacity-40 hover:bg-gray-800 transition"
          >
            {canStart ? 'Start game' : 'Set source and target to start'}
          </button>
        </>
      )}

      {!isHost && lobby.source && lobby.target && (
        <div className="flex flex-col items-center gap-1 text-gray-500 text-sm">
          <p>
            <span className="font-medium">{lobby.source}</span>
            {' > '}
            <span className="font-medium">{lobby.target}</span>
          </p>
          <p>Waiting for the host to start...</p>
        </div>
      )}
    </main>
  );
}