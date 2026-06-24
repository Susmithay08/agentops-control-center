import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'AgentOps Control Center',
  description: 'Monitor, evaluate, and govern AI coding agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans">
        <Sidebar />
        <main className="pl-64">
          <div className="mx-auto max-w-[1480px] px-9 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
