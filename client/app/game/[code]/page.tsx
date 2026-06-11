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
  const [startedAt, setStartedAt] = useState<number | null>(lobby.startedAt);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  // Sync startedAt depuis game:started
  useEffect(() => {
    socket.on('game:started', ({ startedAt }: { startedAt: number }) => {
      setStartedAt(startedAt);
    });
    return () => { socket.off('game:started'); };
  }, []);

  // Redirect on replay
  useEffect(() => {
    socket.on('game:reset', () => {
      router.push(`/lobby/${code}`);
    });
    return () => { socket.off('game:reset'); };
  }, [code, router]);

  // Block browser back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Block Ctrl+R / F5
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') e.preventDefault();
      if (e.key === 'F5') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Warn on tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

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

      {/* Leave warning modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4">
            <h2 className="font-bold text-lg">Leave the game?</h2>
            <p className="text-gray-500 text-sm">
              You will be counted as having given up.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="flex-1 border rounded-lg px-4 py-2 font-medium hover:bg-gray-50 transition"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  socket.emit('game:giveUp', { code });
                  router.push('/');
                }}
                className="flex-1 bg-black text-white rounded-lg px-4 py-2 font-medium hover:bg-gray-800 transition"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

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
        <GameHUD
          target={lobby.target!}
          clicks={players.find(p => p.id === socket.id)?.clicks ?? 0}
          timeLimit={lobby.rules?.timeLimit ?? null}
          startedAt={startedAt}
        />

        {error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-8">
            <span className="text-5xl">🔍</span>
            <h2 className="text-xl font-bold">Page not found</h2>
            <p className="text-gray-500 text-sm max-w-sm">{error}</p>
            {canGoBack && (
              <button
                onClick={goBack}
                className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition"
              >
                ← Go back
              </button>
            )}
          </div>
        )}

        <WikiPage html={html} onNavigate={navigate} />
      </div>

      {/* <Countdown /> */}
    </main>
  );
}