'use client';

import { useState } from 'react';
import { api, getRole } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { PageHeader, Card, CardTitle, Loading, ErrorBox } from '@/components/ui';
import { fmtDate } from '@/lib/format';

type Tab = 'entities' | 'config' | 'audit';

export default function AdminPage() {
  const { data, loading, error, reload } = useApi(() => api.adminEntities());
  const audit = useApi(() => api.audit());
  const [tab, setTab] = useState<Tab>('entities');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (loading) return <Loading label="Loading admin consoleâ€¦" />;
  if (error) return <ErrorBox message={error} />;

  const role = getRole();
  const canWrite = role === 'admin';
  const canConfig = role === 'admin' || role === 'manager';

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div>
      <PageHeader
        title="Admin Console"
        subtitle="Manage agents, models, teams, users and platform thresholds"
        actions={<span className="pill bg-bg-hover text-muted capitalize">role: {role}</span>}
      />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${msg.kind === 'ok' ? 'bg-ok/10 text-ok border border-ok/20' : 'bg-bad/10 text-bad border border-bad/20'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 mb-5 border-b border-line">
        {(['entities', 'config', 'audit'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand text-[#f4ebdd]' : 'border-transparent text-muted hover:text-[#e9dfce]'}`}
          >
            {t === 'config' ? 'Configuration' : t === 'audit' ? 'Audit Log' : 'Entities'}
          </button>
        ))}
      </div>

      {tab === 'entities' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CreateForm
              title="Create Agent"
              fields={[{ name: 'name', label: 'Agent name' }, { name: 'vendor', label: 'Vendor' }]}
              disabled={!canWrite}
              onSubmit={async (body: any) => {
                await api.createEntity('agents', body);
                flash('ok', `Agent "${body.name}" created`);
                reload();
              }}
              onError={(e: any) => flash('err', e)}
            />
            <CreateForm
              title="Create Model"
              fields={[{ name: 'name', label: 'Model name' }, { name: 'provider', label: 'Provider' }, { name: 'pricePer1k', label: 'Price / 1K tokens', type: 'number' }]}
              disabled={!canWrite}
              onSubmit={async (body: any) => {
                await api.createEntity('models', { ...body, pricePer1k: Number(body.pricePer1k), tier: 'balanced' });
                flash('ok', `Model "${body.name}" created`);
                reload();
              }}
              onError={(e: any) => flash('err', e)}
            />
            <CreateForm
              title="Create Team"
              fields={[{ name: 'name', label: 'Team name' }]}
              disabled={!canWrite}
              onSubmit={async (body: any) => {
                await api.createEntity('teams', body);
                flash('ok', `Team "${body.name}" created`);
                reload();
              }}
              onError={(e: any) => flash('err', e)}
            />
            <CreateForm
              title="Create User"
              fields={[{ name: 'name', label: 'Full name' }, { name: 'email', label: 'Email' }, { name: 'role', label: 'Role (admin/manager/engineer/viewer)' }]}
              disabled={!canWrite}
              onSubmit={async (body: any) => {
                await api.createEntity('users', { ...body, teamId: data.teams[0]?.id });
                flash('ok', `User "${body.name}" created`);
                reload();
              }}
              onError={(e: any) => flash('err', e)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EntityList title="Agents" items={data.agents.map((a: any) => ({ k: a.id, a: a.name, b: a.vendor }))} />
            <EntityList title="Models" items={data.models.map((m: any) => ({ k: m.id, a: m.name, b: `${m.provider} Â· $${m.pricePer1k}/1k` }))} />
            <EntityList title="Teams" items={data.teams.map((t: any) => ({ k: t.id, a: t.name, b: t.id }))} />
            <EntityList title={`Users (${data.users.length})`} items={data.users.slice(0, 12).map((u: any) => ({ k: u.id, a: u.name, b: u.role }))} />
          </div>
        </div>
      )}

      {tab === 'config' && <ConfigForm config={data.config} disabled={!canConfig} onSaved={(text: any) => { flash('ok', text); reload(); }} onError={(e: any) => flash('err', e)} />}

      {tab === 'audit' && (
        <Card>
          <CardTitle hint="most recent first">Audit Log</CardTitle>
          {audit.loading ? (
            <Loading />
          ) : (
            <div className="divide-y divide-line">
              {audit.data?.entries.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="pill bg-bg-hover text-[#d8cdbd] font-mono">{e.action}</span>
                    <span className="text-muted">by {e.actor}</span>
                    <span className="text-[#d8cdbd]">{e.target}</span>
                  </div>
                  <span className="text-xs text-muted">{fmtDate(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function CreateForm({ title, fields, onSubmit, onError, disabled }: any) {
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(form);
      setForm({});
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <form onSubmit={submit} className="space-y-3">
        {fields.map((f: any) => (
          <div key={f.name}>
            <label className="stat-label">{f.label}</label>
            <input
              className="input w-full mt-1"
              type={f.type || 'text'}
              value={form[f.name] || ''}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              required
              disabled={disabled}
            />
          </div>
        ))}
        <button type="submit" className="btn-primary disabled:opacity-40" disabled={disabled || busy}>
          {busy ? 'Savingâ€¦' : disabled ? 'Requires admin role' : 'Create'}
        </button>
      </form>
    </Card>
  );
}

function EntityList({ title, items }: { title: string; items: { k: string; a: string; b: string }[] }) {
  return (
    <Card>
      <CardTitle hint={`${items.length} shown`}>{title}</CardTitle>
      <div className="divide-y divide-line">
        {items.map((i) => (
          <div key={i.k} className="flex justify-between py-2 text-sm">
            <span className="text-[#e9dfce]">{i.a}</span>
            <span className="text-muted text-xs">{i.b}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfigForm({ config, onSaved, onError, disabled }: any) {
  const [form, setForm] = useState({
    sloTarget: config.slo.target,
    latencyMs: config.slo.latencyMs,
    dailyThreshold: config.cost.dailyThreshold,
    failureRatePct: config.alerts.failureRatePct,
    latencySpikeMs: config.alerts.latencySpikeMs,
    sloFloor: config.alerts.sloFloor,
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateConfig({
        slo: { target: Number(form.sloTarget), latencyMs: Number(form.latencyMs) },
        cost: { dailyThreshold: Number(form.dailyThreshold) },
        alerts: {
          failureRatePct: Number(form.failureRatePct),
          latencySpikeMs: Number(form.latencySpikeMs),
          sloFloor: Number(form.sloFloor),
        },
      });
      onSaved('Configuration updated â€” alerts re-evaluated');
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, suffix?: string) => (
    <div>
      <label className="stat-label">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <input className="input w-full" type="number" step="any" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} disabled={disabled} />
        {suffix && <span className="text-xs text-muted w-10">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <form onSubmit={save}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardTitle>SLO Targets</CardTitle>
          <div className="space-y-4">
            {field('sloTarget', 'SLO availability target', '%')}
            {field('latencyMs', 'p95 latency objective', 'ms')}
          </div>
        </Card>
        <Card>
          <CardTitle>Cost & Alert Thresholds</CardTitle>
          <div className="space-y-4">
            {field('dailyThreshold', 'Daily cost threshold', 'USD')}
            {field('failureRatePct', 'Failure rate alert', '%')}
            {field('latencySpikeMs', 'Latency spike alert', 'ms')}
            {field('sloFloor', 'SLO compliance floor', '%')}
          </div>
        </Card>
      </div>
      <div className="mt-5">
        <button type="submit" className="btn-primary disabled:opacity-40" disabled={disabled || busy}>
          {busy ? 'Savingâ€¦' : disabled ? 'Requires manager/admin role' : 'Save configuration'}
        </button>
      </div>
    </form>
  );
}
