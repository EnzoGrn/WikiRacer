'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WikiPage } from '@/components/game/WikiPage';
import { GameHUD } from '@/components/game/GameHUD';
import { fetchWikiPage, normalizeTitle } from '@/services/wikipedia';
import { getTodayKey, loadDailyState, saveDailyState, saveToHistory, formatTime } from '@/services/daily';
import type { DailyState } from '@/services/daily';

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
        const newState = {
          ...state,
          elapsedSeconds: state.elapsedSeconds + sessionElapsed,
          sessionStart: null,
        };
        setGameState(newState);
        saveDailyState(newState);
      } else {
        const newState = { ...state, sessionStart: Date.now() };
        setGameState(newState);
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
        <p className="text-gray-400">No daily route available yet. Come back later!</p>
      </main>
    );
  }

  if (gameState.status === 'finished') {
    const totalSeconds = gameState.totalSeconds ?? gameState.elapsedSeconds;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">🎉</span>
          <h1 className="text-3xl font-bold">You made it!</h1>
          <p className="text-gray-500">{route.source} → {route.target}</p>
        </div>

        <div className="flex gap-8 text-center">
          <div>
            <p className="text-3xl font-bold">{gameState.clicks}</p>
            <p className="text-sm text-gray-400">clicks</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatTime(totalSeconds)}</p>
            <p className="text-sm text-gray-400">time</p>
          </div>
        </div>

        {route.stats && route.stats.completions > 0 && (
          <div className="border rounded-xl p-4 text-center flex gap-8">
            <div>
              <p className="text-2xl font-bold">{route.stats.completions}</p>
              <p className="text-sm text-gray-400">completions today</p>
            </div>
            {route.stats.avgClicks && (
              <div>
                <p className="text-2xl font-bold">{route.stats.avgClicks}</p>
                <p className="text-sm text-gray-400">avg clicks</p>
              </div>
            )}
          </div>
        )}

        {route.stats && (
          <p className={`text-sm font-medium ${route.stats.difficulty.color}`}>
            {route.stats.difficulty.label} difficulty
          </p>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400">Your path</p>
          <div className="flex items-center gap-1 flex-wrap justify-center text-sm">
            {[route.source, ...gameState.path].map((page, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-gray-100 rounded px-2 py-0.5">{page}</span>
                {i < gameState.path.length && <span className="text-gray-400">→</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/daily/archive')}
            className="border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
          >
            Archives
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition"
          >
            Play with friends
          </button>
        </div>
      </main>
    );
  }

  const virtualStartedAt = gameState.sessionStart
    ? Date.now() - (gameState.elapsedSeconds * 1000)
    : null;

  return (
    <main className="flex h-screen overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Daily Route</p>
          <p className="text-xs text-gray-400">
            {new Date(route.date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Target</p>
          <p className="font-bold">{route.target}</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Current page</p>
          <p className="text-sm font-medium truncate">
            {loading ? <span className="text-gray-400">Loading...</span> : currentTitle}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Clicks</p>
          <p className="text-2xl font-bold">{gameState.clicks}</p>
        </div>

        {route.stats && (
          <div className="flex flex-col gap-1 mt-auto">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Difficulty</p>
            <p className={`font-bold ${route.stats.difficulty.color}`}>
              {route.stats.difficulty.label}
            </p>
            {route.stats.completions > 0 && (
              <p className="text-xs text-gray-400">
                {route.stats.completions} player{route.stats.completions > 1 ? 's' : ''} finished
                {route.stats.avgClicks && ` · avg ${route.stats.avgClicks} clicks`}
                {route.stats.avgTime && ` · avg ${formatTime(route.stats.avgTime)}`}
              </p>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 overflow-y-auto">
        <GameHUD
          target={route.target}
          clicks={gameState.clicks}
          timeLimit={null}
          startedAt={virtualStartedAt}
        />
        <WikiPage html={html} onNavigate={handleNavigate} />
      </div>
    </main>
  );
}