import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goal Coach Agent',
  description: 'An AI-like agent that reminds you to work on your goal',
  manifest: '/manifest.webmanifest',
  themeColor: '#0ea5e9'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
