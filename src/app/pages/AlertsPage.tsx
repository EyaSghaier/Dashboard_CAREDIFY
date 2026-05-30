import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, CheckCircle, XCircle, Bell,
  Filter, Clock, Loader2, RefreshCw,
  X, ChevronRight, FileText, Zap, Eye,
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
<<<<<<< HEAD
    aiScore: 'Score IA:',
    confirm: 'Confirmer', dismiss: 'Ignorer',
    confirmed: 'Confirmée', dismissed: 'Ignorée',
    viewPatient: 'Voir dossier complet',
    critical: 'CRITIQUE', warning: 'AVERTISSEMENT',
=======
    confirm: 'Confirmer', dismiss: 'Ignorer',
    confirmed: 'Confirmée ✓', dismissed: 'Ignorée',
    viewPatient: 'Voir patient',
>>>>>>> a069ff133295649a400f0e3e624a410d9f18fbd7
    empty: 'Aucune alerte dans cette catégorie.',
    loading: 'Chargement des alertes...',
    emergencyAlerts: "Alertes d'urgence",
<<<<<<< HEAD
    emergencyConfirm: 'Confirmer',
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
    // Confirm modal
=======
>>>>>>> a069ff133295649a400f0e3e624a410d9f18fbd7
    confirmModalTitle: "Confirmer l'alerte",
    confirmModalSubtitle: 'Ajoutez une note médicale avant de confirmer.',
    quickSuggestions: 'SUGGESTIONS RAPIDES',
    personalNote: 'NOTE PERSONNALISÉE',
    notePlaceholder: 'Ajoutez vos observations, recommandations...',
    emergencyNotif: "Notification d'urgence envoyée au patient",
    cancel: 'Annuler',
    confirmWithoutNote: 'Confirmer sans note',
    confirmWithNote: 'Confirmer avec note',
  },
  EN: {
    title: 'Alerts Center',
    unread: (n: number) => `${n} unread`,
    markAllRead: 'Mark all as read',
    statCritical: 'Critical', statUnread: 'Unread', statConfirmed: 'Confirmed',
    filterAll: 'All', filterUnread: 'Unread',
    filterCritical: 'Critical', filterWarning: 'Warnings',
    alertCount: (n: number) => `${n} alerts`,
<<<<<<< HEAD
    aiScore: 'AI Score:',
    confirm: 'Confirm', dismiss: 'Dismiss',
    confirmed: 'Confirmed', dismissed: 'Dismissed',
    viewPatient: 'View full record',
    critical: 'CRITICAL', warning: 'WARNING',
=======
    confirm: 'Confirm', dismiss: 'Dismiss',
    confirmed: 'Confirmed ✓', dismissed: 'Dismissed',
    viewPatient: 'View patient',
>>>>>>> a069ff133295649a400f0e3e624a410d9f18fbd7
    empty: 'No alerts in this category.',
    loading: 'Loading alerts...',
    emergencyAlerts: 'Emergency Alerts',
<<<<<<< HEAD
    emergencyConfirm: 'Confirm',
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
    // Confirm modal
=======
>>>>>>> a069ff133295649a400f0e3e624a410d9f18fbd7
    confirmModalTitle: 'Confirm Alert',
    confirmModalSubtitle: 'Add a medical note before confirming.',
    quickSuggestions: 'QUICK SUGGESTIONS',
    personalNote: 'PERSONAL NOTE',
    notePlaceholder: 'Add your observations, recommendations...',
    emergencyNotif: 'Emergency notification sent to patient',
    cancel: 'Cancel',
    confirmWithoutNote: 'Confirm without note',
    confirmWithNote: 'Confirm with note',
  },
};

const QUICK_SUGGESTIONS_FR = [
  'Augmenter les diurétiques', 'ECG urgent requis', 'Contacter le patient',
  'Hospitalisation à envisager', "Ajuster l'anticoagulation",
  'Échocardiographie planifiée', 'Surveillance rapprochée 24h',
  'Consultation anesthésie', 'Bilan biologique urgent', 'Réduire les bétabloquants',
];
const QUICK_SUGGESTIONS_EN = [
  'Increase diuretics', 'Urgent ECG required', 'Contact patient',
  'Consider hospitalization', 'Adjust anticoagulation',
  'Schedule echocardiography', 'Close 24h monitoring',
  'Anesthesia consultation', 'Urgent blood work', 'Reduce beta-blockers',
];

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
  status: string | null, patientName: string,
  heartRate: number | null, lang: 'FR' | 'EN'
): string => {
  const hr = heartRate ? `${heartRate} bpm` : '—';
  if (lang === 'FR') {
    if (status === 'critical') return `Anomalie ECG critique détectée pour ${patientName}. FC: ${hr}.`;
    if (status === 'warning') return `Signal ECG anormal détecté pour ${patientName}. FC: ${hr}.`;
  }
  if (status === 'critical') return `Critical ECG anomaly for ${patientName}. HR: ${hr}.`;
  if (status === 'warning') return `Abnormal ECG signal for ${patientName}. HR: ${hr}.`;
  return '';
};

