'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Countdown } from '@/components/game/Countdown';
import { WikiPage } from '@/components/game/WikiPage';
import { fetchWikiPage } from '@/services/wikipedia';

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const [html, setHtml] = useState('');

  useEffect(() => {
    fetchWikiPage('Napoleon').then(setHtml);
  }, []);

  const handleNavigate = (title: string) => {
    console.log('Navigate to:', title);
    fetchWikiPage(title).then(setHtml);
  };

  return (
    <main className="bg-white min-h-screen">
      <Countdown />
      <WikiPage html={html} onNavigate={handleNavigate} />
    </main>
  );
}