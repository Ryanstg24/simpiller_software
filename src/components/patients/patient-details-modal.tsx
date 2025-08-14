'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Edit, Save, User, Pill, Calendar } from 'lucide-react';
import { Patient } from '@/hooks/use-patients';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface PatientDetailsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onPatientUpdated: () => void;
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
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function PatientDetailsModal({ patient, isOpen, onClose, onPatientUpdated }: PatientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'medications'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuth();
  
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: '',
    strength: '',
    format: 'UNSPECIFIED',
    dose_count: 1,
    max_daily: 1,
    quantity: 0,
    frequency: 1,
    time_of_day: '',
    custom_time: '',
    with_food: false,
    avoid_alcohol: false,
    impairment_warning: false,
    special_instructions: '',
    rx_refills: 0,
    status: 'active'
  });
  const [showAddMedication, setShowAddMedication] = useState(false);

  // Form data for editing patient
  const [formData, setFormData] = useState<Partial<Patient>>({});

  // Time preferences for the patient
  const [timePreferences, setTimePreferences] = useState({
    morning: '06:00',
    afternoon: '12:00',
    evening: '18:00'
  });

  // Check if user can edit provider assignment
  const canEditProvider = isSimpillerAdmin || isOrganizationAdmin;

  const fetchMedications = useCallback(async () => {
    if (!patient) return;

    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching medications:', error);
      } else {
        setMedications(data || []);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  }, [patient]);

  const fetchProviders = useCallback(async () => {
    if (!canEditProvider) return;

    try {
      setLoadingProviders(true);
      
      // First test a simple query to see if we can access users table
      const { error: testError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .limit(1);

      if (testError) {
        console.error('Simple users query failed:', testError);
        setProviders([]);
        return;
      }

      // Get users who have provider roles
      let providerQuery = supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          user_roles!inner(name, organization_id)
        `)
        .eq('user_roles.name', 'provider');

      // Filter by organization if user is organization admin
      if (isOrganizationAdmin && userOrganizationId) {
        providerQuery = providerQuery.eq('user_roles.organization_id', userOrganizationId);
      }

      const { data: providerUsers, error: providerError } = await providerQuery;

      if (providerError) {
        console.error('Error fetching provider roles:', providerError);
        setProviders([]);
        return;
      }

      const providerUserIds = providerUsers?.map(u => u.user_id) || [];

      if (providerUserIds.length === 0) {
        setProviders([]);
        return;
      }

      // Get the full user details for these provider users
      const { data: providerDetails, error: detailsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)
        .in('id', providerUserIds);

      if (detailsError) {
        console.error('Error fetching provider details:', detailsError);
        setProviders([]);
        return;
      }

      setProviders(providerDetails || []);
      
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  }, [canEditProvider, isOrganizationAdmin, userOrganizationId]);

  useEffect(() => {
    if (patient) {
      setFormData(patient);
      fetchMedications();
      if (canEditProvider) {
        fetchProviders();
      }
      
      // Use patient's time preferences if available, otherwise use defaults
      setTimePreferences({
        morning: patient.morning_time || '06:00',
        afternoon: patient.afternoon_time || '12:00',
        evening: patient.evening_time || '18:00'
      });
    }
  }, [patient, canEditProvider, fetchMedications, fetchProviders]);

  const handleSavePatient = async () => {
    if (!patient) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('patients')
        .update(formData)
        .eq('id', patient.id);

      if (error) {
        console.error('Error updating patient:', error);
        alert('Failed to update patient. Please try again.');
      } else {
        setIsEditing(false);
        onPatientUpdated();
        alert('Patient updated successfully!');
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!patient || !newMedication.name || !newMedication.strength) {
      alert('Please fill in medication name and strength.');
      return;
    }

    // Combine time_of_day with custom_time if applicable
    let finalTimeOfDay = newMedication.time_of_day;
    if (newMedication.time_of_day === 'custom' && newMedication.custom_time) {
      finalTimeOfDay = `Custom: ${newMedication.custom_time}`;
    } else if (['morning', 'afternoon', 'evening'].includes(newMedication.time_of_day || '')) {
      const timeMap = {
        morning: timePreferences.morning,
        afternoon: timePreferences.afternoon,
        evening: timePreferences.evening
      };
      finalTimeOfDay = `${newMedication.time_of_day} (${timeMap[newMedication.time_of_day as keyof typeof timeMap]})`;
    }

    try {
      setLoading(true);
      
      // First, save the updated time preferences to the patient's profile
      const { error: timeError } = await supabase
        .from('patients')
        .update({
          morning_time: timePreferences.morning,
          afternoon_time: timePreferences.afternoon,
          evening_time: timePreferences.evening
        })
        .eq('id', patient.id);

      if (timeError) {
        console.error('Error updating time preferences:', timeError);
        // Continue with medication creation even if time preferences fail
      }

      // Then add the medication
      const { error } = await supabase
        .from('medications')
        .insert({
          patient_id: patient.id,
          name: newMedication.name,
          strength: newMedication.strength,
          format: newMedication.format,
          dose_count: newMedication.dose_count,
          max_daily: newMedication.max_daily,
          quantity: newMedication.quantity,
          frequency: newMedication.frequency,
          time_of_day: finalTimeOfDay,
          with_food: newMedication.with_food,
          avoid_alcohol: newMedication.avoid_alcohol,
          impairment_warning: newMedication.impairment_warning,
          special_instructions: newMedication.special_instructions,
          rx_refills: newMedication.rx_refills,
          status: newMedication.status
        });

      if (error) {
        console.error('Error adding medication:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        console.error('Attempted to insert:', {
          patient_id: patient.id,
          name: newMedication.name,
          strength: newMedication.strength,
          format: newMedication.format,
          dose_count: newMedication.dose_count,
          max_daily: newMedication.max_daily,
          quantity: newMedication.quantity,
          frequency: newMedication.frequency,
          time_of_day: finalTimeOfDay,
          with_food: newMedication.with_food,
          avoid_alcohol: newMedication.avoid_alcohol,
          impairment_warning: newMedication.impairment_warning,
          special_instructions: newMedication.special_instructions,
          rx_refills: newMedication.rx_refills,
          status: newMedication.status
        });
        alert('Failed to add medication. Please try again.');
      } else {
        setNewMedication({
          name: '',
          strength: '',
          format: 'UNSPECIFIED',
          dose_count: 1,
          max_daily: 1,
          quantity: 0,
          frequency: 1,
          time_of_day: '',
          custom_time: '',
          with_food: false,
          avoid_alcohol: false,
          impairment_warning: false,
          special_instructions: '',
          rx_refills: 0,
          status: 'active'
        });
        setShowAddMedication(false);
        fetchMedications();
        onPatientUpdated(); // Refresh patient data to show updated time preferences
        alert('Medication added successfully!');
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      alert('Failed to add medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    if (!confirm('Are you sure you want to delete this medication?')) return;

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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                        <select
                          value={formData.risk_level || ''}
                          onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select Risk Level</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
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
                            onChange={(e) => setFormData({ ...formData, assigned_provider_id: e.target.value })}
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
                    </div>
                  </div>

                  {/* Time Preferences */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Time Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Define when &quot;morning&quot;, &quot;afternoon&quot;, and &quot;evening&quot; mean for this patient based on their work schedule.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Morning Time</label>
                        <input
                          type="time"
                          value={formData.morning_time || '06:00'}
                          onChange={(e) => setFormData({ ...formData, morning_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Afternoon Time</label>
                        <input
                          type="time"
                          value={formData.afternoon_time || '12:00'}
                          onChange={(e) => setFormData({ ...formData, afternoon_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Evening Time</label>
                        <input
                          type="time"
                          value={formData.evening_time || '18:00'}
                          onChange={(e) => setFormData({ ...formData, evening_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
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
                        <p className="text-gray-900 font-medium">{patient.adherence_score || 'Not calculated'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RTM Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.rtm_status || '')}`}>
                          {patient.rtm_status || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(patient.risk_level || '')}`}>
                          {patient.risk_level || 'Not specified'}
                        </span>
                      </div>
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
                    </div>
                  </div>

                  {/* Time Preferences */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Time Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Custom times for medication scheduling based on work schedule.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Morning</label>
                        <p className="text-gray-900 font-medium">{patient.morning_time || '06:00'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Afternoon</label>
                        <p className="text-gray-900 font-medium">{patient.afternoon_time || '12:00'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Evening</label>
                        <p className="text-gray-900 font-medium">{patient.evening_time || '18:00'}</p>
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
                        <button
                          onClick={() => handleDeleteMedication(medication.id!)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          {loading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Medication Modal */}
              {showAddMedication && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Medication</h3>
                    
                    {/* Time Preferences Section */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">Time Preferences</h4>
                      <p className="text-xs text-blue-700 mb-3">
                        Define when &quot;morning&quot;, &quot;afternoon&quot;, and &quot;evening&quot; mean for this patient based on their schedule.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-blue-800 mb-1">Morning</label>
                          <input
                            type="time"
                            value={timePreferences.morning}
                            onChange={(e) => setTimePreferences({ ...timePreferences, morning: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-800 mb-1">Afternoon</label>
                          <input
                            type="time"
                            value={timePreferences.afternoon}
                            onChange={(e) => setTimePreferences({ ...timePreferences, afternoon: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-800 mb-1">Evening</label>
                          <input
                            type="time"
                            value={timePreferences.evening}
                            onChange={(e) => setTimePreferences({ ...timePreferences, evening: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                        <input
                          type="text"
                          value={newMedication.name}
                          onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., Lisinopril"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
                        <input
                          type="text"
                          value={newMedication.strength}
                          onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., 10mg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <select
                          value={newMedication.format}
                          onChange={(e) => setNewMedication({ ...newMedication, format: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="UNSPECIFIED">Select Format</option>
                          <option value="TABLET">Tablet</option>
                          <option value="CAPSULE">Capsule</option>
                          <option value="LIQUID">Liquid</option>
                          <option value="INJECTION">Injection</option>
                          <option value="INHALER">Inhaler</option>
                          <option value="PATCH">Patch</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dose Count</label>
                          <input
                            type="number"
                            value={newMedication.dose_count}
                            onChange={(e) => setNewMedication({ ...newMedication, dose_count: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (per day)</label>
                          <input
                            type="number"
                            value={newMedication.frequency}
                            onChange={(e) => setNewMedication({ ...newMedication, frequency: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            min="1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time of Day</label>
                        <select
                          value={newMedication.time_of_day}
                          onChange={(e) => setNewMedication({ ...newMedication, time_of_day: e.target.value, custom_time: '' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select Time</option>
                          <option value="morning">Morning ({timePreferences.morning})</option>
                          <option value="afternoon">Afternoon ({timePreferences.afternoon})</option>
                          <option value="evening">Evening ({timePreferences.evening})</option>
                          <option value="custom">Custom Time</option>
                        </select>
                      </div>
                      {newMedication.time_of_day === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Time</label>
                          <input
                            type="time"
                            value={newMedication.custom_time}
                            onChange={(e) => setNewMedication({ ...newMedication, custom_time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                        <textarea
                          value={newMedication.special_instructions}
                          onChange={(e) => setNewMedication({ ...newMedication, special_instructions: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Special instructions..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMedication.with_food}
                            onChange={(e) => setNewMedication({ ...newMedication, with_food: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Take with food</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMedication.avoid_alcohol}
                            onChange={(e) => setNewMedication({ ...newMedication, avoid_alcohol: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Avoid alcohol</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMedication.impairment_warning}
                            onChange={(e) => setNewMedication({ ...newMedication, impairment_warning: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">May cause impairment</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                      <button
                        onClick={() => setShowAddMedication(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddMedication}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Adding...' : 'Add Medication'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 