'use client';

import { ReactNode } from 'react';
import { statusColor, scoreColor } from '@/lib/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7">
      <div className="relative pl-4">
        <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-orange-gloss shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
        <h1 className="text-[28px] leading-none font-semibold tracking-tight text-[#f4ebdd]">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-2 tracking-tight">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold tracking-tight text-[#e9dfce]">{children}</h3>
      {hint && <span className="text-[11px] text-muted tracking-tight">{hint}</span>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  trend,
  accent,
  className = '',
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  accent?: 'ok' | 'warn' | 'bad' | 'brand';
  className?: string;
}) {
  const led = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', brand: 'bg-brand' }[accent || 'brand'];
  const glow = {
    ok: 'shadow-[0_0_9px_rgba(249,115,22,0.8)]',
    warn: 'shadow-[0_0_9px_rgba(224,164,74,0.7)]',
    bad: 'shadow-[0_0_9px_rgba(177,71,31,0.8)]',
    brand: 'shadow-[0_0_9px_rgba(249,115,22,0.8)]',
  }[accent || 'brand'];
  return (
    <div className={`card p-5 relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        <span className={`h-2 w-2 rounded-full ${led} ${glow}`} />
      </div>
      <div className="mt-3 text-[26px] leading-none font-semibold tracking-tight text-[#f4ebdd]">{value}</div>
      <div className="mt-2 flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-semibold ${trend.positive ? 'text-ok' : 'text-bad'}`}>
            {trend.positive ? '+' : 'âˆ’'}
            {trend.value}
          </span>
        )}
        {sub && <span className="text-[11px] text-muted tracking-tight">{sub}</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`pill ${statusColor(status)}`}>{status}</span>;
}

export function Score({ value, label }: { value: number; label?: string }) {
  return (
    <span className={`font-semibold tabular-nums ${scoreColor(value)}`}>
      {value}
      {label && <span className="text-muted font-normal text-xs ml-1">{label}</span>}
    </span>
  );
}

export function Loading({ label = 'Loadingâ€¦' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-muted text-sm tracking-wide">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="card p-6 border-bad/40">
      <div className="text-bad font-semibold mb-1 tracking-tight">Could not load data</div>
      <div className="text-sm text-muted">{message}</div>
      <div className="text-xs text-muted mt-3">Make sure the backend is running on its port (default 4000).</div>
    </div>
  );
}
