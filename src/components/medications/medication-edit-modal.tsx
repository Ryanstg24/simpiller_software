'use client';

import { useState, useEffect } from 'react';
import { X, Save, Pill } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Medication {
  id: string;
  patient_id: string;
  name: string;
  strength: string;
  format: string;
  dose_count: number;
  quantity: number;
  frequency: number;
  time_of_day?: string;
  custom_time?: string;
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
    timezone?: string;
  };
}

interface MedicationEditModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onMedicationUpdated: () => void;
}

export function MedicationEditModal({ medication, isOpen, onClose, onMedicationUpdated }: MedicationEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Medication>>({});

  // Time preferences for the patient
  const [timePreferences, setTimePreferences] = useState({
    morning: '06:00',
    afternoon: '12:00',
    evening: '18:00'
  });

  useEffect(() => {
    if (medication) {
      
      // Handle existing medications that might have single time values
      let timeOfDay = medication.time_of_day;
      if (timeOfDay && !timeOfDay.includes(',') && timeOfDay !== 'custom') {
        // Convert single time to comma-separated format for consistency
        timeOfDay = timeOfDay.trim();
      }
      
      const newFormData = {
        ...medication,
        time_of_day: timeOfDay
      };
      
      setFormData(newFormData);
      
      // Use patient's time preferences if available, otherwise use defaults
      setTimePreferences({
        morning: medication.patients?.morning_time || '06:00',
        afternoon: medication.patients?.afternoon_time || '12:00',
        evening: medication.patients?.evening_time || '18:00'
      });
    }
  }, [medication]);

  const handleSaveMedication = async () => {
    if (!medication) return;

    // Validate frequency vs selected times
    const selectedTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
    const frequency = formData.frequency || 1;
    
    // Skip validation for custom time
    if (formData.time_of_day === 'custom') {
      if (!formData.custom_time) {
        alert('Please enter a custom time.');
        return;
      }
    } else {
      if (selectedTimes.length === 0) {
        alert(`Please select ${frequency} time(s) of day for medication administration (frequency is set to ${frequency}).`);
        return;
      }
      
      if (selectedTimes.length !== frequency) {
        alert(`Frequency is set to ${frequency} but you have selected ${selectedTimes.length} time(s). Please ensure the number of selected times matches the frequency.`);
        return;
      }
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/medications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: medication.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error updating medication:', result);
        alert(result.error || 'Failed to update medication. Please try again.');
      } else {
        console.log('✅ Medication updated successfully:', result);
        onMedicationUpdated();
        onClose();
        alert('Medication updated successfully!');
      }
    } catch (error) {
      console.error('💥 Error updating medication:', error);
      alert('Failed to update medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelection = (time: string, checked: boolean) => {
    const currentTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
    const frequency = formData.frequency || 1;
    
    // Extract just the time part (morning, afternoon, evening) from stored values
    const currentTimeParts = currentTimes.map(t => {
      if (t.includes('(')) {
        return t.split('(')[0].trim();
      }
      return t.trim();
    });
    
    if (checked) {
      // Don't allow selecting more times than frequency (unless it's custom)
      if (time !== 'custom' && currentTimeParts.length >= frequency) {
        alert(`You can only select ${frequency} time(s) based on the current frequency setting. Please increase the frequency or deselect another time.`);
        return;
      }
      
      // Add time if not already selected
      if (!currentTimeParts.includes(time)) {
        const timeWithFormat = `${time} (${timePreferences[time as keyof typeof timePreferences]})`;
        const newTimes = [...currentTimes, timeWithFormat].join(',');
        setFormData({ ...formData, time_of_day: newTimes });
      }
    } else {
      // Allow deselecting even if it's the only time selected (user can then select a different time)
      const newTimes = currentTimes.filter(t => {
        const timePart = t.includes('(') ? t.split('(')[0].trim() : t.trim();
        return timePart !== time;
      }).join(',');
      setFormData({ ...formData, time_of_day: newTimes });
    }
  };

  if (!isOpen || !medication) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Pill className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Medication: {medication.name}
              </h2>
              <p className="text-sm text-gray-500">
                Patient: {medication.patients?.first_name} {medication.patients?.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            <div className="space-y-6">
              {/* Basic Medication Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Medication Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
                    <input
                      type="text"
                      value={formData.strength || ''}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g., 10mg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={formData.format || ''}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status || ''}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="active">Active</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dosage Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dosage Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dose Count</label>
                    <input
                      type="number"
                      value={formData.dose_count || 1}
                      onChange={(e) => setFormData({ ...formData, dose_count: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (per day)</label>
                    <input
                      type="number"
                      value={formData.frequency || 1}
                      onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      min="1"
                      max="3"
                    />
                  </div>
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Time of Day</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Time(s) of Day</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const currentTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
                            const isChecked = currentTimes.some(t => {
                              const timePart = t.includes('(') ? t.split('(')[0].trim() : t.trim();
                              return timePart === 'morning';
                            });
                            return isChecked;
                          })()}
                          onChange={(e) => handleTimeSelection('morning', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Morning ({timePreferences.morning})</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const currentTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
                            const isChecked = currentTimes.some(t => {
                              const timePart = t.includes('(') ? t.split('(')[0].trim() : t.trim();
                              return timePart === 'afternoon';
                            });
                            return isChecked;
                          })()}
                          onChange={(e) => handleTimeSelection('afternoon', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Afternoon ({timePreferences.afternoon})</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const currentTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
                            const isChecked = currentTimes.some(t => {
                              const timePart = t.includes('(') ? t.split('(')[0].trim() : t.trim();
                              return timePart === 'evening';
                            });
                            return isChecked;
                          })()}
                          onChange={(e) => handleTimeSelection('evening', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Evening ({timePreferences.evening})</span>
                      </label>
                    </div>
                    
                    {/* Validation Error */}
                    {(() => {
                      const selectedTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
                      const frequency = formData.frequency || 1;
                      
                      if (selectedTimes.length > frequency) {
                        return (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">
                              ⚠️ You have selected {selectedTimes.length} time(s) but frequency is set to {frequency}. 
                              Please either reduce the number of selected times or increase the frequency.
                            </p>
                          </div>
                        );
                      } else if (selectedTimes.length < frequency && selectedTimes.length > 0) {
                        return (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-600">
                              ℹ️ You have selected {selectedTimes.length} time(s) but frequency is set to {frequency}. 
                              Please select {frequency - selectedTimes.length} more time(s) or reduce the frequency.
                            </p>
                          </div>
                        );
                      } else if (selectedTimes.length === 0) {
                        return (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-600">
                              ℹ️ Please select {frequency} time(s) of day for medication administration (frequency is set to {frequency}).
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Selected Times Display */}
                    {(() => {
                      const selectedTimes = formData.time_of_day?.split(',').filter(t => t.trim()) || [];
                      if (selectedTimes.length > 0) {
                        return (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-700">
                              ✅ Selected: {selectedTimes.map(time => {
                                switch (time) {
                                  case 'morning': return `Morning (${timePreferences.morning})`;
                                  case 'afternoon': return `Afternoon (${timePreferences.afternoon})`;
                                  case 'evening': return `Evening (${timePreferences.evening})`;
                                  default: return time;
                                }
                              }).join(', ')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Custom Time Option */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.time_of_day === 'custom'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Clear other times and set custom
                            setFormData({ ...formData, time_of_day: 'custom', custom_time: formData.custom_time || '' });
                          } else {
                            // Remove custom
                            setFormData({ ...formData, time_of_day: '', custom_time: '' });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Custom Time</span>
                    </label>
                    {formData.time_of_day === 'custom' && (
                      <div className="mt-2 ml-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Time</label>
                        <input
                          type="time"
                          value={formData.custom_time || ''}
                          onChange={(e) => setFormData({ ...formData, custom_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    value={formData.special_instructions || ''}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Special instructions..."
                  />
                </div>
              </div>

              {/* Warnings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Warnings</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.with_food || false}
                      onChange={(e) => setFormData({ ...formData, with_food: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Take with food</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.avoid_alcohol || false}
                      onChange={(e) => setFormData({ ...formData, avoid_alcohol: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Avoid alcohol</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.impairment_warning || false}
                      onChange={(e) => setFormData({ ...formData, impairment_warning: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">May cause impairment</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMedication}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 