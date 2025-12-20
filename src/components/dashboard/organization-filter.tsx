'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Building2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

interface OrganizationFilterProps {
  selectedOrganizationId: string | null;
  onOrganizationChange: (organizationId: string | null) => void;
  className?: string;
}

export function OrganizationFilter({ 
  selectedOrganizationId, 
  onOrganizationChange, 
  className = '' 
}: OrganizationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: organizations = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        throw new Error('Failed to fetch organizations');
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const selectedOrg = organizations.find(org => org.id === selectedOrganizationId);
  const displayName = selectedOrg 
    ? selectedOrg.acronym || selectedOrg.name
    : 'All Organizations';

  const handleSelect = (organizationId: string | null) => {
    onOrganizationChange(organizationId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-lg h-10 w-48"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
          Error loading organizations
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center">
          <Building2 className="h-4 w-4 mr-2 text-gray-500" />
          <span className="truncate">{displayName}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {/* All Organizations Option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center ${
                selectedOrganizationId === null 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-700'
              }`}
            >
              <Building2 className="h-4 w-4 mr-2 text-gray-500" />
              <span>All Organizations</span>
            </button>

            {/* Organization Options */}
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center ${
                  selectedOrganizationId === org.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                <div className="flex flex-col">
                  <span className="truncate">{org.name}</span>
                  {org.acronym && (
                    <span className="text-xs text-gray-500 truncate">{org.acronym}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
