import React from 'react';
import { useNavigate } from 'react-router';
import { ShieldOff, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogoIcon } from '../components/CaredifyLogo';

const i18n = {
  FR: {
    heading: 'Compte suspendu',
    desc: "Votre accès à la plateforme Caredify a été suspendu. Pour toute question, contactez l'administrateur de votre établissement.",
    contact: 'Contacter le support',
    logout: 'Se déconnecter',
  },
  EN: {
    heading: 'Account suspended',
    desc: 'Your access to the Caredify platform has been suspended. For any questions, please contact your institution administrator.',
    contact: 'Contact support',
    logout: 'Sign out',
  },
};

export const SuspendedPage: React.FC = () => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: isDark ? 'linear-gradient(145deg, #070d1c, #0a1326)' : 'linear-gradient(145deg, #e8f0fe, #f0f7ff)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: isDark ? '#0e1829' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(21,101,192,0.14)'}`, boxShadow: isDark ? '0 32px 80px rgba(18,34,70,0.55)' : '0 32px 80px rgba(21,101,192,0.22)' }}>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #1565c0)' }}>
            <CaredifyLogoIcon size={30} className="text-white" />
          </div>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <ShieldOff className="w-7 h-7 text-[#EF4444]" />
        </div>
        <h2 className="font-bold text-xl mb-2" style={{ color: isDark ? '#F9FAFB' : '#0D1B3E' }}>{t.heading}</h2>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>{t.desc}</p>
        <div className="space-y-2">
          <a href="mailto:support@caredify.com"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: '#1565C0' }}>
            <Mail className="w-4 h-4" /> {t.contact}
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(21,101,192,0.08)', color: isDark ? '#9CA3AF' : '#6B7280', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.15)'}` }}>
            <LogOut className="w-4 h-4" /> {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};
