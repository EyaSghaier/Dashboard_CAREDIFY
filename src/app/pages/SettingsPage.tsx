import React, { useState, useEffect } from 'react';
import {
  Bell, User, Shield, Sliders, Save, RefreshCw,
  Mail, Phone, Monitor, Activity, CheckCircle, MapPin, Navigation, NavigationOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useLang } from '../context/LanguageContext';
import { supabase } from '../../lib/supabase';

const t = {
  FR: {
    title: 'Paramètres', subtitle: 'Configuration et préférences du système',
    save: 'Sauvegarder', saved: 'Sauvegardé !', saving: 'Sauvegarde...',
    thresholdTitle: "Seuils d'Alerte IA", thresholdSub: 'Configurer les niveaux de déclenchement',
    criticalThreshold: 'Seuil Critique', warningThreshold: 'Seuil Avertissement',
    criticalDesc: (v: number) => `Alertes critiques déclenchées si score IA ≥ ${v}`,
    warningDesc: (w: number, t: number) => `Avertissements si score IA entre ${w} et ${t - 1}`,
    riskZones: 'Zones de risque',
    profileTitle: 'Profil Cardiologue', profileSub: 'Vos informations professionnelles',
    fieldName: 'Nom complet', fieldEmail: 'Email', fieldPhone: 'Téléphone',
    fieldSpecialty: 'Spécialité', fieldHospital: 'Établissement', fieldLicense: 'N° RPPS',
    notifTitle: 'Préférences de Notification', notifSub: "Canaux et filtres d'alerte",
    toggleEmail: 'Alertes par email', toggleEmailDesc: 'Recevoir les alertes critiques par email',
    toggleSMS: 'Alertes SMS', toggleSMSDesc: 'Notifications urgentes par SMS',
    togglePush: 'Notifications push', togglePushDesc: 'Notifications navigateur en temps réel',
    toggleSound: 'Alertes sonores', toggleSoundDesc: 'Son pour les alertes critiques',
    toggleCriticalOnly: 'Critiques uniquement', toggleCriticalOnlyDesc: "N'envoyer que les alertes de niveau critique",
    toggleWeekly: 'Rapport hebdomadaire', toggleWeeklyDesc: 'Résumé PDF chaque lundi matin',
    toggleDaily: 'Résumé quotidien', toggleDailyDesc: 'Bilan des patients chaque soir à 18h',
    systemTitle: 'Système & Sécurité', systemSub: 'Configuration technique',
    reset: 'Réinitialiser les paramètres par défaut',
    dangerZone: 'Zone dangereuse',
    dangerDesc: 'Ces actions sont irréversibles et affecteront tous les patients.',
    exportData: 'Exporter toutes les données',
    zoneNormal: 'Normal', zoneRisk: 'Risque', zoneCrit: 'Crit.',
    statusCritique: 'CRITIQUE', statusAvert: 'AVERT.',
    loading: 'Chargement...', noProfile: 'Profil introuvable',
    // Localisation
    locTitle: 'Localisation', locSub: 'Partager votre position sur la carte de surveillance',
    locToggleLabel: 'Activer la géolocalisation',
    locToggleDesc: 'Autoriser le site à accéder à votre position GPS en temps réel',
    locGranted: 'Position active', locDenied: 'Accès refusé',
    locPending: 'En attente de permission…',
    locCoords: (lat: number, lng: number) => `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
    locError: 'Erreur de localisation',
    locRevoke: 'Révoquer l\'accès',
    locNote: 'Votre position sera visible sur la carte par vous uniquement.',
  },
  EN: {
    title: 'Settings', subtitle: 'System configuration and preferences',
    save: 'Save', saved: 'Saved!', saving: 'Saving...',
    thresholdTitle: 'AI Alert Thresholds', thresholdSub: 'Configure trigger levels',
    criticalThreshold: 'Critical Threshold', warningThreshold: 'Warning Threshold',
    criticalDesc: (v: number) => `Critical alerts triggered if AI score ≥ ${v}`,
    warningDesc: (w: number, t: number) => `Warnings if AI score between ${w} and ${t - 1}`,
    riskZones: 'Risk zones',
    profileTitle: 'Cardiologist Profile', profileSub: 'Your professional information',
    fieldName: 'Full name', fieldEmail: 'Email', fieldPhone: 'Phone',
    fieldSpecialty: 'Specialty', fieldHospital: 'Institution', fieldLicense: 'RPPS No.',
    notifTitle: 'Notification Preferences', notifSub: 'Alert channels and filters',
    toggleEmail: 'Email alerts', toggleEmailDesc: 'Receive critical alerts by email',
    toggleSMS: 'SMS alerts', toggleSMSDesc: 'Urgent SMS notifications',
    togglePush: 'Push notifications', togglePushDesc: 'Real-time browser notifications',
    toggleSound: 'Sound alerts', toggleSoundDesc: 'Sound for critical alerts',
    toggleCriticalOnly: 'Critical only', toggleCriticalOnlyDesc: 'Send only critical-level alerts',
    toggleWeekly: 'Weekly report', toggleWeeklyDesc: 'PDF summary every Monday morning',
    toggleDaily: 'Daily digest', toggleDailyDesc: 'Patient summary every evening at 6pm',
    systemTitle: 'System & Security', systemSub: 'Technical configuration',
    reset: 'Reset to default settings',
    dangerZone: 'Danger zone',
    dangerDesc: 'These actions are irreversible and will affect all patients.',
    exportData: 'Export all data',
    zoneNormal: 'Normal', zoneRisk: 'Risk', zoneCrit: 'Crit.',
    statusCritique: 'CRITICAL', statusAvert: 'WARN.',
    loading: 'Loading...', noProfile: 'Profile not found',
    // Location
    locTitle: 'Location', locSub: 'Share your position on the surveillance map',
    locToggleLabel: 'Enable geolocation',
    locToggleDesc: 'Allow the site to access your real-time GPS position',
    locGranted: 'Position active', locDenied: 'Access denied',
    locPending: 'Waiting for permission…',
    locCoords: (lat: number, lng: number) => `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
    locError: 'Location error',
    locRevoke: 'Revoke access',
    locNote: 'Your position will only be visible to you on the map.',
  },
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 flex items-center justify-center">
      <div className="text-[#0EA5E9]">{icon}</div>
    </div>
    <div>
      <h2 className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>{title}</h2>
      {subtitle && <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>{subtitle}</p>}
    </div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string; description?: string }> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
    <div>
      <p className="text-sm" style={{ color: 'var(--cd-t1)' }}>{label}</p>
      {description && <p className="text-xs mt-0.5" style={{ color: 'var(--cd-t4)' }}>{description}</p>}
    </div>
    <button onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-300"
      style={{ backgroundColor: checked ? '#0EA5E9' : 'var(--cd-hv2)' }}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { lang } = useLang();
  const tr = t[lang];
  const loc = useLocation();

  const [threshold, setThreshold]           = useState(75);
  const [warningThreshold, setWarningThreshold] = useState(50);
  const [saved, setSaved]                   = useState(false);
  const [saving, setSaving]                 = useState(false);
  // ✅ FIX : démarre à false — pas de blocage infini
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '', email: '', phone: '',
    specialty: '', hospital_clinic: '', medical_license_number: '',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true, smsAlerts: false, pushNotifications: true,
    criticalOnly: false, soundAlerts: true, weeklyReport: true, dailyDigest: false,
  });

  // ✅ FIX PRINCIPAL : un seul useEffect propre
  // Priorité 1 : profile du contexte Auth (déjà chargé)
  // Priorité 2 : fetch direct Supabase si contexte vide
  // Priorité 3 : juste l'email si rien trouvé
  useEffect(() => {
    // ── Priorité 1 : AuthContext a déjà le profil ──────────────────
    if (profile) {
      setProfileForm({
        full_name:              profile.full_name              ?? '',
        email:                  profile.email                  ?? user?.email ?? '',
        phone:                  profile.phone                  ?? '',
        specialty:              profile.specialty              ?? '',
        hospital_clinic:        profile.hospital_clinic        ?? '',
        medical_license_number: profile.medical_license_number ?? '',
      });
      return; // loadingProfile reste false, pas de spinner
    }

    // ── Priorité 2 : pas de profil en contexte, fetch direct ───────
    if (!user?.id) return; // pas connecté, rien à faire

    setLoadingProfile(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, specialty, hospital_clinic, medical_license_number, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ [SETTINGS] fetch error:', error);
          // Priorité 3 : au moins l'email
          setProfileForm(prev => ({ ...prev, email: user.email ?? '' }));
        } else if (data) {
          setProfileForm({
            full_name:              data.full_name              ?? '',
            email:                  data.email                  ?? user.email ?? '',
            phone:                  data.phone                  ?? '',
            specialty:              data.specialty              ?? '',
            hospital_clinic:        data.hospital_clinic        ?? '',
            medical_license_number: data.medical_license_number ?? '',
          });
        } else {
          // Priorité 3 : profil introuvable
          setProfileForm(prev => ({ ...prev, email: user.email ?? '' }));
        }
      } catch (err) {
        console.error('❌ [SETTINGS] fetch exception:', err);
        setProfileForm(prev => ({ ...prev, email: user.email ?? '' }));
      } finally {
        setLoadingProfile(false);
      }
    })();

  }, [profile, user?.id, user?.email]); // ✅ dépendances correctes

  const toggle = (key: keyof typeof notifications) =>
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:              profileForm.full_name,
          phone:                  profileForm.phone,
          specialty:              profileForm.specialty,
          hospital_clinic:        profileForm.hospital_clinic,
          medical_license_number: profileForm.medical_license_number,
          updated_at:             new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      if (refreshProfile) await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('❌ [SETTINGS] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getThresholdColor = (val: number) => {
    if (val >= 75) return '#EF4444';
    if (val >= 50) return '#F59E0B';
    return '#10B981';
  };

  const initials = profileForm.full_name
    ? profileForm.full_name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const profileFields = [
    { label: tr.fieldName,      key: 'full_name',              icon: <User className="w-3.5 h-3.5" />,     readOnly: false },
    { label: tr.fieldEmail,     key: 'email',                  icon: <Mail className="w-3.5 h-3.5" />,     readOnly: true  },
    { label: tr.fieldPhone,     key: 'phone',                  icon: <Phone className="w-3.5 h-3.5" />,    readOnly: false },
    { label: tr.fieldSpecialty, key: 'specialty',              icon: <Activity className="w-3.5 h-3.5" />, readOnly: false },
    { label: tr.fieldHospital,  key: 'hospital_clinic',        icon: <Shield className="w-3.5 h-3.5" />,   readOnly: false },
    { label: tr.fieldLicense,   key: 'medical_license_number', icon: <Shield className="w-3.5 h-3.5" />,   readOnly: false },
  ];

  const toggleItems = [
    { key: 'emailAlerts',       label: tr.toggleEmail,        desc: tr.toggleEmailDesc },
    { key: 'smsAlerts',         label: tr.toggleSMS,          desc: tr.toggleSMSDesc },
    { key: 'pushNotifications', label: tr.togglePush,         desc: tr.togglePushDesc },
    { key: 'soundAlerts',       label: tr.toggleSound,        desc: tr.toggleSoundDesc },
    { key: 'criticalOnly',      label: tr.toggleCriticalOnly, desc: tr.toggleCriticalOnlyDesc },
    { key: 'weeklyReport',      label: tr.toggleWeekly,       desc: tr.toggleWeeklyDesc },
    { key: 'dailyDigest',       label: tr.toggleDaily,        desc: tr.toggleDailyDesc },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--cd-t1)' }}>{tr.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.subtitle}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-70"
          style={{
            background: saved ? '#10B981' : 'linear-gradient(135deg, #0EA5E9, #0284c7)',
            boxShadow: saved ? '0 0 15px rgba(16,185,129,0.3)' : '0 0 15px rgba(14,165,233,0.3)',
          }}>
          {saving
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tr.saving}</>
            : saved
            ? <><CheckCircle className="w-4 h-4" />{tr.saved}</>
            : <><Save className="w-4 h-4" />{tr.save}</>
          }
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Seuils IA */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <SectionTitle icon={<Sliders className="w-4 h-4" />} title={tr.thresholdTitle} subtitle={tr.thresholdSub} />
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--cd-t3)' }}>{tr.criticalThreshold}</label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: getThresholdColor(threshold) }}>{threshold}/100</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25">{tr.statusCritique}</span>
              </div>
            </div>
            <input type="range" min={50} max={99} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, ${getThresholdColor(threshold)} 0%, ${getThresholdColor(threshold)} ${((threshold - 50) / 49) * 100}%, var(--cd-bd) ${((threshold - 50) / 49) * 100}%, var(--cd-bd) 100%)` }} />
            <p className="text-xs mt-1.5" style={{ color: 'var(--cd-t4)' }}>{tr.criticalDesc(threshold)}</p>
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--cd-t3)' }}>{tr.warningThreshold}</label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: getThresholdColor(warningThreshold) }}>{warningThreshold}/100</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25">{tr.statusAvert}</span>
              </div>
            </div>
            <input type="range" min={20} max={threshold - 5} value={warningThreshold}
              onChange={e => setWarningThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${((warningThreshold - 20) / (threshold - 25)) * 100}%, var(--cd-bd) ${((warningThreshold - 20) / (threshold - 25)) * 100}%, var(--cd-bd) 100%)` }} />
            <p className="text-xs mt-1.5" style={{ color: 'var(--cd-t4)' }}>{tr.warningDesc(warningThreshold, threshold)}</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--cd-t4)' }}>{tr.riskZones}</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              <div className="flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${warningThreshold}%`, background: '#10B981' }}>{tr.zoneNormal}</div>
              <div className="flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${threshold - warningThreshold}%`, background: '#F59E0B' }}>{tr.zoneRisk}</div>
              <div className="flex-1 flex items-center justify-center text-[9px] text-white font-bold" style={{ background: '#EF4444' }}>{tr.zoneCrit}</div>
            </div>
            <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--cd-t5)' }}>
              <span>0</span><span>{warningThreshold}</span><span>{threshold}</span><span>100</span>
            </div>
          </div>
        </div>

        {/* Profil Cardiologue */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <SectionTitle icon={<User className="w-4 h-4" />} title={tr.profileTitle} subtitle={tr.profileSub} />

          {loadingProfile ? (
            // ✅ Spinner court — seulement si fetch direct nécessaire
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm" style={{ color: 'var(--cd-t4)' }}>{tr.loading}</span>
            </div>
          ) : (
            <>
              {/* Avatar + résumé */}
              <div className="flex items-center gap-4 mb-5 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)' }}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white font-bold text-lg"
                  style={{ boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
                  {initials}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--cd-t1)' }}>
                    {profileForm.full_name || '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--cd-t4)' }}>
                    {profileForm.specialty || (lang === 'FR' ? 'Cardiologue' : 'Cardiologist')}
                  </p>
                  <p className="text-[#0EA5E9] text-xs mt-0.5">{profileForm.hospital_clinic || '—'}</p>
                </div>
              </div>

              {/* Champs */}
              <div className="space-y-3">
                {profileFields.map(({ label, key, icon, readOnly }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--cd-t4)' }}>
                      {icon} {label}
                      {readOnly && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--cd-bd)', color: 'var(--cd-t5)' }}>
                          {lang === 'FR' ? 'Non modifiable' : 'Read only'}
                        </span>
                      )}
                    </label>
                    <input
                      value={profileForm[key as keyof typeof profileForm]}
                      onChange={e => !readOnly && setProfileForm(p => ({ ...p, [key]: e.target.value }))}
                      readOnly={readOnly}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                      style={{
                        backgroundColor: 'var(--cd-bg1)',
                        border: '1px solid var(--cd-bd)',
                        color: readOnly ? 'var(--cd-t4)' : 'var(--cd-t1)',
                        cursor: readOnly ? 'not-allowed' : 'text',
                        opacity: readOnly ? 0.6 : 1,
                      }}
                      onFocus={e => { if (!readOnly) e.currentTarget.style.borderColor = '#0EA5E9'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = 'var(--cd-bd)'; }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <SectionTitle icon={<Bell className="w-4 h-4" />} title={tr.notifTitle} subtitle={tr.notifSub} />
          {toggleItems.map(({ key, label, desc }) => (
            <Toggle key={key}
              checked={notifications[key as keyof typeof notifications]}
              onChange={() => toggle(key as keyof typeof notifications)}
              label={label} description={desc} />
          ))}
        </div>

        {/* Système */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <SectionTitle icon={<Shield className="w-4 h-4" />} title={tr.systemTitle} subtitle={tr.systemSub} />
          <div className="space-y-3">
            {[
              { icon: <Activity className="w-4 h-4 text-[#10B981]" />, label: lang === 'FR' ? 'Moteur IA' : 'AI Engine',             sub: 'v2.4.1 — ' + (lang === 'FR' ? 'Actif' : 'Active'),     subColor: '#10B981' },
              { icon: <Monitor  className="w-4 h-4 text-[#0EA5E9]" />, label: lang === 'FR' ? 'Flux ECG temps réel' : 'Real-time ECG Stream', sub: '200 Hz — ' + (lang === 'FR' ? 'Connecté' : 'Connected'), subColor: '#0EA5E9' },
              { icon: <Shield   className="w-4 h-4 text-[#F59E0B]" />, label: lang === 'FR' ? 'Chiffrement' : 'Encryption',          sub: 'AES-256 — TLS 1.3',                                    subColor: '#F59E0B' },
            ].map(({ icon, label, sub, subColor }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)' }}>
                <div className="flex items-center gap-2">
                  {icon}
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--cd-t1)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: subColor }}>{sub}</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: subColor }} />
              </div>
            ))}
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all"
              style={{ backgroundColor: 'var(--cd-bg1)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t3)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--cd-t3)'; }}>
              <RefreshCw className="w-4 h-4" />{tr.reset}
            </button>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-[#EF4444] text-xs font-medium mb-1">{tr.dangerZone}</p>
              <p className="text-xs mb-2" style={{ color: 'var(--cd-t4)' }}>{tr.dangerDesc}</p>
              <button className="px-3 py-1.5 bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] rounded-lg text-xs hover:bg-[#EF4444]/20 transition-all">
                {tr.exportData}
              </button>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="rounded-xl p-5 col-span-1 lg:col-span-2" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
          <SectionTitle icon={<MapPin className="w-4 h-4" />} title={tr.locTitle} subtitle={tr.locSub} />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Toggle */}
            <div className="flex-1">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--cd-t1)' }}>{tr.locToggleLabel}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.locToggleDesc}</p>
                </div>
                <button
                  onClick={loc.granted ? loc.revokePermission : loc.requestPermission}
                  className="relative w-11 h-6 rounded-full transition-all duration-300 ml-4 flex-shrink-0"
                  style={{ backgroundColor: loc.granted ? '#0EA5E9' : 'var(--cd-hv2)' }}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${loc.granted ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {loc.error && (
                <p className="text-xs mt-1 text-[#EF4444]">⚠ {tr.locError} : {loc.error}</p>
              )}
              <p className="text-[10px] mt-2" style={{ color: 'var(--cd-t5)' }}>{tr.locNote}</p>
            </div>

            {/* Status card */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl flex-shrink-0"
              style={{
                background: loc.granted ? 'rgba(14,165,233,0.08)' : 'var(--cd-bg1)',
                border: `1px solid ${loc.granted ? 'rgba(14,165,233,0.3)' : 'var(--cd-bd)'}`,
                minWidth: '220px',
              }}
            >
              {loc.granted ? (
                <Navigation className="w-5 h-5 text-[#0EA5E9] animate-pulse flex-shrink-0" />
              ) : (
                <NavigationOff className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cd-t4)' }} />
              )}
              <div>
                <p className="text-xs font-semibold" style={{ color: loc.granted ? '#0EA5E9' : 'var(--cd-t3)' }}>
                  {loc.granted ? tr.locGranted : tr.locDenied}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--cd-t4)' }}>
                  {loc.position
                    ? tr.locCoords(loc.position[0], loc.position[1])
                    : loc.granted ? tr.locPending : '—'}
                </p>
              </div>
              {loc.granted && loc.position && (
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse ml-auto" />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};