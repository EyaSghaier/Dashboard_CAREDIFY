import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { LogOut, Sun, Moon, Users, Menu, X, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { CaredifyLogo } from './CaredifyLogo';

export const AdminShell: React.FC = () => {
  const { user, profile, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Guard : seul un admin peut accéder aux routes /admin/* ──────────────
  const isAdminEmail = user?.email?.toLowerCase() === 'admin@caredify.tn';
  const hasAdminRole = profile?.role === 'admin';

  // Pendant le chargement du profil, ne pas rendre le layout
  if (loading || !user || (!hasAdminRole && !isAdminEmail)) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/users', label: lang === 'FR' ? 'Utilisateurs' : 'Users', icon: Users },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
        <CaredifyLogo size={36} textSize="sm" />
      </div>

      {/* Admin badge */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}
        >
          <Shield className="w-3.5 h-3.5" />
          {lang === 'FR' ? 'Administration' : 'Administration'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest px-3 mb-2 font-semibold" style={{ color: 'var(--cd-t5)' }}>
          {lang === 'FR' ? 'Navigation' : 'Navigation'}
        </p>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative"
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
              color: isActive ? '#8B5CF6' : 'var(--cd-t4)',
            })}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ backgroundColor: '#8B5CF6' }} />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--cd-bd)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--cd-bg1)' }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--cd-t1)' }}>
              {profile?.full_name ?? user?.email ?? '—'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--cd-t4)' }}>
              Administrateur
            </p>
          </div>
          <button onClick={handleLogout} className="transition-colors hover:text-[#EF4444]"
            style={{ color: 'var(--cd-t4)' }} title={lang === 'FR' ? 'Déconnexion' : 'Logout'}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--cd-bg1)' }}>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0"
        style={{ backgroundColor: 'var(--cd-bg2)', borderRight: '1px solid var(--cd-bd)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 z-10"
            style={{ backgroundColor: 'var(--cd-bg2)', borderRight: '1px solid var(--cd-bd)' }}>
            <button className="absolute top-4 right-4 transition-colors" style={{ color: 'var(--cd-t4)' }}
              onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--cd-bg2)', borderBottom: '1px solid var(--cd-bd)' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden transition-colors" style={{ color: 'var(--cd-t4)' }}
              onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>

            {/* Admin badge — visible on mobile since sidebar is hidden */}
            <div className="lg:hidden flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}>
              <Shield className="w-3 h-3" />
              Admin
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
                    background: lang === l ? '#8B5CF6' : 'transparent',
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

            {/* User info — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">A</span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--cd-t3)' }}>{user?.email}</span>
            </div>

            {/* Logout — hidden on mobile (available in sidebar) */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
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
    </div>
  );
};
