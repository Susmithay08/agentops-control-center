export const fmtNum = (n: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(n));

export const fmtMoney = (n: number, dp = 2) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

export const fmtPct = (n: number, dp = 1) => `${n.toFixed(dp)}%`;

export const fmtDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const fmtTokens = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const statusColor = (status: string) => {
  switch (status) {
    case 'Success':
      return 'text-ok bg-ok/10 border border-ok/25';
    case 'Partial Success':
      return 'text-warn bg-warn/10 border border-warn/25';
    case 'Failed':
      return 'text-bad bg-bad/10 border border-bad/30';
    default:
      return 'text-muted bg-bg-hover';
  }
};

export const scoreColor = (score: number) => {
  if (score >= 85) return 'text-ok';
  if (score >= 70) return 'text-warn';
  return 'text-bad';
};

// Warm monochrome-plus-orange ramp: pumpkin, amber, ember, brushed greys.
export const CHART_COLORS = ['#f97316', '#e0a44a', '#b1471f', '#8a7d6e', '#fb923c', '#6b6051', '#c2540a', '#d8cdbd'];
