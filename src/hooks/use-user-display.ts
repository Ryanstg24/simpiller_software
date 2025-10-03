import { useAuthV2 } from '@/contexts/auth-context-v2';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserDisplay() {
  const { user, isSimpillerAdmin, isOrganizationAdmin, isProvider, isBilling, userOrganizationId } = useAuthV2();
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState({ 
    name: "Loading...", 
    initials: "L", 
    role: "Loading...",
    organizationId: null as string | null,
    organizationName: null as string | null
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setUserInfo({ 
          name: "Guest", 
          initials: "G", 
          role: "Guest",
          organizationId: null,
          organizationName: null
        });
        return;
      }

      try {
        // Fetch user info from our custom users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user info:', userError);
          // Fallback to email
          const email = user.email || "User";
          const initials = email.charAt(0).toUpperCase();
          setUserInfo({ 
            name: email, 
            initials, 
            role: "User",
            organizationId: userOrganizationId,
            organizationName: null
          });
          return;
        }

        // Determine role from auth context
        let role = "User";
        if (isSimpillerAdmin) {
          role = 'Simpiller Admin';
        } else if (isOrganizationAdmin) {
          role = 'Organization Admin';
        } else if (isProvider) {
          role = 'Provider';
        } else if (isBilling) {
          role = 'Billing';
        }

        if (userData) {
          const firstName = userData.first_name || '';
          const lastName = userData.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.email || "User";
          const initials = firstName && lastName ? 
            `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : 
            (user.email?.charAt(0).toUpperCase() || "U");

          setUserInfo({ 
            name: fullName, 
            initials, 
            role,
            organizationId: userOrganizationId,
            organizationName: null
          });
        }
      } catch (error) {
        console.error('Error in fetchUserInfo:', error);
        // Fallback to email
        const email = user.email || "User";
        const initials = email.charAt(0).toUpperCase();
        setUserInfo({ 
          name: email, 
          initials, 
          role: "User",
          organizationId: userOrganizationId,
          organizationName: null
        });
      }
    };

    fetchUserInfo();
  }, [user, isSimpillerAdmin, isOrganizationAdmin, isProvider, isBilling, userOrganizationId]);

  // Return loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return { 
      name: "Loading...", 
      initials: "L", 
      role: "Loading...",
      organizationId: null,
      organizationName: null
    };
  }

  return userInfo;
} 