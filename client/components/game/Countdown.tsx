'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

export function Countdown() {
  const [count, setCount] = useState<number | null>(3);

  useEffect(() => {
    socket.on('game:countdown', ({ count }: { count: number }) => {
      setCount(count);
    });

    socket.on('game:started', () => {
      setCount(null);
    });

    return () => {
      socket.off('game:countdown');
      socket.off('game:started');
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <span
        key={count}
        className="text-white font-bold animate-ping"
        style={{ fontSize: '12rem', lineHeight: 1 }}
      >
        {count}
      </span>
    </div>
  );
}