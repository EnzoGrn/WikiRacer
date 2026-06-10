import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';

// Mock socket
vi.mock('@/lib/socket', () => {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      on: vi.fn((event, handler) => { handlers[event] = handler; }),
      off: vi.fn(),
      _trigger: (event: string, ...args: any[]) => handlers[event]?.(...args),
    },
  };
});

import { socket } from '@/lib/socket';

const initialPlayers = [
  { id: 'p1', name: 'Enzo', clicks: 0, path: [], ready: false, finishedAt: null, rank: null },
  { id: 'p2', name: 'Alice', clicks: 0, path: [], ready: false, finishedAt: null, rank: null },
];

describe('useGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes players from initialPlayers', () => {
    const { result } = renderHook(() => useGame({ initialPlayers, source: 'Napoleon' }));

    expect(result.current.players).toHaveLength(2);
    expect(result.current.players[0].name).toBe('Enzo');
    expect(result.current.players[0].currentPage).toBe('Napoleon');
  });

  it('updates player position on game:playerMoved', () => {
    const { result } = renderHook(() => useGame({ initialPlayers, source: 'Napoleon' }));

    act(() => {
      (socket as any)._trigger('game:playerMoved', {
        playerId: 'p1',
        currentPage: 'France',
        clicks: 1,
      });
    });

    expect(result.current.players[0].currentPage).toBe('France');
    expect(result.current.players[0].clicks).toBe(1);
  });

  it('marks player as finished on game:playerFinished', () => {
    const { result } = renderHook(() => useGame({ initialPlayers, source: 'Napoleon' }));

    act(() => {
      (socket as any)._trigger('game:playerFinished', {
        playerId: 'p1',
        playerName: 'Enzo',
        rank: 1,
        clicks: 3,
        time: 5000,
        path: ['Napoleon', 'France', 'Pizza'],
      });
    });

    expect(result.current.players[0].rank).toBe(1);
    expect(result.current.players[0].clicks).toBe(3);
    expect(result.current.players[0].finishedAt).not.toBeNull();
  });

  it('marks player as gaveUp on game:playerGaveUp', () => {
    const { result } = renderHook(() => useGame({ initialPlayers, source: 'Napoleon' }));

    act(() => {
      (socket as any)._trigger('game:playerGaveUp', { playerId: 'p2' });
    });

    expect(result.current.players[1].gaveUp).toBe(true);
  });

  it('sets gameStatus to finished on game:finished', () => {
    const { result } = renderHook(() => useGame({ initialPlayers, source: 'Napoleon' }));

    act(() => {
      (socket as any)._trigger('game:finished', {
        rankings: [{ rank: 1, id: 'p1', name: 'Enzo', clicks: 3, time: 5000, path: [] }],
        gaveUp: [],
      });
    });

    expect(result.current.gameStatus).toBe('finished');
    expect(result.current.rankings).toHaveLength(1);
    expect(result.current.rankings[0].name).toBe('Enzo');
  });
});