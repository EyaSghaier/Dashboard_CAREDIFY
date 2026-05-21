import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Eye, EyeOff, Loader2, Sun, Moon, Mail, Lock,
  User, Phone, Building2, Stethoscope, BadgeCheck, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';

const PERIOD = 260;
const COPIES = 10;
const VB_W = PERIOD * COPIES;
const VB_H = 80;
const MID = VB_H / 2;

const seg = (t: number): number => {
  const tt = ((t % PERIOD) + PERIOD) % PERIOD;
  if (tt < 70) return 0;
  if (tt < 82) return -((tt - 70) / 12) * 12;
  if (tt < 94) return -12 + ((tt - 82) / 12) * 12;
  if (tt < 104) return ((tt - 94) / 10) * 48;
  if (tt < 109) return 48 - ((tt - 104) / 5) * 62;
  if (tt < 117) return -14 + ((tt - 109) / 8) * 20;
  if (tt < 127) return 6 - ((tt - 117) / 10) * 6;
  if (tt < 140) return ((tt - 127) / 13) * 10;
  if (tt < 158) return 10 - ((tt - 140) / 18) * 10;
  return 0;
};

const BGECGLine: React.FC<{ color: string }> = ({ color }) => {
  const pts = useMemo(() =>
    Array.from({ length: VB_W / 2 }, (_, i) => {
      const x = i * 2;
      return `${x},${(MID + seg(x)).toFixed(1)}`;
    }).join(' '), []);
  const durSec = (PERIOD / 40).toFixed(1);
  return (
    <div className="w-full overflow-hidden relative" style={{ height: VB_H }}>
      <style>{`@keyframes bgecg{from{transform:translateX(0px)}to{transform:translateX(-${PERIOD}px)}}`}</style>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: `${VB_W}px`, height: `${VB_H}px`, animation: `bgecg ${durSec}s linear infinite` }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecg-grad2" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="20%" stopColor={color} stopOpacity="0.09" />
            <stop offset="50%" stopColor={color} stopOpacity="0.18" />
            <stop offset="80%" stopColor={color} stopOpacity="0.09" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#ecg-grad2)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const SPECIALTIES_FR = ['Cardiologie', 'Rythmologie', 'Cardiologie interventionnelle', 'Insuffisance cardiaque', 'Échocardiographie', 'Médecine interne', 'Réanimation', 'Urgences', 'Autre'];
const SPECIALTIES_EN = ['Cardiology', 'Electrophysiology', 'Interventional Cardiology', 'Heart Failure', 'Echocardiography', 'Internal Medicine', 'ICU', 'Emergency', 'Other'];

const i18n = {
  FR: {
    title: 'Créer un compte', subtitle: 'Rejoignez la plateforme Caredify',
    step1: 'Compte', step2: 'Profil', step3: 'Confirmation',
    fullName: 'Nom complet', fullNamePh: 'Dr. Jean Dupont',
    email: 'Email professionnel', emailPh: 'dr.dupont@hopital.fr',
    password: 'Mot de passe', passwordPh: '8 caractères minimum',
    confirmPassword: 'Confirmer le mot de passe', confirmPh: 'Répéter le mot de passe',
    license: 'N° RPPS / Ordre', licensePh: 'Ex: 10012345678',
    hospital: 'Établissement', hospitalPh: 'CHU de Tunis',
    specialty: 'Spécialité', specialtyPh: 'Sélectionner...',
    phone: 'Téléphone', phonePh: '+216 XX XXX XXX',
    next: 'Suivant', back: 'Retour', submit: 'Créer mon compte',
    submitting: 'Création en cours...',
    haveAccount: 'Déjà un compte ?', signIn: 'Se connecter',
    errorMatch: 'Les mots de passe ne correspondent pas.',
    errorShort: 'Le mot de passe doit contenir au moins 8 caractères.',
    errorRequired: 'Veuillez remplir tous les champs obligatoires.',
    terms: "Conditions d'utilisation", privacy: 'Confidentialité', security: 'Sécurité HDS',
    passwordStrength: 'Force du mot de passe',
    weak: 'Faible', medium: 'Moyen', strong: 'Fort',
    specialties: SPECIALTIES_FR,
    confirmTitle: 'Vérifiez vos informations',
    confirmSub: 'Un email de vérification sera envoyé à votre adresse.',
  },
  EN: {
    title: 'Create an account', subtitle: 'Join the Caredify platform',
    step1: 'Account', step2: 'Profile', step3: 'Confirm',
    fullName: 'Full name', fullNamePh: 'Dr. John Smith',
    email: 'Professional email', emailPh: 'dr.smith@hospital.com',
    password: 'Password', passwordPh: 'Min. 8 characters',
    confirmPassword: 'Confirm password', confirmPh: 'Repeat password',
    license: 'Medical license no.', licensePh: 'Ex: 10012345678',
    hospital: 'Hospital / Clinic', hospitalPh: 'Tunis University Hospital',
    specialty: 'Specialty', specialtyPh: 'Select...',
    phone: 'Phone', phonePh: '+216 XX XXX XXX',
    next: 'Next', back: 'Back', submit: 'Create account',
    submitting: 'Creating account...',
    haveAccount: 'Already have an account?', signIn: 'Sign in',
    errorMatch: 'Passwords do not match.',
    errorShort: 'Password must be at least 8 characters.',
    errorRequired: 'Please fill in all required fields.',
    terms: 'Terms of Use', privacy: 'Privacy', security: 'HDS Security',
    passwordStrength: 'Password strength',
    weak: 'Weak', medium: 'Medium', strong: 'Strong',
    specialties: SPECIALTIES_EN,
    confirmTitle: 'Review your information',
    confirmSub: 'A verification email will be sent to your address.',
  },
};

function getPasswordStrength(p: string): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return 1;
  if (score <= 2) return 2;
  return 3;
}

