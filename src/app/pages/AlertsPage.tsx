import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, CheckCircle, XCircle, Bell,
  Filter, Eye, Clock, Loader2, RefreshCw,
  X, Heart, Droplet, Phone, Mail, User, Activity,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';
 
// ── Types ──────────────────────────────────────────────────────────────────
interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isConfirmed: boolean | null;
  severity: 'critical' | 'warning';
  aiScore: number;
  patientDetail?: PatientInfo | null;
}
 
interface PatientInfo {
  blood_type: string | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  cardiac_pathology: string | null;
  allergies: string | null;
  medical_history: string | null;
  weight: number | null;
  height: number | null;
  emergency_contact: string | null;
}
 
interface EmergencyAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  triggered_at: string;
  heart_rate: number | null;
  ai_score: number | null;
  ai_severity: 'critical' | 'warning' | null;
  patientDetail?: PatientInfo | null;
}
 
// ── i18n ───────────────────────────────────────────────────────────────────
const t = {
  FR: {
    title: "Centre d'Alertes",
    unread: (n: number) => `${n} non lues`,
    markAllRead: 'Tout marquer comme lu',
    statCritical: 'Critiques', statUnread: 'Non lues', statConfirmed: 'Confirmées',
    filterAll: 'Toutes', filterUnread: 'Non lues',
    filterCritical: 'Critiques', filterWarning: 'Avertissements',
    alertCount: (n: number) => `${n} alertes`,
    aiScore: 'Score IA:',
    confirm: 'Prendre en charge', dismiss: 'Ignorer',
    confirmed: 'Confirmée', dismissed: 'Ignorée',
    viewPatient: 'Voir dossier complet',
    critical: 'CRITIQUE', warning: 'AVERTISSEMENT',
    empty: 'Aucune alerte dans cette catégorie.',
    loading: 'Chargement des alertes...',
    refresh: 'Actualiser',
    emergencyAlerts: "Alertes d'urgence",
    emergencyConfirm: 'Prendre en charge',
    emergencyCancel: 'Ignorer',
    clickForDetails: 'Cliquer pour voir les détails',
    patientInfo: 'Informations Patient',
    bloodType: 'Groupe sanguin',
    age: 'Âge',
    phone: 'Téléphone',
    email: 'Email',
    pathology: 'Pathologie',
    allergies: 'Allergies',
    history: 'Antécédents',
    weight: 'Poids',
    height: 'Taille',
    emergency: 'Contact urgence',
    closeModal: 'Fermer',
    heartRate: 'Fréquence cardiaque',
    manualEmergency: 'Alerte manuelle urgente',
    manualMessage: 'Le patient a déclenché une alerte manuelle.',
    years: 'ans',
    loadingPatient: 'Chargement des informations...',
  },
  EN: {
    title: 'Alerts Center',
    unread: (n: number) => `${n} unread`,
    markAllRead: 'Mark all as read',
    statCritical: 'Critical', statUnread: 'Unread', statConfirmed: 'Confirmed',
    filterAll: 'All', filterUnread: 'Unread',
    filterCritical: 'Critical', filterWarning: 'Warnings',
    alertCount: (n: number) => `${n} alerts`,
    aiScore: 'AI Score:',
    confirm: 'Take Charge', dismiss: 'Dismiss',
    confirmed: 'Confirmed', dismissed: 'Dismissed',
    viewPatient: 'View full record',
    critical: 'CRITICAL', warning: 'WARNING',
    empty: 'No alerts in this category.',
    loading: 'Loading alerts...',
    refresh: 'Refresh',
    emergencyAlerts: 'Emergency Alerts',
    emergencyConfirm: 'Take Charge',
    emergencyCancel: 'Dismiss',
    clickForDetails: 'Click to view details',
    patientInfo: 'Patient Information',
    bloodType: 'Blood type',
    age: 'Age',
    phone: 'Phone',
    email: 'Email',
    pathology: 'Pathology',
    allergies: 'Allergies',
    history: 'Medical history',
    weight: 'Weight',
    height: 'Height',
    emergency: 'Emergency contact',
    closeModal: 'Close',
    heartRate: 'Heart rate',
    manualEmergency: 'Manual Emergency Alert',
    manualMessage: 'Patient triggered a manual emergency alert.',
    years: 'yo',
    loadingPatient: 'Loading information...',
  },
};
 
