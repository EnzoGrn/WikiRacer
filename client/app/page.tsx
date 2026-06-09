'use client';

import { useState } from 'react';
import { useLobby } from '@/hooks/useLobby';

export default function Home() {
  const [name, setName] = useState('');
  const { createLobby, loading, error } = useLobby();

  const handleCreate = () => {
    if (!name.trim()) return;
    createLobby(name.trim());
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">WikiRacer</h1>
      <p className="text-gray-500">
        Navigate from one Wikipedia page to another, faster than your friends.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="bg-black text-white rounded-lg px-4 py-2 font-medium disabled:opacity-40 hover:bg-gray-800 transition"
        >
          {loading ? 'Creating...' : 'Create Lobby'}
        </button>
      </div>
    </main>
  );
}