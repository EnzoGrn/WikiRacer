'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WikiPage } from '@/components/game/WikiPage';
import { GameHUD } from '@/components/game/GameHUD';
import { fetchWikiPage, normalizeTitle } from '@/services/wikipedia';
import { getTodayKey, loadDailyState, saveDailyState, saveToHistory, formatTime } from '@/services/daily';
import type { DailyState } from '@/services/daily';
import { Trophy, MousePointer, Clock, ArrowRight, Archive, Users, Target, BookOpen } from 'lucide-react';

interface DailyRoute {
  date: string;
  source: string;
  target: string;
  stats: {
    completions: number;
    avgClicks: number | null;
    avgTime: number | null;
    difficulty: { label: string; color: string };
  } | null;
}

const DEFAULT_STATE: DailyState = {
  status: 'idle',
  clicks: 0,
  path: [],
  elapsedSeconds: 0,
  sessionStart: null,
  totalSeconds: null,
};

export default function DailyPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState<DailyRoute | null>(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [gameState, setGameState] = useState<DailyState>(DEFAULT_STATE);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/daily`)
      .then(res => res.json())
      .then((data: DailyRoute) => {
        setRoute(data);
        const saved = loadDailyState();
        if (saved) {
          const resumed = { ...saved, sessionStart: saved.status === 'playing' ? Date.now() : null };
          setGameState(resumed);
          if (saved.status === 'playing') {
            const lastPage = saved.path[saved.path.length - 1] || data.source;
            setCurrentTitle(lastPage);
            loadPage(lastPage);
          } else {
            setCurrentTitle(data.target);
          }
        } else {
          setCurrentTitle(data.source);
          loadPage(data.source);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      const state = gameStateRef.current;
      if (state.status !== 'playing') return;
      if (document.hidden) {
        const sessionElapsed = state.sessionStart
          ? Math.floor((Date.now() - state.sessionStart) / 1000)
          : 0;
        const newState = { ...state, elapsedSeconds: state.elapsedSeconds + sessionElapsed, sessionStart: null };
        setGameState(newState);
        saveDailyState(newState);
      } else {
        setGameState({ ...state, sessionStart: Date.now() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const loadPage = async (title: string) => {
    setLoading(true);
    try {
      const content = await fetchWikiPage(title);
      setHtml(content);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (title: string) => {
    if (gameState.status === 'finished') return;

    const now = Date.now();
    const sessionStart = gameState.sessionStart ?? now;
    const sessionElapsed = Math.floor((now - sessionStart) / 1000);
    const totalElapsed = gameState.elapsedSeconds + sessionElapsed;
    const hasWon = normalizeTitle(title) === normalizeTitle(route!.target);

    const newState: DailyState = {
      status: hasWon ? 'finished' : 'playing',
      clicks: gameState.clicks + 1,
      path: [...gameState.path, title],
      elapsedSeconds: totalElapsed,
      sessionStart: hasWon ? null : now,
      totalSeconds: hasWon ? totalElapsed : null,
    };

    setGameState(newState);
    saveDailyState(newState);
    setCurrentTitle(title);
    loadPage(title);

    if (hasWon) {
      saveToHistory({
        date: getTodayKey(),
        source: route!.source,
        target: route!.target,
        clicks: newState.clicks,
        time: totalElapsed,
        path: newState.path,
      });

      fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/daily/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clicks: newState.clicks, timeSeconds: totalElapsed }),
      }).catch(console.error);
    }
  };

  if (!route) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="subtitle">No daily route available yet. Come back later!</p>
      </main>
    );
  }

  if (gameState.status === 'finished') {
    const totalSeconds = gameState.totalSeconds ?? gameState.elapsedSeconds;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg flex flex-col gap-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Trophy size={48} style={{ color: '#f59e0b' }} />
            <h1 className="title text-3xl">You made it!</h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <span>{route.source}</span>
              <ArrowRight size={14} />
              <span>{route.target}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {new Date(route.date).toLocaleDateString('en-US', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          </div>

          {/* Stats perso */}
          <div className="flex gap-4">
            <div className="card flex-1 flex flex-col items-center gap-1 text-center">
              <MousePointer size={20} style={{ color: 'var(--accent)' }} />
              <p className="text-3xl font-bold">{gameState.clicks}</p>
              <p className="subtitle text-xs">clicks</p>
            </div>
            <div className="card flex-1 flex flex-col items-center gap-1 text-center">
              <Clock size={20} style={{ color: 'var(--accent)' }} />
              <p className="text-3xl font-bold font-mono">{formatTime(totalSeconds)}</p>
              <p className="subtitle text-xs">time</p>
            </div>
          </div>

          {/* Stats globales */}
          {route.stats && route.stats.completions > 0 && (
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="label">Today's stats</p>
                {route.stats.difficulty && (
                  <span className={`badge ${route.stats.difficulty.color}`}
                    style={{ background: 'var(--muted-bg)' }}>
                    {route.stats.difficulty.label}
                  </span>
                )}
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{route.stats.completions}</p>
                  <p className="subtitle text-xs">completions</p>
                </div>
                {route.stats.avgClicks && (
                  <div>
                    <p className="text-2xl font-bold">{route.stats.avgClicks}</p>
                    <p className="subtitle text-xs">avg clicks</p>
                  </div>
                )}
                {route.stats.avgTime && (
                  <div>
                    <p className="text-2xl font-bold font-mono">{formatTime(route.stats.avgTime)}</p>
                    <p className="subtitle text-xs">avg time</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Path */}
          <div className="flex flex-col gap-2">
            <p className="label">Your path</p>
            <div className="flex items-center gap-1 flex-wrap">
              {[route.source, ...gameState.path].map((page, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className="text-xs rounded px-2 py-0.5"
                    style={{ background: 'var(--muted-bg)', color: 'var(--foreground)' }}
                  >
                    {page}
                  </span>
                  {i < gameState.path.length && (
                    <ArrowRight size={10} style={{ color: 'var(--muted)' }} />
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/daily/archive')}
              className="btn btn-secondary flex-1"
            >
              <Archive size={15} />
              Archives
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary flex-1"
            >
              <Users size={15} />
              Play with friends
            </button>
          </div>
        </div>
      </main>
    );
  }

  const virtualStartedAt = gameState.sessionStart
    ? Date.now() - (gameState.elapsedSeconds * 1000)
    : null;

  return (
    <main className="sidebar-layout">

      {/* Sidebar — desktop only */}
      <aside className="sidebar hidden md:flex flex-col">
        <div className="sidebar-section">
          <p className="label">Daily Route</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {new Date(route.date).toLocaleDateString('en-US', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </p>
        </div>

        <div className="sidebar-section">
          <p className="label">Target</p>
          <div className="flex items-center gap-2">
            <Target size={14} style={{ color: 'var(--accent)' }} />
            <p className="font-bold text-sm">{route.target}</p>
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

        <div className="sidebar-section">
          <p className="label">Clicks</p>
          <p className="text-2xl font-bold">{gameState.clicks}</p>
        </div>

        {route.stats && (
          <div className="sidebar-section mt-auto">
            <p className="label">Difficulty</p>
            <p className={`font-bold text-sm ${route.stats.difficulty.color}`}>
              {route.stats.difficulty.label}
            </p>
            {route.stats.completions > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {route.stats.completions} player{route.stats.completions > 1 ? 's' : ''} finished
                {route.stats.avgClicks && ` · avg ${route.stats.avgClicks} clicks`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => router.push('/daily/archive')}
          className="btn btn-ghost btn-sm justify-start"
        >
          <Archive size={14} />
          Archives
        </button>
      </aside>

      {/* Main content */}
      <div className="main-content">

        {/* Top bar mobile */}
        <div className="md:hidden sticky top-0 z-40 flex items-center px-4 py-2 border-b"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <Target size={13} style={{ color: 'var(--accent)' }} />
          <span className="font-bold ml-1.5 truncate text-sm">{route.target}</span>
        </div>

        {/* HUD desktop */}
        <div className="hidden md:block">
          <GameHUD
            target={route.target}
            clicks={gameState.clicks}
            timeLimit={null}
            startedAt={virtualStartedAt}
          />
        </div>

        <div ref={scrollRef} className="overflow-y-auto pb-16 md:pb-0">
          <WikiPage html={html} onNavigate={handleNavigate} />
        </div>

        {/* Bottom bar mobile */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-t md:hidden"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <MousePointer size={13} style={{ color: 'var(--muted)' }} />
            <span className="text-sm font-bold">{gameState.clicks}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono font-bold text-sm"
            style={{ color: 'var(--muted)' }}
          >
            <Clock size={13} />
            {formatTime(gameState.elapsedSeconds + (
              gameState.sessionStart
                ? Math.floor((Date.now() - gameState.sessionStart) / 1000)
                : 0
            ))}
          </div>

          <button
            onClick={() => router.push('/daily/archive')}
            className="btn btn-ghost btn-sm"
          >
            <BookOpen size={14} />
          </button>
        </div>
      </div>
    </main>
  );
}