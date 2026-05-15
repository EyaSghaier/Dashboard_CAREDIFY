import React, { useState, useMemo } from 'react';
import { Activity, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type RiskClass = 'Critical' | 'At Risk' | 'Normal';

/* ────────────────────────────────────────────────────────────────────────────
   Lead morphology parameters: [pAmp, rAmp, qAmp, sAmp, tAmp]
   Positive = upward deflection, negative = downward
   These reflect realistic 12-lead ECG patterns
──────────────────────────────────────────────────────────────────────────── */
const LP: Record<string, [number, number, number, number, number]> = {
  I:   [ 0.18,  0.90, -0.12, -0.22,  0.28],
  II:  [ 0.22,  1.32, -0.15, -0.28,  0.36],
  III: [ 0.10,  0.52, -0.07, -0.48,  0.11],
  aVR: [-0.16, -0.88,  0.13,  0.18, -0.24],
  aVL: [ 0.05,  0.38, -0.05, -0.58,  0.07],
  aVF: [ 0.19,  1.08, -0.17, -0.34,  0.30],
  V1:  [ 0.07,  0.18, -0.03, -1.32, -0.20],
  V2:  [ 0.10,  0.44, -0.06, -0.98,  0.04],
  V3:  [ 0.13,  0.82, -0.10, -0.64,  0.17],
  V4:  [ 0.16,  1.18, -0.12, -0.33,  0.27],
  V5:  [ 0.18,  1.32, -0.14, -0.17,  0.28],
  V6:  [ 0.15,  1.10, -0.12, -0.07,  0.21],
};

/* ST shifts by condition */
const STEMI_ST: Record<string, number> = {
  V1: 0.26, V2: 0.46, V3: 0.40, V4: 0.26,
  I: -0.07, aVL: -0.11,          // reciprocal depression
};
const ISCH_ST: Record<string, number> = {
  I: -0.04, II: -0.07, aVF: -0.05, V5: -0.06, V6: -0.05,
};

/* Noise seeds per lead — gives each lead a distinct "feel" */
const NOISE_SEEDS: Record<string, number> = {
  I: 1.0, II: 1.1, III: 0.9, aVR: 1.05, aVL: 0.85, aVF: 1.15,
  V1: 0.95, V2: 1.0, V3: 1.05, V4: 1.1, V5: 1.0, V6: 0.92,
};

function computeSample(lead: string, phase: number, riskClass: RiskClass): number {
  const cfg = LP[lead];
  if (!cfg) return 0;
  const [pA, rA, qA, sA, tA] = cfg;
  const ns = NOISE_SEEDS[lead] ?? 1;

  let v = (Math.random() - 0.5) * 0.018 * ns;

  // P wave  (atrial depolarisation)
  if (phase >= 0.05 && phase < 0.18) {
    const t = (phase - 0.05) / 0.13;
    v += pA * Math.exp(-Math.pow((t - 0.5) * 5.5, 2));
  }
  // Q wave
  if (phase >= 0.22 && phase < 0.26) {
    v += qA * Math.sin(Math.PI * (phase - 0.22) / 0.04);
  }
  // R peak
  if (phase >= 0.26 && phase < 0.345) {
    const t = (phase - 0.26) / 0.085;
    v += rA * Math.exp(-Math.pow((t - 0.5) * 7.8, 2));
  }
  // S wave
  if (phase >= 0.345 && phase < 0.40) {
    v += sA * Math.sin(Math.PI * (phase - 0.345) / 0.055);
  }

  // ST segment elevation / depression
  const stShift =
    riskClass === 'Critical' ? (STEMI_ST[lead] ?? 0) :
    riskClass === 'At Risk'  ? (ISCH_ST[lead]  ?? 0) : 0;

  if (phase >= 0.40 && phase < 0.48) {
    v += stShift;
  }

  // T wave  (ventricular repolarisation)
  if (phase >= 0.48 && phase < 0.74) {
    const t = (phase - 0.48) / 0.26;
    let ta = tA;
    if (riskClass === 'Critical' && (STEMI_ST[lead] ?? 0) > 0.1) {
      ta = Math.abs(tA) * 2.3;          // hyperacute tall T
    } else if (riskClass === 'At Risk' && (ISCH_ST[lead] ?? 0) < 0) {
      ta = -Math.abs(tA) * 0.75;        // T-wave inversion
    }
    v += ta * Math.exp(-Math.pow((t - 0.46) * 3.4, 2));
    v += stShift * 0.25 * (1 - t);      // gradual return to isoelectric
  }

  return v;
}

function buildBuffer(
  lead: string,
  heartRate: number,
  beats: number,
  riskClass: RiskClass,
): number[] {
  const spb = Math.round((60 / heartRate) * 200); // samples/beat @ 200 Hz
  const total = spb * beats;
  return Array.from({ length: total }, (_, i) =>
    computeSample(lead, (i % spb) / spb, riskClass),
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   LeadSVG — pure-SVG replacement for LeadCanvas (no canvas API, no rAF)
──────────────────────────────────────────────────────────────────────────── */
interface LeadCanvasProps {
  lead: string;
  heartRate: number;
  riskClass: RiskClass;
  isDark: boolean;
  color: string;
  cW?: number;
  cH?: number;
  beats?: number;
  isRhythm?: boolean;
}

const LeadCanvas: React.FC<LeadCanvasProps> = ({
  lead, heartRate, riskClass, isDark, color,
  cW = 280, cH = 88, beats = 3, isRhythm = false,
}) => {
  const data = useMemo(
    () => buildBuffer(lead, heartRate, beats, riskClass),
    [lead, heartRate, beats, riskClass],
  );

  const midY        = cH / 2;
  const amp         = cH * (isRhythm ? 0.33 : 0.36);
  const pulseW      = 20;
  const oneMillivolt = amp * 0.8;
  const dataStart   = pulseW + 6;
  const dataWidth   = cW - dataStart - 4;

  const wavePoints = useMemo(
    () => data.map((v, i) =>
      `${(dataStart + (i / data.length) * dataWidth).toFixed(1)},${(midY - v * amp).toFixed(1)}`
    ).join(' '),
    [data, dataStart, dataWidth, midY, amp],
  );

  const bgC    = isDark ? '#05091a' : '#FFFBF3';
  const minorC = isDark ? 'rgba(255,60,60,0.10)' : 'rgba(215,80,80,0.22)';
  const majorC = isDark ? 'rgba(255,60,60,0.22)' : 'rgba(215,80,80,0.46)';
  const calibC = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)';
  const labelC = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(20,20,60,0.60)';
  // Include isRhythm in pattern ID so the rhythm-strip II doesn't clash with the grid II
  const pid = `${isRhythm ? 'r' : 'g'}-${lead.replace('a', 'a')}`;

  return (
    <svg
      viewBox={`0 0 ${cW} ${cH}`}
      width="100%"
      height={cH}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id={`mn-${pid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0L0 0 0 10" fill="none" stroke={minorC} strokeWidth="0.5" />
        </pattern>
        <pattern id={`mj-${pid}`} width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0L0 0 0 50" fill="none" stroke={majorC} strokeWidth="0.9" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width={cW} height={cH} fill={bgC} />
      {/* Grid */}
      <rect width={cW} height={cH} fill={`url(#mn-${pid})`} />
      <rect width={cW} height={cH} fill={`url(#mj-${pid})`} />

      {/* 1 mV calibration pulse */}
      <polyline
        points={`2,${midY} 2,${(midY - oneMillivolt).toFixed(1)} ${2 + pulseW},${(midY - oneMillivolt).toFixed(1)} ${2 + pulseW},${midY}`}
        fill="none" stroke={calibC} strokeWidth="1"
      />

      {/* ECG waveform */}
      <polyline
        points={wavePoints}
        fill="none"
        stroke={color}
        strokeWidth={isRhythm ? 1.3 : 1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Lead label */}
      <text x={5} y={cH - 5} fontSize={isRhythm ? 10 : 9}
        fill={labelC} fontFamily="monospace" fontWeight="bold">
        {lead}
      </text>
    </svg>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   Main 12-lead viewer component
──────────────────────────────────────────────────────────────────────────── */
const LAYOUT: string[][] = [
  ['I',   'aVR', 'V1', 'V4'],
  ['II',  'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

interface ECG12LeadViewerProps {
  heartRate: number;
  riskClass: 'Critical' | 'At Risk' | 'Normal';
  patientName?: string;
  isAbnormal?: boolean;
}

export const ECG12LeadViewer: React.FC<ECG12LeadViewerProps> = ({
  heartRate,
  riskClass,
  patientName,
  isAbnormal = false,
}) => {
  const { theme } = useTheme();
  const isDark   = theme === 'dark';
  const [expanded, setExpanded] = useState(true);

  const color =
    riskClass === 'Critical' ? '#EF4444' :
    riskClass === 'At Risk'  ? '#F59E0B' : '#10B981';

  const rhythmBeats = Math.max(6, Math.round(heartRate * 10 / 60)); // ~10 seconds

  const now = useMemo(() => new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }), []);

  const InterpIcon = riskClass === 'Normal' ? CheckCircle : AlertTriangle;

  const interpretation =
    riskClass === 'Critical'
      ? 'Sus-décalage ST antérieur (V1–V4) · STEMI probable · Tachycardie sinusale · T hyperaiguës'
      : riskClass === 'At Risk'
      ? 'Sous-décalage ST (II, aVF, V5–V6) · Ondes T inversées · Ischémie sous-épicardique possible'
      : 'Rythme sinusal régulier · Axe QRS normal · Repolarisation normale · Pas de sus-décalage ST';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? '1px solid var(--cd-bd)' : 'none' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>
              ECG 12 Dérivations
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
              {patientName && `${patientName} · `}
              {now} · 25 mm/s · 10 mm/mV
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* HR badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}30`,
              color,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            {heartRate} bpm
          </div>

          {/* Risk chip */}
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}25`,
              color,
            }}
          >
            {riskClass === 'Critical' ? 'Critique' : riskClass === 'At Risk' ? 'À risque' : 'Normal'}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
          >
            {expanded
              ? <ChevronUp   className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="p-3 space-y-1.5">

          {/* Legend row */}
          <div
            className="flex items-center gap-4 px-3 py-2 rounded-lg text-[10px]"
            style={{ background: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)' }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2.5 border-b" style={{ borderColor: isDark ? 'rgba(255,60,60,0.35)' : 'rgba(215,80,80,0.50)', borderBottomStyle: 'solid' }} />
              <span style={{ color: 'var(--cd-t5)' }}>Grille ECG (papier)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,80,0.28)' }} />
              <span style={{ color: 'var(--cd-t5)' }}>Pulse d'étalonnage 1 mV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5" style={{ background: color }} />
              <span style={{ color: 'var(--cd-t5)' }}>Signal ECG — {riskClass}</span>
            </div>
            <span className="ml-auto" style={{ color: 'var(--cd-t5)' }}>
              Vitesse : 25 mm/s · Amplitude : 10 mm/mV
            </span>
          </div>

          {/* 4 × 3 lead grid */}
          <div className="space-y-1">
            {LAYOUT.map((row, ri) => (
              <div key={ri} className="grid grid-cols-4 gap-1">
                {row.map((lead) => (
                  <div
                    key={lead}
                    className="rounded overflow-hidden"
                    style={{ border: '1px solid var(--cd-bd)' }}
                  >
                    <LeadCanvas
                      lead={lead}
                      heartRate={heartRate}
                      riskClass={riskClass}
                      isDark={isDark}
                      color={color}
                      cW={280}
                      cH={90}
                      beats={3}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Rhythm strip — Lead II, ~10 s */}
          <div
            className="rounded overflow-hidden"
            style={{ border: `1px solid ${color}30` }}
          >
            <div
              className="flex items-center justify-between px-3 py-1.5"
              style={{
                borderBottom: `1px solid ${color}20`,
                background: isDark ? `${color}08` : `${color}06`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                  DII — Bande de rythme
                </span>
                <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                  10 secondes · {rhythmBeats} cycles cardiaques
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
                <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                  {riskClass === 'Normal' ? 'Rythme sinusal régulier'
                    : riskClass === 'At Risk' ? 'Irrégularités détectées'
                    : 'Anomalie critique détectée'}
                </span>
              </div>
            </div>
            <LeadCanvas
              lead="II"
              heartRate={heartRate}
              riskClass={riskClass}
              isDark={isDark}
              color={color}
              cW={1120}
              cH={88}
              beats={rhythmBeats}
              isRhythm
            />
          </div>

          {/* Measurements table */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--cd-bd)' }}
          >
            {[
              { label: 'FC',           value: `${heartRate} bpm`,     sub: 'Fréquence cardiaque' },
              { label: 'PR',           value: `${164 + (heartRate - 70)}  ms`, sub: 'Intervalle PR' },
              { label: 'QRS',          value: riskClass === 'Critical' ? '118 ms' : '92 ms', sub: 'Durée QRS' },
              { label: 'QTc',          value: riskClass === 'Critical' ? '482 ms' : '412 ms', sub: 'QT corrigé (Bazett)' },
            ].map(({ label, value, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center py-3 px-2"
                style={{ background: 'var(--cd-bg1)' }}
              >
                <span className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--cd-t5)' }}>{label}</span>
                <span className="font-bold text-sm" style={{ color: 'var(--cd-t1)' }}>{value}</span>
                <span className="text-[9px] mt-0.5 text-center" style={{ color: 'var(--cd-t5)' }}>{sub}</span>
              </div>
            ))}
          </div>

          {/* AI Interpretation banner */}
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              background: `${color}0d`,
              border: `1px solid ${color}28`,
            }}
          >
            <InterpIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-relaxed" style={{ color }}>
                Interprétation IA · {interpretation}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--cd-t5)' }}>
                Analyse automatique à titre indicatif uniquement · Confirmation médicale obligatoire avant toute décision thérapeutique
              </p>
            </div>
            <div
              className="flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{ background: `${color}20`, color }}
            >
              IA v2.4
            </div>
          </div>
        </div>
      )}
    </div>
  );
};