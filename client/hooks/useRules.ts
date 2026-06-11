'use client';

import { useEffect } from 'react';
import type { Rules } from '@shared/types';

export function useRules(rules: Rules | null) {

  // No Ctrl+F
  useEffect(() => {
    if (!rules?.noCtrlF) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rules?.noCtrlF]);

  // No right click
  useEffect(() => {
    if (!rules?.noRightClick) return;
    const handler = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handler);
    return () => window.removeEventListener('contextmenu', handler);
  }, [rules?.noRightClick]);

  // No refresh (Ctrl+R / F5)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') e.preventDefault();
      if (e.key === 'F5') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

}