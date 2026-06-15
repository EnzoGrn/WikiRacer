import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WikiRacer | Daily Route',
  description: 'A new Wikipedia route every day.',
};

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}