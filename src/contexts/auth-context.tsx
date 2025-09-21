'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useRouter } from 'next/navigation';

interface UserRole {
  id: string;
  name: string;
  organization_id?: string;
  facility_id?: string;
  permissions: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSimpillerAdmin: boolean;
  isOrganizationAdmin: boolean;
  isProvider: boolean;
  isBilling: boolean;
  userOrganizationId: string | null;
  refreshSession: () => void;
  passwordChangeRequired: boolean;
  setPasswordChangeRequired: (required: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const router = useRouter();

  // Session timeout handling
  const handleSessionTimeout = async () => {
    console.log('Session timeout - signing out user');
    try {
      await supabase.auth.signOut();
      // Clear local state
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setPasswordChangeRequired(false);
      
      // Force redirect to login page
      console.log('Session timeout - redirecting to login');
      router.push('/login');
    } catch (error) {
      console.error('Error during session timeout signout:', error);
      // Even if signout fails, redirect to login
      router.push('/login');
    }
  };

  // Enable session timeout only when user is logged in
  useSessionTimeout({
    timeoutMinutes: 30, // 30 minutes of inactivity
    onTimeout: handleSessionTimeout,
    enabled: !!user && !!session
  });

  // Debug logging for session timeout
  useEffect(() => {
    console.log('[Auth Context] Session timeout enabled:', !!user && !!session, {
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      sessionId: session?.access_token?.substring(0, 10) + '...'
    });
  }, [user, session]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserRoles(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRoles(session.user.id);
        } else {
          setUserRoles([]);
        }
        
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('User roles fetch timeout')), 10000)
      );

      const fetchPromise = Promise.all([
        supabase
          .from('user_role_assignments')
          .select(`
            user_roles (
              id, 
              name, 
              organization_id, 
              facility_id, 
              permissions
            )
          `)
          .eq('user_id', userId),
        supabase
          .from('users')
          .select('password_change_required')
          .eq('id', userId)
          .single()
      ]);

      const [roleResult, userResult] = await Promise.race([fetchPromise, timeoutPromise]);

      // Process role data
      if (roleResult.error) {
        console.error('Error fetching role assignments:', roleResult.error);
        setUserRoles([]); // Set empty array on error
      } else if (roleResult.data && roleResult.data.length > 0) {
        const roles = roleResult.data
          .map((assignment: { user_roles: UserRole[] }) => assignment.user_roles)
          .filter(Boolean)
          .flat();
        setUserRoles(roles);
      } else {
        setUserRoles([]);
      }

      // Process password change requirement
      if (!userResult.error && userResult.data) {
        const requiresPasswordChange = userResult.data.password_change_required || false;
        console.log('Password change required:', requiresPasswordChange);
        setPasswordChangeRequired(requiresPasswordChange);
      } else {
        setPasswordChangeRequired(false); // Set default on error
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      // Set safe defaults on error
      setUserRoles([]);
      setPasswordChangeRequired(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setPasswordChangeRequired(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in signOut:', error);
      // Even if there's an error, clear the local state
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setPasswordChangeRequired(false);
      throw error;
    }
  };

  // Computed properties for role checking
  const isSimpillerAdmin = userRoles.some(role => role.name === 'simpiller_admin');
  const isOrganizationAdmin = userRoles.some(role => role.name === 'organization_admin');
  const isProvider = userRoles.some(role => role.name === 'provider');
  const isBilling = userRoles.some(role => role.name === 'billing');
  
  const userOrganizationId = userRoles.find(role => 
    role.name !== 'simpiller_admin'
  )?.organization_id || null;

  const contextValue: AuthContextType = {
    user: mounted ? user : null,
    session: mounted ? session : null,
    userRoles: mounted ? userRoles : [],
    isLoading: mounted ? isLoading : true,
    isSimpillerAdmin: mounted ? isSimpillerAdmin : false,
    isOrganizationAdmin: mounted ? isOrganizationAdmin : false,
    isProvider: mounted ? isProvider : false,
    isBilling: mounted ? isBilling : false,
    userOrganizationId: mounted ? userOrganizationId : null,
    signIn,
    signOut,
    refreshSession: () => {
      // Refresh session logic if needed
    },
    passwordChangeRequired: mounted ? passwordChangeRequired : false,
    setPasswordChangeRequired: (required: boolean) => {
      // This function will be used to manage the password change modal state
      console.log('Setting password change required:', required);
      setPasswordChangeRequired(required);
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}