'use client';

import { useEffect, useState } from 'react';

interface GameHUDProps {
  target: string;
  clicks: number;
  timeLimit: number | null;
  startedAt: number | null;
}

export function GameHUD({ target, clicks, timeLimit, startedAt }: GameHUDProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const remaining = timeLimit ? timeLimit - elapsed : null;
  const isUrgent = remaining !== null && remaining <= 30;

  return (
    <div className="sticky top-0 z-40 bg-white border-b flex items-center justify-between px-4 py-2 text-sm">

      {/* Target */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Target</span>
        <span className="font-bold">{target}</span>
      </div>

      {/* Clicks + Timer */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Clicks</span>
          <span className="font-bold">{clicks}</span>
        </div>

        {timeLimit && remaining !== null && (
          <div className={`flex items-center gap-1 font-mono font-bold transition-colors ${
            isUrgent ? 'text-red-500' : 'text-gray-700'
          }`}>
            {isUrgent && <span className="animate-pulse">⚠</span>}
            {remaining <= 0 ? '00:00' : formatTime(remaining)}
          </div>
        )}

        {!timeLimit && (
          <div className="text-gray-400 font-mono">
            {formatTime(elapsed)}
          </div>
        )}
      </div>
    </div>
  );
}