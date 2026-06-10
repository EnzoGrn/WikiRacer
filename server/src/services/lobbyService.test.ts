import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
vi.mock('./redis', () => ({
  redis: {
    hset: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn(),
    expire: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }
}));

import { redis } from './redis';
import { addPlayer, createLobby, getLobby, removePlayer, resetLobby, startGame, updateLobbyConfig } from './lobbyService';

describe('createLobby', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a lobby with the correct host', async () => {
    const lobby = await createLobby('player-1', 'Jane');
    expect(lobby.hostId).toBe('player-1');
    expect(lobby.players[0].name).toBe('Jane');
  });

  it('generates a code of 6 characters', async () => {
    const lobby = await createLobby('player-1', 'Jane');
    expect(lobby.code).toHaveLength(6);
  });

  it('initial status is waiting', async () => {
    const lobby = await createLobby('player-1', 'Jane');
    expect(lobby.status).toBe('waiting');
  });

  it('saves to Redis', async () => {
    await createLobby('player-1', 'Jane');
    expect(redis.hset).toHaveBeenCalledOnce();
    expect(redis.expire).toHaveBeenCalledOnce();
  });
});

describe('getLobby', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null if the lobby does not exist', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    const result = await getLobby('XXXXXX');
    expect(result).toBeNull();
  });

  it('returns the lobby parsed from Redis', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({ noCtrlF: false, noBack: false, noRightClick: false, noCategories: false, timeLimit: null }),
      players: JSON.stringify([{ id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null }]),
      startedAt: '',
    });

    const lobby = await getLobby('ABC123');
    expect(lobby).not.toBeNull();
    expect(lobby!.code).toBe('ABC123');
    expect(lobby!.players[0].name).toBe('Jane');
  });
});

describe('addPlayer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a new player to the lobby', async () => {
    const existingLobby = {
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: null,
      target: null,
      rules: { noCtrlF: false, noBack: false, noRightClick: false, noCategories: false, timeLimit: null },
      players: [{ id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null }],
      startedAt: null,
    };

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify(existingLobby.rules),
      players: JSON.stringify(existingLobby.players),
      startedAt: '',
    });

    const lobby = await addPlayer('ABC123', { id: 'player-2', name: 'Alice' });

    expect(lobby.players).toHaveLength(2);
    expect(lobby.players[1].name).toBe('Alice');
    expect(redis.hset).toHaveBeenCalledOnce();
  });

  it('throws if lobby not found', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    await expect(addPlayer('XXXXXX', { id: 'p1', name: 'Alice' })).rejects.toThrow('Lobby not found');
  });

  it('throws if lobby is full', async () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: `player-${i}`, name: `Player ${i}`, ready: false,
      path: [], clicks: 0, finishedAt: null, rank: null,
    }));

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-0',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '',
    });

    await expect(addPlayer('ABC123', { id: 'player-8', name: 'Extra' })).rejects.toThrow('Lobby is full');
  });

  it('returns existing lobby if player already in it (reconnection)', async () => {
    const players = [{ id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null }];

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '',
    });

    const lobby = await addPlayer('ABC123', { id: 'player-1', name: 'Jane' });
    expect(lobby.players).toHaveLength(1);
    expect(redis.hset).not.toHaveBeenCalled();
  });

  it('throws if game already started', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'playing',
      source: 'Napoleon',
      target: 'Pizza',
      rules: JSON.stringify({}),
      players: JSON.stringify([]),
      startedAt: '123456',
    });

    await expect(addPlayer('ABC123', { id: 'player-2', name: 'Alice' })).rejects.toThrow('Game already started');
  });
});

