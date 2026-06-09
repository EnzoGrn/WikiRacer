'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWikiPage } from '@/services/wikipedia';

interface UseWikiGameProps {
  source: string;
  rules: {
    noBack: boolean;
  };
  onNavigate: (title: string) => void;
}

export function useWikiGame({ source, rules, onNavigate }: UseWikiGameProps) {
  const [currentTitle, setCurrentTitle] = useState(source);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([source]);

  const loadPage = useCallback(async (title: string) => {
    setLoading(true);
    setError(null);
    try {
      const content = await fetchWikiPage(title);
      setHtml(content);
      setCurrentTitle(title);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(source);
  }, [source, loadPage]);

  const navigate = useCallback((title: string) => {
    setHistory(prev => [...prev, title]);
    loadPage(title);
    onNavigate(title);
  }, [loadPage, onNavigate]);

  const goBack = useCallback(() => {
    if (rules.noBack) return;
    if (history.length < 2) return;

    const prev = history[history.length - 2];
    setHistory(h => h.slice(0, -1));
    loadPage(prev);
  }, [history, loadPage, rules.noBack]);

  return {
    currentTitle,
    html,
    loading,
    error,
    history,
    navigate,
    goBack,
    canGoBack: !rules.noBack && history.length > 1,
  };
}