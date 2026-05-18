import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, AlertTriangle, Activity, TrendingUp, TrendingDown,
  RefreshCw, Loader2, Clock, ChevronRight, Zap, Stethoscope,
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendAreaChart } from '../components/TrendAreaChart';
import { useLang } from '../context/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────
interface PatientRow {
  id: string;
  first_name: string;
  last_name: string;
  cardiac_pathology: string | null;
  lastEcg: { heart_rate: number | null; status: string | null; timestamp: string } | null;
}

interface EcgEvent {
  id: string;
  patient_id: string;
  patientName: string;
  type: string;
  message: string;
  time: string;
  severity: 'critical' | 'warning';
}

interface TrendPoint { day: string; critical: number; atRisk: number; normal: number; }

// ── Helpers ────────────────────────────────────────────────────────
const getRisk = (s: string | null) => s === 'critical' ? 'Critical' : s === 'warning' ? 'At Risk' : 'Normal';
const toScore = (s: string | null) => s === 'critical' ? 85 : s === 'warning' ? 62 : 25;

// ── i18n ───────────────────────────────────────────────────────────
const T = {
  FR: {
    title: 'Tableau de bord',
    subtitle: (n: number) => `Surveillance en temps réel — ${n} patients actifs`,
    updated: 'Mis à jour:',
    totalPatients: 'Patients Totaux', underWatch: 'Sous surveillance active',
    activeAlerts: 'Alertes Actives', needAttention: 'Nécessitent une attention',
    criticalCases: 'Cas Critiques', scoreAbove: 'ECG statut critique',
    avgAI: 'Score Moyen IA', atRisk: (n: number) => `${n} patients à risque`,
    trendTitle: 'Évolution des scores IA — 7 jours', trendSubtitle: 'Moyenne journalière par classe',
    critical: 'Critique', atRiskLabel: 'À risque', normal: 'Normal',
    watchlistTitle: 'Surveillance critique', watchlistSubtitle: 'Patients nécessitant une attention immédiate',
    viewPatient: 'Voir', hr: 'FC', bp: 'PA', ef: 'FEVG',
    ecgTitle: 'Événements ECG récents', ecgSubtitle: "Dernières anomalies détectées",
    distTitle: 'Répartition des risques', distSubtitle: (n: number) => `${n} patients au total`,
    loading: 'Chargement...',
  },
  EN: {
    title: 'Dashboard',
    subtitle: (n: number) => `Real-time monitoring — ${n} active patients`,
    updated: 'Updated:',
    totalPatients: 'Total Patients', underWatch: 'Under active monitoring',
    activeAlerts: 'Active Alerts', needAttention: 'Require attention',
    criticalCases: 'Critical Cases', scoreAbove: 'ECG critical status',
    avgAI: 'Avg AI Score', atRisk: (n: number) => `${n} at-risk patients`,
    trendTitle: 'AI Risk Score Trend — 7 Days', trendSubtitle: 'Daily average by risk class',
    critical: 'Critical', atRiskLabel: 'At Risk', normal: 'Normal',
    watchlistTitle: 'Critical Watchlist', watchlistSubtitle: 'Patients requiring immediate attention',
    viewPatient: 'View', hr: 'HR', bp: 'BP', ef: 'EF',
    ecgTitle: 'Recent ECG Events', ecgSubtitle: 'Latest anomalies detected',
    distTitle: 'Risk Distribution', distSubtitle: (n: number) => `${n} patients total`,
    loading: 'Loading...',
  },
};

