'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface UserRole {
  id: string;
  name: string;
  organization_id?: string;
  facility_id?: string;
  permissions: Record<string, unknown>;
}

interface DatabaseUserRole {
  id: string;
  name: string;
  organization_id?: string;
  facility_id?: string;
  permissions?: Record<string, unknown>;
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
  passwordChangeRequired: boolean;
  setPasswordChangeRequired: (required: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProviderV2({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const router = useRouter();

  // Fetch user roles with proper error handling and caching
  const fetchUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    try {
      console.log('[Auth V2] Fetching user roles for:', userId);
      
      // First get the role assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_role_assignments')
        .select('role_id')
        .eq('user_id', userId);

      if (assignmentsError) {
        console.error('[Auth V2] Error fetching role assignments:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('[Auth V2] No role assignments found for user');
        return [];
      }

      // Then get the role details
      const roleIds = assignments.map(a => a.role_id);
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, name, organization_id, facility_id, permissions')
        .in('id', roleIds);

      if (error) {
        console.error('[Auth V2] Error fetching roles:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('[Auth V2] No roles found for user');
        return [];
      }

      console.log('[Auth V2] Raw data from database:', data);

      // Transform the data to match our interface
      const roles: UserRole[] = data.map((role: DatabaseUserRole) => ({
        id: role.id,
        name: role.name,
        organization_id: role.organization_id,
        facility_id: role.facility_id,
        permissions: role.permissions || {}
      }));

      console.log('[Auth V2] User roles fetched successfully:', roles);
      return roles;
    } catch (error) {
      console.error('[Auth V2] Exception fetching roles:', error);
      return [];
    }
  }, []);

  // Fetch password change requirement
  const fetchPasswordChangeRequired = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('password_change_required')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth V2] Error fetching password change requirement:', error);
        return false;
      }

      return data?.password_change_required || false;
    } catch (error) {
      console.error('[Auth V2] Exception fetching password change requirement:', error);
      return false;
    }
  }, []);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth V2] Error getting session:', error);
        setSession(null);
        setUser(null);
        setUserRoles([]);
        setPasswordChangeRequired(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch roles and password requirement in parallel
        const [roles, passwordRequired] = await Promise.all([
          fetchUserRoles(session.user.id),
          fetchPasswordChangeRequired(session.user.id)
        ]);

        setUserRoles(roles);
        setPasswordChangeRequired(passwordRequired);
      } else {
        setUserRoles([]);
        setPasswordChangeRequired(false);
      }
    } catch (error) {
      console.error('[Auth V2] Error initializing auth:', error);
      setSession(null);
      setUser(null);
      setUserRoles([]);
      setPasswordChangeRequired(false);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserRoles, fetchPasswordChangeRequired]);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('[Auth V2] Auth state change:', event);
    
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      try {
        // Fetch roles and password requirement in parallel
        const [roles, passwordRequired] = await Promise.all([
          fetchUserRoles(session.user.id),
          fetchPasswordChangeRequired(session.user.id)
        ]);

        setUserRoles(roles);
        setPasswordChangeRequired(passwordRequired);
      } catch (error) {
        console.error('[Auth V2] Error in auth state change:', error);
        // Set default values on error to prevent app from breaking
        setUserRoles([]);
        setPasswordChangeRequired(false);
      }
    } else {
      setUserRoles([]);
      setPasswordChangeRequired(false);
    }

    setIsLoading(false);
  }, [fetchUserRoles, fetchPasswordChangeRequired]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, handleAuthStateChange]);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setPasswordChangeRequired(false);
      router.push('/login');
    } catch (error) {
      console.error('[Auth V2] Error signing out:', error);
      // Force redirect even if signout fails
      router.push('/login');
    }
  }, [router]);

  // Computed role flags
  const isSimpillerAdmin = userRoles.some(role => role.name === 'simpiller_admin');
  const isOrganizationAdmin = userRoles.some(role => role.name === 'organization_admin');
  const isProvider = userRoles.some(role => role.name === 'provider');
  const isBilling = userRoles.some(role => role.name === 'billing');

  // Get organization ID from non-admin roles
  const userOrganizationId = userRoles.find(role => 
    role.name !== 'simpiller_admin'
  )?.organization_id || null;

  const contextValue: AuthContextType = {
    user,
    session,
    userRoles,
    isLoading,
    signIn,
    signOut,
    isSimpillerAdmin,
    isOrganizationAdmin,
    isProvider,
    isBilling,
    userOrganizationId,
    passwordChangeRequired,
    setPasswordChangeRequired
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthV2() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthV2 must be used within an AuthProviderV2');
  }
  return context;
}