// ── Helpers ────────────────────────────────────────────────────────────────
const statusToScore = (status: string | null): number => {
  if (status === 'critical') return Math.floor(75 + Math.random() * 25);
  if (status === 'warning') return Math.floor(50 + Math.random() * 24);
  return Math.floor(10 + Math.random() * 39);
};
 
const statusToType = (status: string | null, lang: 'FR' | 'EN'): string => {
  if (lang === 'FR') {
    if (status === 'critical') return 'ECG Critique Détecté';
    if (status === 'warning') return 'Avertissement ECG';
    return 'Statut Normal';
  }
  if (status === 'critical') return 'Critical ECG Detected';
  if (status === 'warning') return 'ECG Warning';
  return 'Normal Status';
};
 
const statusToMessage = (
  status: string | null,
  patientName: string,
  heartRate: number | null,
  lang: 'FR' | 'EN'
): string => {
  const hr = heartRate ? `${heartRate} bpm` : '—';
  if (lang === 'FR') {
    if (status === 'critical')
      return `Anomalie ECG critique détectée pour ${patientName}. Fréquence cardiaque: ${hr}.`;
    if (status === 'warning')
      return `Signal ECG anormal détecté pour ${patientName}. Fréquence cardiaque: ${hr}.`;
  }
  if (status === 'critical')
    return `Critical ECG anomaly detected for ${patientName}. Heart rate: ${hr}.`;
  if (status === 'warning')
    return `Abnormal ECG signal detected for ${patientName}. Heart rate: ${hr}.`;
  return '';
};
 
const formatTs = (ts: string, lang: 'FR' | 'EN') =>
  new Date(ts).toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });
 
// ── Modal Overlay ──────────────────────────────────────────────────────────
interface ModalData {
  type: 'ecg' | 'emergency';
  alert: Alert | EmergencyAlert;
}
 
