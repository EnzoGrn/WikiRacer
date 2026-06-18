'use client';

import { useEffect, useRef, useState } from 'react';
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
import { MousePointer, Clock, AlertTriangle, ArrowLeft, Target } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';

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
        <p className="subtitle">Loading...</p>
      </main>
    );
  }

  return <GameView lobby={lobby} code={code} />;
}

function GameView({ lobby, code }: { lobby: Lobby; code: string }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [startedAt, setStartedAt] = useState<number | null>(lobby.startedAt);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  useEffect(() => {
    socket.on('game:started', ({ startedAt }: { startedAt: number }) => setStartedAt(startedAt));
    return () => { socket.off('game:started'); };
  }, []);

  useEffect(() => {
    socket.on('game:reset', () => router.push(`/lobby/${code}`));
    return () => { socket.off('game:reset'); };
  }, [code, router]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') e.preventDefault();
      if (e.key === 'F5') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useRules(lobby.rules);

  const handleNavigate = (title: string) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

  const myClicks = players.find(p => p.id === socket.id)?.clicks ?? 0;
  const { elapsed, remaining, isUrgent, formatTime } = useTimer({
    startedAt,
    timeLimit: lobby.rules?.timeLimit ?? null,
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
    <main className="sidebar-layout">

      {/* Leave warning modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="card w-full max-w-sm flex flex-col gap-4 fade-in">
            <h2 className="font-bold text-lg">Leave the game?</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              You will be counted as having given up.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="btn btn-secondary flex-1"
              >
                Stay
              </button>
              <button
                onClick={() => { socket.emit('game:giveUp', { code }); router.push('/'); }}
                className="btn btn-danger flex-1"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — desktop only */}
      <aside className="sidebar hidden md:flex flex-col">
        <div className="sidebar-section">
          <p className="label">Target</p>
          <div className="flex items-center gap-2">
            <Target size={14} style={{ color: 'var(--accent)' }} />
            <p className="font-bold">{lobby.target}</p>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="label">Current page</p>
          <p className="text-sm font-medium truncate">
            {loading
              ? <span style={{ color: 'var(--muted)' }}>Loading...</span>
              : currentTitle
            }
          </p>
        </div>

        <PlayerTracker
          players={players}
          target={lobby.target!}
          hideOpponents={lobby.rules?.hideOpponents ?? false}
        />

        {canGoBack && (
          <button onClick={goBack} className="btn btn-ghost btn-sm mt-auto justify-start">
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      </aside>

      {/* Main content */}
      <div className="main-content">

        {/* HUD top — mobile : target only / desktop : full */}
        <div className="md:hidden sticky top-0 z-40 flex items-center px-4 py-2 border-b"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <Target size={13} style={{ color: 'var(--accent)' }} />
          <span className="font-bold ml-1.5 truncate">{lobby.target}</span>
        </div>

        <div className="hidden md:block">
          <GameHUD
            target={lobby.target!}
            clicks={myClicks}
            timeLimit={lobby.rules?.timeLimit ?? null}
            startedAt={startedAt}
          />
        </div>

        {error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-8 fade-in">
            <Target size={40} style={{ color: 'var(--muted)' }} />
            <h2 className="font-bold text-xl">Page not found</h2>
            <p className="text-sm max-w-sm" style={{ color: 'var(--muted)' }}>{error}</p>
            {canGoBack && (
              <button onClick={goBack} className="btn btn-primary">
                <ArrowLeft size={15} />
                Go back
              </button>
            )}
          </div>
        )}

        <div ref={scrollRef} className="overflow-y-auto pb-16 md:pb-0">
          <WikiPage html={html} onNavigate={navigate} />
        </div>

        {/* Bottom bar — mobile only */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-t md:hidden"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <MousePointer size={13} style={{ color: 'var(--muted)' }} />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Clicks</span>
            <span className="font-bold text-sm">{myClicks}</span>
          </div>

          <div
            className="flex items-center gap-1.5 font-mono font-bold text-sm"
            style={{ color: isUrgent ? 'var(--danger)' : 'var(--muted)' }}
          >
            {isUrgent
              ? <AlertTriangle size={13} className="animate-pulse" />
              : <Clock size={13} />
            }
            {remaining !== null
              ? (remaining <= 0 ? '00:00' : formatTime(remaining))
              : formatTime(elapsed)
            }
          </div>

          {canGoBack && (
            <button onClick={goBack} className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} />
            </button>
          )}
        </div>
      </div>

      <Countdown />
    </main>
  );
}