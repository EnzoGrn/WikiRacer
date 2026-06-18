'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WikiPage } from '@/components/game/WikiPage';
import { GameHUD } from '@/components/game/GameHUD';
import { fetchWikiPage, normalizeTitle } from '@/services/wikipedia';
import Cookies from 'js-cookie';

interface ArchiveRoute {
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

interface ArchiveState {
  status: 'idle' | 'playing' | 'finished';
  clicks: number;
  path: string[];
  elapsedSeconds: number;
  sessionStart: number | null;
  totalSeconds: number | null;
}

interface HistoryEntry {
  date: string;
  source: string;
  target: string;
  clicks: number;
  time: number;
  path: string[];
}

const HISTORY_COOKIE_KEY = 'wikiracer:daily:history';
const COOKIE_EXPIRES = 180;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = Cookies.get(HISTORY_COOKIE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToHistory(entry: HistoryEntry) {
  const history = loadHistory();
  if (history.find(h => h.date === entry.date)) return;
  history.unshift(entry);
  Cookies.set(HISTORY_COOKIE_KEY, JSON.stringify(history), { expires: COOKIE_EXPIRES });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const DEFAULT_STATE: ArchiveState = {
  status: 'idle',
  clicks: 0,
  path: [],
  elapsedSeconds: 0,
  sessionStart: null,
  totalSeconds: null,
};

export default function ArchiveDailyPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<ArchiveRoute | null>(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [gameState, setGameState] = useState<ArchiveState>(DEFAULT_STATE);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/daily/archive/${date}`)
      .then(res => res.json())
      .then((data: ArchiveRoute) => {
        setRoute(data);
        setCurrentTitle(data.source);
        loadWikiPage(data.source);

        const history = loadHistory();
        const played = history.find(h => h.date === date);
        if (played) {
          setGameState({
            status: 'finished',
            clicks: played.clicks,
            path: played.path,
            elapsedSeconds: played.time,
            sessionStart: null,
            totalSeconds: played.time,
          });
        }
      })
      .catch(console.error);
  }, [date]);

  const loadWikiPage = async (title: string) => {
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

    const newState: ArchiveState = {
      status: hasWon ? 'finished' : 'playing',
      clicks: gameState.clicks + 1,
      path: [...gameState.path, title],
      elapsedSeconds: totalElapsed,
      sessionStart: hasWon ? null : now,
      totalSeconds: hasWon ? totalElapsed : null,
    };

    setGameState(newState);
    setCurrentTitle(title);
    loadWikiPage(title);

    if (hasWon) {
      saveToHistory({
        date,
        source: route!.source,
        target: route!.target,
        clicks: newState.clicks,
        time: totalElapsed,
        path: newState.path,
      });
    }
  };

  if (!route) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
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
          <p className="text-xs text-gray-400">
            {new Date(route.date).toLocaleDateString('en-US', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
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
              <p className="text-sm text-gray-400">completions</p>
            </div>
            {route.stats.avgClicks && (
              <div>
                <p className="text-2xl font-bold">{route.stats.avgClicks}</p>
                <p className="text-sm text-gray-400">avg clicks</p>
              </div>
            )}
          </div>
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
            ← Archives
          </button>
          <button
            onClick={() => router.push('/daily')}
            className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition"
          >
            Today's route
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
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Archive</p>
          <p className="text-xs text-gray-400">
            {new Date(route.date).toLocaleDateString('en-US', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
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
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => router.push('/daily/archive')}
          className="text-sm text-gray-400 hover:text-black transition text-left"
        >
          ← Back to archives
        </button>
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