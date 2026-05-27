import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values for environments where .env is not injected (e.g. Figma Make sandbox).
// The anon key is safe to ship in client-side code — it is restricted by Row Level Security.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  || 'https://sjwehettourojokbuahr.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd2VoZXR0b3Vyb2pva2J1YWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTcwNDksImV4cCI6MjA5MTIzMzA0OX0.VPEcRhTf_FwRVuYbP0uNA3pEe-VAPS-2DxQGyP9h5Sc';

// Development mode for testing when Supabase is not available
const isDevelopment = import.meta.env.DEV;

export const isSupabaseConfigured = true;
export const isDemoMode = isDevelopment;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserStatus = 'pending' | 'verified' | 'active' | 'suspended' | 'rejected';

/**
 * 'carediologue' is kept for backward compatibility with existing rows in the DB.
 * All new sign-ups use 'carediologue'.
 */
export type UserRole = 'carediologue' | 'doctor' | 'admin' | 'nurse' | 'patient';

/** Returns true when the role is a medical doctor (handles legacy 'doctor'). */
export const isDoctor = (role: string | null | undefined): boolean =>
  role === 'carediologue' || role === 'doctor';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  medical_license_number?: string | null;
  hospital_clinic?: string | null;
  specialty?: string | null;
  phone?: string | null;
  status: UserStatus;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

// Demo authentication helper
export const createDemoSession = (email: string) => {
  const demoUserId = 'demo-user-' + Date.now();
  const demoSession = {
    access_token: 'demo-token-' + Date.now(),
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'demo-refresh-' + Date.now(),
    user: {
      id: demoUserId,
      email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        full_name: email.split('@')[0],
      },
      app_metadata: {
        provider: 'demo',
        providers: ['demo'],
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  // Store in localStorage to simulate Supabase
  try {
    const storageKey = 'sb-' + supabaseUrl.split('.')[0].split('//')[1] + '-auth-token';
    localStorage.setItem(storageKey, JSON.stringify(demoSession));
    console.log('✅ [SUPABASE] Demo session created:', demoUserId);
  } catch (err) {
    console.warn('⚠️ [SUPABASE] Could not store demo session:', err);
  }

  return { data: { session: demoSession }, error: null };
};

// Override signInWithPassword to support demo mode
const originalSignInWithPassword = supabase.auth.signInWithPassword.bind(supabase.auth);

const patchedSignInWithPassword = (async (credentials: { email: string; password: string }) => {
  try {
    console.log('🔹 [SUPABASE] Attempting real authentication...');
    const result = await originalSignInWithPassword(credentials);
    return result;
  } catch (err: unknown) {
    const error = err as { message?: string };

    // If we're in demo mode and get an auth error, offer demo login
    if (isDevelopment && error.message?.includes('credentials')) {
      console.log('🟡 [SUPABASE] Real authentication failed, demo mode available');
      // Return the error so the UI can offer demo login
      return { data: null, error: err as never };
    }

    // For other errors, return as-is
    return { data: null, error: err as never };
  }
}) as typeof supabase.auth.signInWithPassword;

supabase.auth.signInWithPassword = patchedSignInWithPassword;

// Export demo login function for UI
export const signInWithDemo = async (email: string) => {
  return createDemoSession(email);
};
