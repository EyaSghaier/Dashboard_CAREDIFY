import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Mail, Loader2, Sun, Moon, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';

const PERIOD = 260; const COPIES = 10; const VB_W = PERIOD * COPIES; const VB_H = 80; const MID = VB_H / 2;
const seg = (t: number): number => { const tt = ((t % PERIOD) + PERIOD) % PERIOD; if (tt < 70) return 0; if (tt < 82) return -((tt - 70) / 12) * 12; if (tt < 94) return -12 + ((tt - 82) / 12) * 12; if (tt < 104) return ((tt - 94) / 10) * 48; if (tt < 109) return 48 - ((tt - 104) / 5) * 62; if (tt < 117) return -14 + ((tt - 109) / 8) * 20; if (tt < 127) return 6 - ((tt - 117) / 10) * 6; if (tt < 140) return ((tt - 127) / 13) * 10; if (tt < 158) return 10 - ((tt - 140) / 18) * 10; return 0; };

const BGECGLine: React.FC<{ color: string }> = ({ color }) => {
  const pts = useMemo(() => Array.from({ length: VB_W / 2 }, (_, i) => { const x = i * 2; return `${x},${(MID + seg(x)).toFixed(1)}`; }).join(' '), []);
  const durSec = (PERIOD / 40).toFixed(1);
  return (
    <div className="w-full overflow-hidden relative" style={{ height: VB_H }}>
      <style>{`@keyframes bgecg3{from{transform:translateX(0px)}to{transform:translateX(-${PERIOD}px)}}`}</style>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: `${VB_W}px`, height: `${VB_H}px`, animation: `bgecg3 ${durSec}s linear infinite` }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <defs><linearGradient id="eg3" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0" /><stop offset="50%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polyline points={pts} fill="none" stroke="url(#eg3)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const i18n = {
  FR: {
    title: 'Mot de passe oublié', subtitle: 'Réinitialiser votre accès',
    email: 'Adresse email professionnelle', emailPh: 'dr.docteur@hopital.fr',
    submit: 'Envoyer le lien', submitting: 'Envoi en cours...',
    back: 'Retour à la connexion',
    successTitle: 'Email envoyé !',
    successDesc: (e: string) => `Un lien de réinitialisation a été envoyé à ${e}. Vérifiez votre boîte mail et vos spams.`,
    desc: "Entrez votre adresse email professionnelle. Nous vous enverrons un lien pour réinitialiser votre mot de passe.",
  },
  EN: {
    title: 'Forgot password', subtitle: 'Reset your access',
    email: 'Professional email address', emailPh: 'dr.doctor@hospital.com',
    submit: 'Send reset link', submitting: 'Sending...',
    back: 'Back to sign in',
    successTitle: 'Email sent!',
    successDesc: (e: string) => `A reset link has been sent to ${e}. Check your inbox and spam folder.`,
    desc: 'Enter your professional email address. We\'ll send you a link to reset your password.',
  },
};

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const accent = isDark ? '#0EA5E9' : '#1565C0';
  const pageBg = isDark ? 'linear-gradient(145deg, #070d1c 0%, #0a1326 50%, #060c1a 100%)' : 'linear-gradient(145deg, #e8f0fe 0%, #f0f7ff 45%, #dceeff 100%)';
  const cardBg = isDark ? '#0e1829' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.14)';
  const cardShadow = isDark ? '0 32px 80px rgba(18,34,70,0.55)' : '0 32px 80px rgba(21,101,192,0.22)';
  const labelColor = isDark ? '#9CA3AF' : '#374151';
  const textColor = isDark ? '#F9FAFB' : '#0D1B3E';
  const subtitleColor = isDark ? '#6B7280' : '#6B7280';
  const inputBg = isDark ? '#070d1c' : '#F5F8FF';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.2)';
  const inputText = isDark ? '#F9FAFB' : '#0D1B3E';
  const iconColor = isDark ? '#4B5563' : '#93A8D0';
  const gridColor = isDark ? 'rgba(18,34,70,0.08)' : 'rgba(21,101,192,0.055)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await resetPassword(email);
    if (error) { setError(error); setLoading(false); return; }
    setSent(true); setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: pageBg }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '52px 52px' }} />
      <div className="absolute top-6 left-0 right-0 pointer-events-none"><BGECGLine color={isDark ? '#0EA5E9' : '#1565C0'} /></div>
      <div className="absolute bottom-6 left-0 right-0 pointer-events-none opacity-60"><BGECGLine color={isDark ? '#0EA5E9' : '#1565C0'} /></div>

      <div className="relative z-20 flex justify-between items-center px-6 pt-5">
        <div />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)'}` }}>
            {(['FR', 'EN'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className="px-3 py-1 text-xs font-medium transition-all"
                style={{ background: lang === l ? accent : 'transparent', color: lang === l ? '#fff' : subtitleColor }}>{l}</button>
            ))}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(21,101,192,0.09)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)'}`, color: accent }}>
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #1565c0)', boxShadow: isDark ? '0 0 32px rgba(18,34,70,0.8)' : '0 0 24px rgba(21,101,192,0.3)' }}>
            <CaredifyLogoIcon size={30} className="text-white" />
          </div>
          <p className="font-bold tracking-[0.35em] text-base" style={{ color: accent }}>CAREDIFY</p>
        </div>

        <div className="w-full rounded-2xl" style={{ maxWidth: '440px', background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="px-8 py-8">
            {!sent ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="font-bold text-xl mb-1" style={{ color: textColor }}>{t.title}</h2>
                  <p className="text-sm" style={{ color: subtitleColor }}>{t.desc}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} required
                        className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
                        style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(14,165,233,0.1)' : 'rgba(21,101,192,0.1)'}`; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.boxShadow = 'none'; }} />
                    </div>
                  </div>
                  {error && (
                    <div className="px-4 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="text-[#EF4444] text-xs">{error}</span>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
                    style={{ background: isDark ? '#1d4ed8' : '#1565C0', boxShadow: loading ? 'none' : (isDark ? '0 4px 20px rgba(29,78,216,0.4)' : '0 4px 20px rgba(21,101,192,0.35)') }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t.submitting}</> : t.submit}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle className="w-7 h-7 text-[#10B981]" />
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: textColor }}>{t.successTitle}</h3>
                <p className="text-sm" style={{ color: subtitleColor }}>{t.successDesc(email)}</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs transition-opacity hover:opacity-75" style={{ color: accent }}>
                <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
