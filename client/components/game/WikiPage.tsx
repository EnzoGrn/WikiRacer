'use client';

import { useEffect, useRef } from 'react';
import { isInternalWikiLink, extractTitleFromHref } from '@/services/wikipedia';
import '@/styles/wiki.css';

interface WikiPageProps {
  html: string;
  onNavigate: (title: string) => void;
}

export function WikiPage({ html, onNavigate }: WikiPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    container.innerHTML = html;

    const links = container.querySelectorAll<HTMLAnchorElement>('a[href]');

    links.forEach(link => {
      const href = link.getAttribute('href');

      if (!isInternalWikiLink(href)) {
        link.classList.add('disabled-link');
        return;
      }

      link.addEventListener('click', (e) => {
        e.preventDefault();
        const title = extractTitleFromHref(href!);
        onNavigate(title);
      });
    });

  }, [html, onNavigate]);

  return (
    <div
      ref={containerRef}
      className="wiki-content"
    />
  );
}