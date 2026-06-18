'use client';

import { Target, MousePointer, Clock, AlertTriangle } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';

interface GameHUDProps {
  target: string;
  clicks: number;
  timeLimit: number | null;
  startedAt: number | null;
}

export function GameHUD({ target, clicks, timeLimit, startedAt }: GameHUDProps) {
  const { remaining, isUrgent, formatTime, elapsed } = useTimer({ startedAt, timeLimit });

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 text-sm border-b"
      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5">
        <Target size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--muted)' }}>Target</span>
        <span className="font-bold">{target}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <MousePointer size={13} style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--muted)' }}>Clicks</span>
          <span className="font-bold">{clicks}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 font-mono font-bold transition-colors`}
          style={{ color: isUrgent ? 'var(--danger)' : 'var(--muted)' }}
        >
          {isUrgent
            ? <AlertTriangle size={13} className="animate-pulse" />
            : <Clock size={13} />
          }
          {remaining !== null
            ? (remaining <= 0 ? '00:00' : formatTime(remaining))
            : formatTime(elapsed)
          }
        </div>
      </div>
    </div>
  );
}