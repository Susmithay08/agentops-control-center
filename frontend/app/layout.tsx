import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'AgentOps Control Center',
  description: 'Monitor, evaluate, and govern AI coding agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
