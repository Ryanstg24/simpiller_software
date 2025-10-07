'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  
  // Role caching to prevent excessive database queries
  const lastRoleFetchTime = useRef<number>(0);
  const lastRoleFetchUserId = useRef<string | null>(null);
  const hasInitializedRoles = useRef<boolean>(false); // Track if roles fetched for current session
  const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  // Fetch user roles with proper error handling and timeout
  const fetchUserRoles = useCallback(async (userId: string, forceRefresh: boolean = false): Promise<UserRole[]> => {
    // Check cache first - if we fetched roles recently for this user, return cached roles
    const now = Date.now();
    const timeSinceLastFetch = now - lastRoleFetchTime.current;
    const isSameUser = lastRoleFetchUserId.current === userId;
    
    if (!forceRefresh && isSameUser && timeSinceLastFetch < ROLE_CACHE_TTL && userRoles.length > 0) {
      console.log(`[Auth V2] Using cached roles (age: ${Math.round(timeSinceLastFetch / 1000)}s)`);
      return userRoles;
    }
    
    try {
      console.log(`[Auth V2] Fetching fresh roles for user: ${userId}`);
      // Increased timeout from 5s to 15s for better reliability
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Role fetch timeout')), 15000)
      );

      const fetchPromise = (async () => {
        // First get the role assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from('user_role_assignments')
          .select('role_id')
          .eq('user_id', userId);

        if (assignmentsError) {
          console.error('[Auth V2] Error fetching role assignments:', assignmentsError);
          // Return current roles instead of empty array to prevent access loss
          return userRoles.length > 0 ? userRoles : [];
        }

        if (!assignments || assignments.length === 0) {
          console.warn('[Auth V2] No role assignments found for user:', userId);
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
          // Return current roles instead of empty array to prevent access loss
          return userRoles.length > 0 ? userRoles : [];
        }

        if (!data || data.length === 0) {
          console.warn('[Auth V2] No roles found for role IDs');
          return [];
        }

        // Transform the data to match our interface
        const roles: UserRole[] = data.map((role: DatabaseUserRole) => ({
          id: role.id,
          name: role.name,
          organization_id: role.organization_id,
          facility_id: role.facility_id,
          permissions: role.permissions || {}
        }));

        // Update cache tracking
        lastRoleFetchTime.current = Date.now();
        lastRoleFetchUserId.current = userId;

        return roles;
      })();

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('[Auth V2] Exception fetching roles:', error);
      // If we have existing roles, keep them instead of clearing to prevent access denial
      if (userRoles.length > 0) {
        console.warn('[Auth V2] Keeping existing roles due to fetch error');
        return userRoles;
      }
      // Only return empty if we truly have no roles
      return [];
    }
  }, [userRoles]);

  // Fetch password change requirement with timeout
  const fetchPasswordChangeRequired = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Increased timeout from 3s to 10s for better reliability
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Password check timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('users')
        .select('password_change_required')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('[Auth V2] Error fetching password change requirement:', error);
        // On error, keep existing state instead of defaulting to false
        return passwordChangeRequired;
      }

      return data?.password_change_required || false;
    } catch (error) {
      console.error('[Auth V2] Exception fetching password change requirement:', error);
      // On timeout/exception, keep existing state to avoid unnecessary prompts
      return passwordChangeRequired;
    }
  }, [passwordChangeRequired]);

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
      // Only fetch roles on INITIAL_SESSION or first SIGNED_IN
      // CRITICAL FIX: SIGNED_IN can fire multiple times - we only want to fetch once per session
      const shouldFetchRoles = (event === 'INITIAL_SESSION') || 
                               (event === 'SIGNED_IN' && !hasInitializedRoles.current);
      
      if (shouldFetchRoles) {
        console.log('[Auth V2] Fetching roles for event:', event);
        try {
          // Fetch roles - always needed
          const roles = await fetchUserRoles(session.user.id);
          setUserRoles(roles);
          hasInitializedRoles.current = true; // Mark as initialized
          
          // Only check password requirement on actual sign-in, not on page load
          // This reduces database queries and prevents unnecessary modal triggers
          if (event === 'SIGNED_IN') {
            const passwordRequired = await fetchPasswordChangeRequired(session.user.id);
            setPasswordChangeRequired(passwordRequired);
          }
        } catch (error) {
          console.error('[Auth V2] Error in auth state change:', error);
          // Don't clear existing roles on error - keep them for stability
          if (userRoles.length === 0) {
            setUserRoles([]);
          }
          // Don't change password requirement on error
        }
      } else {
        console.log('[Auth V2] Skipping role fetch for event:', event, '(already initialized)');
      }
      // For TOKEN_REFRESHED and subsequent SIGNED_IN events, keep existing roles
      // Don't refetch roles unnecessarily
    } else {
      // User signed out - reset everything
      setUserRoles([]);
      setPasswordChangeRequired(false);
      hasInitializedRoles.current = false; // Reset for next session
    }

    setIsLoading(false);
  }, [fetchUserRoles, fetchPasswordChangeRequired, userRoles.length]);

  // Initialize auth on mount - only run once
  useEffect(() => {
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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

  // Get organization ID with proper role prioritization
  // CRITICAL FIX: Previously used .find() which returned FIRST role, causing org admins
  // to see wrong organization's data if they had multiple roles
  const userOrganizationId = (() => {
    // Priority 1: organization_admin (highest authority)
    const orgAdminRole = userRoles.find(role => role.name === 'organization_admin');
    if (orgAdminRole?.organization_id) {
      console.log('[Auth V2] Using organization_admin org:', orgAdminRole.organization_id);
      return orgAdminRole.organization_id;
    }
    
    // Priority 2: provider
    const providerRole = userRoles.find(role => role.name === 'provider');
    if (providerRole?.organization_id) {
      console.log('[Auth V2] Using provider org:', providerRole.organization_id);
      return providerRole.organization_id;
    }
    
    // Priority 3: billing
    const billingRole = userRoles.find(role => role.name === 'billing');
    if (billingRole?.organization_id) {
      console.log('[Auth V2] Using billing org:', billingRole.organization_id);
      return billingRole.organization_id;
    }
    
    // Fallback: any non-simpiller_admin role
    const anyRole = userRoles.find(role => 
      role.name !== 'simpiller_admin' && role.organization_id
    );
    if (anyRole?.organization_id) {
      console.log('[Auth V2] Using fallback role org:', anyRole.organization_id);
    }
    return anyRole?.organization_id || null;
  })();


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
