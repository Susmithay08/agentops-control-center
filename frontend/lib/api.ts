// Thin API client for the AgentOps backend.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

// The active role is stored client-side to simulate an authenticated session.
export function getRole(): string {
  if (typeof window === 'undefined') return 'admin';
  return window.localStorage.getItem('agentops_role') || 'admin';
}

export function setRole(role: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('agentops_role', role);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-role': getRole(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.message || '';
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<any>('/dashboard'),
  reliability: () => request<any>('/reliability'),
  modelComparison: () => request<any>('/models/comparison'),
  recommendations: () => request<any>('/models/recommendations'),
  runs: (qs: string) => request<any>(`/runs${qs ? `?${qs}` : ''}`),
  runFilters: () => request<any>('/runs/filters'),
  run: (id: string) => request<any>(`/runs/${id}`),
  alerts: () => request<any>('/alerts'),
  status: () => request<any>('/status'),
  health: () => request<any>('/health'),
  metrics: () => request<any>('/metrics?format=json'),
  docs: () => request<any>('/docs'),
  adminEntities: () => request<any>('/admin/entities'),
  audit: () => request<any>('/admin/audit'),
  createEntity: (kind: string, body: any) =>
    request<any>(`/admin/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
  updateConfig: (body: any) =>
    request<any>('/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
};