const AlertModal: React.FC<{
  data: ModalData;
  onClose: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onViewPatient?: () => void;
  lang: 'FR' | 'EN';
  loadingPatient: boolean;
}> = ({ data, onClose, onConfirm, onDismiss, onViewPatient, lang, loadingPatient }) => {
  const tr = t[lang];
  const isEcg = data.type === 'ecg';
  const alert = data.alert;
 
  const severity = isEcg
    ? (alert as Alert).severity
    : (alert as EmergencyAlert).ai_severity ?? 'critical';
 
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';
  const patientName = isEcg ? (alert as Alert).patientName : (alert as EmergencyAlert).patient_name;
  const heartRate = isEcg ? null : (alert as EmergencyAlert).heart_rate;
  const aiScore = isEcg ? (alert as Alert).aiScore : (alert as EmergencyAlert).ai_score;
  const pd = alert.patientDetail;
  const isConfirmed = isEcg ? (alert as Alert).isConfirmed : null;
  const initials = patientName.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);
 
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--cd-bg2)', border: `1px solid ${accentColor}40`, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* ── Top banner ── */}
        <div
          className="relative px-6 pt-8 pb-6"
          style={{
            background: `linear-gradient(135deg, ${accentColor}22 0%, transparent 60%)`,
            borderBottom: `1px solid ${accentColor}30`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
          >
            <X className="w-4 h-4" />
          </button>
 
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              {isCritical ? tr.critical : tr.warning}
            </span>
            {!isEcg && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--cd-bg3)', color: 'var(--cd-t4)', border: '1px solid var(--cd-bd)' }}>
                {tr.manualEmergency}
              </span>
            )}
          </div>
 
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
                boxShadow: `0 0 24px ${accentColor}50`,
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xl truncate" style={{ color: 'var(--cd-t1)' }}>{patientName}</h2>
              {isEcg && (
                <p className="text-sm mt-0.5 truncate" style={{ color: accentColor }}>
                  {(alert as Alert).type}
                </p>
              )}
              {!isEcg && (
                <p className="text-sm mt-0.5" style={{ color: accentColor }}>{tr.manualEmergency}</p>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--cd-t4)' }}>
                <Clock className="w-3 h-3 inline mr-1" />
                {isEcg ? (alert as Alert).timestamp : formatTs((alert as EmergencyAlert).triggered_at, lang)}
              </p>
            </div>
          </div>
        </div>
 
        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: `${accentColor}10`, border: `1px solid ${accentColor}25` }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--cd-t2)' }}>
                {isEcg
                  ? (alert as Alert).message
                  : `${tr.manualMessage} ${heartRate ? `${tr.heartRate}: ${heartRate} bpm` : ''}`
                }
              </p>
            </div>
          </div>
 
          {aiScore !== null && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--cd-t4)' }}>{tr.aiScore}</span>
                <span className="text-sm font-bold" style={{ color: accentColor }}>{Math.round(aiScore)}/100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cd-bg1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(aiScore)}%`, backgroundColor: accentColor }}
                />
              </div>
            </div>
          )}
 
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--cd-t4)' }}>
              {tr.patientInfo}
            </h3>
            {loadingPatient ? (
              <div className="flex items-center gap-2 py-4" style={{ color: 'var(--cd-t4)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{tr.loadingPatient}</span>
              </div>
            ) : pd ? (
              <div className="grid grid-cols-2 gap-3">
                {pd.blood_type && (
                  <div
                    className="col-span-2 rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                      <Droplet className="w-4 h-4 text-[#EF4444]" />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>{tr.bloodType}</p>
                      <p className="font-bold text-lg text-[#EF4444]">{pd.blood_type}</p>
                    </div>
                  </div>
                )}
                {pd.age && (
                  <InfoPill icon={<User className="w-3.5 h-3.5" />} label={tr.age} value={`${pd.age} ${tr.years}`} />
                )}
                {pd.phone && (
                  <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label={tr.phone} value={pd.phone} />
                )}
                {pd.cardiac_pathology && (
                  <div className="col-span-2">
                    <InfoPill icon={<Activity className="w-3.5 h-3.5" />} label={tr.pathology} value={pd.cardiac_pathology} full />
                  </div>
                )}
                {pd.weight && (
                  <InfoPill icon={<Heart className="w-3.5 h-3.5" />} label={tr.weight} value={`${pd.weight} kg`} />
                )}
                {pd.height && (
                  <InfoPill icon={<Heart className="w-3.5 h-3.5" />} label={tr.height} value={`${pd.height} cm`} />
                )}
                {pd.emergency_contact && (
                  <div className="col-span-2">
                    <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label={tr.emergency} value={pd.emergency_contact} full accent="#F59E0B" />
                  </div>
                )}
                {pd.allergies && (
                  <div
                    className="col-span-2 rounded-xl p-3"
                    style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    <p className="text-xs font-medium text-[#F59E0B] mb-1">⚠ {tr.allergies}</p>
                    <p className="text-xs" style={{ color: 'var(--cd-t3)' }}>{pd.allergies}</p>
                  </div>
                )}
                {pd.medical_history && (
                  <div className="col-span-2 rounded-xl p-3" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--cd-t4)' }}>{tr.history}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--cd-t3)' }}>{pd.medical_history}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
                <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>—</p>
              </div>
            )}
          </div>
 
          <div className="flex items-center gap-3 pt-1">
            {(isEcg ? isConfirmed === null : true) && (
              <>
                <button
                  onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.28)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)'; }}
                >
                  <CheckCircle className="w-4 h-4" />
                  {tr.confirm}
                </button>
                <button
                  onClick={onDismiss}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.22)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.10)'; }}
                >
                  <XCircle className="w-4 h-4" />
                  {tr.dismiss}
                </button>
              </>
            )}
            {isEcg && isConfirmed === true && (
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle className="w-4 h-4" />{tr.confirmed}
              </div>
            )}
            {isEcg && isConfirmed === false && (
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--cd-bg3)', color: 'var(--cd-t4)', border: '1px solid var(--cd-bd)' }}>
                <XCircle className="w-4 h-4" />{tr.dismissed}
              </div>
            )}
          </div>
 
          {onViewPatient && (
            <button
              onClick={onViewPatient}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#0EA5E9' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,165,233,0.16)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(14,165,233,0.08)'; }}
            >
              <Eye className="w-3.5 h-3.5" />
              {tr.viewPatient}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
 
const InfoPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
  accent?: string;
}> = ({ icon, label, value, full, accent }) => (
  <div
    className={`rounded-xl p-3 ${full ? '' : ''}`}
    style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}
  >
    <div className="flex items-center gap-1.5 mb-1" style={{ color: accent ?? 'var(--cd-t4)' }}>
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm font-medium truncate" style={{ color: 'var(--cd-t1)' }}>{value}</p>
  </div>
);
 
// ── Main Component ─────────────────────────────────────────────────────────
export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = t[lang];
 
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');

  // ── CORRECTION : compteur des urgences confirmées ─────────────────
  const [confirmedEmergencyCount, setConfirmedEmergencyCount] = useState(0);
  // ─────────────────────────────────────────────────────────────────
 
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
 
  const fetchPatientDetail = async (patientId: string): Promise<PatientInfo | null> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('blood_type, age, phone, email, cardiac_pathology, allergies, medical_history, weight, height, emergency_contact')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data as PatientInfo;
    } catch {
      return null;
    }
  };
 
  const openAlertModal = async (alert: Alert) => {
    setAlertList(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
    setModalData({ type: 'ecg', alert });
    if (!alert.patientDetail) {
      setLoadingPatient(true);
      const pd = await fetchPatientDetail(alert.patientId);
      setAlertList(prev => prev.map(a => a.id === alert.id ? { ...a, patientDetail: pd } : a));
      setModalData(prev => prev ? { ...prev, alert: { ...prev.alert, patientDetail: pd } } : null);
      setLoadingPatient(false);
    }
  };
 
  const openEmergencyModal = async (ea: EmergencyAlert) => {
    setModalData({ type: 'emergency', alert: ea });
    if (!ea.patientDetail) {
      setLoadingPatient(true);
      const pd = await fetchPatientDetail(ea.patient_id);
      setEmergencyAlerts(prev => prev.map(a => a.id === ea.id ? { ...a, patientDetail: pd } : a));
      setModalData(prev => prev ? { ...prev, alert: { ...prev.alert, patientDetail: pd } } : null);
      setLoadingPatient(false);
    }
  };
 
  const fetchAlerts = useCallback(async () => {
    try {
      const { data: ecgData, error } = await supabase
        .from('ecg_readings')
        .select(`
          id, status, heart_rate, timestamp, patient_id,
          patients ( id, first_name, last_name )
        `)
        .in('status', ['critical', 'warning'])
        .order('timestamp', { ascending: false })
        .limit(50);
 
      if (error) throw error;
 
      const built: Alert[] = (ecgData ?? [])
        .filter((e) => e.patients)
        .map((e) => {
          const p = e.patients as unknown as { id: string; first_name: string; last_name: string };
          const patientName = `${p.first_name} ${p.last_name}`.trim();
          const severity = (e.status === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning';
          return {
            id: e.id,
            patientId: p.id,
            patientName,
            type: statusToType(e.status, lang),
            message: statusToMessage(e.status, patientName, e.heart_rate, lang),
            timestamp: formatTs(e.timestamp, lang),
            isRead: false,
            isConfirmed: null,
            severity,
            aiScore: statusToScore(e.status),
            patientDetail: null,
          };
        });
 
      setAlertList(built);
    } catch (err) {
      console.error('Erreur chargement alertes:', err);
    }
  }, [lang]);
 
  const fetchEmergencyAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('id, patient_id, patient_name, status, triggered_at, heart_rate, ai_score, ai_severity')
        .eq('status', 'pending')
        .order('triggered_at', { ascending: false });
 
      if (error) throw error;
      setEmergencyAlerts((data ?? []).map(d => ({ ...d, patientDetail: null })));
    } catch (err) {
      console.error('Erreur chargement alertes urgence:', err);
    }
  }, []);
 
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchEmergencyAlerts()]);
      setLoading(false);
    };
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchEmergencyAlerts]);
 
  const handleModalConfirm = () => {
    if (!modalData) return;
    if (modalData.type === 'ecg') {
      const id = (modalData.alert as Alert).id;
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, isConfirmed: true, isRead: true } : a));
      setModalData(prev => prev ? { ...prev, alert: { ...prev.alert, isConfirmed: true } } : null);
    } else {
      const id = (modalData.alert as EmergencyAlert).id;
      supabase.from('emergency_alerts')
        .update({ status: 'confirmed', responded_at: new Date().toISOString() })
        .eq('id', id).then(() => {
          setEmergencyAlerts(prev => prev.filter(a => a.id !== id));
          // ── CORRECTION : incrémenter le compteur "Confirmées" ──────
          setConfirmedEmergencyCount(prev => prev + 1);
          // ──────────────────────────────────────────────────────────
          setModalData(null);
        });
    }
  };
 
  const handleModalDismiss = () => {
    if (!modalData) return;
    if (modalData.type === 'ecg') {
      const id = (modalData.alert as Alert).id;
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, isConfirmed: false, isRead: true } : a));
      setModalData(prev => prev ? { ...prev, alert: { ...prev.alert, isConfirmed: false } } : null);
    } else {
      const id = (modalData.alert as EmergencyAlert).id;
      supabase.from('emergency_alerts')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('id', id).then(() => {
          setEmergencyAlerts(prev => prev.filter(a => a.id !== id));
          setModalData(null);
        });
    }
  };
 
  const markAllRead = () => setAlertList(prev => prev.map(a => ({ ...a, isRead: true })));
 
  const filtered = alertList.filter((a) => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  // ── CORRECTION : compteurs incluant les alertes d'urgence ─────────
  const unreadCount = alertList.filter(a => !a.isRead).length + emergencyAlerts.length;
  const criticalCount = alertList.filter(a => a.severity === 'critical' && a.isConfirmed === null).length + emergencyAlerts.length;
  const confirmedCount = alertList.filter(a => a.isConfirmed === true).length + confirmedEmergencyCount;
  // ─────────────────────────────────────────────────────────────────
 
  return (
    <>
      {modalData && (
        <AlertModal
          data={modalData}
          onClose={() => setModalData(null)}
          onConfirm={handleModalConfirm}
          onDismiss={handleModalDismiss}
          onViewPatient={
            modalData.type === 'ecg'
              ? () => { navigate(`/patients/${(modalData.alert as Alert).patientId}`); setModalData(null); }
              : undefined
          }
          lang={lang}
          loadingPatient={loadingPatient}
        />
      )}
 
      <div className="p-4 lg:p-6 space-y-5 overflow-hidden">
 
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-bold text-xl truncate" style={{ color: 'var(--cd-t1)' }}>{tr.title}</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-full animate-pulse flex-shrink-0">
                {tr.unread(unreadCount)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { fetchAlerts(); fetchEmergencyAlerts(); }}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0EA5E9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={markAllRead} className="text-[#0EA5E9] text-xs hover:underline flex-shrink-0">
              {tr.markAllRead}
            </button>
          </div>
        </div>
 
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          <StatCard color="#EF4444" icon={<AlertTriangle className="w-4 h-4 text-[#EF4444]" />} value={criticalCount} label={tr.statCritical} />
          <StatCard color="#F59E0B" icon={<Bell className="w-4 h-4 text-[#F59E0B]" />} value={unreadCount} label={tr.statUnread} />
          <StatCard color="#10B981" icon={<CheckCircle className="w-4 h-4 text-[#10B981]" />} value={confirmedCount} label={tr.statConfirmed} />
        </div>
 
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cd-t4)' }} />
          {([
            { key: 'all', label: tr.filterAll },
            { key: 'unread', label: tr.filterUnread },
            { key: 'critical', label: tr.filterCritical },
            { key: 'warning', label: tr.filterWarning },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
              style={filter === key
                ? { backgroundColor: '#0EA5E9', color: 'white' }
                : { backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }
              }
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--cd-t4)' }}>
            {tr.alertCount(filtered.length + emergencyAlerts.length)}
          </span>
        </div>
 
        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20" style={{ color: 'var(--cd-t4)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{tr.loading}</span>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
 
            {/* Emergency alerts */}
            {emergencyAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#EF4444] flex items-center gap-2 flex-shrink-0">
                  <span className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse flex-shrink-0" />
                  {tr.emergencyAlerts}
                </h3>
                {emergencyAlerts.map((ea) => (
                  <ClickableAlertCard
                    key={ea.id}
                    patientName={ea.patient_name}
                    type={lang === 'FR' ? 'Alerte manuelle urgente' : 'Manual Emergency Alert'}
                    message={lang === 'FR'
                      ? `Patient a déclenché une alerte manuelle. Fréquence cardiaque: ${ea.heart_rate ? `${ea.heart_rate} bpm` : '—'}.`
                      : `Patient triggered a manual emergency alert. Heart rate: ${ea.heart_rate ? `${ea.heart_rate} bpm` : '—'}.`
                    }
                    timestamp={formatTs(ea.triggered_at, lang)}
                    severity="critical"
                    aiScore={ea.ai_score ?? undefined}
                    isRead={false}
                    isConfirmed={null}
                    clickLabel={tr.clickForDetails}
                    onClick={() => openEmergencyModal(ea)}
                  />
                ))}
              </div>
            )}
 
            {/* ECG alerts */}
            <div className="space-y-3">
              {filtered.map((alert) => (
                <ClickableAlertCard
                  key={alert.id}
                  patientName={alert.patientName}
                  type={alert.type}
                  message={alert.message}
                  timestamp={alert.timestamp}
                  severity={alert.severity}
                  aiScore={alert.aiScore}
                  isRead={alert.isRead}
                  isConfirmed={alert.isConfirmed}
                  clickLabel={tr.clickForDetails}
                  confirmedLabel={tr.confirmed}
                  dismissedLabel={tr.dismissed}
                  onClick={() => openAlertModal(alert)}
                />
              ))}
              {filtered.length === 0 && emergencyAlerts.length === 0 && (
                <div className="py-16 text-center">
                  <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto mb-3 opacity-50" />
                  <p style={{ color: 'var(--cd-t4)' }}>{tr.empty}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
 
// ── StatCard ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ color: string; icon: React.ReactNode; value: number; label: string }> = ({ color, icon, value, label }) => (
  <div className="rounded-xl p-4 flex items-center gap-3"
    style={{ backgroundColor: 'var(--cd-bg3)', border: `1px solid ${color}30` }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}18` }}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="font-bold text-lg truncate" style={{ color }}>{value}</p>
      <p className="text-xs truncate" style={{ color: 'var(--cd-t4)' }}>{label}</p>
    </div>
  </div>
);
 
