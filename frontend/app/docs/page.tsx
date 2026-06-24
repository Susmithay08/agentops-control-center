'use client';

import { api, API_BASE } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, Card, Loading, ErrorBox } from '@/components/ui';

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-ok/15 text-ok',
  POST: 'bg-brand/15 text-brand',
  PUT: 'bg-warn/15 text-warn',
  DELETE: 'bg-bad/15 text-bad',
};

export default function DocsPage() {
  const { data, loading, error } = useApi(() => api.docs());
  if (loading) return <Loading label="Loading API docsâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <PageHeader title="API Documentation" subtitle={`${data.name} Â· v${data.version}`} />

      <Card className="mb-5">
        <div className="text-sm text-[#d8cdbd]">
          <span className="text-muted">Base URL:</span> <span className="font-mono text-brand">{API_BASE}{data.baseUrl}</span>
        </div>
        <div className="text-sm text-muted mt-2">{data.auth}</div>
      </Card>

      <div className="space-y-5">
        {data.groups.map((g: any) => (
          <Card key={g.group}>
            <h3 className="text-sm font-semibold text-[#e9dfce] mb-4">{g.group}</h3>
            <div className="space-y-2">
              {g.endpoints.map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-line last:border-0">
                  <span className={`pill shrink-0 font-mono ${METHOD_COLOR[e.method] || 'bg-bg-hover text-muted'}`}>{e.method}</span>
                  <div className="min-w-0">
                    <code className="text-sm text-[#f4ebdd]">{e.path}</code>
                    <div className="text-xs text-muted mt-0.5">{e.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
