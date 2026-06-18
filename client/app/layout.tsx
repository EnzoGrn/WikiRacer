import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'WikiRacer',
    template: '%s — WikiRacer',
  },
  description: 'Race through Wikipedia pages faster than your friends. Navigate from one article to another using only the links on each page.',
  keywords: ['wikipedia', 'game', 'multiplayer', 'race', 'wiki', 'wikiracer'],
  authors: [{ name: 'Enzo Garnier', url: 'https://enzogarnier.fr' }],
  creator: 'Enzo Garnier',
  metadataBase: new URL('https://wikiracer.enzogarnier.fr'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wikiracer.enzogarnier.fr',
    siteName: 'WikiRacer',
    title: 'WikiRacer — Race through Wikipedia',
    description: 'Race through Wikipedia pages faster than your friends. Navigate from one article to another using only the links on each page.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WikiRacer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WikiRacer — Race through Wikipedia',
    description: 'Race through Wikipedia pages faster than your friends.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}