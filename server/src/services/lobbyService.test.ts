import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
vi.mock('./redis', () => ({
  redis: {
    hset: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn(),
    expire: vi.fn().mockResolvedValue(1),
  }
}));

import { redis } from './redis';
import { createLobby, getLobby } from './lobbyService';

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