import React, { useMemo } from 'react';
import { getECGValue } from '../utils/ecgGenerator';
import { useTheme } from '../context/ThemeContext';

/**
 * Pure-SVG ECG display with CSS scroll animation.
 * Zero canvas / Zero requestAnimationFrame — fully compatible with Figma's preview.
 */

interface ECGCanvasProps {
  heartRate?: number;
  color?: string;
  height?: number;
  className?: string;
  isAbnormal?: boolean;
}

export const ECGCanvas: React.FC<ECGCanvasProps> = ({
  heartRate = 72,
  color = '#10B981',
  height = 120,
  className = '',
  isAbnormal = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* ── waveform geometry ───────────────────────────────────────── */
  const spb   = Math.max(1, Math.round((60 / heartRate) * 200)); // samples/beat
  const NPTS  = 600;   // half-width in SVG units (also # data points)
  const VB_W  = NPTS * 2; // viewBox total width (two copies side-by-side)
  const VB_H  = 100;
  const MID   = VB_H / 2;
  const AMP   = VB_H * 0.38;

  /* ── compute waveform once ───────────────────────────────────── */
  const pts = useMemo(() => {
    const vals = Array.from({ length: NPTS }, (_, i) => {
      const phase = (i % spb) / spb;
      let v = getECGValue(phase, heartRate);
      // deterministic artifact for abnormal (no Math.random → stable memo)
      if (isAbnormal && (i % Math.floor(spb * 0.68)) === 0) v += 0.28;
      return v;
    });
    // First copy (0 → NPTS) + second copy (NPTS → VB_W) for seamless loop
    const a = vals.map((v, i) => `${i},${(MID - v * AMP).toFixed(1)}`).join(' ');
    const b = vals.map((v, i) => `${NPTS + i},${(MID - v * AMP).toFixed(1)}`).join(' ');
    return `${a} ${b}`;
  }, [heartRate, spb, isAbnormal, NPTS, MID, AMP]);

  /* ── scroll speed: 200 samples/s = real ECG 25 mm/s ─────────── */
  const durationSec = (NPTS / 200).toFixed(2);
  const animName    = `ecg-s${heartRate}${isAbnormal ? 'a' : 'n'}`;

  const bgColor   = isDark ? '#0B1120' : '#F8FAFC';
  const gridColor = isDark ? 'rgba(16,185,129,0.07)' : 'rgba(14,165,233,0.06)';

  return (
    <div
      className={`overflow-hidden relative ${className}`}
      style={{ height, width: '100%', backgroundColor: bgColor }}
    >
      {/* Keyframe injected inline — avoids any global CSS conflicts */}
      <style>{`@keyframes ${animName}{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '200%',      // 2× container → shows exactly NPTS units at a time
          height: '100%',
          animation: `${animName} ${durationSec}s linear infinite`,
        }}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`g-${animName}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0L0 0 0 20" fill="none" stroke={gridColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        {/* Grid */}
        <rect width={VB_W} height={VB_H} fill={`url(#g-${animName})`} />
        {/* Waveform (two seamless copies) */}
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* Right-edge fade */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
          background: `linear-gradient(to right, transparent, ${bgColor})`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