describe('removePlayer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes a player from the lobby', async () => {
    const players = [
      { id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null },
      { id: 'player-2', name: 'Alice', ready: false, path: [], clicks: 0, finishedAt: null, rank: null },
    ];

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '',
    });

    const lobby = await removePlayer('ABC123', 'player-2');

    expect(lobby).not.toBeNull();
    expect(lobby!.players).toHaveLength(1);
    expect(lobby!.players[0].id).toBe('player-1');
  });

  it('transfers host when host leaves', async () => {
    const players = [
      { id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null },
      { id: 'player-2', name: 'Alice', ready: false, path: [], clicks: 0, finishedAt: null, rank: null },
    ];

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '',
    });

    const lobby = await removePlayer('ABC123', 'player-1');

    expect(lobby!.hostId).toBe('player-2');
  });

  it('returns null and deletes lobby when last player leaves', async () => {
    const players = [
      { id: 'player-1', name: 'Jane', ready: false, path: [], clicks: 0, finishedAt: null, rank: null },
    ];

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '',
    });

    const lobby = await removePlayer('ABC123', 'player-1');

    expect(lobby).toBeNull();
    expect(redis.del).toHaveBeenCalledWith('lobby:ABC123');
  });

  it('returns null if lobby not found', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    const lobby = await removePlayer('XXXXXX', 'player-1');
    expect(lobby).toBeNull();
  });
});

describe('updateLobbyConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates source, target and rules', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: '',
      target: '',
      rules: JSON.stringify({}),
      players: JSON.stringify([]),
      startedAt: '',
    });

    const rules = { noCtrlF: true, noBack: false, noRightClick: false, noCategories: false, timeLimit: null };
    const lobby = await updateLobbyConfig('ABC123', { source: 'Napoleon', target: 'Pizza', rules });

    expect(lobby.source).toBe('Napoleon');
    expect(lobby.target).toBe('Pizza');
    expect(redis.hset).toHaveBeenCalledOnce();
  });

  it('throws if lobby not found', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    await expect(
      updateLobbyConfig('XXXXXX', { source: 'Napoleon', target: 'Pizza', rules: {} as any })
    ).rejects.toThrow('Lobby not found');
  });

  it('throws if game already started', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'playing',
      source: 'Napoleon',
      target: 'Pizza',
      rules: JSON.stringify({}),
      players: JSON.stringify([]),
      startedAt: '123456',
    });

    await expect(
      updateLobbyConfig('ABC123', { source: 'Napoleon', target: 'Pizza', rules: {} as any })
    ).rejects.toThrow('Game already started');
  });
});

describe('startGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets status to playing and saves startedAt', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'waiting',
      source: 'Napoleon',
      target: 'Pizza',
      rules: JSON.stringify({}),
      players: JSON.stringify([]),
      startedAt: '',
    });

    const lobby = await startGame('ABC123');

    expect(lobby.status).toBe('playing');
    expect(lobby.startedAt).toBeTypeOf('number');
    expect(redis.hset).toHaveBeenCalledOnce();
  });

  it('throws if lobby not found', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    await expect(startGame('XXXXXX')).rejects.toThrow('Lobby not found');
  });

  it('throws if game already started', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'player-1',
      status: 'playing',
      source: 'Napoleon',
      target: 'Pizza',
      rules: JSON.stringify({}),
      players: JSON.stringify([]),
      startedAt: '123456',
    });

    await expect(startGame('ABC123')).rejects.toThrow('Game already started');
  });
});

describe('resetLobby', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets lobby to waiting with clean players', async () => {
    const players = [
      { id: 'p1', name: 'Enzo', ready: false, path: ['Napoleon', 'Pizza'], clicks: 3, finishedAt: 123, rank: 1 },
    ];

    vi.mocked(redis.hgetall).mockResolvedValue({
      code: 'ABC123',
      hostId: 'p1',
      status: 'finished',
      source: 'Napoleon',
      target: 'Pizza',
      rules: JSON.stringify({}),
      players: JSON.stringify(players),
      startedAt: '123456',
    });

    const lobby = await resetLobby('ABC123');

    expect(lobby.status).toBe('waiting');
    expect(lobby.source).toBeNull();
    expect(lobby.target).toBeNull();
    expect(lobby.startedAt).toBeNull();
    expect(lobby.players[0].clicks).toBe(0);
    expect(lobby.players[0].path).toEqual([]);
    expect(lobby.players[0].finishedAt).toBeNull();
    expect(lobby.players[0].rank).toBeNull();
  });

  it('throws if lobby not found', async () => {
    vi.mocked(redis.hgetall).mockResolvedValue({});
    await expect(resetLobby('XXXXXX')).rejects.toThrow('Lobby not found');
  });
});