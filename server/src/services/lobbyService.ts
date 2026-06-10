import { redis } from './redis';
import { generateLobbyCode } from '../utils/generateCode';
import type { Lobby, Player, Rules } from '../../../shared/types';

const LOBBY_TTL = 60 * 60 * 2; // 2 hours

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

export async function addPlayer(code: string, player: { id: string; name: string }): Promise<Lobby> {
  const lobby = await getLobby(code);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'waiting') throw new Error('Game already started');
  if (lobby.players.length >= 8) throw new Error('Lobby is full');

  const already = lobby.players.find(p => p.id === player.id);
  if (already) return lobby;

  lobby.players.push({
    id: player.id,
    name: player.name,
    ready: false,
    path: [],
    clicks: 0,
    finishedAt: null,
    rank: null,
  });

  await redis.hset(`lobby:${code}`, 'players', JSON.stringify(lobby.players));

  return lobby;
}

export async function removePlayer(code: string, playerId: string): Promise<Lobby | null> {
  const lobby = await getLobby(code);
  if (!lobby) return null;

  lobby.players = lobby.players.filter(p => p.id !== playerId);

  if (lobby.players.length === 0) {
    await redis.del(`lobby:${code}`);
    return null;
  }

  if (lobby.hostId === playerId) {
    lobby.hostId = lobby.players[0].id;
    await redis.hset(`lobby:${code}`, 'hostId', lobby.hostId);
  }

  await redis.hset(`lobby:${code}`, 'players', JSON.stringify(lobby.players));

  return lobby;
}

export async function updateLobbyConfig(
  code: string,
  config: { source: string; target: string; rules: Rules }
): Promise<Lobby> {
  const lobby = await getLobby(code);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'waiting') throw new Error('Game already started');

  await redis.hset(`lobby:${code}`, {
    source: config.source,
    target: config.target,
    rules: JSON.stringify(config.rules),
  });

  return { ...lobby, ...config };
}

export async function startGame(code: string): Promise<Lobby> {
  const lobby = await getLobby(code);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'waiting') throw new Error('Game already started');

  const startedAt = Date.now();

  await redis.hset(`lobby:${code}`, {
    status: 'playing',
    startedAt: startedAt.toString(),
  });

  return { ...lobby, status: 'playing', startedAt };
}

export async function endGame(code: string, players: Player[], startedAt: number) {
  await redis.hset(`lobby:${code}`, 'status', 'finished');

  const rankings = players
    .filter(p => p.finishedAt && p.finishedAt > 0)
    .sort((a, b) => a.finishedAt! - b.finishedAt!)
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.name,
      clicks: p.clicks,
      time: p.finishedAt! - startedAt,
      path: p.path,
    }));

  const gaveUp = players
    .filter(p => p.finishedAt === -1)
    .map(p => ({
      id: p.id,
      name: p.name,
      clicks: p.clicks,
      path: p.path,
    }));

  return { rankings, gaveUp };
}

export async function updatePlayerPath(code: string, players: Player[]): Promise<void> {
  await redis.hset(`lobby:${code}`, 'players', JSON.stringify(players));
}

export async function resetLobby(code: string): Promise<Lobby> {
  const lobby = await getLobby(code);
  if (!lobby) throw new Error('Lobby not found');

  const resetPlayers = lobby.players.map(p => ({
    ...p,
    path: [],
    clicks: 0,
    finishedAt: null,
    rank: null,
  }));

  await redis.hset(`lobby:${code}`, {
    status: 'waiting',
    source: '',
    target: '',
    startedAt: '',
    players: JSON.stringify(resetPlayers),
  });

  return {
    ...lobby,
    status: 'waiting',
    source: null,
    target: null,
    startedAt: null,
    players: resetPlayers,
  };
}