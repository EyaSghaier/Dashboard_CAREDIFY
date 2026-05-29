import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShieldOff, Mail, ArrowLeft, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';

const VB_W = 1600;
const VB_H = 90;
const MID = VB_H / 2;
const PERIOD = 240;

const seg = (tt: number): number => {
  if (tt < 20 || tt >= 158) return 0;
  if (tt < 32) return ((tt - 20) / 12) * 8;
  if (tt < 42) return 8 - ((tt - 32) / 10) * 8;
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
  const pts = useMemo(() => Array.from({ length: VB_W / 2 }, (_, i) => { const x = i * 2; return `${x},${(MID + seg(x)).toFixed(1)}`; }).join(' '), []);
  const durSec = (PERIOD / 40).toFixed(1);
  return (
    <div className="w-full overflow-hidden relative" style={{ height: VB_H }}>
      <style>{`@keyframes bgecg6{from{transform:translateX(0px)}to{transform:translateX(-${PERIOD}px)}}`}</style>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: `${VB_W}px`, height: `${VB_H}px`, animation: `bgecg6 ${durSec}s linear infinite` }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs><linearGradient id="eg6" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0" /><stop offset="50%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polyline points={pts} fill="none" stroke="url(#eg6)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const i18n = {
  FR: {
    title: 'Compte suspendu',
    subtitle: 'Votre accès a été temporairement suspendu',
    message: "Votre accès à la plateforme CAREDIFY a été suspendu par l'équipe administrative. Cette suspension peut être temporaire et sera réexaminée.",
    reasons: [
      "Une activité inhabituelle a été détectée sur votre compte",
      "Une vérification supplémentaire de vos informations est nécessaire",
      "Une violation des conditions d'utilisation a été signalée",
    ],
    nextSteps: 'Que faire ?',
    contact: 'Contactez notre support',
    contactDesc: "Si vous pensez qu'il s'agit d'une erreur ou souhaitez obtenir plus d'informations, contactez-nous à :",
    backToLogin: 'Retour à la connexion',
    logout: 'Se déconnecter',
  },
  EN: {
    title: 'Account suspended',
    subtitle: 'Your access has been temporarily suspended',
    message: 'Your access to the CAREDIFY platform has been suspended by the administrative team. This suspension may be temporary and will be reviewed.',
    reasons: [
      'Unusual activity has been detected on your account',
      'Additional verification of your information is required',
      'A terms of service violation has been reported',
    ],
    nextSteps: 'What to do?',
    contact: 'Contact our support',
    contactDesc: 'If you believe this is an error or would like more information, contact us at:',
    backToLogin: 'Back to sign in',
    logout: 'Sign out',
  },
};

export const SuspendedPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const accent = '#F59E0B';
  const pageBg = isDark ? 'linear-gradient(145deg, #070d1c 0%, #0a1326 50%, #060c1a 100%)' : 'linear-gradient(145deg, #e8f0fe 0%, #f0f7ff 45%, #dceeff 100%)';
  const cardBg = isDark ? '#0e1829' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(245,158,11,0.14)';
  const cardShadow = isDark ? '0 32px 80px rgba(18,34,70,0.55)' : '0 32px 80px rgba(245,158,11,0.18)';
  const textColor = isDark ? '#F9FAFB' : '#0D1B3E';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? 'rgba(18,34,70,0.08)' : 'rgba(245,158,11,0.04)';
  const reasonBg = isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.05)';
  const reasonBorder = isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.2)';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: pageBg }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '52px 52px' }} />
      <div className="absolute top-6 left-0 right-0 pointer-events-none"><BGECGLine color={accent} /></div>
      <div className="absolute bottom-6 left-0 right-0 pointer-events-none opacity-60"><BGECGLine color={accent} /></div>

      <div className="relative z-20 flex justify-between items-center px-6 pt-5">
        <div />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.18)'}` }}>
            {(['FR', 'EN'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className="px-3 py-1 text-xs font-medium transition-all"
                style={{ background: lang === l ? accent : 'transparent', color: lang === l ? '#fff' : subtitleColor }}>{l}</button>
            ))}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.09)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.18)'}`, color: accent }}>
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: isDark ? '0 0 32px rgba(245,158,11,0.4)' : '0 0 24px rgba(245,158,11,0.3)' }}>
            <CaredifyLogoIcon size={30} className="text-white" />
          </div>
          <p className="font-bold tracking-[0.35em] text-base" style={{ color: accent }}>CAREDIFY</p>
        </div>

        <div className="w-full rounded-2xl" style={{ maxWidth: '540px', background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="px-8 py-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <ShieldOff className="w-10 h-10 text-[#F59E0B]" />
              </div>
              <h2 className="font-bold text-2xl mb-2" style={{ color: textColor }}>{t.title}</h2>
              <p className="text-sm mb-1" style={{ color: accent, fontWeight: 600 }}>{t.subtitle}</p>
              <p className="text-sm leading-relaxed" style={{ color: subtitleColor }}>{t.message}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: subtitleColor }}>{t.nextSteps}</h3>
              <div className="space-y-2">
                {t.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: reasonBg, border: `1px solid ${reasonBorder}` }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent }} />
                    <span className="text-sm leading-relaxed" style={{ color: textColor }}>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(245,158,11,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.15)'}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" style={{ color: accent }} />
                <h4 className="text-sm font-semibold" style={{ color: textColor }}>{t.contact}</h4>
              </div>
              <p className="text-xs mb-2" style={{ color: subtitleColor }}>{t.contactDesc}</p>
              <a href="mailto:support@caredify.tn" className="text-sm font-medium transition-opacity hover:opacity-75" style={{ color: accent }}>
                support@caredify.tn
              </a>
            </div>

            <div className="space-y-3">
              <button onClick={handleLogout}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: accent, boxShadow: isDark ? '0 4px 20px rgba(245,158,11,0.4)' : '0 4px 20px rgba(245,158,11,0.35)' }}>
                <LogOut className="w-4 h-4" /> {t.logout}
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs transition-opacity hover:opacity-75" style={{ color: subtitleColor }}>
                <ArrowLeft className="w-3.5 h-3.5" /> {t.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
