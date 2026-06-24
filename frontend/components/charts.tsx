'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/lib/format';

const axis = { stroke: '#6b6051', fontSize: 11, tickLine: false };
const grid = '#2a221c';

const tooltipStyle = {
  contentStyle: {
    background: '#1a1613',
    border: '1px solid #38302a',
    borderRadius: 12,
    fontSize: 12,
    color: '#ece3d6',
    boxShadow: '0 10px 24px -10px rgba(0,0,0,0.85)',
  },
  labelStyle: { color: '#8a7d6e' },
  cursor: { fill: '#241f1a', stroke: '#3a322b' },
};

function shortDate(d: string) {
  return d?.slice(5); // MM-DD
}

export function AreaTrend({ data, xKey, yKey, color = '#f97316' }: any) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} tickFormatter={shortDate} />
        <YAxis {...axis} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#g-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({ data, xKey, series }: { data: any[]; xKey: string; series: { key: string; color: string; name?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} tickFormatter={shortDate} />
        <YAxis {...axis} />
        <Tooltip {...tooltipStyle} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name || s.key} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HBar({ data, xKey, yKey, color = '#f97316', unit = '' }: any) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" {...axis} unit={unit} />
        <YAxis type="category" dataKey={yKey} {...axis} width={110} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={xKey} radius={[0, 5, 5, 0]}>
          {data.map((_: any, i: number) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, nameKey, valueKey }: any) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_: any, i: number) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#15110e" />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
