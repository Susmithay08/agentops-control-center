'use client';

import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, KpiCard, Card, CardTitle, Loading, ErrorBox } from '@/components/ui';
import { LineTrend } from '@/components/charts';
import { fmtNum, fmtDuration, fmtPct, fmtDate } from '@/lib/format';

export default function ReliabilityPage() {
  const { data, loading, error } = useApi(() => api.reliability());
  if (loading) return <Loading label="Loading SLO dashboard…" />;
  if (error) return <ErrorBox message={error} />;

  const { slo, trends, incidents, topFailureCauses } = data;

  return (
    <div>
      <PageHeader title="Reliability & SLO" subtitle={`Service objective: ${slo.target}% availability`} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        <KpiCard label="Availability" value={fmtPct(slo.availability, 2)} accent={slo.availability >= slo.target ? 'ok' : 'bad'} />
        <KpiCard label="Success Rate" value={fmtPct(slo.successRate, 2)} accent="ok" />
        <KpiCard label="Avg Response" value={fmtDuration(slo.avgResponseTimeMs)} accent="brand" />
        <KpiCard label="Failed Runs" value={fmtNum(slo.failedRuns)} accent="bad" />
        <KpiCard label="Retries" value={fmtNum(slo.retries)} accent="warn" />
        <KpiCard label="Error Budget Burn" value={fmtPct(slo.errorBudgetBurnRatePct, 1)} accent={slo.errorBudgetBurnRatePct > 100 ? 'bad' : 'warn'} sub="of monthly budget" />
        <KpiCard label="SLO Target" value={fmtPct(slo.target, 1)} accent="brand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardTitle hint="% / day">Success Rate Trend</CardTitle>
          <LineTrend data={trends.successRate} xKey="date" series={[{ key: 'successRate', color: '#f97316', name: 'success %' }]} />
        </Card>
        <Card>
          <CardTitle hint="ms / day">Average Latency Trend</CardTitle>
          <LineTrend data={trends.latency} xKey="date" series={[{ key: 'latencyMs', color: '#e0a44a', name: 'latency ms' }]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle hint="last 30 days">Top Failure Causes</CardTitle>
          <div className="space-y-3">
            {topFailureCauses.map((c: any) => (
              <div key={c.cause}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#e9dfce]">{c.cause}</span>
                  <span className="text-muted">{c.count} · {fmtPct(c.pct)}</span>
                </div>
                <div className="rail h-2">
                  <div className="rail-fill bg-bad" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle hint={`${incidents.length} total`}>Incident Summaries</CardTitle>
          <div className="space-y-3">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="border border-line rounded-lg p-3 bg-bg-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`pill ${inc.severity === 'SEV1' ? 'bg-bad/15 text-bad' : inc.severity === 'SEV2' ? 'bg-warn/15 text-warn' : 'bg-brand/15 text-brand'}`}>{inc.severity}</span>
                    <span className={`pill ${inc.status === 'resolved' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>{inc.status}</span>
                  </div>
                  <span className="text-xs text-muted">{fmtDate(inc.startedAt)}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-[#f4ebdd]">{inc.title}</div>
                <div className="text-xs text-muted mt-1">{inc.summary}</div>
                <div className="text-xs text-muted mt-1.5">Agent: {inc.affectedAgent} · {inc.impactedRuns} runs impacted</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
