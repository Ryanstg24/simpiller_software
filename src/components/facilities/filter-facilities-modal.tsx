'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2";
import { useOrganizations } from "@/hooks/use-organizations";
import { supabase } from "@/lib/supabase";

interface FilterFacilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FacilityFilters) => void;
  currentFilters: FacilityFilters;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export interface FacilityFilters {
  organization_id?: string;
  status?: 'all' | 'active' | 'inactive';
  search?: string;
  city?: string;
  state?: string;
}

export function FilterFacilitiesModal({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  currentFilters,
  buttonRef
}: FilterFacilitiesModalProps) {
  const { isSimpillerAdmin, user } = useAuth();
  const { organizations } = useOrganizations();
  const [userOrganizationId, setUserOrganizationId] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<FacilityFilters>({
    organization_id: currentFilters.organization_id || '',
    status: currentFilters.status || 'all',
    search: currentFilters.search || '',
    city: currentFilters.city || '',
    state: currentFilters.state || ''
  });

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node) &&
          buttonRef?.current && !buttonRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  // Get user's organization if they're not a Simpiller Admin
  useEffect(() => {
    const getUserOrganization = async () => {
      if (!isSimpillerAdmin && user) {
        try {
          const { data: userRoles, error } = await supabase
            .from('user_role_assignments')
            .select(`
              user_roles (
                organization_id
              )
            `)
            .eq('user_id', user.id);

          if (!error && userRoles && userRoles.length > 0) {
            const orgId = (userRoles[0].user_roles as { organization_id?: string })?.organization_id;
            if (orgId) {
              setUserOrganizationId(orgId);
              setFormData(prev => ({ ...prev, organization_id: orgId }));
            }
          }
        } catch (err) {
          console.error('Error fetching user organization:', err);
        }
      }
    };

    getUserOrganization();
  }, [isSimpillerAdmin, user]);

  // Fetch unique cities and states for dropdowns
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        let query = supabase
          .from('facilities')
          .select('city, state')
          .not('city', 'is', null);

        if (!isSimpillerAdmin && userOrganizationId) {
          query = query.eq('organization_id', userOrganizationId);
        }

        const { data, error } = await query;

        if (!error && data) {
          const uniqueCities = [...new Set(data.map(f => f.city).filter(Boolean))].sort();
          const uniqueStates = [...new Set(data.map(f => f.state).filter(Boolean))].sort();
          
          setCities(uniqueCities);
          setStates(uniqueStates);
        }
      } catch (err) {
        console.error('Error fetching location data:', err);
      }
    };

    if (isOpen) {
      fetchLocationData();
    }
  }, [isOpen, isSimpillerAdmin, userOrganizationId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(formData);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: FacilityFilters = {
      organization_id: userOrganizationId || '',
      status: 'all',
      search: '',
      city: '',
      state: ''
    };
    setFormData(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={filterRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      style={{ minWidth: '320px' }}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">Filter Facilities</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Organization Filter (only for Simpiller Admins) */}
        {isSimpillerAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Organization
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => handleInputChange('organization_id', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.acronym})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={formData.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
            placeholder="Search by name or code"
          />
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            State
          </label>
          <select
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleClearFilters}
            className="text-xs px-3 py-1"
          >
            Clear All
          </Button>
          <Button 
            type="button"
            size="sm"
            onClick={handleApplyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
} 