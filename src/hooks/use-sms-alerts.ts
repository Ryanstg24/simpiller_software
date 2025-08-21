import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface SMSAlert {
  id: string;
  patient_id: string;
  medication_ids: string[];
  alert_type: 'sms_reminder' | 'follow_up' | 'compliance_summary';
  scheduled_time: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  scan_session_id?: string;
  created_at: string;
  
  // Joined data
  patients?: {
    first_name: string;
    last_name: string;
    phone1: string;
  };
  medications?: Array<{
    medication_name: string;
    dosage: string;
  }>;
}

export interface SendReminderRequest {
  patientId: string;
  medicationIds: string[];
  scheduledTime: string;
}

export function useSMSAlerts() {
  const { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch SMS alerts
  const {
    data: alerts = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sms-alerts', isSimpillerAdmin, isOrganizationAdmin, userOrganizationId],
    queryFn: async (): Promise<SMSAlert[]> => {
      let query = supabase
        .from('medication_alerts')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            phone1
          ),
          medications (
            medication_name,
            dosage
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply role-based filtering
      if (isSimpillerAdmin) {
        // Simpiller Admin sees all alerts
      } else if (isOrganizationAdmin && userOrganizationId) {
        // Organization Admin sees alerts for their organization's patients
        query = query.eq('patients.organization_id', userOrganizationId);
      } else {
        // Other roles see no alerts
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching SMS alerts:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to fetch SMS alerts: ${error.message || 'Unknown error'}`);
      }

      return (data as SMSAlert[]) || [];
    },
    enabled: !!isSimpillerAdmin || !!isOrganizationAdmin,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes (replaces cacheTime)
  });

  // Send immediate reminder
  const sendReminderMutation = useMutation({
    mutationFn: async (request: SendReminderRequest) => {
      const response = await fetch('/api/sms/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reminder');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['sms-alerts'] });
    },
  });

  // Send follow-up reminder
  const sendFollowUpMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/sms/send-followup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send follow-up');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-alerts'] });
    },
  });

  // Get alert statistics
  const getAlertStats = () => {
    const alertArray = alerts as SMSAlert[];
    const totalAlerts = alertArray.length;
    const sentAlerts = alertArray.filter((alert: SMSAlert) => alert.status === 'sent').length;
    const failedAlerts = alertArray.filter((alert: SMSAlert) => alert.status === 'failed').length;
    const pendingAlerts = alertArray.filter((alert: SMSAlert) => alert.status === 'pending').length;

    return {
      total: totalAlerts,
      sent: sentAlerts,
      failed: failedAlerts,
      pending: pendingAlerts,
      successRate: totalAlerts > 0 ? (sentAlerts / totalAlerts) * 100 : 0,
    };
  };

  // Get alerts by date range
  const getAlertsByDateRange = (startDate: string, endDate: string) => {
    const alertArray = alerts as SMSAlert[];
    return alertArray.filter((alert: SMSAlert) => {
      const alertDate = new Date(alert.created_at).toISOString().split('T')[0];
      return alertDate >= startDate && alertDate <= endDate;
    });
  };

  // Get alerts by patient
  const getAlertsByPatient = (patientId: string) => {
    const alertArray = alerts as SMSAlert[];
    return alertArray.filter((alert: SMSAlert) => alert.patient_id === patientId);
  };

  return {
    alerts,
    loading,
    error: error?.message || null,
    refetch,
    sendReminder: sendReminderMutation.mutate,
    sendFollowUp: sendFollowUpMutation.mutate,
    isSendingReminder: sendReminderMutation.isPending,
    isSendingFollowUp: sendFollowUpMutation.isPending,
    getAlertStats,
    getAlertsByDateRange,
    getAlertsByPatient,
  };
} 