'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getRole, setRole } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Dashboard', tag: '01' },
  { href: '/runs', label: 'Agent Runs', tag: '02' },
  { href: '/reliability', label: 'Reliability', tag: '03' },
  { href: '/models', label: 'Model Comparison', tag: '04' },
  { href: '/alerts', label: 'Alerts', tag: '05' },
  { href: '/admin', label: 'Admin', tag: '06' },
  { href: '/status', label: 'System Status', tag: '07' },
  { href: '/docs', label: 'API Docs', tag: '08' },
];

const ROLES = ['admin', 'manager', 'engineer', 'viewer'];

function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRoleState] = useState('admin');

  useEffect(() => setRoleState(getRole()), []);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Esc to close + lock body scroll while the drawer is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const onRole = (r: string) => {
    setRole(r);
    setRoleState(r);
    window.location.reload();
  };

  const current = NAV.find((n) => isActive(n.href, pathname));

  return (
    <>
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-30 h-16 bg-soft-sheen border-b border-[#2a221c] shadow-[0_6px_18px_-12px_rgba(0,0,0,0.9)]">
        <div className="mx-auto max-w-[1480px] h-full px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
              className="btn-ghost group !px-3.5 !py-2.5"
            >
              <span className="flex flex-col items-center justify-center gap-[4px]">
                <span className={`menu-bar ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
                <span className={`menu-bar ${open ? 'opacity-0' : ''}`} />
                <span className={`menu-bar ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Menu</span>
            </button>

            {current && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="font-mono text-[11px] text-brand">{current.tag}</span>
                <span className="text-muted">/</span>
                <span className="font-semibold tracking-tight text-[#f4ebdd]">{current.label}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-orange-gloss shadow-plate flex items-center justify-center text-[#2a1402] text-base font-bold">
                A
              </div>
              <div className="hidden md:block leading-tight">
                <div className="font-semibold tracking-tight text-[#f4ebdd] text-sm">AgentOps</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Control Center</div>
              </div>
            </div>
            <span className="pill bg-brand/15 text-brand border border-brand/25 capitalize">{role}</span>
          </div>
        </div>
      </header>

      {/* ---- Backdrop ---- */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ---- Slide-out drawer ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-soft-sheen border-r border-[#3a322b] shadow-[18px_0_50px_-20px_rgba(0,0,0,0.95)] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 border-b border-[#2a221c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-orange-gloss shadow-plate flex items-center justify-center text-[#2a1402] text-xl font-bold">
              A
            </div>
            <div>
              <div className="font-semibold leading-tight tracking-tight text-[#f4ebdd]">AgentOps</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted leading-tight mt-0.5">
                Control Center
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[11px] uppercase tracking-[0.16em] text-muted hover:text-brand transition-colors"
          >
            Close
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {NAV.map((item, i) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ transitionDelay: open ? `${i * 45 + 90}ms` : '0ms' }}
                className={`group relative flex items-center gap-3 rounded-xl pl-4 pr-3 py-2.5 text-sm transition-all duration-300 ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                } ${
                  active
                    ? 'bg-metal text-[#f4ebdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.5)] border border-[#3a322b]'
                    : 'text-[#b6a896] hover:text-[#f4ebdd] hover:bg-[#1b1612]/60 border border-transparent'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-orange-gloss shadow-[0_0_10px_rgba(249,115,22,0.7)]" />
                )}
                <span
                  className={`text-[11px] font-mono tabular-nums tracking-wider ${
                    active ? 'text-brand' : 'text-[#6b6051]'
                  }`}
                >
                  {item.tag}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-[#2a221c]">
          <label className="stat-label">Active role — RBAC</label>
          <select value={role} onChange={(e) => onRole(e.target.value)} className="input w-full mt-2 capitalize">
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <div className="mt-3.5 text-[11px] tracking-wide text-[#6b6051]">v1.0.0 — in-memory demo</div>
        </div>
      </aside>

      {/* ---- Page content (keyed → re-animates on every route change) ---- */}
      <main>
        <div key={pathname} className="page-enter mx-auto max-w-[1480px] px-9 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
