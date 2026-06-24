'use client';

import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, Card, CardTitle, Score, Loading, ErrorBox } from '@/components/ui';
import { fmtMoney, fmtDuration, fmtPct } from '@/lib/format';

export default function ModelsPage() {
  const { data, loading, error } = useApi(() => api.modelComparison());
  if (loading) return <Loading label="Comparing modelsâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  const { ranking, recommendations } = data;

  return (
    <div>
      <PageHeader
        title="Model Comparison"
        subtitle="Claude Â· GPT Â· Gemini Â· Copilot â€” compared on cost, latency, success rate and health score"
      />

      {/* Ranking table */}
      <Card className="mb-5 !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <CardTitle hint="composite score = 40% quality Â· 25% reliability Â· 20% latency Â· 15% cost">Provider Ranking</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-soft border-b border-line">
              <tr>
                <th className="th">Rank</th>
                <th className="th">Provider</th>
                <th className="th">Avg Cost</th>
                <th className="th">Latency</th>
                <th className="th">Success Rate</th>
                <th className="th">Health Score</th>
                <th className="th">Runs</th>
                <th className="th">Composite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ranking.map((r: any) => (
                <tr key={r.provider} className="hover:bg-bg-hover">
                  <td className="td">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                        r.rank <= 3
                          ? 'bg-orange-gloss text-[#2a1402] shadow-[inset_0_1px_0_rgba(255,220,180,0.5)]'
                          : 'bg-metal text-muted border border-line'
                      }`}
                    >
                      {String(r.rank).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="td font-semibold">{r.provider}</td>
                  <td className="td">{fmtMoney(r.avgCost, 4)}</td>
                  <td className="td">{fmtDuration(r.avgLatencyMs)}</td>
                  <td className="td">{fmtPct(r.successRate)}</td>
                  <td className="td"><Score value={r.healthScore} /></td>
                  <td className="td text-muted">{r.runs}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-bg-hover overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${r.compositeScore}%` }} />
                      </div>
                      <span className="font-semibold">{r.compositeScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommendation engine */}
      <h2 className="text-lg font-semibold mb-1">Recommendation Engine</h2>
      <p className="text-sm text-muted mb-4">
        Best model per task type. Weighted score = 40% quality Â· 25% cost Â· 20% latency Â· 15% reliability.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {recommendations.map((rec: any) => (
          <Card key={rec.taskType}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e9dfce]">{rec.taskType}</h3>
              {rec.recommended && (
                <span className="pill bg-brand/15 text-brand border border-brand/30 uppercase tracking-wider text-[10px]">
                  Best Â· {rec.recommended}
                </span>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">{rec.explanation}</p>
            <div className="space-y-2">
              {rec.ranking.slice(0, 4).map((p: any, i: number) => (
                <div key={p.provider} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-muted">{i + 1}</span>
                  <span className="w-20 text-[#e9dfce]">{p.provider}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-hover overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? 'bg-brand' : 'bg-line'}`} style={{ width: `${p.score}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium text-[#d8cdbd]">{p.score}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
