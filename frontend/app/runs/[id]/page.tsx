'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Card, CardTitle, StatusBadge, Loading, ErrorBox } from '@/components/ui';
import { fmtMoney, fmtDuration, fmtNum, fmtDate, scoreColor } from '@/lib/format';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, loading, error } = useApi(() => api.run(id), [id]);

  if (loading) return <Loading label="Loading run…" />;
  if (error) return <ErrorBox message={error} />;

  const m = run.metrics;

  return (
    <div>
      <div className="mb-6">
        <Link href="/runs" className="text-xs uppercase tracking-[0.16em] text-muted hover:text-brand transition-colors">
          Back to runs
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold font-mono text-[#f4ebdd]">{run.id}</h1>
          <StatusBadge status={run.status} />
        </div>
        <p className="text-sm text-muted mt-1">
          {run.agentName} · {run.modelName} · {run.taskType} · {fmtDate(run.timestamp)} · trace{' '}
          <span className="font-mono">{run.traceId}</span>
        </p>
      </div>

      {/* Top facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-5">
        <Fact label="Tokens Consumed" value={fmtNum(run.tokensUsed)} />
        <Fact label="Execution Time" value={fmtDuration(run.durationMs)} />
        <Fact label="Cost" value={fmtMoney(run.costUsd, 4)} />
        <Fact label="Model Used" value={run.modelName} mono />
        <Fact label="Agent Used" value={run.agentName} />
        <Fact label="Provider" value={run.provider} />
        <Fact label="Final Status" value={run.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardTitle>Prompt Summary</CardTitle>
            <p className="text-sm text-[#e9dfce] leading-relaxed">{run.promptSummary}</p>
            <div className="mt-3 flex gap-6 text-xs text-muted">
              <span>Prompt tokens: {fmtNum(run.promptTokens)}</span>
              <span>Completion tokens: {fmtNum(run.completionTokens)}</span>
              <span>Retries: {run.retries}</span>
            </div>
          </Card>

          {run.failureReason && (
            <Card className="border-bad/30">
              <CardTitle>Failure Reason</CardTitle>
              <div className="text-sm text-bad bg-bad/10 border border-bad/20 rounded-lg px-3 py-2">{run.failureReason}</div>
            </Card>
          )}

          <Card>
            <CardTitle hint={`${run.filesChanged.length} files`}>Files Changed</CardTitle>
            <ul className="space-y-1.5">
              {run.filesChanged.map((f: string) => (
                <li key={f} className="font-mono text-xs text-[#d8cdbd] flex items-center gap-2">
                  <span className="text-ok">+</span> {f}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle hint="model output">Generated Code Snippet</CardTitle>
            <pre className="bg-bg-soft border border-line rounded-lg p-4 overflow-x-auto text-xs leading-relaxed font-mono text-[#e9dfce]">
              <code>{run.codeSnippet}</code>
            </pre>
          </Card>

          <Card>
            <CardTitle hint="execution trace">Logs</CardTitle>
            <div className="bg-bg-soft border border-line rounded-lg p-3 font-mono text-xs space-y-1">
              {run.logs.map((l: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className={l.level === 'error' ? 'text-bad' : l.level === 'warn' ? 'text-warn' : 'text-muted'}>
                    [{l.level}]
                  </span>
                  <span className="text-[#d8cdbd]">{l.message}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: evaluation scores */}
        <div className="space-y-5">
          <Card>
            <CardTitle hint="AI Evaluation Engine">Run Health Score</CardTitle>
            <div className="flex items-center justify-center py-2">
              <Gauge value={m.healthScore} />
            </div>
          </Card>

          <Card>
            <CardTitle>Score Breakdown</CardTitle>
            <div className="space-y-4">
              <ScoreBar label="Output Quality" value={m.qualityScore} />
              <ScoreBar label="Security" value={m.securityScore} />
              <ScoreBar label="Maintainability" value={m.maintainabilityScore} />
              <ScoreBar label="Test Coverage" value={m.testCoverageScore} />
            </div>

            {(m.securityFindings?.length > 0 || m.maintainabilityFindings?.length > 0) && (
              <div className="mt-5 pt-4 border-t border-line">
                <div className="stat-label mb-2">Findings</div>
                <ul className="space-y-1 text-xs">
                  {m.securityFindings?.map((f: string, i: number) => (
                    <li key={`s${i}`} className="text-bad">• {f}</li>
                  ))}
                  {m.maintainabilityFindings?.map((f: string, i: number) => (
                    <li key={`m${i}`} className="text-warn">• {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className={`mt-1.5 text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[#d8cdbd]">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="rail h-2">
        <div
          className={`rail-fill ${value >= 85 ? 'bg-orange-gloss' : value >= 70 ? 'bg-warn' : 'bg-bad'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const color = value >= 85 ? '#f97316' : value >= 70 ? '#e0a44a' : '#b1471f';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - value / 100);
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#241f1a" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  );
}
