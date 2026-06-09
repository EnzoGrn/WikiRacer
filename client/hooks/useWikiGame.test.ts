import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWikiGame } from './useWikiGame';

vi.mock('@/services/wikipedia', () => ({
  fetchWikiPage: vi.fn(),
}));

import { fetchWikiPage } from '@/services/wikipedia';

const defaultProps = {
  source: 'Napoleon',
  rules: { noBack: false },
  onNavigate: vi.fn(),
};

describe('useWikiGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads source page on mount', async () => {
    vi.mocked(fetchWikiPage).mockResolvedValue('<p>Napoleon content</p>');

    const { result } = renderHook(() => useWikiGame(defaultProps));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchWikiPage).toHaveBeenCalledWith('Napoleon');
    expect(result.current.html).toBe('<p>Napoleon content</p>');
    expect(result.current.currentTitle).toBe('Napoleon');
  });

  it('navigate updates currentTitle and history', async () => {
    vi.mocked(fetchWikiPage).mockResolvedValue('<p>content</p>');

    const { result } = renderHook(() => useWikiGame(defaultProps));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.navigate('Pizza');
    });

    await waitFor(() => expect(result.current.currentTitle).toBe('Pizza'));
    expect(result.current.history).toEqual(['Napoleon', 'Pizza']);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('Pizza');
  });

  it('goBack goes to previous page', async () => {
    vi.mocked(fetchWikiPage).mockResolvedValue('<p>content</p>');

    const { result } = renderHook(() => useWikiGame(defaultProps));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.navigate('France'); });
    await waitFor(() => expect(result.current.currentTitle).toBe('France'));

    await act(async () => { result.current.goBack(); });
    await waitFor(() => expect(result.current.currentTitle).toBe('Napoleon'));

    expect(result.current.history).toEqual(['Napoleon']);
  });

  it('goBack does nothing if noBack rule is active', async () => {
    vi.mocked(fetchWikiPage).mockResolvedValue('<p>content</p>');

    const { result } = renderHook(() => useWikiGame({
      ...defaultProps,
      rules: { noBack: true },
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { result.current.navigate('France'); });
    await waitFor(() => expect(result.current.currentTitle).toBe('France'));

    await act(async () => { result.current.goBack(); });

    expect(result.current.currentTitle).toBe('France');
    expect(result.current.canGoBack).toBe(false);
  });

  it('sets error if page not found', async () => {
    vi.mocked(fetchWikiPage).mockRejectedValue(new Error('Page not found: Unknown'));

    const { result } = renderHook(() => useWikiGame(defaultProps));
    await waitFor(() => expect(result.current.error).toBe('Page not found: Unknown'));
  });
});