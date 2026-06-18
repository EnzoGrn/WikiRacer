'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Play, ArrowLeft, MousePointer, Clock } from 'lucide-react';

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

function DifficultyBar({ difficulty }: { difficulty: { label: string } | undefined }) {
  const segments = [
    { color: 'var(--success)' },  // Easy
    { color: '#ca8a04' },          // Medium
    { color: 'var(--warning)' },   // Hard
    { color: 'var(--danger)' },    // Expert
  ];

  const activeIndex: Record<string, number> = {
    Easy: 0,
    Medium: 1,
    Hard: 2,
    Expert: 3,
  };

  const active = difficulty ? activeIndex[difficulty.label] ?? -1 : -1;

  return (
    <div className="flex flex-col gap-0.5 rounded-full overflow-hidden"
      style={{ width: '6px', height: '100%', minHeight: '80px' }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            background: i <= active ? seg.color : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

type SortKey = 'date' | 'difficulty' | 'completions';
type FilterKey = 'all' | 'played' | 'unplayed';

export default function ArchivePage() {
  const router = useRouter();
  const [archives, setArchives] = useState<ArchiveRoute[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('date');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    const raw = Cookies.get('wikiracer:daily:history');
    if (raw) setHistory(JSON.parse(raw));

    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/daily/archive`)
      .then(res => res.json())
      .then(setArchives)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const historyMap = new Map(history.map(h => [h.date, h]));

  const difficultyOrder: Record<string, number> = {
    Expert: 4, Hard: 3, Medium: 2, Easy: 1, Unknown: 0,
  };

  const sorted = [...archives].sort((a, b) => {
    if (sort === 'date') return b.date.localeCompare(a.date);
    if (sort === 'difficulty') {
      const da = difficultyOrder[a.stats?.difficulty?.label ?? 'Unknown'] ?? 0;
      const db = difficultyOrder[b.stats?.difficulty?.label ?? 'Unknown'] ?? 0;
      return db - da;
    }
    if (sort === 'completions') {
      return (b.stats?.completions ?? 0) - (a.stats?.completions ?? 0);
    }
    return 0;
  });

  const filtered = sorted.filter(r => {
    const dateKey = r.date.split('T')[0];
    if (filter === 'played') return historyMap.has(dateKey);
    if (filter === 'unplayed') return !historyMap.has(dateKey);
    return true;
  });

  const totalPlayed = history.length;
  const totalAvailable = archives.length;
  const avgClicks = totalPlayed > 0
    ? Math.round(history.reduce((sum, h) => sum + h.clicks, 0) / totalPlayed)
    : null;
  const avgTime = totalPlayed > 0
    ? Math.round(history.reduce((sum, h) => sum + h.time, 0) / totalPlayed)
    : null;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="subtitle">Loading archives...</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden">

      {/* Grille — 3/4 */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <h1 className="title text-xl">Archives</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as FilterKey)}
              className="input text-sm py-1.5 w-auto"
              style={{ width: 'auto' }}
            >
              <option value="all">All</option>
              <option value="played">Played</option>
              <option value="unplayed">Not played</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="input text-sm py-1.5"
              style={{ width: 'auto' }}
            >
              <option value="date">Date</option>
              <option value="difficulty">Difficulty</option>
              <option value="completions">Popular</option>
            </select>
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <p className="subtitle text-center py-12">No routes found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(route => {
                const dateKey = route.date.split('T')[0];
                const played = historyMap.get(dateKey);

                return (
                  <div
                    key={route.date}
                    className="card card-hover flex gap-3"
                    style={played ? { borderColor: 'var(--success)', background: 'var(--success-light)' } : {}}
                  >
                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>

                      <div className="flex flex-col gap-0.5">
                        <p className="font-semibold text-sm truncate">{route.source}</p>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-px" style={{ background: 'var(--muted)' }} />
                          <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{route.target}</p>
                        </div>
                      </div>

                      {route.stats && route.stats.completions > 0 && (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {route.stats.completions} finished
                          {route.stats.avgClicks && ` · avg ${route.stats.avgClicks} clicks`}
                        </p>
                      )}

                      {!played && (
                        <button
                          onClick={() => router.push(`/daily/${dateKey}`)}
                          className="btn btn-secondary btn-sm mt-auto w-full"
                        >
                          <Play size={12} />
                          Play
                        </button>
                      )}
                    </div>

                    {/* Difficulty bar */}
                    <div className="flex-shrink-0 self-stretch">
                      <DifficultyBar difficulty={route.stats?.difficulty} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stats panel — 1/4 */}
      <div className="w-64 flex-shrink-0 border-l flex flex-col gap-6 p-6 hidden md:flex"
        style={{ borderColor: 'var(--border)', background: 'var(--muted-bg)' }}
      >
        <h2 className="title text-lg">Your stats</h2>

        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-1">
            <p className="label">Completed</p>
            <p className="text-2xl font-bold">{totalPlayed}
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--muted)' }}>
                / {totalAvailable}
              </span>
            </p>
            {totalAvailable > 0 && (
              <>
                <div className="w-full rounded-full h-1.5 mt-1" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      background: 'var(--accent)',
                      width: `${Math.round((totalPlayed / totalAvailable) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {Math.round((totalPlayed / totalAvailable) * 100)}%
                </p>
              </>
            )}
          </div>

          {avgClicks && (
            <div className="card flex flex-col gap-1">
              <p className="label">Avg clicks</p>
              <div className="flex items-center gap-2">
                <MousePointer size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-2xl font-bold">{avgClicks}</p>
              </div>
            </div>
          )}

          {avgTime && (
            <div className="card flex flex-col gap-1">
              <p className="label">Avg time</p>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-2xl font-bold font-mono">{formatTime(avgTime)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}