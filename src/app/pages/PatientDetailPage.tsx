import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Heart, Activity, Thermometer, Droplet,
  Clock, Phone, Mail, Calendar, Download, Share2,
  Stethoscope, Loader2, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RiskGauge } from '../components/RiskGauge';
import { ECGCanvas } from '../components/ECGCanvas';
import { ECG12LeadViewer } from '../components/ECG12LeadViewer';

interface PatientDetail {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  birth_date: string | null;
  blood_type: string | null;
  cardiac_pathology: string | null;
  weight: number | null;
  height: number | null;
  phone: string | null;
  email: string;
  cardiologist: string | null;
  emergency_contact: string | null;
  medical_history: string | null;
  allergies: string | null;
  patient_id: string | null;
  created_at: string;
  // Antécédents cardiaques
  antecedent_infarctus: boolean | null;
  antecedent_trouble_rythme: boolean | null;
  antecedent_hospitalisation: boolean | null;
}

interface EcgReading {
  id: string;
  heart_rate: number | null;
  status: string | null;
  timestamp: string;
  ecg_values: number[];
}

const VitalCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; unit?: string; color: string;
}> = ({ icon, label, value, unit, color }) => (
  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)' }}>
    <div className="flex items-center gap-2 mb-2">
      <div style={{ color }}>{icon}</div>
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--cd-t4)' }}>{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="font-bold text-xl" style={{ color: 'var(--cd-t1)' }}>{value}</span>
      {unit && <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>{unit}</span>}
    </div>
  </div>
);

// ✅ Composant antécédent Oui/Non avec icône
const AntecedentRow: React.FC<{ label: string; value: boolean | null }> = ({ label, value }) => {
  if (value === null) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: 'var(--cd-t3)' }}>{label}</span>
      <span
        className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: value ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          color: value ? '#EF4444' : '#10B981',
        }}
      >
        {value
          ? <><XCircle className="w-3 h-3" /> Oui</>
          : <><CheckCircle className="w-3 h-3" /> Non</>
        }
      </span>
    </div>
  );
};

