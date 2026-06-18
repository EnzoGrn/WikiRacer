'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { PlayerList } from '@/components/lobby/PlayerList';
import { GameConfig } from '@/components/lobby/GameConfig';
import { GameConfigReadOnly } from '@/components/lobby/GameConfigReadOnly';
import type { Lobby, Rules } from '@shared/types';
import { Eye, EyeOff, Copy, Link, Play, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/lobby/Toast';

const DEFAULT_RULES: Rules = {
  noCtrlF: false,
  noBack: false,
  noRightClick: false,
  noCategories: false,
  timeLimit: null,
  gameMode: 'speed',
  hideOpponents: false,
};

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const isHost = lobby?.hostId === socket.id;
  const canStart = !!lobby?.source && !!lobby?.target;
  const router = useRouter();
  const toast = useToast();

  const [codeVisible, setCodeVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleInvite = () => {
    const url = `${window.location.origin}?join=${code}`;
    navigator.clipboard.writeText(url);
    toast.show('Invite link copied!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.show('Code copied!');
  };

  const handleStart = () => {
    socket.emit('game:start', { code: lobby?.code }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) console.error(res.error);
    });
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('lobby:get', { code }, (res: { ok: boolean; lobby?: Lobby }) => {
      if (res.ok && res.lobby) setLobby(res.lobby);
    });

    socket.on('lobby:configured', ({ source, target, rules }: { source: string; target: string; rules: Rules }) => {
      setLobby(prev => prev ? { ...prev, source, target, rules } : prev);
    });

    socket.on('game:countdown', ({ count }: { count: number }) => {
      if (count === 3) router.push(`/game/${code}`);
    });

    return () => {
      socket.off('lobby:configured');
      socket.off('game:countdown');
    };
  }, [code, router]);

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="subtitle">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <h1 className="title">Lobby</h1>
            <p className="subtitle text-sm">Share this code with your friends</p>
          </div>

          {/* Code */}
          <div className="card w-full flex items-center justify-between">
            <span className={`text-3xl font-mono tracking-widest font-bold transition-all ${!codeVisible ? 'blur-sm select-none' : ''
              }`}>
              {code}
            </span>

            <div className="flex items-center gap-1">
              <button onClick={() => setCodeVisible(v => !v)} className="btn btn-ghost btn-sm">
                {codeVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={handleCopy} className="btn btn-ghost btn-sm">
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Invite */}
          <button onClick={handleInvite} className="btn btn-secondary w-full">
            <Link size={15} />
            Invite friends
          </button>
        </div>

        {/* Players */}
        <PlayerList initialPlayers={lobby.players} initialHostId={lobby.hostId} />

        {/* Config */}
        {isHost ? (
          <>
            <GameConfig
              lobbyCode={lobby.code}
              initialSource={lobby.source}
              initialTarget={lobby.target}
              initialRules={lobby.rules || DEFAULT_RULES}
            />

            <button
              onClick={handleStart}
              disabled={!canStart}
              className="btn btn-primary btn-lg w-full"
            >
              <Play size={16} />
              {canStart ? 'Start game' : 'Set source and target to start'}
            </button>
          </>
        ) : (
          <>
            <GameConfigReadOnly
              source={lobby.source}
              target={lobby.target}
              rules={lobby.rules || DEFAULT_RULES}
            />

            {lobby.source && lobby.target && (
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                <Clock size={14} />
                Waiting for the host to start...
              </div>
            )}
          </>
        )}
        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </main>
  );
}