const formatTs = (ts: string, lang: 'FR' | 'EN') =>
  new Date(ts).toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });

// ── Confirm Modal ──────────────────────────────────────────────────────────
interface ConfirmModalProps {
  patientName: string; alertType: string; aiScore: number;
  severity: 'critical' | 'warning'; lang: 'FR' | 'EN';
  onConfirm: (note: string) => void; onCancel: () => void;
  onViewPatient?: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  patientName, alertType, aiScore, severity, lang, onConfirm, onCancel, onViewPatient,
}) => {
  const tr = t[lang];
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const suggestions = lang === 'FR' ? QUICK_SUGGESTIONS_FR : QUICK_SUGGESTIONS_EN;
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const finalNote = [...selectedTags, ...(note.trim() ? [note.trim()] : [])].join(' | ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0F1623', border: `1px solid ${accentColor}35`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                <FileText className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">{tr.confirmModalTitle}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{tr.confirmModalSubtitle}</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mx-5 mt-4">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: `${accentColor}0D`, border: `1px solid ${accentColor}25` }}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4" style={{ color: accentColor }} />
              <span className="font-bold text-sm text-white">{patientName}</span>
              <span className="text-xs" style={{ color: accentColor }}>· {alertType}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: accentColor }}>{Math.round(aiScore)}/100</span>
          </div>
        </div>

        <div className="px-5 mt-4">
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Zap className="w-3 h-3 inline mr-1.5" style={{ color: '#F59E0B' }} />
            {tr.quickSuggestions}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => toggleTag(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={selectedTags.includes(s) ? {
                  backgroundColor: `${accentColor}25`, border: `1px solid ${accentColor}60`, color: accentColor,
                } : {
                  backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 mt-4">
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <FileText className="w-3 h-3 inline mr-1.5" />{tr.personalNote}
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={tr.notePlaceholder} rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
          />
        </div>

        {severity === 'critical' && (
          <div className="mx-5 mt-3">
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-2.5"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
              <span className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{tr.emergencyNotif}</span>
            </div>
          </div>
        )}

        <div className="px-5 py-5 space-y-2.5 mt-1">
          {onViewPatient && (
            <button onClick={onViewPatient}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
              style={{ backgroundColor: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#0EA5E9' }}>
              <Eye className="w-3.5 h-3.5" />{tr.viewPatient}<ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              {tr.cancel}
            </button>
            <button onClick={() => onConfirm(finalNote)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }}>
              <CheckCircle className="w-4 h-4" />
              {finalNote ? tr.confirmWithNote : tr.confirmWithoutNote}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Dismiss Modal ──────────────────────────────────────────────────────────
const DismissModal: React.FC<{
  patientName: string; lang: 'FR' | 'EN';
  onConfirm: () => void; onCancel: () => void;
}> = ({ patientName, lang, onConfirm, onCancel }) => {
  const tr = t[lang];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: '#0F1623', border: '1px solid rgba(239,68,68,0.25)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle className="w-5 h-5 text-[#EF4444]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{tr.dismiss}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{patientName}</p>
          </div>
        </div>
        <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {lang === 'FR' ? 'Êtes-vous sûr de vouloir ignorer cette alerte ?' : 'Are you sure you want to dismiss this alert?'}
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            {tr.cancel}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}>
            {tr.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = t[lang];

  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');
  const [confirmedEmergencyCount, setConfirmedEmergencyCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<{
    type: 'confirm' | 'dismiss';
    alertType: 'ecg' | 'emergency';
    alertId: string;
    patientId?: string;
    patientName: string;
    alertLabel: string;
    aiScore: number;
    severity: 'critical' | 'warning';
  } | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: ecgData, error } = await supabase
        .from('ecg_readings')
        .select(`
          id, status, heart_rate, timestamp, patient_id, confirmed_at,
          patients ( id, first_name, last_name )
        `)
        .in('status', ['critical', 'warning'])
        .is('confirmed_at', null)
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
      setEmergencyAlerts(data ?? []);
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

  const executeConfirm = async (note: string) => {
    if (!pendingAction) return;

    if (pendingAction.alertType === 'ecg') {
      const { error } = await supabase
        .from('ecg_readings')
        .update({
          confirmed_at: new Date().toISOString(),
          cardiologist_note: note || null,
        })
        .eq('id', pendingAction.alertId);

      if (error) {
        console.error('Erreur confirmation ECG:', error);
      } else {
        // ✅ Supprime l'alerte de la liste lors de la confirmation
        setAlertList(prev => prev.filter(a => a.id !== pendingAction.alertId));
      }
    } else {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({
          status: 'confirmed',
          responded_at: new Date().toISOString(),
        })
        .eq('id', pendingAction.alertId);

      if (!error) {
        setEmergencyAlerts(prev => prev.filter(a => a.id !== pendingAction.alertId));
        setConfirmedEmergencyCount(prev => prev + 1);
      }
    }
    setPendingAction(null);
  };

  const executeDismiss = async () => {
    if (!pendingAction) return;

    if (pendingAction.alertType === 'ecg') {
      // ✅ Supprime l'alerte ignorée de la liste
      setAlertList(prev => prev.filter(a => a.id !== pendingAction.alertId));
    } else {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({
          status: 'cancelled',
          responded_at: new Date().toISOString(),
        })
        .eq('id', pendingAction.alertId);

      if (!error) {
        setEmergencyAlerts(prev => prev.filter(a => a.id !== pendingAction.alertId));
      }
    }
    setPendingAction(null);
  };

  const markAllRead = () => setAlertList(prev => prev.map(a => ({ ...a, isRead: true })));

  const filtered = alertList.filter((a) => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  const unreadCount = alertList.filter(a => !a.isRead).length + emergencyAlerts.length;
  const criticalCount = alertList.filter(a => a.severity === 'critical' && a.isConfirmed === null).length + emergencyAlerts.length;
  const confirmedCount = alertList.filter(a => a.isConfirmed === true).length + confirmedEmergencyCount;

  return (
    <>
      {pendingAction?.type === 'confirm' && (
        <ConfirmModal
          patientName={pendingAction.patientName}
          alertType={pendingAction.alertLabel}
          aiScore={pendingAction.aiScore}
          severity={pendingAction.severity}
          lang={lang}
          onConfirm={executeConfirm}
          onCancel={() => setPendingAction(null)}
          onViewPatient={
            pendingAction.patientId
              ? () => { navigate(`/patients/${pendingAction.patientId}`); setPendingAction(null); }
              : undefined
          }
        />
      )}

      {pendingAction?.type === 'dismiss' && (
        <DismissModal
          patientName={pendingAction.patientName}
          lang={lang}
          onConfirm={executeDismiss}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <div className="p-4 lg:p-6 space-y-5 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-bold text-xl truncate" style={{ color: 'var(--cd-t1)' }}>{tr.title}</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-full animate-pulse">
                {tr.unread(unreadCount)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchAlerts(); fetchEmergencyAlerts(); }}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={markAllRead} className="text-[#0EA5E9] text-xs hover:underline">
              {tr.markAllRead}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard color="#EF4444" icon={<AlertTriangle className="w-4 h-4 text-[#EF4444]" />} value={criticalCount} label={tr.statCritical} />
          <StatCard color="#F59E0B" icon={<Bell className="w-4 h-4 text-[#F59E0B]" />} value={unreadCount} label={tr.statUnread} />
          <StatCard color="#10B981" icon={<CheckCircle className="w-4 h-4 text-[#10B981]" />} value={confirmedCount} label={tr.statConfirmed} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4" style={{ color: 'var(--cd-t4)' }} />
          {([
            { key: 'all', label: tr.filterAll },
            { key: 'unread', label: tr.filterUnread },
            { key: 'critical', label: tr.filterCritical },
            { key: 'warning', label: tr.filterWarning },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filter === key
                ? { backgroundColor: '#0EA5E9', color: 'white' }
                : { backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t4)' }}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: 'var(--cd-t4)' }}>
            {tr.alertCount(filtered.length + emergencyAlerts.length)}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20" style={{ color: 'var(--cd-t4)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{tr.loading}</span>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">

            {/* ── Alertes urgence manuelles ── */}
            {emergencyAlerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
                  {tr.emergencyAlerts}
                </h3>
                {emergencyAlerts.map((ea) => (
                  <AlertCard
                    key={ea.id}
                    patientId={ea.patient_id}
                    patientName={ea.patient_name}
                    type={lang === 'FR' ? 'Alerte manuelle urgente' : 'Manual Emergency Alert'}
                    message={lang === 'FR'
                      ? `Patient a déclenché une alerte manuelle. FC: ${ea.heart_rate ? `${ea.heart_rate} bpm` : '—'}.`
                      : `Patient triggered a manual emergency alert. HR: ${ea.heart_rate ? `${ea.heart_rate} bpm` : '—'}.`}
                    timestamp={formatTs(ea.triggered_at, lang)}
                    severity="critical"
                    aiScore={ea.ai_score ?? 80}
                    isRead={false}
                    confirmLabel={tr.confirm}
                    dismissLabel={tr.dismiss}
                    viewPatientLabel={tr.viewPatient}
                    onConfirm={() => setPendingAction({
                      type: 'confirm', alertType: 'emergency',
                      alertId: ea.id, patientId: ea.patient_id,
                      patientName: ea.patient_name,
                      alertLabel: lang === 'FR' ? 'Alerte manuelle urgente' : 'Manual Emergency Alert',
                      aiScore: ea.ai_score ?? 80, severity: 'critical',
                    })}
                    onDismiss={() => setPendingAction({
                      type: 'dismiss', alertType: 'emergency',
                      alertId: ea.id, patientName: ea.patient_name,
                      alertLabel: '', aiScore: 0, severity: 'critical',
                    })}
                    onViewPatient={() => navigate(`/patients/${ea.patient_id}`)}
                  />
                ))}
              </div>
            )}

            {/* ── Alertes ECG automatiques ── */}
            <div className="space-y-3">
              {filtered.map((alert) => (
                <AlertCard
                  key={alert.id}
                  patientId={alert.patientId}
                  patientName={alert.patientName}
                  type={alert.type}
                  message={alert.message}
                  timestamp={alert.timestamp}
                  severity={alert.severity}
                  aiScore={alert.aiScore}
                  isRead={alert.isRead}
                  confirmLabel={tr.confirm}
                  dismissLabel={tr.dismiss}
                  viewPatientLabel={tr.viewPatient}
                  onConfirm={() => {
                    setAlertList(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
                    setPendingAction({
                      type: 'confirm', alertType: 'ecg',
                      alertId: alert.id, patientId: alert.patientId,
                      patientName: alert.patientName, alertLabel: alert.type,
                      aiScore: alert.aiScore, severity: alert.severity,
                    });
                  }}
                  onDismiss={() => {
                    setAlertList(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
                    setPendingAction({
                      type: 'dismiss', alertType: 'ecg',
                      alertId: alert.id, patientName: alert.patientName,
                      alertLabel: alert.type, aiScore: alert.aiScore,
                      severity: alert.severity,
                    });
                  }}
                  onViewPatient={() => navigate(`/patients/${alert.patientId}`)}
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
    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${color}18` }}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="font-bold text-lg truncate" style={{ color }}>{value}</p>
      <p className="text-xs truncate" style={{ color: 'var(--cd-t4)' }}>{label}</p>
    </div>
  </div>
);

// ── AlertCard ──────────────────────────────────────────────────────────────
const AlertCard: React.FC<{
  patientId: string;
  patientName: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning';
  aiScore: number;
  isRead: boolean;
  confirmLabel: string;
  dismissLabel: string;
  viewPatientLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  onViewPatient: () => void;
}> = ({
  patientName, type, message, timestamp, severity, aiScore,
  isRead, confirmLabel, dismissLabel, viewPatientLabel,
  onConfirm, onDismiss, onViewPatient,
}) => {
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';

  return (
    <div
      className="relative rounded-xl p-4 transition-all"
      style={{
        backgroundColor: 'var(--cd-bg3)',
        border: '1px solid var(--cd-bd)',
        borderLeft: !isRead ? `3px solid ${accentColor}` : '1px solid var(--cd-bd)',
      }}
    >
      {/* Unread dot */}
      {!isRead && (
        <span
          className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* ── Top row: icon + name/badge + timestamp ── */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <AlertTriangle className="w-4 h-4" style={{ color: accentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badge + timestamp */}
          <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--cd-t1)' }}>
                {patientName}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: `${accentColor}18`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                {isCritical ? '⚠ CRITIQUE' : '⚡ WARNING'}
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs flex-shrink-0"
              style={{ color: 'var(--cd-t5)' }}
            >
              <Clock className="w-3 h-3" />
              {timestamp}
            </div>
          </div>

          {/* Alert type */}
          <p className="text-[#0EA5E9] text-xs font-medium mb-1 truncate">{type}</p>

          {/* Message */}
          <p
            className="text-xs leading-relaxed mb-3 line-clamp-2"
            style={{ color: 'var(--cd-t3)' }}
          >
            {message}
          </p>

          {/* AI Score bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--cd-t4)' }}>Score IA:</span>
            <div
              className="flex-1 max-w-[80px] h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--cd-bd)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${aiScore}%`, backgroundColor: accentColor }}
              />
            </div>
            <span className="font-bold text-xs" style={{ color: accentColor }}>
              {aiScore}/100
            </span>
          </div>

          {/* ── Action row: Confirmer + Ignorer + Voir patient ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981',
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {confirmLabel}
            </button>

            <button
              onClick={onDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#EF4444',
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
              {dismissLabel}
            </button>

            {/* Voir patient — pushed to the right */}
            <button
              onClick={onViewPatient}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.25)',
                color: '#0EA5E9',
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              {viewPatientLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};