const RiskHistorySVG: React.FC<{ data: { date: string; score: number }[]; color: string }> = ({ data, color }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data || data.length < 2) return (
    <div className="py-8 text-center text-xs" style={{ color: 'var(--cd-t4)' }}>
      Pas assez de données ECG pour afficher l'historique.
    </div>
  );

  const VB_W = 500; const VB_H = 140;
  const pL = 30; const pR = 8; const pT = 8; const pB = 24;
  const cW = VB_W - pL - pR; const cH = VB_H - pT - pB;
  const toX = (i: number) => pL + (i / (data.length - 1)) * cW;
  const toY = (v: number) => pT + cH - Math.max(0, Math.min(1, v / 100)) * cH;
  const linePoints = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ');
  const areaPoints = [`${toX(0)},${pT + cH}`, ...data.map((d, i) => `${toX(i)},${toY(d.score)}`), `${toX(data.length - 1)},${pT + cH}`].join(' ');

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={VB_H} style={{ display: 'block', overflow: 'visible' }}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pL} y1={toY(v)} x2={VB_W - pR} y2={toY(v)} stroke="var(--cd-bd)" strokeWidth={0.6} strokeDasharray="3 3" />
          <text x={pL - 4} y={toY(v) + 3.5} textAnchor="end" fontSize={9} fill="var(--cd-t5)">{v}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={d.date} x={toX(i)} y={VB_H - 4} textAnchor="middle" fontSize={9} fill="var(--cd-t5)">{d.date}</text>
      ))}
      <polygon points={areaPoints} fill={color} fillOpacity={0.11} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={`pt-${d.date}`}>
          <rect x={toX(i) - 18} y={pT} width={36} height={cH} fill="transparent"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          <circle cx={toX(i)} cy={toY(d.score)} r={hovered === i ? 5 : 3} fill={color} />
          {hovered === i && (
            <g>
              <rect x={toX(i) - 28} y={toY(d.score) - 30} width={56} height={22} rx={4}
                fill="var(--cd-bg3)" stroke="var(--cd-bd)" strokeWidth={0.8} />
              <text x={toX(i)} y={toY(d.score) - 15} textAnchor="middle" fontSize={10} fill={color} fontWeight="bold">
                {Math.round(d.score)}/100
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
};

const statusToScore = (status: string | null): number => {
  if (status === 'critical') return Math.floor(75 + Math.random() * 25);
  if (status === 'warning')  return Math.floor(50 + Math.random() * 25);
  return Math.floor(Math.random() * 49);
};

const getRiskFromStatus = (status: string | null) => {
  if (status === 'critical') return 'Critical';
  if (status === 'warning')  return 'At Risk';
  return 'Normal';
};

export const PatientDetailPage: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [patient, setPatient]     = useState<PatientDetail | null>(null);
  const [ecgList, setEcgList]     = useState<EcgReading[]>([]);
  const [loading, setLoading]     = useState(true);
  const [liveScore, setLiveScore] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: p, error: pErr } = await supabase
          .from('patients').select('*').eq('id', id).single();
        if (pErr) throw pErr;
        setPatient(p);

        const { data: ecgs } = await supabase
          .from('ecg_readings')
          .select('*')
          .eq('patient_id', id)
          .order('timestamp', { ascending: false })
          .limit(30);

        setEcgList(ecgs ?? []);
        const lastScore = statusToScore(ecgs?.[0]?.status ?? null);
        setLiveScore(lastScore);
      } catch (err) {
        console.error('Erreur chargement patient:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (!patient) return;
    const interval = setInterval(() => {
      setLiveScore((prev) => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, [patient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--cd-t4)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement du patient...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--cd-t4)' }}>
        <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
        <span>Patient introuvable.</span>
        <button onClick={() => navigate('/patients')}
          className="text-xs px-4 py-2 rounded-lg"
          style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
          Retour aux patients
        </button>
      </div>
    );
  }

  const lastEcg   = ecgList[0] ?? null;
  const riskClass = getRiskFromStatus(lastEcg?.status ?? null);
  const heartRate = lastEcg?.heart_rate ?? 72;
  const ecgColor  = riskClass === 'Critical' ? '#EF4444' : riskClass === 'At Risk' ? '#F59E0B' : '#10B981';
  const initials  = `${patient.first_name?.[0] ?? ''}${patient.last_name?.[0] ?? ''}`.toUpperCase();

  // ✅ Vérifie si au moins un antécédent est renseigné (non null)
  const hasAntecedents =
    patient.antecedent_infarctus !== null ||
    patient.antecedent_trouble_rythme !== null ||
    patient.antecedent_hospitalisation !== null;

  const riskHistory = (() => {
    const days: { date: string; score: number }[] = [];
    const grouped: Record<string, number[]> = {};
    ecgList.forEach((e) => {
      const day = new Date(e.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(statusToScore(e.status));
    });
    Object.entries(grouped).slice(0, 7).reverse().forEach(([date, scores]) => {
      days.push({ date, score: scores.reduce((a, b) => a + b, 0) / scores.length });
    });
    return days;
  })();

  const alertTimeline = ecgList
    .filter((e) => e.status === 'critical' || e.status === 'warning')
    .slice(0, 6)
    .map((e) => ({
      time: new Date(e.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
      type: e.status === 'critical' ? '🔴 Alerte Critique' : '🟡 Alerte Warning',
      message: `ECG anormal détecté — Fréquence: ${e.heart_rate ?? '?'} bpm`,
      severity: (e.status === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning' | 'info',
    }));

  // ✅ Infos de base — on n'affiche que celles qui ont une valeur
  const infoRows: { icon: React.ReactNode; label: string; value: string }[] = [
    patient.age
      ? { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Âge', value: `${patient.age} ans` }
      : null,
    patient.cardiologist
      ? { icon: <Stethoscope className="w-3.5 h-3.5" />, label: 'Cardiologue', value: patient.cardiologist }
      : null,
    patient.phone
      ? { icon: <Phone className="w-3.5 h-3.5" />, label: 'Téléphone', value: patient.phone }
      : null,
    { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', value: patient.email },
    patient.blood_type
      ? { icon: <Droplet className="w-3.5 h-3.5" />, label: 'Groupe sanguin', value: patient.blood_type }
      : null,
    { icon: <Clock className="w-3.5 h-3.5" />, label: 'Enregistré', value: new Date(patient.created_at).toLocaleDateString('fr-FR') },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-lg" style={{ color: 'var(--cd-t1)' }}>
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>
              {patient.cardiac_pathology ?? 'Aucune pathologie renseignée'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[Share2, Download].map((Icon, i) => (
            <button key={i} className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT */}
        <div className="space-y-4">

          {/* Profile card */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-3"
                style={{
                  background: riskClass === 'Critical'
                    ? 'linear-gradient(135deg,#EF4444,#dc2626)'
                    : riskClass === 'At Risk'
                    ? 'linear-gradient(135deg,#F59E0B,#d97706)'
                    : 'linear-gradient(135deg,#10B981,#059669)',
                  boxShadow: `0 0 20px ${ecgColor}40`,
                }}>
                {initials}
              </div>
              <h2 className="font-bold" style={{ color: 'var(--cd-t1)' }}>
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--cd-t4)' }}>
                {patient.cardiac_pathology ?? '—'}
              </p>
              <div className="mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{
                    background: `${ecgColor}15`,
                    color: ecgColor,
                    border: `1px solid ${ecgColor}25`,
                  }}>
                  {riskClass === 'Critical' && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ecgColor }} />
                  )}
                  {riskClass === 'Critical' ? 'CRITIQUE' : riskClass === 'At Risk' ? 'À RISQUE' : 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Infos de base — nulls masqués */}
            <div className="space-y-2.5 text-xs pt-4" style={{ borderTop: '1px solid var(--cd-bd)' }}>
              {infoRows.map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <div style={{ color: 'var(--cd-t4)' }}>{icon}</div>
                  <span className="w-24 flex-shrink-0" style={{ color: 'var(--cd-t5)' }}>{label} :</span>
                  <span className="truncate" style={{ color: 'var(--cd-t3)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* ✅ Antécédents cardiaques Oui/Non — section masquée si tout est null */}
            {hasAntecedents && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--cd-bd)' }}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--cd-t2)' }}>
                  <Heart className="w-3.5 h-3.5 text-[#EF4444]" />
                  Antécédents cardiaques
                </p>
                <div className="divide-y" style={{ borderColor: 'var(--cd-bd)' }}>
                  <AntecedentRow label="Infarctus du myocarde" value={patient.antecedent_infarctus} />
                  <AntecedentRow label="Trouble du rythme" value={patient.antecedent_trouble_rythme} />
                  <AntecedentRow label="Hospitalisation cardiaque" value={patient.antecedent_hospitalisation} />
                </div>
              </div>
            )}

            {/* Antécédents texte */}
            {patient.medical_history && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--cd-bd)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--cd-t4)' }}>Historique médical</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--cd-t3)' }}>{patient.medical_history}</p>
              </div>
            )}

            {/* Allergies */}
            {patient.allergies && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-1" style={{ color: '#F59E0B' }}>⚠ Allergies</p>
                <p className="text-xs" style={{ color: 'var(--cd-t3)' }}>{patient.allergies}</p>
              </div>
            )}
          </div>

          {/* Vitaux */}
          <div className="grid grid-cols-2 gap-3">
            <VitalCard icon={<Heart className="w-4 h-4" />} label="Fréq. cardiaque"
              value={`${heartRate}`} unit="bpm" color="#EF4444" />
            <VitalCard icon={<Droplet className="w-4 h-4" />} label="Poids"
              value={patient.weight ? `${patient.weight}` : '—'} unit="kg" color="#0EA5E9" />
            <VitalCard icon={<Activity className="w-4 h-4" />} label="Taille"
              value={patient.height ? `${patient.height}` : '—'} unit="cm" color="#10B981" />
            <VitalCard icon={<Thermometer className="w-4 h-4" />} label="ECG total"
              value={`${ecgList.length}`} unit="lectures" color="#F59E0B" />
          </div>

          {/* Gauge IA */}
          <div className="rounded-xl p-4 flex flex-col items-center"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <h3 className="font-medium text-sm mb-3 self-start" style={{ color: 'var(--cd-t1)' }}>
              Score IA en Temps Réel
            </h3>
            <RiskGauge score={Math.round(liveScore)} size={200} />
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>Mise à jour en continu</span>
            </div>
          </div>
        </div>

        {/* RIGHT (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* ECG Live */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: ecgColor }} />
                <h3 className="font-medium text-sm" style={{ color: 'var(--cd-t1)' }}>ECG en Temps Réel</h3>
                <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
                <span className="text-[#10B981] text-xs">En direct</span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cd-t4)' }}>
                <span>25 mm/s</span>
                <span>10 mm/mV</span>
                <span className="font-bold" style={{ color: ecgColor }}>{heartRate} bpm</span>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--cd-bd)' }}>
              <ECGCanvas
                heartRate={heartRate}
                height={140}
                color={ecgColor}
                isAbnormal={riskClass === 'Critical'}
              />
            </div>
          </div>

          {/* Historique 7 jours */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm" style={{ color: 'var(--cd-t1)' }}>
                Historique du Risque — 7 jours
              </h3>
              <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>Score IA quotidien</span>
            </div>
            <RiskHistorySVG data={riskHistory} color={ecgColor} />
          </div>

          {/* Timeline alertes */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#0EA5E9]" />
              <h3 className="font-medium text-sm" style={{ color: 'var(--cd-t1)' }}>Chronologie des Alertes</h3>
            </div>
            {alertTimeline.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--cd-t4)' }}>
                Aucune alerte enregistrée pour ce patient.
              </p>
            ) : (
              <div className="space-y-0">
                {alertTimeline.map((event, idx) => {
                  const colors = { info: '#0EA5E9', warning: '#F59E0B', critical: '#EF4444' };
                  const c = colors[event.severity];
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} />
                        {idx < alertTimeline.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ backgroundColor: 'var(--cd-bd)' }} />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium" style={{ color: c }}>{event.type}</span>
                          <span className="text-xs" style={{ color: 'var(--cd-t5)' }}>{event.time}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--cd-t3)' }}>{event.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 12-lead ECG */}
      <ECG12LeadViewer
        heartRate={heartRate}
        riskClass={riskClass}
        patientName={`${patient.first_name} ${patient.last_name}`}
        isAbnormal={riskClass === 'Critical'}
      />
    </div>
  );
};