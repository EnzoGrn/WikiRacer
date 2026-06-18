'use client';

import { useEffect, useState } from 'react';

interface UseTimerProps {
  startedAt: number | null;
  timeLimit: number | null;
}

interface UseTimerReturn {
  elapsed: number;
  remaining: number | null;
  isUrgent: boolean;
  formatTime: (seconds: number) => string;
}

export function useTimer({ startedAt, timeLimit }: UseTimerProps): UseTimerReturn {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const remaining = timeLimit ? timeLimit - elapsed : null;
  const isUrgent = remaining !== null && remaining <= 30;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return { elapsed, remaining, isUrgent, formatTime };
}