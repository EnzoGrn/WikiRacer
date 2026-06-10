'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Countdown } from '@/components/game/Countdown';
import { PlayerTracker } from '@/components/game/PlayerTracker';
import { Results } from '@/components/game/Results';
import { WikiPage } from '@/components/game/WikiPage';
import { useWikiGame } from '@/hooks/useWikiGame';
import type { Lobby } from '@shared/types';
import { useGame } from '@/hooks/useGame';
import { useRules } from '@/hooks/useRules';
import { GameHUD } from '@/components/game/GameHUD';

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
  const router = useRouter();

  useRules(lobby.rules);

  const handleNavigate = (title: string) => {
    socket.emit('game:navigate', { code, page: title });
  };

  const { currentTitle, html, loading, error, navigate, goBack, canGoBack } = useWikiGame({
    source: lobby.source!,
    rules: { noBack: lobby.rules?.noBack ?? false },
    onNavigate: handleNavigate,
  });

  const { players, gameStatus, rankings, gaveUp } = useGame({
    initialPlayers: lobby.players,
    source: lobby.source!,
  });

  useEffect(() => {
    socket.on('game:reset', () => {
      router.push(`/lobby/${code}`);
    });

    return () => {
      socket.off('game:reset');
    };
  }, [code, router]);

  if (gameStatus === 'finished') {
    return (
      <Results
        rankings={rankings}
        gaveUp={gaveUp}
        lobbyCode={code}
        hostId={lobby.hostId}
        onReplay={() => router.push(`/lobby/${code}`)}
      />
    );
  }

  return (
    <main className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Target</p>
          <p className="font-bold text-lg">{lobby.target}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Current page</p>
          <p className="text-sm font-medium truncate">
            {loading ? <span className="text-gray-400">Loading...</span> : currentTitle}
          </p>
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
        <GameHUD
          target={lobby.target!}
          clicks={players.find(p => p.id === socket.id)?.clicks ?? 0}
          timeLimit={lobby.rules?.timeLimit ?? null}
          startedAt={lobby.startedAt}
        />

        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        <WikiPage html={html} onNavigate={navigate} />
      </div>

      <Countdown />
    </main>
  );
}