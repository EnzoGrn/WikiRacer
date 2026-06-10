'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Countdown } from '@/components/game/Countdown';
import { WikiPage } from '@/components/game/WikiPage';
import { useWikiGame } from '@/hooks/useWikiGame';
import type { Lobby } from '@shared/types';
import { useGame } from '@/hooks/useGame';
import { PlayerTracker } from '@/components/game/PlayerTracker';

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('lobby:get', { code }, (res: { ok: boolean; lobby?: Lobby }) => {
      if (res.ok && res.lobby) setLobby(res.lobby);
    });
  }, [code]);

  if (!lobby?.source) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return <GameView lobby={lobby} code={code} />;
}

function GameView({ lobby, code }: { lobby: Lobby; code: string }) {
  const handleNavigate = (title: string) => {
    socket.emit('game:navigate', { code, page: title });
  };

  const { currentTitle, html, loading, error, navigate, goBack, canGoBack } = useWikiGame({
    source: lobby.source!,
    rules: { noBack: lobby.rules?.noBack ?? false },
    onNavigate: handleNavigate,
  });

  const { players } = useGame({
    initialPlayers: lobby.players,
    source: lobby.source!,
  });

  return (
    <main className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Target</p>
          <p className="font-bold text-lg">{lobby.target}</p>
        </div>

        <PlayerTracker players={players} target={lobby.target!} />

        {canGoBack && (
          <button
            onClick={goBack}
            className="mt-auto text-sm text-gray-500 hover:text-black transition text-left"
          >
            ← Back
          </button>
        )}
      </aside>

      {/* Wikipedia content */}
      <div className="flex-1 overflow-y-auto">
        {/* HUD */}
        <div className="sticky top-0 z-40 bg-white border-b flex items-center justify-between px-4 py-2 text-sm">
          <span className="font-medium truncate max-w-[300px]">{currentTitle}</span>
          {loading && <span className="text-gray-400 text-xs">Loading...</span>}
        </div>

        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        <WikiPage html={html} onNavigate={navigate} />
      </div>

      <Countdown />
    </main>
  );
}