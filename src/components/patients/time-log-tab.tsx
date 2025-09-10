'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { Patient } from '@/hooks/use-patients';
import { Plus, Edit, Trash2, Clock, Activity } from 'lucide-react';

interface TimeLogTabProps {
  patient: Patient;
}

interface TimeLog {
  id: string;
  patient_id: string;
  provider_id: string;
  activity_type: string;
  description?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  billing_code?: string;
  created_at: string;
  
  // Joined data
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ACTIVITY_TYPES = [
  { value: 'patient_communication', label: 'Patient Communication', defaultMinutes: 10 },
  { value: 'adherence_review', label: 'Adherence Review', defaultMinutes: 5 },
  { value: 'other', label: 'Other', defaultMinutes: 5 },
];

export function TimeLogTab({ patient }: TimeLogTabProps) {
  const { user } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    activity_type: 'adherence_review',
    description: '',
    duration_minutes: 5,
    date: new Date().toISOString().split('T')[0], // Default to today
    billing_code: '',
  });

  // Duration options for dropdown
  const durationOptions = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 'custom', label: 'Custom time' },
  ];

  const [showCustomDuration, setShowCustomDuration] = useState(false);

  const fetchTimeLogs = useCallback(async () => {
    try {
      setLoading(true);

      // For now, use mock data since the provider_time_logs table might not be deployed yet
      // This ensures the component works on Vercel deployment
      const mockTimeLogs: TimeLog[] = [];

      // Try to fetch real data, but handle errors gracefully
      try {
        const { data, error } = await supabase
          .from('provider_time_logs')
          .select(`
            *,
            users (
              first_name,
              last_name,
              email
            )
          `)
          .eq('patient_id', patient.id)
          .eq('provider_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Provider time logs table not available yet, using mock data:', error);
          setTimeLogs(mockTimeLogs);
        } else {
          setTimeLogs(data || []);
        }
      } catch (error) {
        console.warn('Error fetching time logs, using mock data:', error);
        setTimeLogs(mockTimeLogs);
      }
    } catch (error) {
      console.error('Error in fetchTimeLogs:', error);
      setTimeLogs([]);
    } finally {
      setLoading(false);
    }
  }, [patient.id, user?.id]);

  useEffect(() => {
    fetchTimeLogs();
  }, [fetchTimeLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      // Calculate start and end times based on date and duration
      const startTime = new Date(formData.date + 'T09:00:00'); // Default to 9 AM
      const endTime = new Date(startTime.getTime() + (formData.duration_minutes * 60 * 1000));

      const logData = {
        patient_id: patient.id,
        provider_id: user.id,
        activity_type: formData.activity_type,
        description: formData.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        // billing_code removed
      };

      if (editingLog) {
        // Update existing log
        const { error } = await supabase
          .from('provider_time_logs')
          .update(logData)
          .eq('id', editingLog.id);

        if (error) throw error;
      } else {
        // Create new log
        const { error } = await supabase
          .from('provider_time_logs')
          .insert(logData);

        if (error) throw error;
      }

      // Reset form and refresh data
      resetForm();
      fetchTimeLogs();
    } catch (error) {
      console.error('Error saving time log:', error);
      alert('Failed to save time log. Please try again.');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) return;

    try {
      const { error } = await supabase
        .from('provider_time_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      fetchTimeLogs();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('Failed to delete time log. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      activity_type: 'adherence_review',
      description: '',
      duration_minutes: 5,
      date: new Date().toISOString().split('T')[0], // Reset to today
      billing_code: '',
    });
    setShowAddForm(false);
    setEditingLog(null);
    setShowCustomDuration(false);
  };

  const handleActivityTypeChange = (activityType: string) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === activityType);
    setFormData(prev => ({
      ...prev,
      activity_type: activityType,
      duration_minutes: activity?.defaultMinutes || 5,
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Month filter helpers
  const filteredTimeLogs = useMemo(() => {
    if (!selectedMonth) return timeLogs;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // 0-based
    // Use UTC boundaries to avoid TZ spillover
    const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
    return timeLogs.filter((log) => {
      const when = log.start_time ? new Date(log.start_time) : new Date(log.created_at);
      return when >= monthStart && when < nextMonthStart;
    });
  }, [timeLogs, selectedMonth]);

  const getTotalTime = (logs: TimeLog[]) => {
    return logs.reduce((total, log) => total + (Number(log.duration_minutes) || 0), 0);
  };

  const getActivityTypeLabel = (value: string) => {
    return ACTIVITY_TYPES.find(a => a.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading time logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Provider Time Log</h3>
          <p className="text-sm text-gray-600">Track time spent with patient for billing and documentation</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Time</option>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const monthYear = date.toISOString().slice(0, 7);
              return (
                <option key={monthYear} value={monthYear}>
                  {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Time Log
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Time Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(getTotalTime(filteredTimeLogs))}
            </div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredTimeLogs.length}
            </div>
            <div className="text-sm text-gray-600">Total Entries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredTimeLogs.length > 0 ? Math.round(getTotalTime(filteredTimeLogs) / filteredTimeLogs.length) : 0}m
            </div>
            <div className="text-sm text-gray-600">Average Duration</div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingLog) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingLog ? 'Edit Time Log' : 'Add Time Log'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Activity Type
                </label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => handleActivityTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {ACTIVITY_TYPES.map((activity) => (
                    <option key={activity.value} value={activity.value}>
                      {activity.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Duration
                </label>
                <select
                  value={showCustomDuration ? 'custom' : formData.duration_minutes}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomDuration(true);
                    } else {
                      setShowCustomDuration(false);
                      setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {showCustomDuration && (
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2 text-gray-900"
                    min="1"
                    placeholder="Enter custom duration in minutes"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={3}
                placeholder="Describe the activity performed..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              
              {/* Billing Code (Optional) removed */}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {editingLog ? 'Update' : 'Save'} Time Log
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Time Logs List */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Time Log History</h4>
        {filteredTimeLogs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No time logs found</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedMonth ? 'for the selected month' : 'yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimeLogs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-900">
                        {getActivityTypeLabel(log.activity_type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(log.start_time || log.created_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {log.description && (
                        <p>{log.description}</p>
                      )}
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(log.duration_minutes)}
                        </span>
                        <span className="flex items-center">
                          {/* User icon was removed, so this line is now empty */}
                          {log.users ? `${log.users.first_name} ${log.users.last_name}` : 'Unknown Provider'}
                        </span>
                        {log.billing_code && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {log.billing_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingLog(log);
                        setFormData({
                          activity_type: log.activity_type,
                          description: log.description || '',
                          duration_minutes: log.duration_minutes,
                          date: (log.start_time || log.created_at).split('T')[0], // Set date to the log's start date
                          billing_code: log.billing_code || '',
                        });
                        setShowCustomDuration(false); // Ensure custom duration is off when editing
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 