'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface HistoryEntry {
  date: string;
  source: string;
  target: string;
  clicks: number;
  time: number;
  path: string[];
}

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ArchivePage() {
  const router = useRouter();
  const [archives, setArchives] = useState<ArchiveRoute[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = Cookies.get('wikiracer:daily:history');
    if (raw) setHistory(JSON.parse(raw));

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/daily/archive`)
      .then(res => res.json())
      .then(setArchives)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading archives...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Archives</h1>
        <button
          onClick={() => router.push('/daily')}
          className="text-sm text-gray-400 hover:text-black transition"
        >
          ← Today's route
        </button>
      </div>

      {archives.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No past routes yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {archives.map(route => {
            const dateKey = route.date.split('T')[0];
            const played = history.find(h => h.date === dateKey);

            return (
              <div
                key={route.date}
                className={`border rounded-xl p-4 flex flex-col gap-3 ${played ? 'border-green-200 bg-green-50' : ''}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {new Date(route.date).toLocaleDateString('en-US', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  {route.stats?.difficulty && (
                    <span className={`text-xs font-medium ${route.stats.difficulty.color}`}>
                      {route.stats.difficulty.label}
                    </span>
                  )}
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 font-medium">
                  <span>{route.source}</span>
                  <span className="text-gray-400">→</span>
                  <span>{route.target}</span>
                </div>

                {/* Stats globales */}
                {route.stats && route.stats.completions > 0 && (
                  <p className="text-xs text-gray-400">
                    {route.stats.completions} player{route.stats.completions > 1 ? 's' : ''} finished
                    {route.stats.avgClicks && ` · avg ${route.stats.avgClicks} clicks`}
                    {route.stats.avgTime && ` · avg ${formatTime(route.stats.avgTime)}`}
                  </p>
                )}

                {/* Score personnel */}
                {played && (
                  <div className="flex items-center gap-4 bg-white rounded-lg px-3 py-2 text-sm border border-green-200">
                    <span className="text-green-600 font-medium">✓ You played</span>
                    <span className="text-gray-500">{played.clicks} clicks</span>
                    <span className="text-gray-500">{formatTime(played.time)}</span>
                  </div>
                )}
                <button
                  onClick={() => router.push(`/daily/${dateKey}`)}
                  className="text-xs border rounded px-3 py-1 hover:bg-gray-50 transition"
                >
                  {played ? 'Replay' : 'Play'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}