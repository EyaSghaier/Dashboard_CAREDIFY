import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Mail, Phone, Building2, Stethoscope,
  Calendar, ChevronDown, ChevronUp, RefreshCw, UserCheck,
  UserX, UserMinus, ShieldCheck, ShieldOff, AlertCircle,
  CheckCircle2, XCircle, Clock, Ban, X, Loader2,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { UserStatus } from '../../lib/supabase';

interface Doctor {
  id: string;
  email: string;
  full_name: string;
  role: string;
  specialty: string;
  medical_license_number: string;
  hospital_clinic: string;
  phone: string;
  created_at?: string;
  status: UserStatus | null;
  password?: string;
}

type SortKey = 'full_name' | 'email' | 'specialty' | 'hospital_clinic' | 'created_at';
type StatusFilter = 'all' | UserStatus;


const STATUS_CONFIG: Record<UserStatus, {
  labelFR: string; labelEN: string;
  color: string; bg: string; border: string;
  icon: React.FC<{ className?: string }>;
}> = {
  pending:   { labelFR: 'En attente',  labelEN: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: Clock },
  verified:  { labelFR: 'Vérifié',     labelEN: 'Verified',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.25)',  icon: ShieldCheck },
  active:    { labelFR: 'Actif',        labelEN: 'Active',    color: '#10B981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.25)',  icon: CheckCircle2 },
  suspended: { labelFR: 'Suspendu',    labelEN: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',   icon: Ban },
  rejected:  { labelFR: 'Rejeté',      labelEN: 'Rejected',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', icon: XCircle },
};

const i18n = {
  FR: {
    title: 'Gestion des utilisateurs',
    subtitle: 'Approuver, suspendre ou rejeter les comptes de la plateforme',
    search: 'Rechercher par nom, email ou spécialité...',
    name: 'Nom complet', email: 'Email', specialty: 'Spécialité',
    hospital: 'Établissement', phone: 'Téléphone', since: 'Inscrit le',
    status: 'Statut', actions: 'Actions',
    total: 'utilisateurs', noResults: 'Aucun utilisateur trouvé',
    loading: 'Chargement...', refresh: 'Actualiser', all: 'Tous',
    approve: 'Approuver', suspend: 'Suspendre', reject: 'Rejeter', reactivate: 'Réactiver',
    confirmTitle: 'Confirmer l\'action',
    confirmSuspend: (name: string) => `Suspendre le compte de ${name} ? L'utilisateur ne pourra plus se connecter.`,
    confirmReject: (name: string) => `Rejeter le compte de ${name} ? Cette action est réversible.`,
    confirmReactivate: (name: string) => `Réactiver le compte de ${name} ?`,
    confirmApprove: (name: string) => `Approuver le compte de ${name} et lui donner accès à la plateforme ?`,
    cancel: 'Annuler', confirm: 'Confirmer',
    actionSuccess: 'Statut mis à jour avec succès.',
  },
  EN: {
    title: 'User Management',
    subtitle: 'Approve, suspend or reject platform accounts',
    search: 'Search by name, email or specialty...',
    name: 'Full name', email: 'Email', specialty: 'Specialty',
    hospital: 'Hospital', phone: 'Phone', since: 'Registered',
    status: 'Status', actions: 'Actions',
    total: 'users', noResults: 'No users found',
    loading: 'Loading...', refresh: 'Refresh', all: 'All',
    approve: 'Approve', suspend: 'Suspend', reject: 'Reject', reactivate: 'Reactivate',
    confirmTitle: 'Confirm action',
    confirmSuspend: (name: string) => `Suspend ${name}'s account? They won't be able to sign in.`,
    confirmReject: (name: string) => `Reject ${name}'s account? This action is reversible.`,
    confirmReactivate: (name: string) => `Reactivate ${name}'s account?`,
    confirmApprove: (name: string) => `Approve ${name}'s account and give them platform access?`,
    cancel: 'Cancel', confirm: 'Confirm',
    actionSuccess: 'Status updated successfully.',
  },
};

const STATUS_TABS: { key: StatusFilter; labelFR: string; labelEN: string }[] = [
  { key: 'all',       labelFR: 'Tous',       labelEN: 'All' },
  { key: 'pending',   labelFR: 'En attente', labelEN: 'Pending' },
  { key: 'active',    labelFR: 'Actifs',     labelEN: 'Active' },
  { key: 'suspended', labelFR: 'Suspendus',  labelEN: 'Suspended' },
  { key: 'rejected',  labelFR: 'Rejetés',    labelEN: 'Rejected' },
];

interface ConfirmState {
  userId: string;
  userName: string;
  action: 'approve' | 'suspend' | 'reject' | 'reactivate';
  newStatus: UserStatus;
}

export const UsersPage: React.FC = () => {
  const { lang } = useLang();
  const { theme } = useTheme();
  const t = i18n[lang];
  const isDark = theme === 'dark';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors((data ?? []) as Doctor[]);
    } catch (err: any) {
      console.error('[USERS] fetchDoctors error:', err);
      showToast(false, err.message ?? 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(confirm.userId);
    setConfirm(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: confirm.newStatus })
        .eq('id', confirm.userId);

      if (error) throw error;

      // Mise à jour locale optimiste
      setDoctors((prev) =>
        prev.map((u) =>
          u.id === confirm.userId ? { ...u, status: confirm.newStatus } : u,
        ),
      );
      showToast(true, t.actionSuccess);
    } catch (err: any) {
      console.error('[USERS] handleAction error:', err);
      showToast(false, err.message ?? 'Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (doctor: Doctor, action: ConfirmState['action'], newStatus: UserStatus) => {
    setConfirm({ userId: doctor.id, userName: doctor.full_name || doctor.email, action, newStatus });
  };

  const counts = {
    all: doctors.length,
    pending:   doctors.filter((d) => d.status === 'pending' || d.status === 'verified').length,
    active:    doctors.filter((d) => d.status === 'active').length,
    suspended: doctors.filter((d) => d.status === 'suspended').length,
    rejected:  doctors.filter((d) => d.status === 'rejected').length,
  };

  const filtered = doctors
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        d.full_name?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.specialty?.toLowerCase().includes(q) ||
        d.hospital_clinic?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'pending' ? (d.status === 'pending' || d.status === 'verified') : d.status === statusFilter);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const va = ((a as any)[sortKey] ?? '').toString().toLowerCase();
      const vb = ((b as any)[sortKey] ?? '').toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-30" />;

  const initials = (name: string) =>
    (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  const avatarColors = [
    'from-[#0EA5E9] to-[#0284c7]', 'from-[#8B5CF6] to-[#7C3AED]',
    'from-[#10B981] to-[#059669]',  'from-[#F59E0B] to-[#D97706]',
    'from-[#EF4444] to-[#DC2626]',  'from-[#EC4899] to-[#DB2777]',
  ];
  const avatarColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  const cardBg      = isDark ? 'var(--cd-bg2)' : '#ffffff';
  const border      = isDark ? 'var(--cd-bd)' : 'rgba(21,101,192,0.12)';
  const headBg      = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(21,101,192,0.05)';
  const rowHover    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(21,101,192,0.04)';
  const inputBg     = isDark ? 'var(--cd-bg3)' : '#F5F8FF';
  const inputBorder = isDark ? 'var(--cd-bd)' : 'rgba(21,101,192,0.2)';
  const tabInactive = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(21,101,192,0.05)';
  const tabBorder   = isDark ? 'var(--cd-bd)' : 'rgba(21,101,192,0.12)';

  const getConfirmMessage = () => {
    if (!confirm) return '';
    const { action, userName } = confirm;
    if (action === 'approve')    return t.confirmApprove(userName);
    if (action === 'suspend')    return t.confirmSuspend(userName);
    if (action === 'reject')     return t.confirmReject(userName);
    if (action === 'reactivate') return t.confirmReactivate(userName);
    return '';
  };

  const ActionButtons: React.FC<{ doctor: Doctor }> = ({ doctor }) => {
    const isActing = actionLoading === doctor.id;
    const status = doctor.status;
    const btnBase = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50';

    if (isActing) {
      return (
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--cd-t4)' }} />
        </div>
      );
    }

    if (status === 'pending' || status === 'verified' || status === null) {
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openConfirm(doctor, 'approve', 'active')}
            className={btnBase}
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}
          >
            <UserCheck className="w-3 h-3" />{t.approve}
          </button>
          <button
            onClick={() => openConfirm(doctor, 'reject', 'rejected')}
            className={btnBase}
            style={{ background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)', color: '#9CA3AF' }}
          >
            <UserX className="w-3 h-3" />{t.reject}
          </button>
        </div>
      );
    }

    if (status === 'active') {
      return (
        <button
          onClick={() => openConfirm(doctor, 'suspend', 'suspended')}
          className={btnBase}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
        >
          <UserMinus className="w-3 h-3" />{t.suspend}
        </button>
      );
    }

    if (status === 'suspended' || status === 'rejected') {
      return (
        <button
          onClick={() => openConfirm(doctor, 'reactivate', 'active')}
          className={btnBase}
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#0EA5E9' }}
        >
          <ShieldCheck className="w-3 h-3" />{t.reactivate}
        </button>
      );
    }

    return null;
  };

  const StatusBadge: React.FC<{ status: UserStatus | null }> = ({ status }) => {
    if (!status) return <span style={{ color: 'var(--cd-t5)' }}>—</span>;
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        <Icon className="w-3 h-3" />
        {lang === 'FR' ? cfg.labelFR : cfg.labelEN}
      </span>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full" style={{ backgroundColor: 'var(--cd-bg1)' }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
          style={{
            background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.ok ? '#10B981' : '#EF4444',
          }}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirm(null)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: isDark ? '#0e1829' : '#ffffff', border: `1px solid ${border}` }}
          >
            <button
              onClick={() => setConfirm(null)}
              className="absolute top-4 right-4 transition-opacity hover:opacity-70"
              style={{ color: 'var(--cd-t4)' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: confirm.action === 'approve' || confirm.action === 'reactivate'
                    ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${confirm.action === 'approve' || confirm.action === 'reactivate'
                    ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}
              >
                {confirm.action === 'approve' || confirm.action === 'reactivate'
                  ? <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                  : <ShieldOff className="w-5 h-5 text-[#EF4444]" />}
              </div>
              <h3 className="font-bold text-base" style={{ color: 'var(--cd-t1)' }}>{t.confirmTitle}</h3>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--cd-t3)' }}>{getConfirmMessage()}</p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'var(--cd-t3)' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAction}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: confirm.action === 'approve' || confirm.action === 'reactivate'
                    ? '#10B981' : '#EF4444',
                }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--cd-t1)' }}>{t.title}</h1>
          </div>
          <p className="text-sm ml-10" style={{ color: 'var(--cd-t4)' }}>{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <UserCheck className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span className="text-[#0EA5E9] text-sm font-semibold">{doctors.length}</span>
            <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>{t.total}</span>
          </div>
          <button
            onClick={fetchDoctors}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'var(--cd-t3)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t.refresh}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map(({ key, labelFR, labelEN }) => {
          const count = counts[key as keyof typeof counts] ?? 0;
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive ? 'rgba(14,165,233,0.15)' : tabInactive,
                border: `1px solid ${isActive ? 'rgba(14,165,233,0.3)' : tabBorder}`,
                color: isActive ? '#0EA5E9' : 'var(--cd-t4)',
              }}
            >
              {lang === 'FR' ? labelFR : labelEN}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: isActive ? 'rgba(14,165,233,0.2)' : 'rgba(128,128,128,0.1)',
                  color: isActive ? '#0EA5E9' : 'var(--cd-t5)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--cd-t4)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'var(--cd-t1)' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--cd-t4)' }} />
            <p className="text-sm" style={{ color: 'var(--cd-t4)' }}>{t.loading}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: headBg, borderBottom: `1px solid ${border}` }}>
                    {[
                      { key: 'full_name' as SortKey,      label: t.name,      icon: null },
                      { key: 'email' as SortKey,           label: t.email,     icon: Mail },
                      { key: 'specialty' as SortKey,       label: t.specialty, icon: Stethoscope },
                      { key: 'hospital_clinic' as SortKey, label: t.hospital,  icon: Building2 },
                      { key: 'created_at' as SortKey,      label: t.since,     icon: Calendar },
                    ].map(({ key, label, icon: Icon }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-4 py-3 text-left cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: 'var(--cd-t4)' }} />}
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cd-t4)' }}>{label}</span>
                          <SortIcon k={key} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cd-t4)' }}>{t.status}</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cd-t4)' }}>{t.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm" style={{ color: 'var(--cd-t4)' }}>
                        {t.noResults}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((doctor, idx) => (
                      <tr
                        key={doctor.id}
                        style={{
                          borderBottom: idx < filtered.length - 1 ? `1px solid ${border}` : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(doctor.id)} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{initials(doctor.full_name)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--cd-t1)' }}>
                                {doctor.full_name || '—'}
                              </p>
                              <p className="text-[11px]" style={{ color: 'var(--cd-t5)' }}>
                                <Phone className="w-2.5 h-2.5 inline mr-1" />
                                {doctor.phone || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: 'var(--cd-t3)' }}>{doctor.email || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {doctor.specialty ? (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#0EA5E9' }}
                            >
                              {doctor.specialty}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--cd-t5)' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cd-t5)' }} />
                            <span className="text-sm capitalize" style={{ color: 'var(--cd-t3)' }}>
                              {doctor.hospital_clinic || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--cd-t4)' }}>
                            {formatDate(doctor.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doctor.status} />
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons doctor={doctor} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: `1px solid ${border}`, background: headBg }}
              >
                <p className="text-xs" style={{ color: 'var(--cd-t5)' }}>
                  {filtered.length} / {doctors.length} {t.total}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
