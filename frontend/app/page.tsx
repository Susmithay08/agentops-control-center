'use client';

import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, KpiCard, Card, CardTitle, Loading, ErrorBox } from '@/components/ui';
import { AreaTrend, HBar, LineTrend } from '@/components/charts';
import { fmtNum, fmtMoney, fmtPct, fmtDuration } from '@/lib/format';

export default function DashboardPage() {
  const { data, loading, error } = useApi(() => api.dashboard());

  if (loading) return <Loading label="Loading executive dashboardâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  const { kpis, charts, reliability } = data;

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Organization-wide health of AI-assisted software development"
      />

      {/* Bento â€” deliberately asymmetric 12-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-min gap-4">
        {/* Hero tile */}
        <div className="md:col-span-4 md:row-span-2 card p-6 relative overflow-hidden flex flex-col justify-between min-h-[232px]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl" />
          <div>
            <div className="flex items-center justify-between">
              <div className="stat-label">Total Agent Runs</div>
              <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_9px_rgba(249,115,22,0.85)]" />
            </div>
            <div className="mt-5 text-[64px] leading-none font-semibold tracking-tighter text-[#f4ebdd]">
              {fmtNum(kpis.totalRuns)}
            </div>
            <div className="text-xs text-muted mt-2 tracking-tight">evaluated in the last 30 days</div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted">Success rate</span>
              <span className="font-semibold text-ok tabular-nums">{fmtPct(kpis.successRate)}</span>
            </div>
            <div className="rail h-2.5">
              <div className="rail-fill bg-orange-gloss" style={{ width: `${Math.min(100, kpis.successRate)}%` }} />
            </div>
          </div>
        </div>

        {/* Usage trend â€” wide */}
        <div className="md:col-span-8 md:row-span-2 card p-5">
          <CardTitle hint="runs / day Â· 30d">Agent Usage Trend</CardTitle>
          <AreaTrend data={charts.usageTrend} xKey="date" yKey="runs" />
        </div>

        {/* KPI band â€” uneven widths */}
        <KpiCard className="md:col-span-3" label="Success Rate" value={fmtPct(kpis.successRate)} accent={kpis.successRate >= 80 ? 'ok' : 'warn'} sub="completed cleanly" />
        <KpiCard className="md:col-span-2" label="Avg Cost / Run" value={fmtMoney(kpis.avgCostPerRun, 4)} accent="brand" sub="all models" />
        <KpiCard className="md:col-span-3" label="Avg Latency" value={fmtDuration(kpis.avgLatencyMs)} accent={kpis.avgLatencyMs < 8000 ? 'ok' : 'warn'} sub="end to end" />
        <KpiCard className="md:col-span-2" label="Failed Today" value={fmtNum(kpis.failedRunsToday)} accent={kpis.failedRunsToday > 10 ? 'bad' : 'ok'} sub="since midnight" />
        <KpiCard className="md:col-span-2" label="SLO" value={fmtPct(kpis.sloCompliance, 1)} accent={kpis.sloCompliance >= reliability.sloTarget ? 'ok' : 'bad'} sub={`tgt ${reliability.sloTarget}%`} />

        {/* Charts band â€” asymmetric 5 / 7 */}
        <div className="md:col-span-5 card p-5">
          <CardTitle hint="USD, 30 days">Cost by Model</CardTitle>
          <HBar data={charts.costByModel} xKey="cost" yKey="model" unit="" />
        </div>
        <div className="md:col-span-7 card p-5">
          <CardTitle hint="non-failed runs">Success Rate by Agent</CardTitle>
          <HBar data={charts.successRateByAgent} xKey="successRate" yKey="agent" unit="%" />
        </div>

        {/* Lower band â€” asymmetric 7 / 5 */}
        <div className="md:col-span-7 card p-5">
          <CardTitle hint="% of daily runs">Daily Failure Rate</CardTitle>
          <LineTrend data={charts.dailyFailureRate} xKey="date" series={[{ key: 'failureRate', color: '#b1471f', name: 'failure %' }]} />
        </div>

        <div className="md:col-span-5 card p-5">
          <CardTitle hint="error budget policy">Reliability &amp; Error Budget</CardTitle>
          <div className="grid grid-cols-2 gap-5">
            <SloStat label="SLO Target" value={`${reliability.sloTarget}%`} note="availability" />
            <SloStat
              label="Compliance"
              value={`${reliability.compliance}%`}
              note={reliability.compliance >= reliability.sloTarget ? 'within objective' : 'below objective'}
              tone={reliability.compliance >= reliability.sloTarget ? 'ok' : 'bad'}
            />
          </div>
          <div className="mt-5 pt-5 border-t border-line">
            <div className="flex items-center justify-between">
              <div className="stat-label">Error Budget Remaining</div>
              <div className="text-xl font-semibold tabular-nums text-[#f4ebdd]">{reliability.errorBudgetRemaining}%</div>
            </div>
            <div className="mt-3 rail h-2.5">
              <div
                className={`rail-fill ${reliability.errorBudgetRemaining > 30 ? 'bg-orange-gloss' : reliability.errorBudgetRemaining > 0 ? 'bg-warn' : 'bg-bad'}`}
                style={{ width: `${Math.max(2, reliability.errorBudgetRemaining)}%` }}
              />
            </div>
            <div className="text-[11px] text-muted mt-2 tracking-tight">
              of the {(100 - reliability.sloTarget).toFixed(1)}% monthly budget
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SloStat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'ok' | 'bad' }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-[#f4ebdd]'}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1 tracking-tight">{note}</div>
    </div>
  );
}
