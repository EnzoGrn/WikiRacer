'use client';

import { Suspense, useEffect, useState } from 'react';
import { useLobby } from '@/hooks/useLobby';
import { useSearchParams } from 'next/navigation';
import { Users, Hash, ArrowRight, Calendar } from 'lucide-react';

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
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">WikiRacer</h1>
          <p className="subtitle">
            Navigate from one Wikipedia page to another, faster than your friends.
          </p>
        </div>

        {/* Card */}
        <div className="card flex flex-col gap-5">

          {/* Mode toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${
                mode === 'create'
                  ? 'bg-foreground text-background'
                  : 'hover:bg-muted-bg text-foreground'
              }`}
              style={mode === 'create' ? { background: 'var(--foreground)', color: 'var(--background)' } : {}}
            >
              <Users size={15} />
              Create
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${
                mode === 'join'
                  ? 'bg-foreground text-background'
                  : 'hover:bg-muted-bg text-foreground'
              }`}
              style={mode === 'join' ? { background: 'var(--foreground)', color: 'var(--background)' } : {}}
            >
              <Hash size={15} />
              Join
            </button>
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input"
            />

            {mode === 'join' && (
              <input
                type="text"
                placeholder="Lobby code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                maxLength={6}
                className="input font-mono tracking-widest uppercase text-center"
              />
            )}

            {error && (
              <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || (mode === 'join' && !code.trim())}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                mode === 'create' ? 'Creating...' : 'Joining...'
              ) : (
                <>
                  {mode === 'create' ? 'Create a lobby' : 'Join lobby'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Daily link */}
        <a
          href="/daily"
          className="flex items-center justify-center gap-2 text-sm transition"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
        >
          <Calendar size={15} />
          Play today's daily route
          <ArrowRight size={13} />
        </a>
      </div>
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