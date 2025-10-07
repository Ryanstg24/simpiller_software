'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/hooks/use-patients';
import { Activity, Calendar } from 'lucide-react';

interface ComplianceLogTabProps {
  patient: Patient;
}

interface MedicationLog {
  id: string;
  patient_id: string;
  medication_id: string;
  scan_method?: string;
  scanned_medication_name?: string;
  scanned_dosage?: string;
  image_url?: string;
  ocr_data?: Record<string, unknown>;
  verification_score?: number;
  session_token?: string;
  status: 'verified' | 'failed' | 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string;
  created_at: string;
  
  // Joined data
  medications?: {
    medication_name: string;
    dosage: string;
  }[];
}

interface ComplianceScore {
  id: string;
  patient_id: string;
  month_year: string;
  total_medications: number;
  total_scans: number;
  successful_scans: number;
  compliance_percentage: number; // Changed from compliance_rate
  created_at: string;
}

interface ScanSessionData {
  id: string;
  patient_id: string;
  session_token?: string;
  medication_ids: string[];
  scheduled_time: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  // Joined data from medication_logs
  has_taken_logs?: boolean; // Whether any medications were actually scanned/taken
}

// Helper to derive status based on medication_logs and time
// Don't rely on is_active since past scans failed to update it
function deriveSessionStatus(session: ScanSessionData): 'pending' | 'completed' | 'expired' {
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  
  // If any medication in the session was logged as 'taken', the session is completed
  // This is the definitive check - if they scanned, it's completed regardless of is_active
  if (session.has_taken_logs) {
    return 'completed';
  }
  
  // If no logs and past expiration time, it expired (missed)
  if (expiresAt < now) {
    return 'expired';
  }
  
  // If no logs and not yet expired, it's still pending
  return 'pending';
}

