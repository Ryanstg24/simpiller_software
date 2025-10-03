'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, MapPin, Calendar, Shield, Save, X, Stethoscope, Upload } from 'lucide-react';
import { HybridTimeInput } from '@/components/ui/hybrid-time-input';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { useFacilities } from '@/hooks/use-facilities';
import { useOrganizations } from '@/hooks/use-organizations';
import { supabase } from '@/lib/supabase';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  npi?: string;
}

export function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const { isSimpillerAdmin, userOrganizationId } = useAuthV2();
  const { facilities } = useFacilities();
  const { organizations } = useOrganizations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    date_of_birth: '',
    gender: '',
    gender_identity: '',
    race: '',
    ethnicity: '',
    
    // Contact Information
    phone1: '',
    phone1_verified: false,
    phone2: '',
    phone3: '',
    email: '',
    email_verified: false,
    
    // Address
    street1: '',
    street2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    
    // Medical Information
    ssn: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    patient_id_alt: '',
    
    // Organization & Assignment
    organization_id: '',
    facility_id: '',
    assigned_provider_id: '',
    
    // Medical Status
    rtm_status: '',
    risk_level: '',
    notes: '',
    
    // Time Preferences
    morning_time: '06:00',
    afternoon_time: '12:00',
    evening_time: '18:00',
    bedtime: '22:00',
    timezone: 'America/New_York'
  });

  // Fetch providers for the selected organization
  useEffect(() => {
    const fetchProviders = async () => {
      if (!formData.organization_id) {
        setProviders([]);
        return;
      }

      try {
        // First get provider role IDs for this organization
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('name', 'provider')
          .eq('organization_id', formData.organization_id);

        if (roleError || !roleData || roleData.length === 0) {
          console.error('Error fetching provider roles:', roleError);
          setProviders([]);
          return;
        }

        const roleIds = roleData.map(role => role.id);

        // Then get user IDs assigned to these roles
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('user_role_assignments')
          .select('user_id')
          .in('role_id', roleIds);

        if (assignmentError || !assignmentData || assignmentData.length === 0) {
          console.error('Error fetching role assignments:', assignmentError);
          setProviders([]);
          return;
        }

        const userIds = assignmentData.map(assignment => assignment.user_id);

        // Finally get the user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            npi
          `)
          .eq('is_active', true)
          .in('id', userIds);

        if (userError) {
          console.error('Error fetching providers:', userError);
          setProviders([]);
          return;
        }

        setProviders(userData || []);
      } catch (err) {
        console.error('Error in fetchProviders:', err);
        setProviders([]);
      }
    };

    fetchProviders();
  }, [formData.organization_id]);

  // Set organization ID based on user role
  useEffect(() => {
    if (!isSimpillerAdmin && userOrganizationId) {
      setFormData(prev => ({
        ...prev,
        organization_id: userOrganizationId
      }));
    }
  }, [isSimpillerAdmin, userOrganizationId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('patients')
        .insert({
          organization_id: formData.organization_id,
          facility_id: formData.facility_id || null,
          assigned_provider_id: formData.assigned_provider_id || null,
          patient_id_alt: formData.patient_id_alt || null,
          
          // Basic Information
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          suffix: formData.suffix || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          gender_identity: formData.gender_identity || null,
          race: formData.race || null,
          ethnicity: formData.ethnicity || null,
          
          // Contact Information
          phone1: formData.phone1 || null,
          phone1_verified: false,
          phone2: formData.phone2 || null,
          phone3: formData.phone3 || null,
          email: formData.email || null,
          email_verified: false,
          
          // Address
          street1: formData.street1 || null,
          street2: formData.street2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          country: formData.country,
          
          // Medical Status
          rtm_status: formData.rtm_status || null,
          
          // Time Preferences
          morning_time: formData.morning_time || null,
          afternoon_time: formData.afternoon_time || null,
          evening_time: formData.evening_time || null,
          bedtime: formData.bedtime || null,
          timezone: formData.timezone || null,
          
          is_active: true
        });

      if (error) {
        console.error('Error creating patient:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        setError(`Failed to create patient: ${error.message}`);
        return;
      }

      // Reset form and close modal
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        date_of_birth: '',
        gender: '',
        gender_identity: '',
        race: '',
        ethnicity: '',
        phone1: '',
        phone1_verified: false,
        phone2: '',
        phone3: '',
        email: '',
        email_verified: false,
        street1: '',
        street2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US',
        ssn: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        patient_id_alt: '',
        organization_id: '',
        facility_id: '',
        assigned_provider_id: '',
        rtm_status: '',
        risk_level: '',
        notes: '',
        morning_time: '06:00',
        afternoon_time: '12:00',
        evening_time: '18:00',
        bedtime: '22:00',
        timezone: 'America/New_York'
      });

      // Auto-populate medication schedules after patient creation (in case time preferences are set)
      try {
        await fetch('/api/admin/populate-medication-schedules', { method: 'POST' });
      } catch (e) {
        console.warn('Populate medication schedules failed (non-blocking):', e);
      }

      // Show success message and close modal
      alert('Patient created successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Add New Patient
          </h2>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
              onClick={() => {
                // Placeholder for future import functionality
                alert('Import Data functionality coming soon!');
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <User className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => handleInputChange('middle_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter middle name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={formData.suffix}
                      onChange={(e) => handleInputChange('suffix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Jr, Sr, III, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="X">Other</option>
                      <option value="U">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Race
                    </label>
                    <input
                      type="text"
                      value={formData.race}
                      onChange={(e) => handleInputChange('race', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter race"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ethnicity
                    </label>
                    <input
                      type="text"
                      value={formData.ethnicity}
                      onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter ethnicity"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone1}
                    onChange={(e) => handleInputChange('phone1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter primary phone"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone2}
                      onChange={(e) => handleInputChange('phone2', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter secondary phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter emergency contact"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter emergency contact name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organization & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Organization & Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSimpillerAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization *
                    </label>
                    <select
                      value={formData.organization_id}
                      onChange={(e) => handleInputChange('organization_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.acronym})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facility
                  </label>
                  <select
                    value={formData.facility_id}
                    onChange={(e) => handleInputChange('facility_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a facility</option>
                    {facilities
                      .filter(facility => !formData.organization_id || facility.organization_id === formData.organization_id)
                      .map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Provider
                  </label>
                  <select
                    value={formData.assigned_provider_id}
                    onChange={(e) => handleInputChange('assigned_provider_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a provider</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        Dr. {provider.first_name} {provider.last_name} {provider.npi ? `(NPI: ${provider.npi})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID (Alt)
                  </label>
                  <input
                    type="text"
                    value={formData.patient_id_alt}
                    onChange={(e) => handleInputChange('patient_id_alt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter patient ID"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Shield className="h-5 w-5 mr-2" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RTM Status
                    </label>
                    <select
                      value={formData.rtm_status}
                      onChange={(e) => handleInputChange('rtm_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">Select RTM status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Calendar className="h-5 w-5 mr-2" />
                  Time Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Define when &quot;morning&quot;, &quot;afternoon&quot;, &quot;evening&quot;, and &quot;bedtime&quot; mean for this patient based on their work schedule and timezone.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                    <option value="America/Phoenix">Arizona Time (MST)</option>
                    <option value="America/Indiana/Indianapolis">Indiana Time (ET)</option>
                    <option value="America/Detroit">Michigan Time (ET)</option>
                    <option value="America/Kentucky/Louisville">Kentucky Time (ET)</option>
                    <option value="America/Kentucky/Monticello">Kentucky Time (CT)</option>
                    <option value="America/North_Dakota/Center">North Dakota Time (CT)</option>
                    <option value="America/North_Dakota/New_Salem">North Dakota Time (MT)</option>
                    <option value="America/North_Dakota/Beulah">North Dakota Time (CT)</option>
                    <option value="America/Boise">Idaho Time (MT)</option>
                    <option value="America/Indiana/Tell_City">Indiana Time (CT)</option>
                    <option value="America/Indiana/Petersburg">Indiana Time (ET)</option>
                    <option value="America/Indiana/Vincennes">Indiana Time (ET)</option>
                    <option value="America/Indiana/Winamac">Indiana Time (ET)</option>
                    <option value="America/Indiana/Marengo">Indiana Time (ET)</option>
                    <option value="America/Indiana/Pike">Indiana Time (ET)</option>
                    <option value="America/Indiana/Knox">Indiana Time (CT)</option>
                    <option value="America/Menominee">Michigan Time (CT)</option>
                    <option value="America/North_Dakota/Beulah">North Dakota Time (CT)</option>
                    <option value="America/North_Dakota/Center">North Dakota Time (CT)</option>
                    <option value="America/North_Dakota/New_Salem">North Dakota Time (MT)</option>
                    <option value="America/Indiana/Knox">Indiana Time (CT)</option>
                    <option value="America/Indiana/Tell_City">Indiana Time (CT)</option>
                    <option value="America/Indiana/Petersburg">Indiana Time (ET)</option>
                    <option value="America/Indiana/Vincennes">Indiana Time (ET)</option>
                    <option value="America/Indiana/Winamac">Indiana Time (ET)</option>
                    <option value="America/Indiana/Marengo">Indiana Time (ET)</option>
                    <option value="America/Indiana/Pike">Indiana Time (ET)</option>
                    <option value="America/Menominee">Michigan Time (CT)</option>
                    <option value="America/Boise">Idaho Time (MT)</option>
                    <option value="America/Phoenix">Arizona Time (MST)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <HybridTimeInput
                      label="Morning Time"
                      value={formData.morning_time || '06:00'}
                      onChange={(value) => handleInputChange('morning_time', value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 06:00</p>
                  </div>
                  <div>
                    <HybridTimeInput
                      label="Bedtime"
                      value={formData.bedtime || '22:00'}
                      onChange={(value) => handleInputChange('bedtime', value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 22:00</p>
                  </div>
                  <div>
                    <HybridTimeInput
                      label="Afternoon Time"
                      value={formData.afternoon_time || '12:00'}
                      onChange={(value) => handleInputChange('afternoon_time', value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 12:00</p>
                  </div>
                  <div>
                    <HybridTimeInput
                      label="Evening Time"
                      value={formData.evening_time || '18:00'}
                      onChange={(value) => handleInputChange('evening_time', value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 18:00</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Adjust these times based on the patient&apos;s work schedule. 
                    For example, a night shift worker might set morning to 14:00 (2 PM) and evening to 02:00 (2 AM).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address 1
                  </label>
                  <input
                    type="text"
                    value={formData.street1}
                    onChange={(e) => handleInputChange('street1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address 2
                  </label>
                  <input
                    type="text"
                    value={formData.street2}
                    onChange={(e) => handleInputChange('street2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Suite, unit, etc."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Patient'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 