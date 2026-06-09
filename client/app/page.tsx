'use client';

import { useEffect } from 'react';
import { socket } from '@/lib/socket';

export default function Home() {
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('✅ connected:', socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <div>WikiRacer</div>;
}