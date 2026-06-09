'use client';

import { useParams } from 'next/navigation';

export default function GamePage() {
  const { code } = useParams<{ code: string }>();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Game</h1>
      <p className="font-mono text-gray-400">{code}</p>
    </main>
  );
}