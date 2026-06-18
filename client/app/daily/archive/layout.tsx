import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WikiRacer | Daily Archives',
};

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}