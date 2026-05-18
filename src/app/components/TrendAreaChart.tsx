import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendDataPoint {
  day: string;
  critical: number;
  atRisk: number;
  normal: number;
}

interface TrendAreaChartProps {
  data: TrendDataPoint[];
  labels: { critical: string; atRisk: string; normal: string };
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--cd-bg2)',
        border: '1px solid var(--cd-bd)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'var(--cd-t3)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--cd-t4)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 700 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({ data, labels }) => (
  <ResponsiveContainer width="100%" height={200}>
    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="gcritical" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="gatrisk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="gnormal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--cd-bd)" vertical={false} />
      <XAxis
        dataKey="day"
        tick={{ fill: 'var(--cd-t5)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        domain={[0, 100]}
        tick={{ fill: 'var(--cd-t5)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip content={<CustomTooltip />} />
      <Area
        type="monotone"
        dataKey="critical"
        name={labels.critical}
        stroke="#EF4444"
        strokeWidth={2}
        fill="url(#gcritical)"
        dot={false}
        activeDot={{ r: 4, fill: '#EF4444' }}
      />
      <Area
        type="monotone"
        dataKey="atRisk"
        name={labels.atRisk}
        stroke="#F59E0B"
        strokeWidth={2}
        fill="url(#gatrisk)"
        dot={false}
        activeDot={{ r: 4, fill: '#F59E0B' }}
      />
      <Area
        type="monotone"
        dataKey="normal"
        name={labels.normal}
        stroke="#10B981"
        strokeWidth={2}
        fill="url(#gnormal)"
        dot={false}
        activeDot={{ r: 4, fill: '#10B981' }}
      />
    </AreaChart>
  </ResponsiveContainer>
);
