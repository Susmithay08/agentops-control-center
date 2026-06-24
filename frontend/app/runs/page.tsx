'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader, StatusBadge, Score, Loading, ErrorBox } from '@/components/ui';
import { fmtMoney, fmtDuration, fmtTokens, fmtDate } from '@/lib/format';

const SORTABLE: Record<string, string> = {
  timestamp: 'Timestamp',
  cost: 'Cost',
  duration: 'Duration',
  tokens: 'Tokens',
  health: 'Health',
};

export default function RunsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [q, setQ] = useState({ status: '', agentId: '', provider: '', taskType: '', teamId: '' });
  const [sort, setSort] = useState('timestamp');
  const [dir, setDir] = useState('desc');
  const [page, setPage] = useState(1);
  const size = 25;

  useEffect(() => {
    api.runFilters().then(setFilters).catch(() => {});
  }, []);

  // debounce search
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    Object.entries(q).forEach(([k, v]) => v && params.set(k, v as string));
    params.set('sort', sort);
    params.set('dir', dir);
    params.set('page', String(page));
    params.set('size', String(size));
    api
      .runs(params.toString())
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debounced, q, sort, dir, page]);

  useEffect(() => setPage(1), [debounced, q, sort, dir]);

  const toggleSort = (key: string) => {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setDir('desc');
    }
  };

  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <PageHeader
        title="Agent Runs"
        subtitle={data ? `${data.total.toLocaleString()} runs match the current filters` : 'Search and inspect individual agent runs'}
      />

      {/* Filter bar */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input flex-1 min-w-[220px]"
            placeholder="Search run id, prompt, user, agent, modelâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Status" value={q.status} onChange={(v) => setQ({ ...q, status: v })} options={filters?.statuses} />
          <Select label="Agent" value={q.agentId} onChange={(v) => setQ({ ...q, agentId: v })} options={filters?.agents?.map((a: any) => ({ value: a.id, label: a.name }))} />
          <Select label="Provider" value={q.provider} onChange={(v) => setQ({ ...q, provider: v })} options={filters?.providers} />
          <Select label="Task" value={q.taskType} onChange={(v) => setQ({ ...q, taskType: v })} options={filters?.taskTypes} />
          <Select label="Team" value={q.teamId} onChange={(v) => setQ({ ...q, teamId: v })} options={filters?.teams?.map((t: any) => ({ value: t.id, label: t.name }))} />
        </div>
      </div>

      {error ? (
        <ErrorBox message={error} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-soft border-b border-line">
                <tr>
                  <th className="th">Run ID</th>
                  <th className="th">Agent</th>
                  <th className="th">User</th>
                  <th className="th">Task Type</th>
                  <th className="th">Model</th>
                  <Th label="Duration" col="duration" sort={sort} dir={dir} onClick={toggleSort} />
                  <Th label="Cost" col="cost" sort={sort} dir={dir} onClick={toggleSort} />
                  <Th label="Tokens" col="tokens" sort={sort} dir={dir} onClick={toggleSort} />
                  <Th label="Health" col="health" sort={sort} dir={dir} onClick={toggleSort} />
                  <th className="th">Status</th>
                  <Th label="Timestamp" col="timestamp" sort={sort} dir={dir} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading && !data ? (
                  <tr>
                    <td colSpan={11}>
                      <Loading />
                    </td>
                  </tr>
                ) : (
                  data?.data.map((r: any) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/runs/${r.id}`)}
                      className="hover:bg-bg-hover cursor-pointer transition-colors"
                    >
                      <td className="td font-mono text-xs text-brand">{r.id}</td>
                      <td className="td">{r.agentName}</td>
                      <td className="td text-[#d8cdbd]">{r.userName}</td>
                      <td className="td text-[#d8cdbd]">{r.taskType}</td>
                      <td className="td font-mono text-xs text-muted">{r.modelName}</td>
                      <td className="td">{fmtDuration(r.durationMs)}</td>
                      <td className="td">{fmtMoney(r.costUsd, 4)}</td>
                      <td className="td text-[#d8cdbd]">{fmtTokens(r.tokensUsed)}</td>
                      <td className="td"><Score value={r.metrics.healthScore} /></td>
                      <td className="td"><StatusBadge status={r.status} /></td>
                      <td className="td text-muted">{fmtDate(r.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
            <div className="text-muted">
              Page {data?.page || 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost disabled:opacity-40" disabled={(data?.page || 1) <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button className="btn-ghost disabled:opacity-40" disabled={(data?.page || 1) >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options?: any[] }) {
  const norm = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: All</option>
      {norm.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Th({ label, col, sort, dir, onClick }: { label: string; col: string; sort: string; dir: string; onClick: (c: string) => void }) {
  const active = sort === col;
  return (
    <th className="th cursor-pointer select-none hover:text-[#e9dfce]" onClick={() => onClick(col)}>
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className={`text-[9px] font-mono tracking-tighter ${active ? 'text-brand' : 'text-[#4a4039]'}`}>
          {active ? (dir === 'asc' ? 'ASC' : 'DSC') : 'SORT'}
        </span>
      </span>
    </th>
  );
}
