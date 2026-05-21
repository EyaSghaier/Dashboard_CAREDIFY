import React, { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { Layout } from './components/Layout';
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

const ProtectedLayout: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // ✅ Vérification directe Supabase — avec timeout pour éviter un écran blanc
    const initAuth = async () => {
      const timeoutMs = 8000;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), timeoutMs);
        });

        const { data: { session } } = (await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ])) as { data: { session: unknown } };

        if (isMounted) {
          setHasSession(!!session);
          setChecked(true);
        }
      } catch (err) {
        console.error('❌ [PROTECTED_LAYOUT] Error checking session:', err);
        if (isMounted) {
          setHasSession(false);
          setChecked(true);
        }
      }
    };

    initAuth();

    // ✅ Écouteur des changements d'auth pour les changements ultérieurs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        console.log(`🔹 [PROTECTED_LAYOUT] Auth state changed: ${event}`);
        setHasSession(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Attendre la vérification (court — local storage Supabase)
  if (!checked) return null;

  if (!hasSession) return <Navigate to="/login" replace />;

  return <Layout />;
};

export const router = createBrowserRouter([
  { path: '/login',           Component: LoginPage },
  { path: '/signup',          Component: SignUpPage },
  { path: '/forgot-password', Component: ForgotPasswordPage },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      { index: true,          element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    Component: DashboardPage },
      { path: 'patients',     Component: PatientsPage },
      { path: 'patients/:id', Component: PatientDetailPage },
      { path: 'alerts',       Component: AlertsPage },
      { path: 'messages',     Component: MessagesPage },
      { path: 'map',          Component: MapPage },
      { path: 'settings',     Component: SettingsPage },
      { path: '*',            element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
