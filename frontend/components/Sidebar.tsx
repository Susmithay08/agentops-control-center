'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRoleState] = useState('admin');

  useEffect(() => setRoleState(getRole()), []);

  const onRole = (r: string) => {
    setRole(r);
    setRoleState(r);
    window.location.reload();
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-soft-sheen border-r border-[#2a221c]">
      {/* Brand plate */}
      <div className="px-5 py-6 border-b border-[#2a221c]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-gloss shadow-plate flex items-center justify-center text-[#2a1402] text-xl font-bold tracking-tight">
            A
          </div>
          <div>
            <div className="font-semibold leading-tight tracking-tight text-[#f4ebdd]">AgentOps</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted leading-tight mt-0.5">
              Control Center
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl pl-4 pr-3 py-2.5 text-sm transition-all ${
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
        <label className="stat-label">Active role â€” RBAC</label>
        <select
          value={role}
          onChange={(e) => onRole(e.target.value)}
          className="input w-full mt-2 capitalize"
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
        <div className="mt-3.5 text-[11px] tracking-wide text-[#6b6051]">v1.0.0 â€” in-memory demo</div>
      </div>
    </aside>
  );
}