export const SignUpPage: React.FC = () => {
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    medical_license_number: '', hospital_clinic: '', specialty: '', phone: '',
  });

  const accent = isDark ? '#0EA5E9' : '#1565C0';
  const pageBg = isDark
    ? 'linear-gradient(145deg, #070d1c 0%, #0a1326 50%, #060c1a 100%)'
    : 'linear-gradient(145deg, #e8f0fe 0%, #f0f7ff 45%, #dceeff 100%)';
  const cardBg = isDark ? '#0e1829' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.14)';
  const cardShadow = isDark
    ? '0 32px 80px rgba(18,34,70,0.55), 0 8px 32px rgba(18,34,70,0.35)'
    : '0 32px 80px rgba(21,101,192,0.22), 0 8px 32px rgba(21,101,192,0.14)';
  const labelColor = isDark ? '#9CA3AF' : '#374151';
  const textColor = isDark ? '#F9FAFB' : '#0D1B3E';
  const subtitleColor = isDark ? '#6B7280' : '#6B7280';
  const inputBg = isDark ? '#070d1c' : '#F5F8FF';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.2)';
  const inputText = isDark ? '#F9FAFB' : '#0D1B3E';
  const iconColor = isDark ? '#4B5563' : '#93A8D0';
  const btnBg = isDark ? '#1d4ed8' : '#1565C0';
  const bgECGColor = isDark ? '#0EA5E9' : '#1565C0';
  const gridColor = isDark ? 'rgba(18,34,70,0.08)' : 'rgba(21,101,192,0.055)';

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = accent;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(14,165,233,0.1)' : 'rgba(21,101,192,0.1)'}`;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = inputBorder;
    e.currentTarget.style.boxShadow = 'none';
  };

  const inputClass = 'w-full rounded-xl py-2.5 text-sm outline-none transition-all';
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: inputText };

  const strength = getPasswordStrength(form.password);
  const strengthColor = strength === 1 ? '#EF4444' : strength === 2 ? '#F59E0B' : '#10B981';
  const strengthLabel = strength === 1 ? t.weak : strength === 2 ? t.medium : t.strong;

  const validateStep1 = () => {
    if (!form.full_name || !form.email || !form.password || !form.confirm_password) {
      setError(t.errorRequired); return false;
    }
    if (form.password.length < 8) { setError(t.errorShort); return false; }
    if (form.password !== form.confirm_password) { setError(t.errorMatch); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.medical_license_number || !form.hospital_clinic || !form.specialty) {
      setError(t.errorRequired); return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signup({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      medical_license_number: form.medical_license_number,
      hospital_clinic: form.hospital_clinic,
      specialty: form.specialty,
      phone: form.phone,
    });
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    navigate('/pending-approval');
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-7">
      {[{ n: 1, label: t.step1 }, { n: 2, label: t.step2 }, { n: 3, label: t.step3 }].map(({ n, label }, i) => (
        <React.Fragment key={n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step >= n ? accent : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.08)'),
                color: step >= n ? '#fff' : (isDark ? '#4B5563' : '#93A8D0'),
                border: step === n ? `2px solid ${accent}` : 'none',
              }}
            >
              {n}
            </div>
            <span className="text-[10px]" style={{ color: step >= n ? accent : subtitleColor }}>{label}</span>
          </div>
          {i < 2 && (
            <div className="w-12 h-px mx-1 mb-4" style={{ background: step > n ? accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.15)') }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: pageBg }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '52px 52px' }} />
      <div className="absolute top-6 left-0 right-0 pointer-events-none"><BGECGLine color={bgECGColor} /></div>
      <div className="absolute bottom-6 left-0 right-0 pointer-events-none opacity-60"><BGECGLine color={bgECGColor} /></div>

      {/* Top bar */}
      <div className="relative z-20 flex justify-between items-center px-6 pt-5">
        <div />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)'}` }}>
            {(['FR', 'EN'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className="px-3 py-1 text-xs font-medium transition-all"
                style={{ background: lang === l ? accent : 'transparent', color: lang === l ? '#fff' : subtitleColor }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(21,101,192,0.09)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)'}`, color: accent }}>
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #1565c0)', boxShadow: isDark ? '0 0 32px rgba(18,34,70,0.8)' : '0 0 24px rgba(21,101,192,0.3)' }}>
            <CaredifyLogoIcon size={30} className="text-white" />
          </div>
          <p className="font-bold tracking-[0.35em] text-base" style={{ color: accent }}>CAREDIFY</p>
          <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: isDark ? '#374151' : '#93A8D0' }}>AI Cardiac Care</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl" style={{ maxWidth: '520px', background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="px-8 py-8">
            <div className="text-center mb-5">
              <h2 className="font-bold text-2xl mb-1" style={{ color: textColor }}>{t.title}</h2>
              <p className="text-sm" style={{ color: subtitleColor }}>{t.subtitle}</p>
            </div>

            <StepIndicator />

            <form onSubmit={handleSubmit}>
              {/* Step 1: Account credentials */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Full name */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.fullName}</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="text" value={form.full_name} onChange={set('full_name')} placeholder={t.fullNamePh}
                        className={`${inputClass} pl-10 pr-4`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="email" value={form.email} onChange={set('email')} placeholder={t.emailPh}
                        className={`${inputClass} pl-10 pr-4`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                    </div>
                  </div>
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.password}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={t.passwordPh}
                        className={`${inputClass} pl-10 pr-10`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: iconColor }}>
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: strength >= i ? strengthColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.1)') }} />
                          ))}
                        </div>
                        <p className="text-[10px]" style={{ color: strengthColor }}>{t.passwordStrength}: {strengthLabel}</p>
                      </div>
                    )}
                  </div>
                  {/* Confirm password */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.confirmPassword}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type={showConfirm ? 'text' : 'password'} value={form.confirm_password} onChange={set('confirm_password')} placeholder={t.confirmPh}
                        className={`${inputClass} pl-10 pr-10`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: iconColor }}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Professional profile */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.license}</label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="text" value={form.medical_license_number} onChange={set('medical_license_number')} placeholder={t.licensePh}
                        className={`${inputClass} pl-10 pr-4`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.hospital}</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="text" value={form.hospital_clinic} onChange={set('hospital_clinic')} placeholder={t.hospitalPh}
                        className={`${inputClass} pl-10 pr-4`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.specialty}</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: iconColor }} />
                      <select value={form.specialty} onChange={set('specialty')}
                        className={`${inputClass} pl-10 pr-4 appearance-none`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} required>
                        <option value="">{t.specialtyPh}</option>
                        {t.specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.phone}</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="tel" value={form.phone} onChange={set('phone')} placeholder={t.phonePh}
                        className={`${inputClass} pl-10 pr-4`} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div>
                  <div className="rounded-xl p-4 mb-4 space-y-2.5" style={{ background: isDark ? 'rgba(14,165,233,0.06)' : 'rgba(21,101,192,0.05)', border: `1px solid ${isDark ? 'rgba(14,165,233,0.15)' : 'rgba(21,101,192,0.15)'}` }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: accent }}>{t.confirmTitle}</p>
                    {[
                      { label: t.fullName, value: form.full_name },
                      { label: t.email, value: form.email },
                      { label: t.license, value: form.medical_license_number },
                      { label: t.hospital, value: form.hospital_clinic },
                      { label: t.specialty, value: form.specialty },
                      { label: t.phone, value: form.phone || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: subtitleColor }}>{label}</span>
                        <span className="text-xs font-medium" style={{ color: textColor }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center" style={{ color: subtitleColor }}>{t.confirmSub}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span className="text-[#EF4444] text-xs">{error}</span>
                </div>
              )}

              {/* Navigation buttons */}
              <div className={`flex gap-3 mt-6 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                {step > 1 && (
                  <button type="button" onClick={() => { setError(''); setStep((s) => s - 1); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.08)', color: isDark ? '#9CA3AF' : '#6B7280', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.15)'}` }}>
                    <ChevronLeft className="w-4 h-4" /> {t.back}
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={handleNext}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: btnBg, boxShadow: isDark ? '0 4px 20px rgba(29,78,216,0.4)' : '0 4px 20px rgba(21,101,192,0.35)' }}>
                    {t.next} <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-70"
                    style={{ background: btnBg, boxShadow: loading ? 'none' : (isDark ? '0 4px 20px rgba(29,78,216,0.4)' : '0 4px 20px rgba(21,101,192,0.35)') }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t.submitting}</> : t.submit}
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-xs mt-5" style={{ color: subtitleColor }}>
              {t.haveAccount}{' '}
              <Link to="/login" className="transition-opacity hover:opacity-75" style={{ color: accent }}>{t.signIn}</Link>
            </p>
          </div>
        </div>

        <p className="text-[10px] tracking-wide mt-5" style={{ color: isDark ? '#1F2937' : '#B0BEC5' }}>
          Conforme RGPD · Certifié HDS · Chiffrement AES-256
        </p>
      </div>
    </div>
  );
};