export function ComplianceLogTab({ patient }: ComplianceLogTabProps) {
  const [logs, setLogs] = useState<ScanSessionData[]>([]);
  const [complianceScores, setComplianceScores] = useState<ComplianceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchComplianceData = useCallback(async () => {
    if (!patient?.id) {
      console.error('No patient ID available');
      return;
    }
    
    try {
      setLoading(true);

      // Mock data for fallback (currently unused but kept for future use)
      // const mockLogs: MedicationLog[] = [];
      // const mockScores: ComplianceScore[] = [];

      // Fetch scan sessions with medication_logs to determine if session was completed
      try {
        console.log('[Compliance] Fetching scan sessions for patient:', patient.id);
        
        // First, get all scan sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('medication_scan_sessions')
          .select('*')
          .eq('patient_id', patient.id)
          .order('scheduled_time', { ascending: false })
          .limit(100);

        if (sessionsError) {
          console.error('[Compliance] Error fetching scan sessions:', {
            error: sessionsError,
            message: sessionsError.message,
            details: sessionsError.details,
            hint: sessionsError.hint,
            code: sessionsError.code
          });
          setLogs([]);
        } else if (sessionsData && sessionsData.length > 0) {
          // For each session, check if any medications were logged as 'taken'
          // Match by: patient, medication IDs, and time window (within window: 30 min before to 2 hours after scheduled time)
          const sessionsWithStatus = await Promise.all(
            sessionsData.map(async (session) => {
              // Allow 30 minutes before scheduled time (early scans) and 2 hours after
              const windowStart = new Date(new Date(session.scheduled_time).getTime() - 30 * 60 * 1000).toISOString();
              const windowEnd = new Date(new Date(session.scheduled_time).getTime() + 2 * 60 * 60 * 1000).toISOString();
              
              const { data: takenLogs, error: logsError } = await supabase
                .from('medication_logs')
                .select('id, event_date, medication_id')
                .eq('patient_id', session.patient_id)
                .in('medication_id', session.medication_ids)
                .eq('status', 'taken')
                .gte('event_date', windowStart)
                .lte('event_date', windowEnd)
                .limit(1);

              const hasTakenLogs = takenLogs && takenLogs.length > 0;

              // Debug logging - show a few sessions to understand the data
              if (sessionsData.indexOf(session) < 3) {
                console.log('[Compliance] DEBUG session sample:', {
                  session_id: session.id,
                  scheduled: session.scheduled_time,
                  is_active: session.is_active,
                  medication_ids: session.medication_ids,
                  medication_count: session.medication_ids?.length,
                  windowStart,
                  windowEnd,
                  found_logs: takenLogs?.length || 0,
                  has_taken_logs: hasTakenLogs,
                  logs_sample: takenLogs?.[0],
                  error: logsError
                });
              }

              return {
                ...session,
                has_taken_logs: hasTakenLogs
              } as ScanSessionData;
            })
          );

          console.log('[Compliance] Successfully fetched scan sessions:', sessionsWithStatus.length);
          setLogs(sessionsWithStatus);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('[Compliance] Exception fetching scan sessions:', error);
        setLogs([]);
      }

      // Try to fetch compliance scores
      try {
        const { data: scoresData, error: scoresError } = await supabase
          .from('compliance_scores')
          .select('*')
          .eq('patient_id', patient.id)
          .order('month_year', { ascending: false });

        if (scoresError) {
          console.warn('Compliance scores table not available yet, using empty data:', scoresError);
          setComplianceScores([]);
        } else {
          setComplianceScores(scoresData || []);
        }
      } catch (error) {
        console.warn('Error fetching compliance scores, using empty data:', error);
        setComplianceScores([]);
      }

    } catch (error) {
      console.error('Error in fetchComplianceData:', error);
      // Set empty arrays as fallback
      setLogs([]);
      setComplianceScores([]);
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => {
    if (patient) {
      fetchComplianceData();
    }
  }, [patient, fetchComplianceData]);

  const getCurrentMonthCompliance = () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    return complianceScores.find(score => {
      const scoreMonth = new Date(score.month_year).toISOString().slice(0, 7);
      return scoreMonth === currentMonth;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'failed':
        return 'text-yellow-600 bg-yellow-100';
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Format in user's local timezone
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
      // Removed timeZone: 'UTC' to use local time
    });
  };

  const currentCompliance = getCurrentMonthCompliance();

  // Safety check for patient
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No patient selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading adherence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Session Adherence</h3>
          <p className="text-sm text-gray-600">Track medication session completion and scanning history</p>
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
        </div>
      </div>

      {/* Current Month Summary */}
      {currentCompliance && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Current Month Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentCompliance.compliance_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Adherence Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentCompliance.successful_scans}
              </div>
              <div className="text-sm text-gray-600">Successful Scans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {currentCompliance.total_scans}
              </div>
              <div className="text-sm text-gray-600">Total Scans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentCompliance.total_medications}
              </div>
              <div className="text-sm text-gray-600">Active Medications</div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Compliance */}
      {complianceScores.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Historical Adherence</h4>
          <div className="space-y-3">
            {complianceScores.map((score) => (
              <div key={score.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(score.month_year + '-01').toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {score.successful_scans} of {score.total_scans} scans successful
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    score.compliance_percentage >= 80 ? 'text-green-600' :
                    score.compliance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {score.compliance_percentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Adherence</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Scan Logs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Session History</h4>
        
        {/* Status Summary */}
        {logs.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-green-600">
                ✅ Completed: {logs.filter(log => deriveSessionStatus(log) === 'completed').length}
              </span>
              <span className="text-red-600">
                ❌ Expired: {logs.filter(log => deriveSessionStatus(log) === 'expired').length}
              </span>
              <span className="text-blue-600">
                ⏳ Pending: {logs.filter(log => deriveSessionStatus(log) === 'pending').length}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Note: A session counts as completed when at least one medication is scanned
            </div>
          </div>
        )}
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No session history found</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedMonth ? 'for the selected month' : 'yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const status = deriveSessionStatus(log);
              return (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {status === 'completed' ? '✅ Completed' : 
                     status === 'expired' ? '❌ Expired' : 
                     status === 'pending' ? '⏳ Pending' :
                     status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">
                      Medication Session
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(log.scheduled_time)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.medication_ids.length} medication{log.medication_ids.length !== 1 ? 's' : ''} in session
                    </div>
                    {status === 'completed' && log.has_taken_logs && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Session completed - medications taken
                      </div>
                    )}
                    {status === 'expired' && (
                      <div className="text-xs text-gray-500">
                        ⏰ Window expired at {new Date(log.expires_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 