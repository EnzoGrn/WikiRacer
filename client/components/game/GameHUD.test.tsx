import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameHUD } from './GameHUD';

vi.mock('@/lib/socket', () => ({
  socket: { id: 'player-1' },
}));

describe('GameHUD', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the target page', () => {
    render(<GameHUD target="Pizza" clicks={3} timeLimit={null} startedAt={null} />);
    expect(screen.getByText('Pizza')).toBeDefined();
  });

  it('displays click count', () => {
    render(<GameHUD target="Pizza" clicks={5} timeLimit={null} startedAt={null} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows elapsed time when no time limit', () => {
    const startedAt = Date.now();
    render(<GameHUD target="Pizza" clicks={0} timeLimit={null} startedAt={startedAt} />);

    act(() => { vi.advanceTimersByTime(5000); });

    expect(screen.getByText('00:05')).toBeDefined();
  });

  it('shows remaining time when time limit is set', () => {
    const startedAt = Date.now();
    render(<GameHUD target="Pizza" clicks={0} timeLimit={60} startedAt={startedAt} />);

    act(() => { vi.advanceTimersByTime(10000); });

    expect(screen.getByText('00:50')).toBeDefined();
  });

  it('shows urgent style when under 30 seconds remaining', () => {
    const startedAt = Date.now();
    const { container } = render(
      <GameHUD target="Pizza" clicks={0} timeLimit={60} startedAt={startedAt} />
    );

    act(() => { vi.advanceTimersByTime(35000); });

    expect(container.querySelector('.text-red-500')).not.toBeNull();
  });
});