// ── StatCard ───────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; color: string; trend?: string; trendUp?: boolean;
}> = ({ title, value, subtitle, icon, color, trend, trendUp }) => (
  <div className="rounded-xl p-5 flex items-start gap-4"
    style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}18` }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--cd-t4)' }}>{title}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--cd-t4)' }}>{subtitle}</p>
    </div>
    {trend && (
      <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${trendUp ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    )}
  </div>
);

// ── SeverityDot ────────────────────────────────────────────────────
const SeverityDot: React.FC<{ severity: string }> = ({ severity }) => (
  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
    style={{ backgroundColor: severity === 'critical' ? '#EF4444' : '#F59E0B' }} />
);

// ── Page ───────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = T[lang];

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [ecgEvents, setEcgEvents] = useState<EcgEvent[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ── CORRECTION : compteur des alertes d'urgence pending ──────────
  const [emergencyCount, setEmergencyCount] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Patients + last ECG
      const { data: pData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, cardiac_pathology')
        .order('created_at', { ascending: false });

      const enriched: PatientRow[] = await Promise.all(
        (pData ?? []).map(async (p) => {
          const { data: ecg } = await supabase
            .from('ecg_readings')
            .select('heart_rate, status, timestamp')
            .eq('patient_id', p.id)
            .order('timestamp', { ascending: false })
            .limit(1).maybeSingle();
          return { ...p, lastEcg: ecg ?? null };
        })
      );
      setPatients(enriched);

      // 2. Recent critical/warning ECG events (feed)
      const { data: evData } = await supabase
        .from('ecg_readings')
        .select(`id, status, heart_rate, timestamp, patient_id, patients(first_name, last_name)`)
        .in('status', ['critical', 'warning'])
        .order('timestamp', { ascending: false })
        .limit(8);

      const events: EcgEvent[] = (evData ?? [])
        .filter((e) => e.patients)
        .map((e) => {
          const p = e.patients as unknown as { first_name: string; last_name: string };
          const name = `${p.first_name} ${p.last_name}`;
          const hr = e.heart_rate ? `${e.heart_rate} bpm` : '—';
          return {
            id: e.id,
            patient_id: e.patient_id,
            patientName: name,
            type: e.status === 'critical'
              ? (lang === 'FR' ? 'ECG Critique' : 'Critical ECG')
              : (lang === 'FR' ? 'Avertissement ECG' : 'ECG Warning'),
            message: lang === 'FR'
              ? `Anomalie détectée — FC: ${hr}`
              : `Anomaly detected — HR: ${hr}`,
            time: new Date(e.timestamp).toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
            severity: e.status as 'critical' | 'warning',
          };
        });
      setEcgEvents(events);

      // 3. 7-day trend: group ECG by day + status
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data: tData } = await supabase
        .from('ecg_readings')
        .select('status, timestamp')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true });

      const dayLabels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { weekday: 'short' });
      });

      const trend: TrendPoint[] = dayLabels.map((day, i) => {
        const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - (6 - i)); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
        const dayRows = (tData ?? []).filter((r) => {
          const t = new Date(r.timestamp);
          return t >= dayStart && t <= dayEnd;
        });
        const critRows = dayRows.filter((r) => r.status === 'critical');
        const warningRows = dayRows.filter((r) => r.status === 'warning');
        const normalRows = dayRows.filter((r) => r.status !== 'critical' && r.status !== 'warning');
        return {
          day,
          critical: critRows.length ? Math.round(critRows.reduce((s, r) => s + toScore(r.status), 0) / critRows.length) : 0,
          atRisk: warningRows.length ? Math.round(warningRows.reduce((s, r) => s + toScore(r.status), 0) / warningRows.length) : 0,
          normal: normalRows.length ? Math.round(normalRows.reduce((s, r) => s + toScore(r.status), 0) / normalRows.length) : 0,
        };
      });
      setTrendData(trend);

      // ── CORRECTION : fetch emergency_alerts pending ───────────────
      const { count: emCount } = await supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setEmergencyCount(emCount ?? 0);
      // ─────────────────────────────────────────────────────────────

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Derived stats ──────────────────────────────────────────────
  const criticalPts = patients.filter((p) => getRisk(p.lastEcg?.status ?? null) === 'Critical');
  const criticalCount = criticalPts.length;
  const atRiskCount = patients.filter((p) => getRisk(p.lastEcg?.status ?? null) === 'At Risk').length;
  const normalCount = patients.filter((p) => getRisk(p.lastEcg?.status ?? null) === 'Normal').length;

  // ── CORRECTION : activeAlerts = ECG critiques + urgences pending ─
  const activeAlerts = criticalCount + emergencyCount;
  // ────────────────────────────────────────────────────────────────

  const avgScore = patients.length
    ? Math.round(patients.reduce((s, p) => s + toScore(p.lastEcg?.status ?? null), 0) / patients.length)
    : 0;

  const radialData = [
    { name: tr.critical, value: criticalCount || 0, fill: '#EF4444' },
    { name: tr.atRiskLabel, value: atRiskCount || 0, fill: '#F59E0B' },
    { name: tr.normal, value: normalCount || 0, fill: '#10B981' },
  ];
  const pieTotal = patients.length || 1;

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--cd-t1)' }}>{tr.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.subtitle(patients.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs hidden sm:block" style={{ color: 'var(--cd-t5)' }}>
            {tr.updated}{' '}
            {lastUpdate.toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={fetchAll} className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0EA5E9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={tr.totalPatients} value={loading ? '—' : patients.length}
          subtitle={tr.underWatch} icon={<Users className="w-5 h-5" />} color="#0EA5E9" />
        <StatCard title={tr.activeAlerts} value={loading ? '—' : activeAlerts}
          subtitle={tr.needAttention} icon={<AlertTriangle className="w-5 h-5" />} color="#EF4444"
          trend={activeAlerts > 0 ? `${activeAlerts}` : undefined} trendUp={false} />
        <StatCard title={tr.criticalCases} value={loading ? '—' : criticalCount}
          subtitle={tr.scoreAbove} icon={<Activity className="w-5 h-5" />} color="#F59E0B" />
        <StatCard title={tr.avgAI} value={loading ? '—' : `${avgScore}/100`}
          subtitle={tr.atRisk(atRiskCount)} icon={<TrendingUp className="w-5 h-5" />} color="#10B981" />
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>{tr.trendTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.trendSubtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cd-t4)' }}>
            {[{ c: '#EF4444', l: tr.critical }, { c: '#F59E0B', l: tr.atRiskLabel }, { c: '#10B981', l: tr.normal }].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />{l}
              </div>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2" style={{ color: 'var(--cd-t4)' }}>
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">{tr.loading}</span>
          </div>
        ) : (
          <TrendAreaChart data={trendData} labels={{ critical: tr.critical, atRisk: tr.atRiskLabel, normal: tr.normal }} />
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Critical Watchlist */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--cd-t1)' }}>
            <span className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
            {tr.watchlistTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--cd-t4)' }}>{tr.watchlistSubtitle}</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--cd-t4)' }} /></div>
          ) : criticalPts.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--cd-t4)' }}>
              {lang === 'FR' ? 'Aucun patient critique' : 'No critical patients'}
            </p>
          ) : (
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 400 }}>
              {criticalPts.map((p) => {
                const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
                const hr = p.lastEcg?.heart_rate;
                const score = toScore(p.lastEcg?.status ?? null);
                return (
                  <div key={p.id} className="rounded-xl p-3 cursor-pointer transition-all"
                    style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid rgba(239,68,68,0.2)' }}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EF4444] to-[#dc2626] flex items-center justify-center text-white text-[10px] font-bold">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--cd-t1)' }}>{p.first_name} {p.last_name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--cd-t4)' }}>{p.cardiac_pathology ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-sm font-bold text-[#EF4444]">{score}</span>
                        <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>/100</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg p-1.5 text-center" style={{ backgroundColor: '#EF444410' }}>
                        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--cd-t5)' }}>{tr.hr}</p>
                        <p className="text-xs font-bold text-[#EF4444]">{hr ? `${hr}bpm` : '—'}</p>
                      </div>
                      <div className="flex-1 rounded-lg p-1.5 text-center" style={{ backgroundColor: '#F59E0B10' }}>
                        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--cd-t5)' }}>ECG</p>
                        <p className="text-xs font-bold text-[#F59E0B]">CRIT</p>
                      </div>
                      <button
                        className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] transition-all"
                        style={{ backgroundColor: 'rgba(14,165,233,0.08)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.2)' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p.id}`); }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.08)'; }}>
                        {tr.viewPatient}<ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ECG Events Feed */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--cd-t1)' }}>
            <Zap className="w-4 h-4 text-[#F59E0B]" />{tr.ecgTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--cd-t4)' }}>{tr.ecgSubtitle}</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--cd-t4)' }} /></div>
          ) : ecgEvents.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--cd-t4)' }}>
              {lang === 'FR' ? 'Aucun événement récent' : 'No recent events'}
            </p>
          ) : (
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 380 }}>
              {ecgEvents.map((ev) => (
                <div key={ev.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd2)' }}
                  onClick={() => navigate(`/patients/${ev.patient_id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cd-bd)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cd-bd2)'; }}>
                  <SeverityDot severity={ev.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: ev.severity === 'critical' ? '#EF4444' : '#F59E0B' }}>
                        {ev.type}
                      </span>
                      <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--cd-t5)' }}>
                        <Clock className="w-2.5 h-2.5" />{ev.time}
                      </span>
                    </div>
                    <p className="text-xs leading-snug" style={{ color: 'var(--cd-t3)' }}>{ev.message}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--cd-t5)' }}>{ev.patientName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--cd-t1)' }}>
            <Stethoscope className="w-4 h-4 text-[#0EA5E9]" />{tr.distTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--cd-t4)' }}>{tr.distSubtitle(patients.length)}</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--cd-t4)' }} /></div>
          ) : (
            <div className="flex flex-col items-center gap-5 flex-1 justify-center">
              <PieChart width={160} height={160}>
                <Pie data={radialData} cx={75} cy={75} innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                  {radialData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
              </PieChart>
              <div className="w-full space-y-3">
                {radialData.map(({ name, value, fill }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill }} />
                        <span className="text-xs" style={{ color: 'var(--cd-t3)' }}>{name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: fill }}>{value}</span>
                        <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                          ({Math.round((value / pieTotal) * 100)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cd-bd)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round((value / pieTotal) * 100)}%`, backgroundColor: fill }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};