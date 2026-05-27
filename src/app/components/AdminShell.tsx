import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { LogOut, Sun, Moon, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogo } from './CaredifyLogo';

export const AdminShell: React.FC = () => {
  const { user, profile, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();

  // ─── Guard : seul un admin peut accéder aux routes /admin/* ──────────────
  useEffect(() => {
    if (loading) return;
    
    // Fallback: si l'email est admin@caredify.tn, on autorise même si le rôle DB n'est pas encore sync
    const isAdminEmail = user?.email?.toLowerCase() === 'admin@caredify.tn';
    const hasAdminRole = profile?.role === 'admin';

    if (!user || (!hasAdminRole && !isAdminEmail)) {
      navigate('/login', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Pendant le chargement du profil, ne pas rendre le layout
  const isAdminEmail = user?.email?.toLowerCase() === 'admin@caredify.tn';
  const hasAdminRole = profile?.role === 'admin';
  if (loading || !user || (!hasAdminRole && !isAdminEmail)) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--cd-bg1)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--cd-bg2)', borderBottom: '1px solid var(--cd-bd)' }}
      >
        <div className="flex items-center gap-3">
          <CaredifyLogo size={32} textSize="sm" />
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}
          >
            <Users className="w-3 h-3" />
            {lang === 'FR' ? 'Administration' : 'Administration'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language */}
          <div className="flex items-center gap-0.5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--cd-bd)' }}>
            {(['FR', 'EN'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-2.5 py-1 text-xs font-medium transition-all"
                style={{
                  background: lang === l ? '#0EA5E9' : 'transparent',
                  color: lang === l ? '#fff' : 'var(--cd-t4)',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--cd-t4)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cd-hv)'; e.currentTarget.style.color = 'var(--cd-t1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--cd-t4)'; }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">A</span>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--cd-t3)' }}>{user?.email}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            {lang === 'FR' ? 'Déconnexion' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
