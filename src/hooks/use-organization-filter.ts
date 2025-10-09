'use client';

import { useState, useEffect } from 'react';
import { useAuthV2 } from '@/contexts/auth-context-v2';

export function useOrganizationFilter() {
  const { isSimpillerAdmin } = useAuthV2();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  // Reset filter when user is no longer a Simpiller Admin
  useEffect(() => {
    if (!isSimpillerAdmin) {
      setSelectedOrganizationId(null);
    }
  }, [isSimpillerAdmin]);

  const handleOrganizationChange = (organizationId: string | null) => {
    setSelectedOrganizationId(organizationId);
  };

  return {
    selectedOrganizationId,
    handleOrganizationChange,
    isSimpillerAdmin
  };
}
