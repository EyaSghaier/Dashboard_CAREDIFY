import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { UserStatus } from '../../lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  medical_license_number: string | null;
  hospital_clinic: string | null;
  specialty: string | null;
  phone: string | null;
  role: string | null;
  /** Statut du compte — utilisé pour les guards de routes */
  status: UserStatus | null;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  logout: () => Promise<void>;
  signout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fonction de fetch profil robuste avec gestion d'erreur
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔹 [AUTH] Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          specialty,
          hospital_clinic,
          medical_license_number,
          role,
          status,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ [AUTH] Error fetching profile:', error);
        // Ne pas throw pour éviter de bloquer l'app
        return null;
      }

      if (!data) {
        console.log('ℹ️ [AUTH] No profile found for user:', userId);
        return null;
      }

      console.log('✅ [AUTH] Profile loaded:', data.full_name);
      return data as Profile;
      
    } catch (err) {
      console.error('❌ [AUTH] Exception in fetchProfile:', err);
      return null;
    }
  }, []);

  // ✅ Fonction refreshProfile publique
  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ [AUTH] No user ID for refreshProfile');
      return;
    }
    
    const freshProfile = await fetchProfile(user.id);
    if (freshProfile) {
      setProfile(freshProfile);
    }
  }, [user?.id, fetchProfile]);

  // ✅ Initialisation au montage
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔹 [AUTH] Initializing auth...');
        
        // Récupérer la session actuelle
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [AUTH] Session error:', sessionError);
        }

        if (isMounted) {
          setSession(currentSession ?? null);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            // Fetch profil en parallèle
            const userProfile = await fetchProfile(currentSession.user.id);
            if (isMounted && userProfile) {
              setProfile(userProfile);
            }
          }
        }
      } catch (err) {
        console.error('❌ [AUTH] Initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // ✅ Écouteur des changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        console.log(`🔹 [AUTH] Auth state changed: ${event}`);
        
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          const userProfile = await fetchProfile(newSession.user.id);
          if (isMounted && userProfile) {
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ✅ Déconnexion
  const signout = async () => {
    console.log('🔹 [AUTH] Signing out...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      console.log('✅ [AUTH] Signed out successfully');
    } catch (err) {
      console.error('❌ [AUTH] Sign out error:', err);
    }
  };

  // ✅ logout = alias pour compatibilité
  const logout = signout;

  const value: AuthContextType = {
    user,
    profile,
    session,
    logout,
    signout,
    refreshProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook useAuth avec type safety
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ✅ Hook optionnel pour attendre l'auth
export const useRequireAuth = (redirectUrl = '/login') => {
  const { user, loading } = useAuth();
  
  // Ici vous pourriez ajouter une navigation vers redirectUrl si !user && !loading
  // Mais cela dépend de votre router (React Router, etc.)
  
  return { user, loading };
};