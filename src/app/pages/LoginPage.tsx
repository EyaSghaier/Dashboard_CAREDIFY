import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Loader2, Sun, Moon, Mail, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';
import { supabase } from '../../lib/supabase'; // ✅ chemin corrigé

const BGECGLine: React.FC<{ color: string }> = ({ color }) => {
  const PERIOD = 260;
  const COPIES = 10;
  const VB_W   = PERIOD * COPIES;
  const VB_H   = 80;
  const MID    = VB_H / 2;

  const seg = (t: number): number => {
    const tt = ((t % PERIOD) + PERIOD) % PERIOD;
    if (tt < 70)  return 0;
    if (tt < 82)  return -((tt - 70) / 12) * 12;
    if (tt < 94)  return -12 + ((tt - 82) / 12) * 12;
    if (tt < 104) return ((tt - 94) / 10) * 48;
    if (tt < 109) return 48 - ((tt - 104) / 5) * 62;
    if (tt < 117) return -14 + ((tt - 109) / 8) * 20;
    if (tt < 127) return 6 - ((tt - 117) / 10) * 6;
    if (tt < 140) return ((tt - 127) / 13) * 10;
    if (tt < 158) return 10 - ((tt - 140) / 18) * 10;
    return 0;
  };

  const pts = useMemo(() =>
    Array.from({ length: VB_W / 2 }, (_, i) => {
      const x = i * 2;
      return `${x},${(MID + seg(x)).toFixed(1)}`;
    }).join(' ')
  , []);

  const animId = 'bg-ecg-scroll';
  const durSec = (PERIOD / 40).toFixed(1);

  return (
    <div className="w-full overflow-hidden relative" style={{ height: VB_H }}>
      <style>{`@keyframes ${animId}{from{transform:translateX(0px)}to{transform:translateX(-${PERIOD}px)}}`}</style>
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: `${VB_W}px`, height: `${VB_H}px`, animation: `${animId} ${durSec}s linear infinite` }}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bg-ecg-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity="0" />
            <stop offset="20%"  stopColor={color} stopOpacity="0.09" />
            <stop offset="50%"  stopColor={color} stopOpacity="0.18" />
            <stop offset="80%"  stopColor={color} stopOpacity="0.09" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#bg-ecg-grad)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const i18n = {
  FR: {
    welcome: 'Bienvenue',
    welcomeSub: 'Connectez-vous à votre tableau de bord clinique',
    emailLabel: 'Adresse Email',
    emailPlaceholder: 'docteur@caredify.tn',
    passLabel: 'Mot de passe',
    forgotPass: 'Mot de passe oublié ?',
    passPlaceholder: '••••••••',
    remember: 'Rester connecté',
    submit: 'Se connecter',
    connecting: 'Connexion en cours...',
    newUser: 'Nouvel utilisateur?',
    requestAccess: 'Demander accès',
    terms: "Conditions d'utilisation",
    privacy: 'Confidentialité',
    security: 'Sécurité HDS',
    error: 'Identifiants invalides. Veuillez réessayer.',
  },
  EN: {
    welcome: 'Welcome Back',
    welcomeSub: 'Sign in to access your clinical dashboard',
    emailLabel: 'Email Address',
    emailPlaceholder: 'doctor@caredify.tn',
    passLabel: 'Password',
    forgotPass: 'Forgot password?',
    passPlaceholder: '••••••••',
    remember: 'Remember me',
    submit: 'Sign In',
    connecting: 'Signing in...',
    newUser: 'New user?',
    requestAccess: 'Request access',
    terms: 'Terms of Use',
    privacy: 'Privacy',
    security: 'HDS Security',
    error: 'Invalid credentials. Please try again.',
  },
};

