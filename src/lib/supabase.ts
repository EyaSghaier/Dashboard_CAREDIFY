import { createClient } from '@supabase/supabase-js';

// The anon key is safe to ship in client-side code — it is restricted by Row Level Security.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  || 'https://sjwehettourojokbuahr.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd2VoZXR0b3Vyb2pva2J1YWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTcwNDksImV4cCI6MjA5MTIzMzA0OX0.VPEcRhTf_FwRVuYbP0uNA3pEe-VAPS-2DxQGyP9h5Sc';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserStatus = 'pending' | 'verified' | 'active' | 'suspended' | 'rejected';

/**
 * 'carediologue' is kept for backward compatibility with existing rows in the DB.
 * All new sign-ups use 'carediologue'.
 */
export type UserRole = 'carediologue' | 'doctor' | 'admin';

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