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
  gameMode: 'speed',
  hideOpponents: false,
};

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const isHost = lobby?.hostId === socket.id;
  const canStart = !!lobby?.source && !!lobby?.target;
  const router = useRouter();

  const [codeVisible, setCodeVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      if (count === 3) {
        router.push(`/game/${code}`);
      }
    });

    return () => {
      socket.off('lobby:configured');
      socket.off('game:countdown');
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

        <div className="flex items-center gap-2">
          <span className={`text-4xl font-mono tracking-widest font-bold transition-all ${!codeVisible ? 'blur-sm select-none' : ''
            }`}>
            {code}
          </span>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setCodeVisible(v => !v)}
              title={codeVisible ? 'Hide code' : 'Show code'}
              className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 transition text-sm"
            >
              {codeVisible ? '🙈' : '👁️'}
            </button>
            <button
              onClick={handleCopy}
              title="Copy code"
              className={`w-8 h-8 flex items-center justify-center border rounded-lg transition text-sm ${copied ? 'bg-green-500 border-green-500 text-white' : 'hover:bg-gray-50'
                }`}
            >
              {copied ? '✓' : '📋'}
            </button>
            {copied && (
              <span className="text-xs text-green-500 font-medium animate-pulse">
                Copied!
              </span>
            )}
          </div>
        </div>
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