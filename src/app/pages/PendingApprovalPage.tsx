import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Mail, LogOut, CheckCircle, Sun, Moon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';

const i18n = {
  FR: {
    title: 'Demande en attente',
    subtitle: 'Votre compte est en cours de vérification',
    heading: 'Merci pour votre inscription !',
    desc: "Votre demande d'accès a bien été reçue. Notre équipe vérifie vos informations professionnelles. Ce processus prend généralement 24 à 48 heures.",
    step1: 'Inscription soumise',
    step1Sub: 'Vos informations ont été enregistrées',
    step2: 'Vérification en cours',
    step2Sub: "Contrôle de votre n° RPPS et de l'établissement",
    step3: 'Activation du compte',
    step3Sub: 'Vous recevrez un email de confirmation',
    emailNote: 'Un email de confirmation vous sera envoyé à',
    logout: 'Se déconnecter',
    check: 'Vérifier le statut',
    terms: "Conditions d'utilisation", privacy: 'Confidentialité', security: 'Sécurité HDS',
  },
  EN: {
    title: 'Pending approval',
    subtitle: 'Your account is being verified',
    heading: 'Thank you for registering!',
    desc: 'Your access request has been received. Our team is verifying your professional information. This process typically takes 24 to 48 hours.',
    step1: 'Application submitted',
    step1Sub: 'Your information has been saved',
    step2: 'Verification in progress',
    step2Sub: 'Checking your license number and institution',
    step3: 'Account activation',
    step3Sub: 'You will receive a confirmation email',
    emailNote: 'A confirmation email will be sent to',
    logout: 'Sign out',
    check: 'Check status',
    terms: 'Terms of Use', privacy: 'Privacy', security: 'HDS Security',
  },
};

export const PendingApprovalPage: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const [isChecking, setIsChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const accent = isDark ? '#0EA5E9' : '#1565C0';
  const pageBg = isDark
    ? 'linear-gradient(145deg, #070d1c 0%, #0a1326 50%, #060c1a 100%)'
    : 'linear-gradient(145deg, #e8f0fe 0%, #f0f7ff 45%, #dceeff 100%)';
  const cardBg = isDark ? '#0e1829' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.14)';
  const cardShadow = isDark ? '0 32px 80px rgba(18,34,70,0.55)' : '0 32px 80px rgba(21,101,192,0.22)';
  const textColor = isDark ? '#F9FAFB' : '#0D1B3E';
  const subtitleColor = isDark ? '#6B7280' : '#6B7280';
  const gridColor = isDark ? 'rgba(18,34,70,0.08)' : 'rgba(21,101,192,0.055)';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckMsg(null);
    await refreshProfile();

    // Read updated status directly from localStorage to avoid stale closure
    try {
      const raw = localStorage.getItem('caredify_session');
      const updated = raw ? JSON.parse(raw) : null;
      if (updated?.status === 'active') {
        navigate('/approved');
        return;
      }
      if (updated?.status === 'suspended') {
        navigate('/suspended');
        return;
      }
      if (updated?.status === 'rejected') {
        navigate('/rejected');
        return;
      }
    } catch { /* ignore */ }

    setCheckMsg({
      ok: false,
      text: lang === 'FR'
        ? 'Votre compte est toujours en cours de vérification.'
        : 'Your account is still under review.',
    });
    setIsChecking(false);
  };

  const steps = [
    { label: t.step1, sub: t.step1Sub, done: true },
    { label: t.step2, sub: t.step2Sub, done: false, active: true },
    { label: t.step3, sub: t.step3Sub, done: false },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: pageBg }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '52px 52px' }} />

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
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #1565c0)', boxShadow: isDark ? '0 0 32px rgba(18,34,70,0.8)' : '0 0 24px rgba(21,101,192,0.3)' }}>
            <CaredifyLogoIcon size={30} className="text-white" />
          </div>
          <p className="font-bold tracking-[0.35em] text-base" style={{ color: accent }}>CAREDIFY</p>
          <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: isDark ? '#374151' : '#93A8D0' }}>AI Cardiac Care</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl" style={{ maxWidth: '480px', background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="px-8 py-8">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Clock className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="font-bold text-xl mb-2" style={{ color: textColor }}>{t.heading}</h2>
              <p className="text-sm leading-relaxed" style={{ color: subtitleColor }}>{t.desc}</p>
            </div>

            {/* Progress steps */}
            <div className="space-y-3 mb-6">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: step.active ? (isDark ? 'rgba(14,165,233,0.06)' : 'rgba(21,101,192,0.05)') : 'transparent', border: step.active ? `1px solid ${isDark ? 'rgba(14,165,233,0.15)' : 'rgba(21,101,192,0.15)'}` : '1px solid transparent' }}>
                  <div className="flex-shrink-0 mt-0.5">
                    {step.done ? (
                      <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    ) : step.active ? (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: accent }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(21,101,192,0.2)' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: step.done || step.active ? textColor : subtitleColor }}>{step.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: subtitleColor }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Email note */}
            {user?.email && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(21,101,192,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.12)'}` }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
                <p className="text-xs" style={{ color: subtitleColor }}>
                  {t.emailNote}{' '}
                  <span className="font-medium" style={{ color: textColor }}>{user.email}</span>
                </p>
              </div>
            )}

            {/* Check status */}
            {checkMsg && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-2 text-xs font-medium"
                style={{
                  background: checkMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${checkMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`,
                  color: checkMsg.ok ? '#10B981' : '#F59E0B',
                }}>
                {checkMsg.ok ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <Clock className="w-3.5 h-3.5 flex-shrink-0" />}
                {checkMsg.text}
              </div>
            )}
            <button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all mb-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: accent, boxShadow: isDark ? '0 4px 20px rgba(14,165,233,0.3)' : '0 4px 20px rgba(21,101,192,0.3)' }}>
              {isChecking
                ? <><Loader2 className="w-4 h-4 animate-spin" />{lang === 'FR' ? 'Vérification…' : 'Checking…'}</>
                : t.check}
            </button>

            {/* Logout */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.08)', color: isDark ? '#9CA3AF' : '#6B7280', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.15)'}` }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#9CA3AF' : '#6B7280'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.15)'; }}>
              <LogOut className="w-4 h-4" /> {t.logout}
            </button>

            <div className="flex justify-center gap-6 mt-5">
              {[t.terms, t.privacy, t.security].map((item) => (
                <a key={item} href="#" className="text-[10px] transition-opacity hover:opacity-75" style={{ color: isDark ? '#374151' : '#9CA3AF' }}>{item}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};