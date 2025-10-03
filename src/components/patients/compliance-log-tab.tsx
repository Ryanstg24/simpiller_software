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

interface SessionLogData {
  id: string;
  session_id: string;
  patient_id: string;
  status: 'completed' | 'missed' | 'partial';
  event_date?: string;
  created_at: string;
  total_medications: number;
  scanned_medications: number;
  missed_medications: number;
  raw_scan_data?: string;
  qr_code_scanned?: string;
  source?: string;
  completion_time?: string;
}

export function ComplianceLogTab({ patient }: ComplianceLogTabProps) {
  const [logs, setLogs] = useState<SessionLogData[]>([]);
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

      // Fetch real session logs
      try {
        const { data: logsData, error: logsError } = await supabase
          .from('session_logs')
          .select(`
            id,
            session_id,
            patient_id,
            status,
            event_date,
            created_at,
            total_medications,
            scanned_medications,
            missed_medications,
            raw_scan_data,
            qr_code_scanned,
            source,
            completion_time
          `)
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(100); // Increased limit to show more comprehensive history

        if (logsError) {
          console.error('Error fetching session logs:', logsError);
          setLogs([]);
        } else {
          setLogs(logsData as SessionLogData[] || []);
        }
      } catch (error) {
        console.error('Error fetching session logs:', error);
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
      case 'missed':
        return 'text-red-600 bg-red-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    // For missed entries from expired sessions, we want to show the original scheduled time
    // without timezone conversion, as it represents when the medication was supposed to be taken
    const date = new Date(dateString);
    
    // Format as UTC to avoid timezone conversion issues
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ' UTC';
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
                ✅ Completed: {logs.filter(log => log.status === 'completed').length}
              </span>
              <span className="text-yellow-600">
                ⚠️ Partial: {logs.filter(log => log.status === 'partial').length}
              </span>
              <span className="text-red-600">
                ❌ Missed: {logs.filter(log => log.status === 'missed').length}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Note: Sessions are marked as completed when at least one medication is scanned
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
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                    {log.status === 'completed' ? '✅ Completed' : 
                     log.status === 'missed' ? '❌ Missed' : 
                     log.status === 'partial' ? '⚠️ Partial' :
                     log.status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">
                      Medication Session
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(log.event_date || log.created_at)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.scanned_medications} of {log.total_medications} medications scanned
                    </div>
                    {log.source && (
                      <div className="text-xs text-gray-500">
                        Source: {log.source}
                      </div>
                    )}
                    {log.raw_scan_data && (
                      <div className="text-xs text-gray-500">
                        {(() => {
                          try {
                            const scanData = JSON.parse(log.raw_scan_data);
                            if (scanData.reason === 'session_expired') {
                              return '⏰ Session expired';
                            } else if (scanData.timeliness === 'overdue') {
                              return '⏰ Late (but within window)';
                            } else if (scanData.timeliness === 'missed') {
                              return '⏰ Missed (window expired)';
                            }
                          } catch (e) {
                            // Ignore parsing errors
                          }
                          return null;
                        })()}
                      </div>
                    )}
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