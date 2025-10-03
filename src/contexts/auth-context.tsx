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
  const [rolesFetched, setRolesFetched] = useState(false);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [fetchInterval, setFetchInterval] = useState<number>(600000); // 10 minutes default
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
      setRolesFetched(false);
      setLastFetchedUserId(null);
      
      // Force redirect to login page
      console.log('Session timeout - redirecting to login');
      router.push('/login');
    } catch (error) {
      console.error('Error during session timeout signout:', error);
      // Even if signout fails, redirect to login
      router.push('/login');
    }
  };

  // Temporarily disable session timeout to fix platform instability
  // TODO: Re-enable once auth system is stable
  useSessionTimeout({
    timeoutMinutes: 30, // 30 minutes of inactivity
    onTimeout: handleSessionTimeout,
    enabled: false // Disabled to prevent platform instability
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
        console.log('[Auth Context] Auth state change:', event, session?.user?.id);
        
        // Only process significant auth changes
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserRoles(session.user.id);
          } else {
            setUserRoles([]);
            setRolesFetched(false);
            setLastFetchedUserId(null);
          }
        } else {
          console.log('[Auth Context] Ignoring auth event:', event);
        }
        
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRoles = async (userId: string, forceRefresh = false) => {
    // Don't fetch if we already have roles for this user and it's not a forced refresh
    if (rolesFetched && lastFetchedUserId === userId && !forceRefresh) {
      console.log('User roles already fetched for this user, skipping...');
      return;
    }

    // Debounce: Don't fetch if we've fetched in the last 5 seconds (unless forced)
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime) < fetchInterval) {
      console.log('Debouncing role fetch - too soon since last fetch (interval:', fetchInterval / 1000, 'seconds)');
      return;
    }

    // If we have roles for a different user, clear them first
    if (lastFetchedUserId && lastFetchedUserId !== userId) {
      console.log('User changed, clearing previous roles');
      setUserRoles([]);
      setRolesFetched(false);
      setLastFetchedUserId(null);
    }

    try {
      console.log('Fetching user roles for user:', userId);
      // Increase timeout to 30 seconds to prevent frequent timeouts
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('User roles fetch timeout')), 30000)
      );

      // Try a simpler approach first - get role assignments and then fetch roles separately
      const roleAssignmentsPromise = supabase
        .from('user_role_assignments')
        .select('role_id')
        .eq('user_id', userId);

      const userPromise = supabase
        .from('users')
        .select('password_change_required')
        .eq('id', userId)
        .single();

      const [roleAssignmentsResult, userResult] = await Promise.race([
        Promise.all([roleAssignmentsPromise, userPromise]),
        timeoutPromise
      ]);

      let roles: UserRole[] = [];
      
      if (!roleAssignmentsResult.error && roleAssignmentsResult.data && roleAssignmentsResult.data.length > 0) {
        // Get the role IDs
        const roleIds = roleAssignmentsResult.data.map(assignment => assignment.role_id);
        
        // Fetch the actual roles
        const rolesResult = await supabase
          .from('user_roles')
          .select('id, name, organization_id, facility_id, permissions')
          .in('id', roleIds);
          
        if (!rolesResult.error && rolesResult.data) {
          roles = rolesResult.data;
        }
      }

      // Set the roles
      setUserRoles(roles);

      // Process password change requirement
      if (!userResult.error && userResult.data) {
        const requiresPasswordChange = userResult.data.password_change_required || false;
        console.log('Password change required:', requiresPasswordChange);
        setPasswordChangeRequired(requiresPasswordChange);
      } else {
        setPasswordChangeRequired(false); // Set default on error
      }

      // Mark roles as fetched for this user
      setRolesFetched(true);
      setLastFetchedUserId(userId);
      setLastFetchTime(now);
      console.log('User roles fetched successfully');
    } catch (error) {
      console.error('Error fetching user roles:', error);
      
      // If we already have roles and this is just a timeout, don't clear them
      if (rolesFetched && userRoles.length > 0 && error instanceof Error && error.message.includes('timeout')) {
        console.log('Timeout occurred but keeping existing roles to prevent access denied');
        return;
      }
      
      // If this is a timeout and we don't have roles, keep empty roles instead of fallback
      // This prevents the system from incorrectly assigning "provider" role to Simpiller Admins
      if (error instanceof Error && error.message.includes('timeout') && !rolesFetched) {
        console.log('Timeout on first fetch - keeping empty roles, user will need to refresh');
        setUserRoles([]);
        setPasswordChangeRequired(false);
        setRolesFetched(false);
        setLastFetchedUserId(null);
        return;
      }
      
      // Only clear roles if this is a critical error (not timeout) and we don't have existing roles
      if (!rolesFetched || userRoles.length === 0) {
        console.log('Critical error and no existing roles - clearing auth state');
        setUserRoles([]);
        setPasswordChangeRequired(false);
        setRolesFetched(false);
        setLastFetchedUserId(null);
      } else {
        console.log('Critical error but keeping existing roles to prevent platform instability');
      }
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
    refreshSession: async () => {
      // Refresh user data from database
      if (user?.id) {
        console.log('Refreshing user session data...');
        await fetchUserRoles(user.id, true); // Force refresh
      }
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