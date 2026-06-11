import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRules } from './useRules';

describe('useRules', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when rules are null', () => {
    renderHook(() => useRules(null));
    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing when all rules are false', () => {
    renderHook(() => useRules({
      noCtrlF: false,
      noBack: false,
      noRightClick: false,
      noCategories: false,
      timeLimit: null,
      gameMode: 'speed',
    }));
    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('registers keydown listener when noCtrlF is true', () => {
    renderHook(() => useRules({
      noCtrlF: true,
      noBack: false,
      noRightClick: false,
      noCategories: false,
      timeLimit: null,
      gameMode: 'speed',
    }));

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('registers contextmenu listener when noRightClick is true', () => {
    renderHook(() => useRules({
      noCtrlF: false,
      noBack: false,
      noRightClick: true,
      noCategories: false,
      timeLimit: null,
      gameMode: 'speed',
    }));

    expect(window.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });

  it('blocks Ctrl+F when noCtrlF is active', () => {
    renderHook(() => useRules({
      noCtrlF: true,
      noBack: false,
      noRightClick: false,
      noCategories: false,
      timeLimit: null,
      gameMode: 'speed',
    }));

    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, cancelable: true });
    vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not block regular keys when noCtrlF is active', () => {
    renderHook(() => useRules({
      noCtrlF: true,
      noBack: false,
      noRightClick: false,
      noCategories: false,
      timeLimit: null,
      gameMode: 'speed',
    }));

    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});