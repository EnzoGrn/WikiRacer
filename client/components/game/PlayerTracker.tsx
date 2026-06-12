'use client';

import { socket } from '@/lib/socket';

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
    <div className="flex flex-col gap-1">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Players
      </h2>

      {players.map(player => {
        const isMe = player.id === socket.id;
        const hasFinished = player.rank !== null;
        const hasGaveUp = player.gaveUp;
        const shouldHide = hideOpponents && !isMe;

        return (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {hasFinished && (
                <span className={`text-xs font-bold flex-shrink-0 ${isMe ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  #{player.rank}
                </span>
              )}

              <span className={`font-medium truncate ${isMe ? 'text-white' : ''}`}>
                {player.name}
                {isMe && <span className="ml-1 text-xs text-gray-400">you</span>}
              </span>

              {hasGaveUp && (
                <span className="text-xs text-red-400 flex-shrink-0">gave up</span>
              )}
            </div>

            <div className={`flex items-center gap-2 flex-shrink-0 text-xs ${isMe ? 'text-gray-300' : 'text-gray-500'
              }`}>

              {hasFinished ? (
                <span className="font-medium text-green-500">✓ {target}</span>
              ) : shouldHide ? (
                <span className="text-gray-400 italic">hidden</span>
              ) : (
                <span className="truncate max-w-[120px]">{player.currentPage}</span>
              )}

              {!shouldHide && (
                <span className="flex-shrink-0">{player.clicks} clicks</span>
              )}
              <span className="flex-shrink-0">{player.clicks} clicks</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}