import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Users, Eye, Activity, Heart, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  name: string | null;
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
  // ECG dernière lecture
  lastEcg?: { heart_rate: number | null; status: string | null; timestamp: string } | null;
}

const t = {
  FR: {
    title: 'Patients',
    subtitle: (n: number) => `${n} patients enregistrés`,
    search: 'Rechercher un patient...',
    all: 'Tous', critical: 'Critiques', atRisk: 'À risque', normal: 'Normal',
    statCritical: 'Critiques', statAtRisk: 'À risque', statNormal: 'Normal',
    badgeCritical: 'Critique', badgeAtRisk: 'À risque', badgeNormal: 'Normal',
    years: 'ans', male: 'H', female: 'F',
    lastEcg: 'Dernier ECG',
    view: 'Voir',
    notFound: 'Aucun patient trouvé.',
    loading: 'Chargement des patients...',
    noEcg: 'Aucun ECG',
    heartRate: 'bpm',
    bloodType: 'Groupe',
    pathology: 'Pathologie',
  },
  EN: {
    title: 'Patients',
    subtitle: (n: number) => `${n} registered patients`,
    search: 'Search a patient...',
    all: 'All', critical: 'Critical', atRisk: 'At Risk', normal: 'Normal',
    statCritical: 'Critical', statAtRisk: 'At Risk', statNormal: 'Normal',
    badgeCritical: 'Critical', badgeAtRisk: 'At Risk', badgeNormal: 'Normal',
    years: 'y/o', male: 'M', female: 'F',
    lastEcg: 'Last ECG',
    view: 'View',
    notFound: 'No patients found.',
    loading: 'Loading patients...',
    noEcg: 'No ECG',
    heartRate: 'bpm',
    bloodType: 'Blood type',
    pathology: 'Pathology',
  },
};

// Dériver le niveau de risque depuis le statut ECG
const getRiskFromEcg = (status: string | null | undefined): 'Critical' | 'At Risk' | 'Normal' => {
  if (status === 'critical') return 'Critical';
  if (status === 'warning')  return 'At Risk';
  return 'Normal';
};

const getRiskColor = (risk: string) => {
  if (risk === 'Critical') return '#EF4444';
  if (risk === 'At Risk')  return '#F59E0B';
  return '#10B981';
};

const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang }  = useLang();
  const tr        = t[lang];
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'All' | 'Critical' | 'At Risk' | 'Normal'>('All');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        // 1. Récupérer tous les patients
        const { data: patientsData, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Pour chaque patient, récupérer le dernier ECG
        const enriched = await Promise.all(
          (patientsData ?? []).map(async (p) => {
            const { data: ecgData } = await supabase
              .from('ecg_readings')
              .select('heart_rate, status, timestamp')
              .eq('patient_id', p.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle();

            return { ...p, lastEcg: ecgData ?? null };
          })
        );

        setPatients(enriched);
      } catch (err) {
        console.error('Erreur chargement patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const fullName   = `${p.first_name} ${p.last_name}`.toLowerCase();
    const pathology  = (p.cardiac_pathology ?? '').toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase()) || pathology.includes(search.toLowerCase());
    const risk        = getRiskFromEcg(p.lastEcg?.status);
    const matchFilter = filter === 'All' || risk === filter;
    return matchSearch && matchFilter;
  });

  const criticalCount = patients.filter((p) => getRiskFromEcg(p.lastEcg?.status) === 'Critical').length;
  const atRiskCount   = patients.filter((p) => getRiskFromEcg(p.lastEcg?.status) === 'At Risk').length;
  const normalCount   = patients.filter((p) => getRiskFromEcg(p.lastEcg?.status) === 'Normal').length;

  const formatEcgTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3" style={{ color: 'var(--cd-t4)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{tr.loading}</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--cd-t1)' }}>{tr.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.subtitle(patients.length)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 max-w-xs"
          style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--cd-t5)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tr.search} className="bg-transparent text-sm outline-none w-full"
            style={{ color: 'var(--cd-t3)' }} />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4" style={{ color: 'var(--cd-t4)' }} />
          {([
            { key: 'All',      label: tr.all },
            { key: 'Critical', label: tr.critical },
            { key: 'At Risk',  label: tr.atRisk },
            { key: 'Normal',   label: tr.normal },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filter === key
                ? { backgroundColor: '#0EA5E9', color: 'white' }
                : { backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
              onMouseEnter={(e) => { if (filter !== key) e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={(e) => { if (filter !== key) e.currentTarget.style.color = 'var(--cd-t4)'; }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tr.statCritical, count: criticalCount, color: '#EF4444' },
          { label: tr.statAtRisk,   count: atRiskCount,   color: '#F59E0B' },
          { label: tr.statNormal,   count: normalCount,   color: '#10B981' },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--cd-bg3)', border: `1px solid ${color}25` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}18` }}>
              <Users className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color }}>{count}</p>
              <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((patient) => {
          const risk      = getRiskFromEcg(patient.lastEcg?.status);
          const riskColor = getRiskColor(risk);
          const initials  = getInitials(patient.first_name, patient.last_name);

          return (
            <div key={patient.id}
              className="rounded-xl p-4 cursor-pointer transition-all"
              style={{ backgroundColor: 'var(--cd-bg3)', border: `1px solid var(--cd-bd)` }}
              onClick={() => navigate(`/patients/${patient.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${riskColor}40`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--cd-bd)';
                e.currentTarget.style.transform = 'none';
              }}>

              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      background: risk === 'Critical'
                        ? 'linear-gradient(135deg, #EF4444, #dc2626)'
                        : risk === 'At Risk'
                        ? 'linear-gradient(135deg, #F59E0B, #d97706)'
                        : 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: `0 0 16px ${riskColor}35`,
                    }}>
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>
                      {patient.age ? `${patient.age} ${tr.years}` : '—'}
                      {patient.blood_type ? ` · ${patient.blood_type}` : ''}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                  style={{ backgroundColor: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
                  {risk === 'Critical' && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: riskColor }} />
                  )}
                  {risk === 'Critical' ? tr.badgeCritical : risk === 'At Risk' ? tr.badgeAtRisk : tr.badgeNormal}
                </span>
              </div>

              {/* Pathologie */}
              <p className="text-xs mb-3 truncate" style={{ color: 'var(--cd-t3)' }}>
                {patient.cardiac_pathology ?? '—'}
              </p>

              {/* Dernier ECG */}
              <div className="flex items-center justify-between py-2 rounded-lg px-3 mb-3"
                style={{ backgroundColor: 'var(--cd-bg1)' }}>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-[#EF4444]" />
                  <span className="text-xs font-medium" style={{ color: 'var(--cd-t3)' }}>
                    {patient.lastEcg?.heart_rate ? `${patient.lastEcg.heart_rate} ${tr.heartRate}` : tr.noEcg}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[#0EA5E9]" />
                  <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>
                    {patient.lastEcg?.timestamp ? formatEcgTime(patient.lastEcg.timestamp) : '—'}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {patient.lastEcg ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
                      <span className="text-[10px]" style={{ color: 'var(--cd-t4)' }}>
                        {tr.lastEcg}: {formatEcgTime(patient.lastEcg.timestamp)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>{tr.noEcg}</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-[#0EA5E9] transition-all"
                  style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,165,233,0.16)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(14,165,233,0.08)'; }}>
                  <Eye className="w-3 h-3" />
                  {tr.view}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center" style={{ color: 'var(--cd-t4)' }}>{tr.notFound}</div>
      )}
    </div>
  );
};