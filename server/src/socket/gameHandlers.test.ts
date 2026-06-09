import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/lobbyService', () => ({
  getLobby: vi.fn(),
  startGame: vi.fn(),
}));

vi.mock('../utils/sleep', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

import { getLobby, startGame } from '../services/lobbyService';
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