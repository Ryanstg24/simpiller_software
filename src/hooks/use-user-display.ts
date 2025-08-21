import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserDisplay() {
  const { user, isSimpillerAdmin, isOrganizationAdmin, isProvider, isBilling, userOrganizationId } = useAuth();
  const [userInfo, setUserInfo] = useState({ 
    name: "User", 
    initials: "U", 
    role: "User",
    organizationId: null as string | null,
    organizationName: null as string | null
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setUserInfo({ 
          name: "User", 
          initials: "U", 
          role: "User",
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
          
          if (firstName || lastName) {
            const fullName = `${firstName} ${lastName}`.trim();
            const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
            setUserInfo({ 
              name: fullName, 
              initials: initials || "U", 
              role,
              organizationId: userOrganizationId,
              organizationName: null
            });
          } else {
            // Fallback to email if no name is set
            const email = userData.email || user.email || "User";
            const initials = email.charAt(0).toUpperCase();
            setUserInfo({ 
              name: email, 
              initials, 
              role,
              organizationId: userOrganizationId,
              organizationName: null
            });
          }
        }
      } catch (error) {
        console.error('Error in useUserDisplay:', error);
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

  return userInfo;
} 