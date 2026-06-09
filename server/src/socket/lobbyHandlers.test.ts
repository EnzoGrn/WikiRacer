import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lobbyService
vi.mock('../services/lobbyService', () => ({
  createLobby: vi.fn(),
  addPlayer: vi.fn(),
}));

// Mock redis
vi.mock('../services/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
  }
}));

import { addPlayer, createLobby } from '../services/lobbyService';
import { registerLobbyHandlers } from './lobbyHandlers';

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

describe('lobby:create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a lobby and joins the socket to it', async () => {
    const socket = createMockSocket();
    const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

    const mockLobby = {
      code: 'ABC123',
      hostId: 'socket-123',
      status: 'waiting',
      players: [{ id: 'socket-123', name: 'Jane' }],
    };

    vi.mocked(createLobby).mockResolvedValue(mockLobby as any);

    registerLobbyHandlers(io, socket as any);

    const callback = vi.fn();
    await socket._trigger('lobby:create', { playerName: 'Jane' }, callback);

    expect(createLobby).toHaveBeenCalledWith('socket-123', 'Jane');
    expect(socket.join).toHaveBeenCalledWith('ABC123');
    expect(callback).toHaveBeenCalledWith({ ok: true, lobby: mockLobby });
  });

  it('calls callback with ok: false if there is an error', async () => {
    const socket = createMockSocket();
    const io = {} as any;

    vi.mocked(createLobby).mockRejectedValue(new Error('Redis down'));

    registerLobbyHandlers(io, socket as any);

    const callback = vi.fn();
    await socket._trigger('lobby:create', { playerName: 'Jane' }, callback);

    expect(callback).toHaveBeenCalledWith({ ok: false, error: 'Redis down' });
  });
});

describe('lobby:join', () => {
  beforeEach(() => vi.clearAllMocks());

  it('joins a lobby and notifies other players', async () => {
    const socket = createMockSocket('socket-456');
    const mockEmit = vi.fn();
    const io = { to: vi.fn().mockReturnThis(), emit: mockEmit } as any;

    const mockLobby = {
      code: 'ABC123',
      players: [
        { id: 'socket-123', name: 'Enzo' },
        { id: 'socket-456', name: 'Alice' },
      ],
    };

    vi.mocked(addPlayer).mockResolvedValue(mockLobby as any);

    registerLobbyHandlers(io, socket as any);

    const callback = vi.fn();
    await socket._trigger('lobby:join', { code: 'abc123', playerName: 'Alice' }, callback);

    expect(addPlayer).toHaveBeenCalledWith('ABC123', { id: 'socket-456', name: 'Alice' });
    expect(socket.join).toHaveBeenCalledWith('ABC123');
    expect(callback).toHaveBeenCalledWith({ ok: true, lobby: mockLobby });
  });

  it('calls callback with ok: false if lobby not found', async () => {
    const socket = createMockSocket();
    const io = {} as any;

    vi.mocked(addPlayer).mockRejectedValue(new Error('Lobby not found'));

    registerLobbyHandlers(io, socket as any);

    const callback = vi.fn();
    await socket._trigger('lobby:join', { code: 'XXXXXX', playerName: 'Alice' }, callback);

    expect(callback).toHaveBeenCalledWith({ ok: false, error: 'Lobby not found' });
  });
});