'use client';

import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, KpiCard, Card, CardTitle, Loading, ErrorBox } from '@/components/ui';
import { fmtMoney } from '@/lib/format';

export default function AlertsPage() {
  const { data, loading, error } = useApi(() => api.alerts());
  if (loading) return <Loading label="Evaluating alert rulesâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  const { active, counts, thresholds } = data;

  return (
    <div>
      <PageHeader title="Alerting" subtitle="Live evaluation of cost, reliability, SLO and latency thresholds" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Active Alerts" value={String(counts.total)} accent={counts.total ? 'bad' : 'ok'} />
        <KpiCard label="Critical" value={String(counts.critical)} accent="bad" />
        <KpiCard label="Warnings" value={String(counts.warning)} accent="warn" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle hint="real-time">Active Alerts</CardTitle>
            {active.length === 0 ? (
              <div className="py-14 text-center">
                <div className="inline-block px-4 py-1.5 rounded-full bg-ok/10 border border-ok/25 text-ok text-xs font-semibold uppercase tracking-[0.18em]">
                  All clear
                </div>
                <div className="text-sm text-muted mt-3">No active alerts â€” all thresholds within limits.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((a: any) => (
                  <div
                    key={a.id}
                    className={`relative rounded-xl border p-4 bg-soft-sheen shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_6px_rgba(0,0,0,0.4)] ${a.severity === 'critical' ? 'border-bad/40' : 'border-warn/40'}`}
                  >
                    <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${a.severity === 'critical' ? 'bg-bad' : 'bg-warn'}`} />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-[10px] font-mono uppercase tracking-[0.14em] text-muted px-2 py-1 rounded bg-bg/60 border border-line">
                          {a.category}
                        </span>
                        <div>
                          <div className="font-semibold text-[#f4ebdd]">{a.title}</div>
                          <div className="text-sm text-muted mt-0.5">{a.message}</div>
                        </div>
                      </div>
                      <span className={`pill shrink-0 ${a.severity === 'critical' ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn'}`}>
                        {a.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle>Configured Thresholds</CardTitle>
          <dl className="space-y-3 text-sm">
            <Threshold label="Daily cost" value={fmtMoney(thresholds.dailyCost)} />
            <Threshold label="Failure rate" value={`${thresholds.failureRatePct}%`} />
            <Threshold label="Latency spike" value={`${thresholds.latencySpikeMs} ms`} />
            <Threshold label="SLO floor" value={`${thresholds.sloFloor}%`} />
          </dl>
          <p className="text-xs text-muted mt-4 pt-4 border-t border-line">
            Adjust thresholds on the Admin page. Alerts are re-evaluated on every load.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Threshold({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono font-medium text-[#e9dfce]">{value}</dd>
    </div>
  );
}
