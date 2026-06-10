'use client';

import { socket } from '@/lib/socket';

interface RankingEntry {
  rank: number;
  id: string;
  name: string;
  clicks: number;
  time: number;
  path: string[];
}

interface ResultsProps {
  rankings: RankingEntry[];
  gaveUp: string[];
  lobbyCode: string;
  hostId: string;
  onReplay: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

export function Results({ rankings, gaveUp, lobbyCode, hostId, onReplay }: ResultsProps) {
  const isHost = socket.id === hostId;

  const handleReplay = () => {
    socket.emit('game:reset', { code: lobbyCode }, (res: { ok: boolean }) => {
      if (res.ok) onReplay();
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold">Results</h1>
        {rankings[0] && (
          <p className="text-gray-500">
            {rankings[0].name} won in {formatTime(rankings[0].time)} with {rankings[0].clicks} clicks
          </p>
        )}
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {rankings.map(entry => (
          <div
            key={entry.id}
            className={`border rounded-xl p-4 flex flex-col gap-2 ${entry.id === socket.id ? 'border-black bg-gray-50' : ''
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${RANK_STYLES[entry.rank] ?? 'text-gray-700'}`}>
                  #{entry.rank}
                </span>
                <span className="font-semibold">
                  {entry.name}
                  {entry.id === socket.id && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">you</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{entry.clicks} clicks</span>
                <span>{formatTime(entry.time)}</span>
              </div>
            </div>

            {/* Path */}
            <div className="flex items-center gap-1 flex-wrap text-xs text-gray-400">
              {entry.path.map((page, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                    {page}
                  </span>
                  {i < entry.path.length - 1 && <span>→</span>}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Gave up */}
        {gaveUp.length > 0 && (
          <div className="border border-dashed rounded-xl p-4">
            <p className="text-sm text-gray-400 font-medium mb-2">Gave up</p>
            <div className="flex gap-2 flex-wrap">
              {gaveUp.map(name => (
                <span key={name} className="text-sm text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2">
        {isHost ? (
          <button
            onClick={handleReplay}
            className="bg-black text-white rounded-lg px-6 py-3 font-semibold hover:bg-gray-800 transition"
          >
            Play again
          </button>
        ) : (
          <p className="text-gray-400 text-sm">Waiting for the host to start a new game...</p>
        )}
      </div>
    </div>
  );
}