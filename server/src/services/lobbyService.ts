import { redis } from './redis';
import { generateLobbyCode } from '../utils/generateCode';

const LOBBY_TTL = 60 * 60 * 2; // 2 hours

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  path: string[];
  clicks: number;
  finishedAt: number | null;
  rank: number | null;
}

export interface Rules {
  noCtrlF: boolean;
  noBack: boolean;
  noRightClick: boolean;
  noCategories: boolean;
  timeLimit: number | null;
}

export interface Lobby {
  code: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  source: string | null;
  target: string | null;
  rules: Rules;
  players: Player[];
  startedAt: number | null;
}

// ----

export async function createLobby(hostId: string, hostName: string): Promise<Lobby> {
  const code = generateLobbyCode();

  const lobby: Lobby = {
    code,
    hostId,
    status: 'waiting',
    source: null,
    target: null,
    rules: {
      noCtrlF: false,
      noBack: false,
      noRightClick: false,
      noCategories: false,
      timeLimit: null,
    },
    players: [
      { id: hostId, name: hostName, ready: false, path: [], clicks: 0, finishedAt: null, rank: null }
    ],
    startedAt: null,
  };

  await redis.hset(`lobby:${code}`, {
    code,
    hostId,
    status: lobby.status,
    source: '',
    target: '',
    rules: JSON.stringify(lobby.rules),
    players: JSON.stringify(lobby.players),
    startedAt: '',
  });
  await redis.expire(`lobby:${code}`, LOBBY_TTL);

  return lobby;
}

export async function getLobby(code: string): Promise<Lobby | null> {
  const raw = await redis.hgetall(`lobby:${code}`);
  if (!raw || !raw.code) return null;

  return {
    code: raw.code,
    hostId: raw.hostId,
    status: raw.status as Lobby['status'],
    source: raw.source || null,
    target: raw.target || null,
    rules: JSON.parse(raw.rules),
    players: JSON.parse(raw.players),
    startedAt: raw.startedAt ? Number(raw.startedAt) : null,
  };
}