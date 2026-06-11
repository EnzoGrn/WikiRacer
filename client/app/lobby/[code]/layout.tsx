import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `WikiRacer | ${code}`,
  };
}

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}