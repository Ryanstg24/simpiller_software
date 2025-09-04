'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
      // Combine both queries into a single request using Promise.all for parallel execution
      const [roleResult, userResult] = await Promise.all([
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

      // Process role data
      if (roleResult.error) {
        console.error('Error fetching role assignments:', roleResult.error);
      } else if (roleResult.data && roleResult.data.length > 0) {
        const roles = roleResult.data
          .map(assignment => assignment.user_roles)
          .filter(Boolean)
          .flat();
        setUserRoles(roles);
      } else {
        setUserRoles([]);
      }

      // Process password change requirement
      if (!userResult.error && userResult.data) {
        setPasswordChangeRequired(userResult.data.password_change_required || false);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
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
    await supabase.auth.signOut();
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
    isSimpillerAdmin: mounted ? userRoles.some(role => role.name === 'simpiller_admin') : false,
    isOrganizationAdmin: mounted ? userRoles.some(role => role.name === 'organization_admin') : false,
    isProvider: mounted ? userRoles.some(role => role.name === 'provider') : false,
    isBilling: mounted ? userRoles.some(role => role.name === 'billing') : false,
    userOrganizationId: mounted ? userRoles.find(role => role.organization_id)?.organization_id || null : null,
    signIn,
    signOut,
    refreshSession: () => {
      // Refresh session logic if needed
    },
    passwordChangeRequired: mounted ? passwordChangeRequired : false,
    setPasswordChangeRequired: (required: boolean) => {
      // This function will be used to manage the password change modal state
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