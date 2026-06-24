'use client';

import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, KpiCard, Card, CardTitle, Loading, ErrorBox } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export default function StatusPage() {
  const { data, loading, error } = useApi(() => api.status());
  const metrics = useApi(() => api.metrics());

  if (loading) return <Loading label="Checking system statusâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  const allUp = data.components.every((c: any) => c.status === 'operational');

  return (
    <div>
      <PageHeader title="System Status" subtitle="Live health of platform components" />

      <div className={`card p-5 mb-6 flex items-center gap-4 ${allUp ? 'border-ok/30' : 'border-warn/40'}`}>
        <div className={`h-3 w-3 rounded-full ${allUp ? 'bg-ok shadow-[0_0_12px_rgba(249,115,22,0.85)]' : 'bg-warn shadow-[0_0_12px_rgba(224,164,74,0.8)]'}`} />
        <div>
          <div className="text-lg font-semibold text-[#f4ebdd]">{data.overall}</div>
          <div className="text-sm text-muted">
            Uptime {Math.floor(data.uptimeSeconds / 60)}m Â· p95 latency {data.p95LatencyMs}ms Â· error rate {data.errorRatePct}%
          </div>
        </div>
      </div>

      {metrics.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard label="Requests" value={String(metrics.data.requestsTotal)} accent="brand" />
          <KpiCard label="Errors" value={String(metrics.data.errorsTotal)} accent={metrics.data.errorsTotal ? 'bad' : 'ok'} />
          <KpiCard label="Cache Hits" value={String(metrics.data.cacheHits)} accent="ok" />
          <KpiCard label="Cache Misses" value={String(metrics.data.cacheMisses)} accent="warn" />
          <KpiCard label="p50 Latency" value={`${metrics.data.p50LatencyMs}ms`} accent="brand" />
          <KpiCard label="p95 Latency" value={`${metrics.data.p95LatencyMs}ms`} accent="brand" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Components</CardTitle>
          <div className="divide-y divide-line">
            {data.components.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-[#f4ebdd]">{c.name}</div>
                  <div className="text-xs text-muted">{c.detail}</div>
                </div>
                <span className={`pill ${c.status === 'operational' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'operational' ? 'bg-ok' : 'bg-warn'}`} />
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle hint={`${data.incidents.length} open`}>Open Incidents</CardTitle>
          {data.incidents.length === 0 ? (
            <div className="py-14 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full bg-ok/10 border border-ok/25 text-ok text-xs font-semibold uppercase tracking-[0.18em]">
                Operational
              </div>
              <div className="text-sm text-muted mt-3">No open incidents.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.incidents.map((inc: any) => (
                <div key={inc.id} className="border border-line rounded-lg p-3 bg-bg-soft">
                  <div className="flex items-center justify-between">
                    <span className={`pill ${inc.severity === 'SEV1' ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn'}`}>{inc.severity}</span>
                    <span className="text-xs text-muted">{fmtDate(inc.startedAt)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium">{inc.title}</div>
                  <div className="text-xs text-muted mt-1">{inc.summary}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
