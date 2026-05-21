import React from 'react';

interface RiskGaugeProps {
  score: number; // 0-100
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, size = 180 }) => {
  const radius = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (startDeg: number, endDeg: number, r: number) => {
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const getColor = (s: number) => {
    if (s >= 75) return '#EF4444';
    if (s >= 50) return '#F59E0B';
    return '#10B981';
  };

  const getRiskLabel = (s: number) => {
    if (s >= 75) return 'CRITIQUE';
    if (s >= 50) return 'À RISQUE';
    return 'NORMAL';
  };

  const scoreAngle = startAngle + (score / 100) * totalAngle;
  const color = getColor(score);
  const label = getRiskLabel(score);

  // Needle
  const needleAngle = toRad(scoreAngle);
  const needleLength = radius - 12;
  const nx = cx + needleLength * Math.cos(needleAngle);
  const ny = cy + needleLength * Math.sin(needleAngle);

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background track */}
      <path
        d={arcPath(startAngle, endAngle, radius)}
        fill="none"
        stroke="var(--cd-bd)"
        strokeWidth={14}
        strokeLinecap="round"
      />

      {/* Colored track - green zone */}
      <path
        d={arcPath(startAngle, startAngle + totalAngle * 0.5, radius)}
        fill="none"
        stroke="#10B981"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Orange zone */}
      <path
        d={arcPath(startAngle + totalAngle * 0.5, startAngle + totalAngle * 0.75, radius)}
        fill="none"
        stroke="#F59E0B"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Red zone */}
      <path
        d={arcPath(startAngle + totalAngle * 0.75, endAngle, radius)}
        fill="none"
        stroke="#EF4444"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.3}
      />

      {/* Active arc */}
      <path
        d={arcPath(startAngle, scoreAngle, radius)}
        fill="none"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* Tick marks */}
      {ticks.map((tick) => {
        const tickAngle = toRad(startAngle + (tick / 100) * totalAngle);
        const innerR = radius - 20;
        const outerR = radius - 10;
        const tx1 = cx + innerR * Math.cos(tickAngle);
        const ty1 = cy + innerR * Math.sin(tickAngle);
        const tx2 = cx + outerR * Math.cos(tickAngle);
        const ty2 = cy + outerR * Math.sin(tickAngle);
        const labelR = radius - 32;
        const lx = cx + labelR * Math.cos(tickAngle);
        const ly = cy + labelR * Math.sin(tickAngle);
        return (
          <g key={tick}>
            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--cd-hv2)" strokeWidth={2} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="var(--cd-t4)" fontSize={9}>
              {tick}
            </text>
          </g>
        );
      })}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <circle cx={cx} cy={cy} r={6} fill={color} filter="url(#glow)" />
      <circle cx={cx} cy={cy} r={3} fill="var(--cd-bg1)" />

      {/* Score text */}
      <text
        x={cx}
        y={cy - 30}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={28}
        fontWeight="bold"
        fontFamily="monospace"
        filter="url(#glow)"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--cd-t3)"
        fontSize={9}
      >
        /100
      </text>

      {/* Risk label */}
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={10}
        fontWeight="bold"
        letterSpacing="2"
      >
        {label}
      </text>
    </svg>
  );
};