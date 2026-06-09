'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Countdown } from '@/components/game/Countdown';
import { WikiPage } from '@/components/game/WikiPage';
import { useWikiGame } from '@/hooks/useWikiGame';
import type { Lobby } from '@shared/types';

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

  return (
    <main>
      <Countdown />

      <div className="sticky top-0 z-40 bg-white border-b flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={goBack}
              className="text-gray-500 hover:text-black transition"
            >
              ← Back
            </button>
          )}
          <span className="font-medium truncate max-w-[200px]">{currentTitle}</span>
          {loading && <span className="text-gray-400">Loading...</span>}
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <span>→</span>
          <span className="font-medium text-black">{lobby.target}</span>
        </div>
      </div>

      {error && (
        <div className="text-center py-8 text-red-500">{error}</div>
      )}

      <WikiPage html={html} onNavigate={navigate} />
    </main>
  );
}