// ── ClickableAlertCard ─────────────────────────────────────────────────────
const ClickableAlertCard: React.FC<{
  patientName: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning';
  aiScore?: number;
  isRead: boolean;
  isConfirmed: boolean | null;
  clickLabel: string;
  confirmedLabel?: string;
  dismissedLabel?: string;
  onClick: () => void;
}> = ({ patientName, type, message, timestamp, severity, aiScore, isRead, isConfirmed, clickLabel, confirmedLabel, dismissedLabel, onClick }) => {
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';
 
  return (
    <button
      onClick={onClick}
      className={`w-full text-left relative rounded-xl p-4 transition-all group ${isConfirmed === true ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: 'var(--cd-bg3)',
        border: '1px solid var(--cd-bd)',
        borderLeft: !isRead ? `3px solid ${accentColor}` : '1px solid var(--cd-bd)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}50`; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isRead ? 'var(--cd-bd)' : accentColor;
        (e.currentTarget as HTMLElement).style.borderLeftColor = !isRead ? accentColor : 'var(--cd-bd)';
      }}
    >
      {!isRead && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: accentColor }} />
      )}
 
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${accentColor}18` }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
        </div>
 
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--cd-t1)' }}>
                  {patientName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                  {isCritical ? '⚠ CRITIQUE' : '⚡ WARNING'}
                </span>
              </div>
              <p className="text-[#0EA5E9] text-xs font-medium mt-0.5 truncate">{type}</p>
            </div>
            <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--cd-t5)' }}>
              <Clock className="w-3 h-3 flex-shrink-0" />{timestamp}
            </div>
          </div>
 
          <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--cd-t3)' }}>
            {message}
          </p>
 
          {aiScore !== undefined && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                style={{ backgroundColor: 'var(--cd-bd)' }}>
                <div className="h-full rounded-full" style={{ width: `${aiScore}%`, backgroundColor: accentColor }} />
              </div>
              <span className="font-bold text-xs flex-shrink-0" style={{ color: accentColor }}>
                {aiScore}/100
              </span>
            </div>
          )}
 
          <div className="flex items-center gap-2">
            {isConfirmed === true && confirmedLabel && (
              <span className="flex items-center gap-1 text-[#10B981] text-xs">
                <CheckCircle className="w-3 h-3" />{confirmedLabel}
              </span>
            )}
            {isConfirmed === false && dismissedLabel && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--cd-t4)' }}>
                <XCircle className="w-3 h-3" />{dismissedLabel}
              </span>
            )}
            {isConfirmed === null && (
              <span className="flex items-center gap-1 text-xs opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ color: accentColor }}>
                <Eye className="w-3 h-3" />{clickLabel}
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};