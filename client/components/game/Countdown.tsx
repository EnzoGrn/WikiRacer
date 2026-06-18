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
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <p className="text-white text-sm font-medium mb-4 tracking-widest uppercase opacity-60">
        Starting in
      </p>
      <span
        key={count}
        className="font-bold text-white animate-ping"
        style={{ fontSize: '10rem', lineHeight: 1 }}
      >
        {count}
      </span>
    </div>
  );
}