export const LoginPage: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const { theme, toggleTheme } = useTheme();
  const { lang, setLang }      = useLang();
  const navigate               = useNavigate();
  const t                      = i18n[lang];
  const isDark                 = theme === 'dark';

  const LIGHT_BLUE = '#1565C0';
  const DARK_MAIN  = '#0EA5E9';
  const accent     = isDark ? DARK_MAIN : LIGHT_BLUE;

  // ─── Login : redirige selon role + status ────────────────────────────────
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;
      if (!data.session) throw new Error('Aucune session créée.');

      const userId = data.session.user.id;

      // Charger le profil pour connaître role + status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('[LOGIN] Profile fetch error:', profileError.message);
      }

      const role   = profileData?.role   ?? null;
      const status = profileData?.status ?? null;

      setLoading(false);

      // Redirection admin (par rôle OU par email)
      if (role === 'admin' || email.toLowerCase() === 'admin@caredify.tn') {
        navigate('/admin/users', { replace: true });
        return;
      }

      // Doctor (carediologue)
      if (status === 'active') {
        navigate('/dashboard', { replace: true });
      } else if (status === 'suspended') {
        navigate('/suspended', { replace: true });
      } else if (status === 'rejected') {
        navigate('/rejected', { replace: true });
      } else {
        // pending | verified | null → page d'attente
        navigate('/pending-approval', { replace: true });
      }

    } catch (err: any) {
      console.error('[LOGIN] Authentication error:', err);
      const msg = err.message?.includes('Invalid login credentials')
        ? t.error
        : err.message || t.error;
      setError(msg);
      setLoading(false);
    }
  };

  const pageBg         = isDark ? 'linear-gradient(145deg, #070d1c 0%, #0a1326 50%, #060c1a 100%)' : 'linear-gradient(145deg, #e8f0fe 0%, #f0f7ff 45%, #dceeff 100%)';
  const cardBg         = isDark ? '#0e1829' : '#ffffff';
  const cardBorder     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.14)';
  const cardShadow     = isDark ? '0 32px 80px rgba(18,34,70,0.55), 0 8px 32px rgba(18,34,70,0.35)' : '0 32px 80px rgba(21,101,192,0.22), 0 8px 32px rgba(21,101,192,0.14)';
  const labelColor     = isDark ? '#9CA3AF' : '#374151';
  const textColor      = isDark ? '#F9FAFB'  : '#0D1B3E';
  const subtitleColor  = isDark ? '#6B7280'  : '#6B7280';
  const inputBg        = isDark ? '#070d1c'  : '#F5F8FF';
  const inputBorder    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.2)';
  const inputText      = isDark ? '#F9FAFB'  : '#0D1B3E';
  const iconColor      = isDark ? '#4B5563'  : '#93A8D0';
  const dividerColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.1)';
  const footerColor    = isDark ? '#374151'  : '#9CA3AF';
  const newUserColor   = isDark ? '#6B7280'  : '#6B7280';
  const gridColor      = isDark ? 'rgba(18,34,70,0.08)' : 'rgba(21,101,192,0.055)';
  const orb1           = isDark ? 'rgba(18,34,70,0.25)' : 'rgba(21,101,192,0.1)';
  const orb2           = isDark ? 'rgba(18,34,70,0.15)' : 'rgba(21,101,192,0.07)';
  const bgECGColor     = isDark ? '#0EA5E9' : '#1565C0';
  const btnBg          = isDark ? '#1d4ed8' : LIGHT_BLUE;
  const btnShadow      = isDark ? '0 4px 20px rgba(29,78,216,0.4)' : '0 4px 20px rgba(21,101,192,0.35)';
  const btnHover       = isDark ? '#1e40af' : '#0D47A1';
  const themeBg        = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(21,101,192,0.09)';
  const themeBorder    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)';
  const brandSubColor  = isDark ? '#374151' : '#93A8D0';
  const langActiveBg   = isDark ? '#122246' : LIGHT_BLUE;
  const langInactiveBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.07)';
  const langInactiveColor = isDark ? '#6B7280' : '#6B7280';
  const langBorder        = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.18)';
  const logoGlow       = isDark ? '0 0 32px rgba(18,34,70,0.8)' : '0 0 24px rgba(21,101,192,0.3)';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: pageBg }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: '52px 52px',
      }} />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: orb1 }} />
      <div className="absolute bottom-1/4 right-1/4 w-[360px] h-[360px] rounded-full blur-3xl pointer-events-none" style={{ background: orb2 }} />
      <div className="absolute top-6 left-0 right-0 pointer-events-none"><BGECGLine color={bgECGColor} /></div>
      <div className="absolute bottom-6 left-0 right-0 pointer-events-none opacity-60"><BGECGLine color={bgECGColor} /></div>

      {/* Top bar */}
      <div className="relative z-20 flex justify-between items-center px-6 pt-5">
        <div />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${langBorder}` }}>
            {(['FR', 'EN'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className="px-3 py-1 text-xs font-medium transition-all"
                style={{ background: lang === l ? langActiveBg : langInactiveBg, color: lang === l ? '#fff' : langInactiveColor }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: themeBg, border: `1px solid ${themeBorder}`, color: accent }}>
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #1565c0)', boxShadow: logoGlow }}>
            <CaredifyLogoIcon size={34} className="text-white" />
          </div>
          <p className="font-bold tracking-[0.35em] text-base" style={{ color: accent }}>CAREDIFY</p>
          <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: brandSubColor }}>AI Cardiac Care</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl"
          style={{ maxWidth: '500px', background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="px-10 py-9">

            <div className="text-center mb-7">
              <h2 className="font-bold text-2xl mb-2" style={{ color: textColor }}>{t.welcome}</h2>
              <p className="text-sm" style={{ color: subtitleColor }}>{t.welcomeSub}</p>
            </div>

            <div className="w-full h-px mb-7" style={{ background: dividerColor }} />

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: labelColor }}>{t.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(14,165,233,0.1)' : 'rgba(21,101,192,0.1)'}`; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder={t.emailPlaceholder} required />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium" style={{ color: labelColor }}>{t.passLabel}</label>
                  <Link to="/forgot-password" className="text-xs transition-colors" style={{ color: accent }}>{t.forgotPass}</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor }} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(14,165,233,0.1)' : 'rgba(21,101,192,0.1)'}`; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder={t.passPlaceholder} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-75" style={{ color: iconColor }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded" style={{ accentColor: accent }} />
                <label htmlFor="remember" className="text-xs cursor-pointer" style={{ color: subtitleColor }}>{t.remember}</label>
              </div>

              {error && (
                <div className="px-4 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span className="text-[#EF4444] text-xs">{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: loading ? (isDark ? '#0EA5E9' : '#1565C0') : btnBg, boxShadow: loading ? 'none' : btnShadow }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = btnHover; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = btnBg; }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t.connecting}</> : t.submit}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: newUserColor }}>
              {t.newUser}{' '}
              <Link to="/signup" className="transition-opacity hover:opacity-75" style={{ color: accent }}>{t.requestAccess}</Link>
            </p>

            <div className="flex justify-center gap-6 mt-5">
              {[t.terms, t.privacy, t.security].map((item) => (
                <a key={item} href="#" className="text-[10px] transition-opacity hover:opacity-75" style={{ color: footerColor }}>{item}</a>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] tracking-wide mt-6" style={{ color: isDark ? '#1F2937' : '#B0BEC5' }}>
          Conforme RGPD · Certifié HDS · Chiffrement AES-256
        </p>
      </div>
    </div>
  );
};
