import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/lobbyService', () => ({
  getLobby: vi.fn(),
  startGame: vi.fn(),
  updatePlayerPath: vi.fn().mockResolvedValue(undefined),
  endGame: vi.fn(),
}));

vi.mock('../utils/sleep', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

import { endGame, getLobby, startGame } from '../services/lobbyService';
import { registerGameHandlers } from './gameHandlers';

function createMockSocket(id = 'socket-123') {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event, handler) => { handlers[event] = handler; }),
    join: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    _trigger: (event: string, ...args: any[]) => handlers[event]?.(...args),
  };
}

describe('game:start', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits countdown then game:started', async () => {
    const socket = createMockSocket('host-socket');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    const mockLobby = {
      code: 'ABC123',
      hostId: 'host-socket',
      status: 'waiting',
      source: 'Napoleon',
      target: 'Pizza',
      rules: { noCtrlF: false, noBack: false, noRightClick: false, noCategories: false, timeLimit: null },
      startedAt: null,
    };

    vi.mocked(getLobby).mockResolvedValue(mockLobby as any);
    vi.mocked(startGame).mockResolvedValue({ ...mockLobby, status: 'playing', startedAt: 123456 } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:start', { code: 'ABC123' });

    expect(mockEmit).toHaveBeenCalledTimes(4);
    expect(mockEmit).toHaveBeenNthCalledWith(1, 'game:countdown', { count: 3 });
    expect(mockEmit).toHaveBeenNthCalledWith(2, 'game:countdown', { count: 2 });
    expect(mockEmit).toHaveBeenNthCalledWith(3, 'game:countdown', { count: 1 });
    expect(mockEmit).toHaveBeenNthCalledWith(4, 'game:started', expect.objectContaining({
      source: 'Napoleon',
      target: 'Pizza',
    }));
  });

  it('does nothing if not host', async () => {
    const socket = createMockSocket('other-socket');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      hostId: 'host-socket',
      status: 'waiting',
      source: 'Napoleon',
      target: 'Pizza',
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:start', { code: 'ABC123' });

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does nothing if source or target missing', async () => {
    const socket = createMockSocket('host-socket');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      hostId: 'host-socket',
      status: 'waiting',
      source: null,
      target: null,
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:start', { code: 'ABC123' });

    expect(mockEmit).not.toHaveBeenCalled();
  });
});

vi.mock('../utils/normalizeTitle', () => ({
  normalizeTitle: vi.fn((title: string) => title.toLowerCase().trim()),
}));

describe('game:navigate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits game:playerMoved when page is not the target', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      source: 'Napoleon',
      target: 'Pizza',
      startedAt: Date.now(),
      players: [
        { id: 'player-1', name: 'Jane', path: [], clicks: 0, finishedAt: null, rank: null },
      ],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:navigate', { code: 'ABC123', page: 'France' });

    expect(mockEmit).toHaveBeenCalledWith('game:playerMoved', expect.objectContaining({
      playerId: 'player-1',
      currentPage: 'France',
      clicks: 1,
    }));
  });

  it('emits game:playerFinished when page matches target', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      source: 'Napoleon',
      target: 'pizza',
      startedAt: Date.now() - 5000,
      players: [
        { id: 'player-1', name: 'Jane', path: [], clicks: 0, finishedAt: null, rank: null },
      ],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:navigate', { code: 'ABC123', page: 'pizza' });

    expect(mockEmit).toHaveBeenCalledWith('game:playerFinished', expect.objectContaining({
      playerId: 'player-1',
      rank: 1,
      clicks: 1,
    }));
  });

  it('does nothing if game is not playing', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'waiting',
      players: [],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:navigate', { code: 'ABC123', page: 'France' });

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does nothing if player already finished', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      target: 'pizza',
      startedAt: Date.now(),
      players: [
        { id: 'player-1', name: 'Jane', path: ['pizza'], clicks: 1, finishedAt: 123456, rank: 1 },
      ],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:navigate', { code: 'ABC123', page: 'France' });

    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('game:giveUp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits game:playerGaveUp and updates player', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      startedAt: Date.now() - 5000,
      players: [
        { id: 'player-1', name: 'Enzo', path: [], clicks: 2, finishedAt: null, rank: null },
        { id: 'player-2', name: 'Alice', path: [], clicks: 3, finishedAt: 123456, rank: 1 },
      ],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:giveUp', { code: 'ABC123' });

    expect(mockEmit).toHaveBeenCalledWith('game:playerGaveUp', { playerId: 'player-1' });
  });

  it('emits game:finished when all players are done after giveUp', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      startedAt: Date.now() - 5000,
      players: [
        { id: 'player-1', name: 'Enzo', path: [], clicks: 2, finishedAt: null, rank: null },
        { id: 'player-2', name: 'Alice', path: [], clicks: 3, finishedAt: 123456, rank: 1 },
      ],
    } as any);

    vi.mocked(endGame).mockResolvedValue({
      rankings: [{ rank: 1, id: 'player-2', name: 'Alice', clicks: 3, time: 1000, path: [] }],
      gaveUp: ['Enzo'],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:giveUp', { code: 'ABC123' });

    expect(mockEmit).toHaveBeenCalledWith('game:finished', expect.objectContaining({
      rankings: expect.any(Array),
    }));
  });

  it('does nothing if player already finished', async () => {
    const socket = createMockSocket('player-1');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit: mockEmit }) } as any;

    vi.mocked(getLobby).mockResolvedValue({
      code: 'ABC123',
      status: 'playing',
      startedAt: Date.now(),
      players: [
        { id: 'player-1', name: 'Enzo', path: [], clicks: 2, finishedAt: 123456, rank: 1 },
      ],
    } as any);

    registerGameHandlers(io, socket as any);
    await socket._trigger('game:giveUp', { code: 'ABC123' });

    expect(mockEmit).not.toHaveBeenCalled();
  });
});