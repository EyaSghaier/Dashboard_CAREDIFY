import React, { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, useNavigate } from 'react-router';
import { supabase, isDoctor } from '../lib/supabase';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminShell } from './components/AdminShell';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { MessagesPage } from './pages/MessagesPage';
import { MapPage } from './pages/MapPage';
import { SettingsPage } from './pages/SettingsPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { SuspendedPage } from './pages/SuspendedPage';
import { RejectedPage } from './pages/RejectedPage';
import { UsersPage } from './pages/UsersPage';

// Guard: routes protégées pour les médecins actifs
const DoctorProtectedLayout: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) {
            setRedirect('/login');
            setChecked(true);
          }
          return;
        }

        // Charger role + status
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profile) {
          if (session.user.email?.toLowerCase() === 'admin@caredify.tn') {
            if (isMounted) {
              setRedirect('/admin/users');
              setChecked(true);
            }
            return;
          }

          if (isMounted) {
            setRedirect('/login');
            setChecked(true);
          }
          return;
        }

        const { role, status } = profile;

        // Admin → dashboard admin (par rôle OU par email)
        if (role === 'admin' || session.user.email?.toLowerCase() === 'admin@caredify.tn') {
          if (isMounted) {
            setRedirect('/admin/users');
            setChecked(true);
          }
          return;
        }

        // Doctor — vérifier statut
        if (isDoctor(role)) {
          if (status === 'active') {
            if (isMounted) setChecked(true);
          } else if (status === 'suspended') {
            if (isMounted) {
              setRedirect('/suspended');
              setChecked(true);
            }
          } else if (status === 'rejected') {
            if (isMounted) {
              setRedirect('/rejected');
              setChecked(true);
            }
          } else {
            if (isMounted) {
              setRedirect('/pending-approval');
              setChecked(true);
            }
          }
          return;
        }

        // Rôle inconnu
        if (isMounted) {
          setRedirect('/login');
          setChecked(true);
        }
      } catch {
        if (isMounted) {
          setRedirect('/login');
          setChecked(true);
        }
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!checked) return null;
  if (redirect) return <Navigate to={redirect} replace />;
  return <Layout />;
};

// Guard: route /pending-approval (médecin connecté mais pas encore actif)
const PendingGuard: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (profile?.role === 'admin' || user.email?.toLowerCase() === 'admin@caredify.tn') {
      navigate('/admin/users', { replace: true });
      return;
    }

    if (profile?.status === 'active') navigate('/dashboard', { replace: true });
    if (profile?.status === 'suspended') navigate('/suspended', { replace: true });
    if (profile?.status === 'rejected') navigate('/rejected', { replace: true });
  }, [user, profile, loading, navigate]);

  if (loading) return null;
  return <PendingApprovalPage />;
};

// Router
export const router = createBrowserRouter([
  // Authentification (publiques)
  { path: '/login', Component: LoginPage },
  { path: '/signup', Component: SignUpPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },

  // Pages de statut (accessibles après login, selon statut)
  { path: '/pending-approval', Component: PendingGuard },
  { path: '/suspended', Component: SuspendedPage },
  { path: '/rejected', Component: RejectedPage },

  // Dashboard médecin (protégé : connecté + status=active)
  {
    path: '/',
    Component: DoctorProtectedLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', Component: DashboardPage },
      { path: 'patients', Component: PatientsPage },
      { path: 'patients/:id', Component: PatientDetailPage },
      { path: 'alerts', Component: AlertsPage },
      { path: 'messages', Component: MessagesPage },
      { path: 'map', Component: MapPage },
      { path: 'settings', Component: SettingsPage },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },

  // Dashboard admin (protégé : role=admin — guard dans AdminShell)
  {
    path: '/admin',
    Component: AdminShell,
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', Component: UsersPage },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);
