import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  return {
    title: `WikiRacer | ${params.code}`,
  };
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}