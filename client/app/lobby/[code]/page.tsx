'use client';

import { useParams } from 'next/navigation';

export default function LobbyPage() {
  const { code } = useParams();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Lobby</h1>
      <p className="text-4xl font-mono tracking-widest">{code}</p>
    </main>
  );
}