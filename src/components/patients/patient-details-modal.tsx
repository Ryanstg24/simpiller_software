'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Edit, Save, User, Pill, Calendar, Activity, Clock, Plus, Trash2 } from 'lucide-react';
import { Patient, usePatients } from '@/hooks/use-patients';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { MedicationModal } from '@/components/medications/medication-modal';
import { usePharmacies, PARTNERED_PHARMACY_NAME } from '@/hooks/use-pharmacies';
import { useDRxSyncStatus } from '@/hooks/use-drx-sync-status';
import { ComplianceLogTab } from './compliance-log-tab';
import { TimeLogTab } from './time-log-tab';
import { HybridTimeInput } from '@/components/ui/hybrid-time-input';

interface PatientDetailsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onPatientUpdated: () => void;
  initialTab?: 'details' | 'medications' | 'compliance' | 'timeLog';
}

interface Medication {
  id?: string;
  patient_id: string;
  prescribed_by_id?: string;
  pharmacy_npi?: string;
  name: string;
  generic_name?: string;
  ndc_id?: string;
  medispan_id?: string;
  drug_class?: string;
  strength: string;
  format: string;
  dose_count: number;
  max_daily: number;
  quantity: number;
  frequency: number;
  time_of_day?: string;
  custom_time?: string; // New field for custom time
  with_food: boolean;
  avoid_alcohol: boolean;
  impairment_warning: boolean;
  special_instructions?: string;
  rx_number?: string;
  rx_filled_date?: string;
  rx_refills: number;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  last_dose_at?: string;
  patients?: {
    first_name: string;
    last_name: string;
    morning_time?: string;
    afternoon_time?: string;
    evening_time?: string;
    bedtime?: string;
    timezone?: string;
  };
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function PatientDetailsModal({ patient, isOpen, onClose, onPatientUpdated, initialTab }: PatientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'medications' | 'compliance' | 'timeLog'>(initialTab || 'details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuthV2();
  const { pharmacies, loading: pharmaciesLoading } = usePharmacies();
  const { invalidatePatients } = usePatients();
  const { syncStatus: drxSyncStatus, loading: drxSyncLoading } = useDRxSyncStatus(patient?.id || null);
  
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [providersFetchedForPatient, setProvidersFetchedForPatient] = useState<string | null>(null);

  // Ensure tab reflects requested initial tab when opening or changing patient
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'details');
    } else {
      // Reset providers fetched state when modal closes
      setProvidersFetchedForPatient(null);
    }
  }, [isOpen, initialTab, patient?.id]);

  // Form data for editing patient
  const [formData, setFormData] = useState<Partial<Patient>>({});

  // Check if user can edit provider assignment
  const canEditProvider = isSimpillerAdmin || isOrganizationAdmin;
  // Check if user can edit pharmacy assignment
  const canEditPharmacy = isSimpillerAdmin || isOrganizationAdmin;


  const fetchMedications = useCallback(async () => {
    if (!patient) return;

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Medications fetch timeout')), 10000)
      );

      const medicationsPromise = supabase
        .from('medications')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            morning_time,
            afternoon_time,
            evening_time,
            bedtime,
            timezone
          )
        `)
        .eq('patient_id', patient.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([medicationsPromise, timeoutPromise]);

      if (error) {
        console.error('Error fetching medications:', error);
        setMedications([]);
      } else {
        setMedications(data || []);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('Medications fetch timed out, using empty array');
      }
      setMedications([]);
    }
  }, [patient]);

  const fetchProviders = useCallback(async () => {
    console.log('fetchProviders called, canEditProvider:', canEditProvider);
    if (!canEditProvider) {
      console.log('Cannot edit provider, returning early');
      return;
    }

    console.log('Starting to fetch providers...');
    setLoadingProviders(true);
    
    try {
      // Get the patient's organization ID
      const patientOrgId = patient?.organization_id;
      if (!patientOrgId) {
        console.error('No organization ID found for patient');
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      // Simplified approach: Get all active users in the organization first
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, is_active')
        .eq('is_active', true)
        .limit(100);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      if (!allUsers || allUsers.length === 0) {
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      // Get role assignments for these users
      const userIds = allUsers.map(u => u.id);
      const { data: roleAssignments, error: roleError } = await supabase
        .from('user_role_assignments')
        .select('user_id, user_roles!inner(name, organization_id)')
        .in('user_id', userIds)
        .in('user_roles.name', ['provider', 'organization_admin'])
        .eq('user_roles.organization_id', patientOrgId);

      if (roleError) {
        console.error('Error fetching role assignments:', roleError);
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      // Filter users to only those with provider or org admin roles in the patient's organization
      const eligibleUserIds = roleAssignments?.map(ra => ra.user_id) || [];
      const eligibleUsers = allUsers.filter(user => eligibleUserIds.includes(user.id));

      setProviders(eligibleUsers);
      
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      console.log('Setting loadingProviders to false in finally block');
      setLoadingProviders(false);
    }
  }, [canEditProvider, patient?.organization_id]);

  useEffect(() => {
    console.log('Patient details useEffect triggered:', { patient: !!patient, canEditProvider });
    if (patient) {
      // Only set form data if it's not already set to prevent flashing
      if (!formData.id || formData.id !== patient.id) {
        console.log('Setting form data for patient:', patient.id);
        setFormData(patient);
      }
      
      fetchMedications();
      if (canEditProvider && providersFetchedForPatient !== patient.id) {
        console.log('Calling fetchProviders from useEffect for patient:', patient.id);
        fetchProviders();
        setProvidersFetchedForPatient(patient.id);
      } else if (!canEditProvider) {
        console.log('Not calling fetchProviders - canEditProvider is false');
      } else {
        console.log('Providers already fetched for this patient:', patient.id);
      }
      
      // Invalidate patients cache to ensure fresh data is available for medication modal
      // This ensures that even if some queries timeout, the cache has the current patient data
      invalidatePatients();
      
      // Use patient's time preferences if available, otherwise use defaults
      // Time preferences are now handled by the MedicationModal component
    }
  }, [patient?.id, canEditProvider]); // Removed formData.id and invalidatePatients to prevent infinite loops

  // Helper function to get time array for a period, handling migration from single time to array
  const getTimesArray = (period: 'morning' | 'afternoon' | 'evening' | 'bedtime'): string[] => {
    const arrayKey = `${period}_times` as keyof Patient;
    const singleKey = period === 'bedtime' ? 'bedtime' : `${period}_time` as keyof Patient;
    
    // Priority: use the array field if it exists and has data
    const arrayValue = formData[arrayKey] as string[] | undefined;
    if (arrayValue && Array.isArray(arrayValue) && arrayValue.length > 0) {
      return arrayValue;
    }
    
    // Fallback: if single time exists, return it as an array
    const singleValue = formData[singleKey] as string | undefined;
    if (singleValue) {
      return [singleValue];
    }
    
    // Default: return a single default time
    const defaults: Record<string, string> = {
      morning: '06:00',
      afternoon: '12:00',
      evening: '18:00',
      bedtime: '22:00'
    };
    return [defaults[period]];
  };

  // Helper function to add a new time slot to a period
  const addTimeSlot = (period: 'morning' | 'afternoon' | 'evening' | 'bedtime') => {
    const currentTimes = getTimesArray(period);
    const arrayKey = `${period}_times` as keyof Patient;
    
    // Add a new time 1 hour after the last time
    const lastTime = currentTimes[currentTimes.length - 1];
    const [hours, minutes] = lastTime.split(':').map(Number);
    const newHour = (hours + 1) % 24;
    const newTime = `${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    setFormData({
      ...formData,
      [arrayKey]: [...currentTimes, newTime]
    });
  };

  // Helper function to remove a time slot from a period
  const removeTimeSlot = (period: 'morning' | 'afternoon' | 'evening' | 'bedtime', index: number) => {
    const currentTimes = getTimesArray(period);
    
    // Don't allow removing the last time slot
    if (currentTimes.length <= 1) {
      alert('Each period must have at least one time slot.');
      return;
    }
    
    const arrayKey = `${period}_times` as keyof Patient;
    const newTimes = currentTimes.filter((_, i) => i !== index);
    
    setFormData({
      ...formData,
      [arrayKey]: newTimes
    });
  };

  // Helper function to update a specific time slot
  const updateTimeSlot = (period: 'morning' | 'afternoon' | 'evening' | 'bedtime', index: number, newTime: string) => {
    const currentTimes = getTimesArray(period);
    const arrayKey = `${period}_times` as keyof Patient;
    const newTimes = [...currentTimes];
    newTimes[index] = newTime;
    
    setFormData({
      ...formData,
      [arrayKey]: newTimes
    });
  };

  const handleSavePatient = async () => {
    if (!patient) return;

    try {
      setLoading(true);
      
      // Check if session is still valid before attempting update
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error or no session:', sessionError);
        alert('Your session has expired. Please refresh the page and try again.');
        setLoading(false);
        return;
      }
      
      console.log('Session is valid, proceeding with update');
      
      // Build minimal update with only changed fields and respecting role-based edit permissions
      const isAdmin = isSimpillerAdmin || isOrganizationAdmin;
      const baseAllowedFields = [
        'first_name', 'middle_name', 'last_name', 'suffix',
        'date_of_birth', 'gender', 'gender_identity', 'race', 'ethnicity',
        'phone1', /* 'phone1_verified' removed for non-admin updates */ 'phone2', 'phone3', 'email', /* 'email_verified' removed */
        'street1', 'street2', 'city', 'state', 'postal_code', 'country',
        'rtm_status', 'notes',
        'timezone', 'morning_time', 'afternoon_time', 'evening_time', 'bedtime',
        'morning_times', 'afternoon_times', 'evening_times', 'bedtime_times',
        'is_active', 'patient_id_alt'
      ] as const;
      const adminOnlyFields = [
        'organization_id', 'facility_id', 'assigned_provider_id', 'assigned_pharmacy_id'
      ] as const;

      const allowedFields = new Set<string>([
        ...baseAllowedFields,
        ...(isAdmin ? adminOnlyFields : [])
      ]);

      const updateData: Partial<Patient> = {};
      for (const key of Object.keys(formData) as Array<keyof Patient>) {
        if (!allowedFields.has(key as string)) continue;
        const newValue = formData[key];
        const oldValue = patient[key];
        // Only include changed fields; treat undefined as omit
        if (newValue !== undefined && newValue !== oldValue) {
          (updateData as unknown as Record<string, unknown>)[key as string] = newValue as unknown;
        }
      }

      console.log('Patient updateData payload:', updateData);
      console.log('Patient being updated:', { id: patient.id, organization_id: patient.organization_id });
      console.log('Current user roles:', { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId });

      // If nothing changed, short-circuit
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        alert('No changes to save.');
        return;
      }

      // Increase timeout to 15 seconds and add better logging
      const startTime = Date.now();
      const updatePromise = supabase
        .from('patients')
        .update(updateData)
        .eq('id', patient.id)
        .then(result => {
          const duration = Date.now() - startTime;
          console.log(`Update completed in ${duration}ms`);
          console.log('Update result:', result);
          return result;
        });

      const timeoutPromise = new Promise<{ error: unknown }>((resolve) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.error(`Update timed out after ${duration}ms`);
          resolve({ error: new Error('Request timed out') });
        }, 15000); // Increased to 15 seconds
      });

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) {
        console.error('Error updating patient:', error);
        console.error('Update payload (on error):', updateData);
        console.error('Patient being updated:', { id: patient.id, organization_id: patient.organization_id });
        console.error('Current user roles:', { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId });
        
        const message = (typeof error === 'object' && error && 'message' in (error as Record<string, unknown>) && typeof (error as Record<string, unknown>).message === 'string')
          ? (error as Record<string, unknown>).message as string
          : 'Failed to update patient. Please try again.';
        alert(`Update failed: ${message}`);
      } else {
        // Call the update callback to refresh parent data
        onPatientUpdated();
        
        // Check if pharmacy was changed to partnered pharmacy and sync to DRx
        const newPharmacyId = updateData.assigned_pharmacy_id;
        if (newPharmacyId) {
          const selectedPharmacy = pharmacies.find(p => p.id === newPharmacyId);
          if (selectedPharmacy?.name === PARTNERED_PHARMACY_NAME || selectedPharmacy?.is_partner) {
            // Sync patient to DRx in the background (don't await to avoid blocking UI)
            fetch('/api/pharmacy/drx/sync-patient', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId: patient.id, pharmacyId: newPharmacyId }),
            })
              .then(async (response) => {
                const result = await response.json();
                if (result.success) {
                  console.log('[DRx] Patient synced successfully:', result);
                } else {
                  console.error('[DRx] Sync failed:', result.error);
                }
              })
              .catch((error) => {
                console.error('[DRx] Sync error:', error);
              });
          }
        }
        
        // Auto-populate medication schedules in the background (don't await)
        // This prevents blocking the UI if time preferences changed
        if (updateData.morning_time || updateData.afternoon_time || updateData.evening_time || updateData.bedtime) {
          fetch('/api/admin/populate-medication-schedules', { method: 'POST' })
            .catch(e => console.warn('Background medication schedule population failed:', e));
        }
        
        // Keep modal open and switch to read mode with fresh data so user sees updates immediately
        setIsEditing(false);
        
        // Show success message and close modal after a brief delay to let user see the success
        alert('Patient updated successfully!');
        
        // Invalidate patients cache to ensure medication modal gets updated data
        invalidatePatients();
        
        // Close modal after a short delay to allow parent to refresh data
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    const medicationName = medication?.name || 'this medication';
    
    if (!confirm(`Are you sure you want to delete ${medicationName}? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('medications')
        .update({ status: 'discontinued' })
        .eq('id', medicationId);

      if (error) {
        console.error('Error deleting medication:', error);
        alert('Failed to delete medication. Please try again.');
      } else {
        fetchMedications();
        alert('Medication deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'discontinued': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // getRiskLevelColor removed (risk level feature deprecated)

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatTimeDisplay = (timeOfDay: string | undefined) => {
    if (!timeOfDay) return 'Not specified';
    
    if (timeOfDay.includes('(') && timeOfDay.includes(')')) {
      return timeOfDay; // Already formatted
    }
    
    if (timeOfDay.startsWith('Custom:')) {
      return timeOfDay;
    }
    
    // For existing medications without time preferences, show as is
    return timeOfDay;
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-sm text-gray-500">Patient ID: {patient.patient_id_alt || patient.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Patient Details</span>
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
              activeTab === 'medications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pill className="h-4 w-4" />
            <span>Medications</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
              activeTab === 'compliance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Adherence Log</span>
          </button>
          <button
            onClick={() => setActiveTab('timeLog')}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
              activeTab === 'timeLog'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Time Log</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'details' && (
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          value={formData.first_name || ''}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name || ''}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={formData.date_of_birth || ''}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          value={formData.gender || ''}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select Gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="X">Non-binary</option>
                          <option value="U">Unknown</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone1 || ''}
                          onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <input
                          type="text"
                          value={formData.street1 || ''}
                          onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={formData.state || ''}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={formData.postal_code || ''}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RTM Status</label>
                        <select
                          value={formData.rtm_status || ''}
                          onChange={(e) => setFormData({ ...formData, rtm_status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select Status</option>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="discontinued">Discontinued</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>
                      {/* Risk Level field removed per request */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={formData.notes || ''}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization & Assignment */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Organization & Assignment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-md">
                          {patient.organizations?.name || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Provider
                          {canEditProvider && (
                            <span className="ml-1 text-xs text-blue-600">(Editable)</span>
                          )}
                        </label>
                        {canEditProvider ? (
                          <select
                            value={formData.assigned_provider_id || ''}
                            onChange={(e) => {
                              console.log('Provider dropdown changed:', e.target.value);
                              setFormData({ ...formData, assigned_provider_id: e.target.value });
                            }}
                            onClick={() => console.log('Provider dropdown clicked')}
                            onFocus={() => console.log('Provider dropdown focused')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            disabled={loadingProviders}
                          >
                            <option value="">Select Provider</option>
                            {loadingProviders ? (
                              <option value="" disabled>Loading providers...</option>
                            ) : providers.length === 0 ? (
                              <option value="" disabled>No providers available</option>
                            ) : (
                              providers.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                  {provider.first_name} {provider.last_name}
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-md">
                            {patient.users ? `${patient.users.first_name} ${patient.users.last_name}` : 'Not assigned'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Pharmacy
                          {canEditPharmacy && (
                            <span className="ml-1 text-xs text-blue-600">(Editable)</span>
                          )}
                        </label>
                        {canEditPharmacy ? (
                          <select
                            value={formData.assigned_pharmacy_id || ''}
                            onChange={(e) => setFormData({ ...formData, assigned_pharmacy_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            disabled={pharmaciesLoading}
                          >
                            <option value="">Select Pharmacy</option>
                            {pharmaciesLoading ? (
                              <option value="" disabled>Loading pharmacies...</option>
                            ) : pharmacies.length === 0 ? (
                              <option value="" disabled>No pharmacies available</option>
                            ) : (
                              pharmacies.map((pharmacy) => (
                                <option key={pharmacy.id} value={pharmacy.id}>
                                  {pharmacy.name}
                                  {pharmacy.name === PARTNERED_PHARMACY_NAME && ' ⭐'}
                                  {pharmacy.is_partner && pharmacy.name !== PARTNERED_PHARMACY_NAME && ' (Partner)'}
                                  {pharmacy.is_default && ' (Default)'}
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <div>
                            <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-md">
                              {patient.pharmacies ? (
                                <>
                                  {patient.pharmacies.name}
                                  {patient.pharmacies.name === PARTNERED_PHARMACY_NAME && (
                                    <span className="ml-2 text-blue-600">⭐ Partnered Pharmacy</span>
                                  )}
                                </>
                              ) : (
                                'Not assigned'
                              )}
                            </p>
                            {/* DRx Sync Status */}
                            {patient.assigned_pharmacy_id && 
                             pharmacies.find(p => p.id === patient.assigned_pharmacy_id)?.name === PARTNERED_PHARMACY_NAME && (
                              <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                                {drxSyncLoading ? (
                                  <p className="text-sm text-gray-600">Loading sync status...</p>
                                ) : drxSyncStatus ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                                        drxSyncStatus.last_sync_status === 'success' 
                                          ? 'bg-green-100 text-green-800' 
                                          : drxSyncStatus.last_sync_status === 'failed'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {drxSyncStatus.last_sync_status === 'success' ? '✓ Synced' : 
                                         drxSyncStatus.last_sync_status === 'failed' ? '✗ Sync Failed' : 
                                         '⏳ Pending'}
                                      </span>
                                    </div>
                                    {drxSyncStatus.synced_at && (
                                      <p className="text-xs text-gray-600">
                                        Last synced: {new Date(drxSyncStatus.synced_at).toLocaleString()}
                                      </p>
                                    )}
                                    {drxSyncStatus.error_message && (
                                      <p className="text-xs text-red-600">
                                        Error: {drxSyncStatus.error_message}
                                      </p>
                                    )}
                                    {drxSyncStatus.last_medication_sync_at && (
                                      <p className="text-xs text-gray-500">
                                        Medications last synced: {new Date(drxSyncStatus.last_medication_sync_at).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-600">Not yet synced to DRx</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Preferences */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Time Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Define medication times for each period. You can add multiple time slots per period for patients taking multiple medications at different times.
                    </p>
                    
                    {/* Timezone */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={formData.timezone || 'America/New_York'}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        <option value="America/Phoenix">Arizona Time (MST)</option>
                      </select>
                    </div>

                    {/* Time Slots for Each Period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Morning Times */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Morning Times</label>
                          <button
                            type="button"
                            onClick={() => addTimeSlot('morning')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Time</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {getTimesArray('morning').map((time, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <HybridTimeInput
                                label=""
                                value={time}
                                onChange={(value) => updateTimeSlot('morning', index, value)}
                              />
                              {getTimesArray('morning').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot('morning', index)}
                                  className="p-2 text-red-600 hover:text-red-700"
                                  title="Remove this time slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Afternoon Times */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Afternoon Times</label>
                          <button
                            type="button"
                            onClick={() => addTimeSlot('afternoon')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Time</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {getTimesArray('afternoon').map((time, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <HybridTimeInput
                                label=""
                                value={time}
                                onChange={(value) => updateTimeSlot('afternoon', index, value)}
                              />
                              {getTimesArray('afternoon').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot('afternoon', index)}
                                  className="p-2 text-red-600 hover:text-red-700"
                                  title="Remove this time slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evening Times */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Evening Times</label>
                          <button
                            type="button"
                            onClick={() => addTimeSlot('evening')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Time</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {getTimesArray('evening').map((time, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <HybridTimeInput
                                label=""
                                value={time}
                                onChange={(value) => updateTimeSlot('evening', index, value)}
                              />
                              {getTimesArray('evening').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot('evening', index)}
                                  className="p-2 text-red-600 hover:text-red-700"
                                  title="Remove this time slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bedtime Times */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Bedtime Times</label>
                          <button
                            type="button"
                            onClick={() => addTimeSlot('bedtime')}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Time</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {getTimesArray('bedtime').map((time, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <HybridTimeInput
                                label=""
                                value={time}
                                onChange={(value) => updateTimeSlot('bedtime', index, value)}
                              />
                              {getTimesArray('bedtime').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot('bedtime', index)}
                                  className="p-2 text-red-600 hover:text-red-700"
                                  title="Remove this time slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePatient}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <p className="text-gray-900 font-medium">{patient.first_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <p className="text-gray-900 font-medium">{patient.last_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <p className="text-gray-900 font-medium">{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <p className="text-gray-900 font-medium">{patient.date_of_birth ? `${calculateAge(patient.date_of_birth)} years` : 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <p className="text-gray-900 font-medium">
                          {patient.gender === 'M' ? 'Male' : 
                           patient.gender === 'F' ? 'Female' : 
                           patient.gender === 'X' ? 'Non-binary' : 
                           patient.gender === 'U' ? 'Unknown' : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <p className="text-gray-900 font-medium">{patient.phone1 || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-gray-900 font-medium">{patient.email || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                    <div className="space-y-2">
                      <p className="text-gray-900 font-medium">
                        {patient.street1 && (
                          <>
                            {patient.street1}
                            {patient.street2 && <>, {patient.street2}</>}
                            <br />
                          </>
                        )}
                        {patient.city && patient.state && (
                          <>
                            {patient.city}, {patient.state} {patient.postal_code}
                          </>
                        )}
                        {!patient.street1 && !patient.city && 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adherence Score</label>
                        <p className="text-gray-900 font-medium">
                          {patient.adherence_score !== null && patient.adherence_score !== undefined 
                            ? typeof patient.adherence_score === 'string' 
                              ? patient.adherence_score.charAt(0).toUpperCase() + patient.adherence_score.slice(1)
                              : `${patient.adherence_score}%`
                            : 'Not calculated'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RTM Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.rtm_status || '')}`}>
                          {patient.rtm_status || 'Not specified'}
                        </span>
                      </div>
                      {/* Risk Level removed from read view */}
                    </div>
                    {patient.notes && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-md">{patient.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Organization & Assignment */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Organization & Assignment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <p className="text-gray-900 font-medium">{patient.organizations?.name || 'Not assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Provider
                          {canEditProvider && (
                            <span className="ml-1 text-xs text-blue-600">(Editable)</span>
                          )}
                        </label>
                        <p className="text-gray-900 font-medium">
                          {patient.users ? `${patient.users.first_name} ${patient.users.last_name}` : 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned Pharmacy
                          {canEditPharmacy && (
                            <span className="ml-1 text-xs text-blue-600">(Editable)</span>
                          )}
                        </label>
                        <p className="text-gray-900 font-medium">
                          {patient.pharmacies ? patient.pharmacies.name : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Time Preferences */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Time Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Medication times for each period. Multiple times indicate different medication schedules within the same period.
                    </p>
                    
                    {/* Timezone */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <p className="text-gray-900 font-medium">
                        {patient.timezone === 'America/New_York' ? 'Eastern Time (ET)' :
                         patient.timezone === 'America/Chicago' ? 'Central Time (CT)' :
                         patient.timezone === 'America/Denver' ? 'Mountain Time (MT)' :
                         patient.timezone === 'America/Los_Angeles' ? 'Pacific Time (PT)' :
                         patient.timezone === 'America/Anchorage' ? 'Alaska Time (AKT)' :
                         patient.timezone === 'Pacific/Honolulu' ? 'Hawaii Time (HT)' :
                         patient.timezone === 'America/Phoenix' ? 'Arizona Time (MST)' :
                         patient.timezone || 'Eastern Time (ET)'}
                      </p>
                    </div>

                    {/* Time Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Morning</label>
                        <div className="space-y-1">
                          {(() => {
                            const morningTimes = patient.morning_times && Array.isArray(patient.morning_times) && patient.morning_times.length > 0
                              ? patient.morning_times
                              : patient.morning_time ? [patient.morning_time] : ['06:00'];
                            return morningTimes.map((time, index) => (
                              <p key={index} className="text-gray-900 font-medium">
                                {time}
                                {morningTimes.length > 1 && <span className="text-xs text-gray-500 ml-2">(#{index + 1})</span>}
                              </p>
                            ));
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Afternoon</label>
                        <div className="space-y-1">
                          {(() => {
                            const afternoonTimes = patient.afternoon_times && Array.isArray(patient.afternoon_times) && patient.afternoon_times.length > 0
                              ? patient.afternoon_times
                              : patient.afternoon_time ? [patient.afternoon_time] : ['12:00'];
                            return afternoonTimes.map((time, index) => (
                              <p key={index} className="text-gray-900 font-medium">
                                {time}
                                {afternoonTimes.length > 1 && <span className="text-xs text-gray-500 ml-2">(#{index + 1})</span>}
                              </p>
                            ));
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Evening</label>
                        <div className="space-y-1">
                          {(() => {
                            const eveningTimes = patient.evening_times && Array.isArray(patient.evening_times) && patient.evening_times.length > 0
                              ? patient.evening_times
                              : patient.evening_time ? [patient.evening_time] : ['18:00'];
                            return eveningTimes.map((time, index) => (
                              <p key={index} className="text-gray-900 font-medium">
                                {time}
                                {eveningTimes.length > 1 && <span className="text-xs text-gray-500 ml-2">(#{index + 1})</span>}
                              </p>
                            ));
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bedtime</label>
                        <div className="space-y-1">
                          {(() => {
                            const bedtimeTimes = patient.bedtime_times && Array.isArray(patient.bedtime_times) && patient.bedtime_times.length > 0
                              ? patient.bedtime_times
                              : patient.bedtime ? [patient.bedtime] : ['22:00'];
                            return bedtimeTimes.map((time, index) => (
                              <p key={index} className="text-gray-900 font-medium">
                                {time}
                                {bedtimeTimes.length > 1 && <span className="text-xs text-gray-500 ml-2">(#{index + 1})</span>}
                              </p>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Medications</h3>
                <button
                  onClick={() => setShowAddMedication(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Pill className="h-4 w-4" />
                  <span>Add Medication</span>
                </button>
              </div>

              {medications.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No medications added yet.</p>
                  <button
                    onClick={() => setShowAddMedication(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Add first medication
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {medications.map((medication) => (
                    <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{medication.name}</h4>
                          <p className="text-sm text-gray-600">{medication.strength} {medication.format}</p>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {medication.frequency} time{medication.frequency > 1 ? 's' : ''} daily
                            </span>
                            <span className="flex items-center">
                              <Pill className="h-4 w-4 mr-1" />
                              {formatTimeDisplay(medication.time_of_day)}
                            </span>
                          </div>
                          {medication.special_instructions && (
                            <p className="mt-2 text-sm text-gray-600">{medication.special_instructions}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {medication.with_food && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                Take with food
                              </span>
                            )}
                            {medication.avoid_alcohol && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                Avoid alcohol
                              </span>
                            )}
                            {medication.impairment_warning && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                May cause impairment
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingMedication(medication);
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMedication(medication.id!)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            {loading ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Medication Modal */}
              {showAddMedication && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <MedicationModal
                    isOpen={showAddMedication}
                    onClose={() => setShowAddMedication(false)}
                    onSuccess={() => {
                      setShowAddMedication(false);
                      fetchMedications();
                      onPatientUpdated();
                    }}
                    mode="add"
                    selectedPatientId={patient?.id}
                  />
                </div>
              )}

              {/* Edit Medication Modal */}
              {editingMedication && isEditModalOpen && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <MedicationModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                      setIsEditModalOpen(false);
                      fetchMedications();
                      onPatientUpdated();
                    }}
                    mode="edit"
                    selectedPatientId={patient?.id}
                    medication={editingMedication}
                  />
                </div>
              )}
            </div>
          )}

          {/* Adherence Log Tab */}
          {activeTab === 'compliance' && patient && (
            <div className="p-6">
              <ComplianceLogTab patient={patient} />
            </div>
          )}

          {/* Time Log Tab */}
          {activeTab === 'timeLog' && patient && (
            <div className="p-6">
              <TimeLogTab patient={patient} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 