'use client';

import { socket } from '@/lib/socket';
import { Trophy, MousePointer, Clock, ArrowRight, RotateCcw, Minus } from 'lucide-react';

interface RankingEntry {
  rank: number;
  id: string;
  name: string;
  clicks: number;
  time: number;
  path: string[];
}

interface GaveUpEntry {
  id: string;
  name: string;
  clicks: number;
  path: string[];
}

interface ResultsProps {
  rankings: RankingEntry[];
  gaveUp: GaveUpEntry[];
  lobbyCode: string;
  hostId: string;
  onReplay: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const RANK_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#9ca3af',
  3: '#b45309',
};

function Path({ pages }: { pages: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {pages.map((page, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="text-xs rounded px-1.5 py-0.5"
            style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
          >
            {page}
          </span>
          {i < pages.length - 1 && (
            <ArrowRight size={10} style={{ color: 'var(--muted)' }} />
          )}
        </span>
      ))}
    </div>
  );
}

export function Results({ rankings, gaveUp, lobbyCode, hostId, onReplay }: ResultsProps) {
  const isHost = socket.id === hostId;

  const handleReplay = () => {
    socket.emit('game:reset', { code: lobbyCode }, (res: { ok: boolean }) => {
      if (res.ok) onReplay();
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="w-full max-w-lg flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Trophy size={40} style={{ color: '#f59e0b' }} />
          <h1 className="title text-3xl">Results</h1>
          {rankings[0] && (
            <p className="subtitle">
              {rankings[0].name} won with {rankings[0].clicks} clicks in {formatTime(rankings[0].time)}
            </p>
          )}
        </div>

        {/* Rankings */}
        <div className="flex flex-col gap-2">
          {rankings.map(entry => {
            const isMe = entry.id === socket.id;
            return (
              <div
                key={entry.id}
                className={`card card-hover flex flex-col gap-2 ${isMe ? 'border-accent' : ''}`}
                style={isMe ? { borderColor: 'var(--accent)' } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xl font-bold w-8"
                      style={{ color: RANK_COLORS[entry.rank] ?? 'var(--muted)' }}
                    >
                      #{entry.rank}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{entry.name}</span>
                      {isMe && <span className="badge badge-accent">you</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
                      <MousePointer size={12} />
                      {entry.clicks}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-mono" style={{ color: 'var(--muted)' }}>
                      <Clock size={12} />
                      {formatTime(entry.time)}
                    </span>
                  </div>
                </div>

                <Path pages={entry.path} />
              </div>
            );
          })}
        </div>

        {/* Did not finish */}
        {gaveUp.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="label">Did not finish</p>
            {gaveUp.map(entry => {
              const isMe = entry.id === socket.id;
              return (
                <div
                  key={entry.id}
                  className="card flex flex-col gap-2"
                  style={{ borderStyle: 'dashed', opacity: isMe ? 1 : 0.7 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Minus size={16} style={{ color: 'var(--muted)' }} />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                          {entry.name}
                        </span>
                        {isMe && <span className="badge badge-default">you</span>}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
                      <MousePointer size={12} />
                      {entry.clicks}
                    </span>
                  </div>
                  {entry.path.length > 0 && <Path pages={entry.path} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          {isHost ? (
            <button onClick={handleReplay} className="btn btn-primary btn-lg w-full">
              <RotateCcw size={16} />
              Play again
            </button>
          ) : (
            <p className="subtitle text-sm text-center">
              Waiting for the host to start a new game...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}