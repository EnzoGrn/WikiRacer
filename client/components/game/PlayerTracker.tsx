'use client';

import { socket } from '@/lib/socket';
import { Check, EyeOff, MousePointer, Trophy } from 'lucide-react';

interface PlayerState {
  id: string;
  name: string;
  clicks: number;
  currentPage: string;
  rank: number | null;
  gaveUp: boolean;
}

interface PlayerTrackerProps {
  players: PlayerState[];
  target: string;
  hideOpponents: boolean;
}

export function PlayerTracker({ players, target, hideOpponents }: PlayerTrackerProps) {
  return (
    <div className="sidebar-section">
      <p className="label">Players</p>
      <div className="flex flex-col gap-1.5">
        {players.map(player => {
          const isMe = player.id === socket.id;
          const hasFinished = player.rank !== null;
          const hasGaveUp = player.gaveUp;
          const shouldHide = hideOpponents && !isMe;

          return (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              style={{
                background: isMe ? 'var(--foreground)' : 'var(--background)',
                color: isMe ? 'var(--background)' : 'var(--foreground)',
                border: `1px solid ${isMe ? 'var(--foreground)' : 'var(--border)'}`,
              }}
            >
              {/* Left - rank + name */}
              <div className="flex items-center gap-2 min-w-0">
                {hasFinished && (
                  <Trophy
                    size={12}
                    style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)', flexShrink: 0 }}
                  />
                )}
                <span className="font-medium truncate text-xs">
                  {player.name}
                </span>
                {isMe && (
                  <span className="text-xs flex-shrink-0" style={{ opacity: 0.5 }}>you</span>
                )}
                {hasGaveUp && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--danger)' }}>
                    out
                  </span>
                )}
              </div>

              {/* Right - page + clicks */}
              <div className="flex items-center gap-2 flex-shrink-0 text-xs"
                style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}
              >
                {hasFinished ? (
                  <span className="flex items-center gap-1" style={{ color: 'var(--success)' }}>
                    <Check size={11} />
                    {target}
                  </span>
                ) : shouldHide ? (
                  <EyeOff size={11} />
                ) : (
                  <span className="truncate max-w-[80px]">{player.currentPage}</span>
                )}

                {!shouldHide && !hasFinished && (
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <MousePointer size={10} />
                    {player.clicks}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}