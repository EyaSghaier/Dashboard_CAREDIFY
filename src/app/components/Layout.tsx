import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Users, AlertTriangle,
  Settings, LogOut, Bell, Search, Menu, X, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { CaredifyLogo, MessageNavIcon, MapNavIcon } from './CaredifyLogo';

interface SearchPatient {
  id: string;
  first_name: string;
  last_name: string;
  cardiac_pathology: string | null;
  lastEcgStatus: string | null;
}

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', labelEn: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', labelEn: 'Patients', icon: Users },
  { path: '/alerts', label: 'Alertes', labelEn: 'Alerts', icon: AlertTriangle },
  { path: '/messages', label: 'Messages', labelEn: 'Messages', icon: null, customIcon: MessageNavIcon },
  { path: '/map', label: 'Carte', labelEn: 'Map', icon: null, customIcon: MapNavIcon },
];

const bottomItems = [
  { path: '/settings', label: 'Paramètres', labelEn: 'Settings', icon: Settings },
];

export const Layout: React.FC = () => {
  const { user, profile, logout } = useAuth(); // ✅ logout corrigé
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchPatient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const isFullHeightPage = location.pathname === '/map' || location.pathname === '/messages';

  // ── Avatar initials depuis profile.full_name ──────────────────
  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';

  // ── Alert counter: fetches once + stays live via Realtime ─────
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [{ count: ecgCount }, { count: emCount }] = await Promise.all([
          supabase
            .from('ecg_readings')
            .select('*', { count: 'exact', head: true })
            .in('status', ['critical', 'warning']),
          supabase
            .from('emergency_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);
        setUnreadAlerts((ecgCount ?? 0) + (emCount ?? 0));
      } catch {
        // silently ignore — badge just stays at last known value
      }
    };

    fetchCount();

    // Re-fetch whenever ECG readings change
    const ecgChannel = supabase
      .channel('layout-ecg-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ecg_readings' }, fetchCount)
      .subscribe();

    // Re-fetch whenever emergency alerts change
    const emChannel = supabase
      .channel('layout-emergency-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, fetchCount)
      .subscribe();

    return () => {
      supabase.removeChannel(ecgChannel);
      supabase.removeChannel(emChannel);
    };
  }, []);

  // ── Recherche Supabase patients ───────────────────────────────
  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name, cardiac_pathology')
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,cardiac_pathology.ilike.%${query}%`
        )
        .limit(5);

      // Récupérer le dernier ECG pour chaque résultat
      const enriched = await Promise.all(
        (data ?? []).map(async (p) => {
          const { data: ecg } = await supabase
            .from('ecg_readings')
            .select('status')
            .eq('patient_id', p.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();
          return { ...p, lastEcgStatus: ecg?.status ?? null };
        })
      );

      setSearchResults(enriched);
      setShowDropdown(enriched.length > 0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce recherche 300ms
  useEffect(() => {
    const timer = setTimeout(() => searchPatients(search), 300);
    return () => clearTimeout(timer);
  }, [search, searchPatients]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      setShowDropdown(false);
      navigate(`/patients?search=${encodeURIComponent(search)}`);
    }
  };

  const handlePatientClick = (patientId: string) => {
    setShowDropdown(false);
    setSearch('');
    navigate(`/patients/${patientId}`);
  };

  const handleLogout = async () => {
    await logout(); // ✅ logout depuis AuthContext
    navigate('/login', { replace: true });
  };

  const getRiskColor = (status: string | null) => {
    if (status === 'critical') return { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', badge: '#EF4444' };
    if (status === 'warning') return { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', badge: '#F59E0B' };
    return { bg: 'linear-gradient(135deg, #10B981, #059669)', badge: '#10B981' };
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
        <CaredifyLogo size={36} textSize="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest px-3 mb-2 font-semibold" style={{ color: 'var(--cd-t5)' }}>
          {lang === 'FR' ? 'Navigation' : 'Navigation'}
        </p>
        {navItems.map(({ path, label, labelEn, icon: Icon, customIcon: CustomIcon }) => (
          <NavLink key={path} to={path} onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative"
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(14,165,233,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(14,165,233,0.2)' : '1px solid transparent',
              color: isActive ? '#0EA5E9' : 'var(--cd-t4)',
            })}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ backgroundColor: '#0EA5E9' }} />
                )}
                {CustomIcon ? <CustomIcon className="w-4 h-4 flex-shrink-0" /> : Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span className="text-sm font-medium flex-1">{lang === 'EN' ? labelEn : label}</span>
                {path === '/alerts' && unreadAlerts > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#EF4444] text-white text-[10px] rounded-full font-bold animate-pulse">
                    {unreadAlerts}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="text-[10px] uppercase tracking-widest px-3 mb-2 font-semibold" style={{ color: 'var(--cd-t5)' }}>
            {lang === 'FR' ? 'Paramètres' : 'Settings'}
          </p>
          {bottomItems.map(({ path, label, labelEn, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(14,165,233,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(14,165,233,0.2)' : '1px solid transparent',
                color: isActive ? '#0EA5E9' : 'var(--cd-t4)',
              })}>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{lang === 'EN' ? labelEn : label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User profile */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--cd-bd)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--cd-bg1)' }}>
          {/* Avatar → Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center flex-shrink-0 transition-all hover:ring-2 hover:ring-[#0EA5E9] hover:ring-offset-2 hover:ring-offset-[var(--cd-bg1)] focus:outline-none"
            title={lang === 'FR' ? 'Paramètres du compte' : 'Account settings'}
          >
            <span className="text-white text-xs font-bold">{avatarInitials}</span>
          </button>
          {/* Name → Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="flex-1 min-w-0 text-left transition-opacity hover:opacity-75 focus:outline-none"
            title={lang === 'FR' ? 'Paramètres du compte' : 'Account settings'}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--cd-t1)' }}>
              {profile?.full_name ?? user?.email ?? '—'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--cd-t4)' }}>
              {profile?.specialty ? `Cardiologue · ${profile.specialty}` : 'Cardiologue'}
            </p>
          </button>
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

            {/* Search — synchronisé Supabase */}
            <div ref={searchRef} className="hidden sm:block relative w-64">
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
                <Search className="w-3.5 h-3.5" style={{ color: 'var(--cd-t4)' }} />
                <input type="text" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={lang === 'FR' ? 'Rechercher un patient...' : 'Search a patient...'}
                  className="bg-transparent text-sm outline-none w-full"
                  style={{ color: 'var(--cd-t3)', caretColor: '#0EA5E9' }} />
                {searchLoading && (
                  <div className="w-3 h-3 border border-[#0EA5E9] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
              </div>

              {/* Dropdown résultats */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden shadow-lg z-50"
                  style={{ backgroundColor: 'var(--cd-bg2)', border: '1px solid var(--cd-bd)' }}>
                  {searchResults.map((p) => {
                    const { bg, badge } = getRiskColor(p.lastEcgStatus);
                    const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
                    return (
                      <button key={p.id} onClick={() => handlePatientClick(p.id)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left"
                        style={{ color: 'var(--cd-t3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cd-hv)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                          style={{ background: bg }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--cd-t1)' }}>
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--cd-t4)' }}>
                            {p.cardiac_pathology ?? '—'}
                          </p>
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${badge}20`, color: badge }}>
                          {p.lastEcgStatus ?? 'normal'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-[#10B981] text-xs font-medium">{lang === 'FR' ? 'En direct' : 'Live'}</span>
            </div>

            {/* Lang */}
            <div className="flex items-center gap-0.5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--cd-bd)' }}>
              {(['FR', 'EN'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className="px-2.5 py-1 text-xs font-medium transition-all"
                  style={{ background: lang === l ? '#0EA5E9' : 'transparent', color: lang === l ? '#fff' : 'var(--cd-t4)' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Theme */}
            <button onClick={toggleTheme} className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--cd-t4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cd-hv)'; e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--cd-t4)'; }}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bell → /alerts */}
            <button
              onClick={() => navigate('/alerts')}
              className="relative p-2 rounded-lg transition-all"
              style={{ color: 'var(--cd-t4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cd-hv)'; e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--cd-t4)'; }}
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
              )}
            </button>

            {/* Avatar → /settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center transition-all focus:outline-none"
              style={{ boxShadow: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cd-bg2), 0 0 0 4px #0EA5E9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              title={lang === 'FR' ? 'Paramètres du compte' : 'Account settings'}
            >
              <span className="text-white text-xs font-bold">{avatarInitials}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 ${isFullHeightPage ? 'overflow-hidden' : 'overflow-auto'}`}
          style={{ backgroundColor: 'var(--cd-bg1)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};