'use client';

import { Suspense, useEffect, useState } from 'react';
import { useLobby } from '@/hooks/useLobby';
import { useSearchParams } from 'next/navigation';

type Mode = 'create' | 'join';

function HomeContent() {
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { createLobby, joinLobby, loading, error } = useLobby();
  const searchParams = useSearchParams();

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (mode === 'create') {
      createLobby(name.trim());
    } else {
      if (!code.trim()) return;
      joinLobby(code.trim(), name.trim());
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">WikiRacer</h1>
      <p className="text-gray-500 text-center">
        Navigate from one Wikipedia page to another, faster than your friends.
      </p>

      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setMode('create')}
          className={`px-6 py-2 font-medium transition ${mode === 'create' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
        >
          Create
        </button>
        <button
          onClick={() => setMode('join')}
          className={`px-6 py-2 font-medium transition ${mode === 'join' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
        >
          Join
        </button>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />

        {mode === 'join' && (
          <input
            type="text"
            placeholder="Lobby code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            maxLength={6}
            className="border rounded-lg px-4 py-2 font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-black"
          />
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || (mode === 'join' && !code.trim())}
          className="bg-black text-white rounded-lg px-4 py-2 font-medium disabled:opacity-40 hover:bg-gray-800 transition"
        >
          {loading
            ? mode === 'create' ? 'Creating...' : 'Joining...'
            : mode === 'create' ? 'Create a lobby' : 'Join lobby'
          }
        </button>
      </div>
      <a href="/daily"
        className="text-sm text-gray-400 hover:text-black transition underline underline-offset-2"
      >
        Play today's daily route →
      </a>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}