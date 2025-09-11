'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/hooks/use-patients';
import { Activity, Calendar, CheckCircle, XCircle } from 'lucide-react';

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

interface MedicationLogData {
  id: string;
  medication_id: string;
  patient_id: string;
  status: string;
  event_date: string;
  created_at: string;
  raw_scan_data?: string;
  qr_code_scanned?: string;
  source?: string;
  medications?: {
    name: string;
    strength: string;
    format: string;
  }[];
}

export function ComplianceLogTab({ patient }: ComplianceLogTabProps) {
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [complianceScores, setComplianceScores] = useState<ComplianceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchComplianceData = useCallback(async () => {
    try {
      setLoading(true);

      // Mock data for fallback (currently unused but kept for future use)
      // const mockLogs: MedicationLog[] = [];
      // const mockScores: ComplianceScore[] = [];

      // Fetch real medication logs
      try {
        const { data: logsData, error: logsError } = await supabase
          .from('medication_logs')
          .select(`
            id,
            medication_id,
            patient_id,
            status,
            event_date,
            created_at,
            raw_scan_data,
            qr_code_scanned,
            source,
            medications (
              name,
              strength,
              format
            )
          `)
          .eq('patient_id', patient.id)
          .order('event_date', { ascending: false })
          .limit(50); // Limit to recent logs

        if (logsError) {
          console.error('Error fetching medication logs:', logsError);
          setLogs([]);
        } else {
          // Transform the data to match the expected interface
          const transformedLogs = (logsData as MedicationLogData[] || []).map((log) => {
            // Handle medication info from joined data
            let medicationName = '';
            let dosage = '';
            
            // Get medication info from joined data
            if (log.medications && log.medications.length > 0) {
              medicationName = log.medications[0].name;
              dosage = `${log.medications[0].strength} ${log.medications[0].format}`;
            }
            
            // Normalize status values - medication_logs uses 'taken', 'missed', 'skipped'
            let normalizedStatus = log.status;
            if (log.status === 'verified') {
              normalizedStatus = 'taken';
            } else if (log.status === 'failed') {
              normalizedStatus = 'failed';
            }
            
            return {
              id: log.id,
              patient_id: log.patient_id,
              medication_id: log.medication_id,
              status: normalizedStatus as 'taken' | 'missed' | 'pending' | 'verified' | 'failed' | 'skipped',
              taken_at: log.event_date, // Use event_date as taken_at
              created_at: log.created_at,
              medications: medicationName ? [{
                medication_name: medicationName,
                dosage: dosage
              }] : []
            };
          });
          setLogs(transformedLogs);
        }
      } catch (error) {
        console.error('Error fetching medication logs:', error);
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
      case 'taken':
        return 'text-green-600 bg-green-100';
      case 'missed':
        return 'text-red-600 bg-red-100';
      case 'skipped':
        return 'text-yellow-600 bg-yellow-100';
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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

  const currentCompliance = getCurrentMonthCompliance();

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
          <h3 className="text-lg font-medium text-gray-900">Medication Adherence</h3>
          <p className="text-sm text-gray-600">Track medication adherence and scanning history</p>
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
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Scan History</h4>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No scan history found</p>
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
                    {log.status === 'taken' ? '✅ Taken' : log.status === 'missed' ? '❌ Missed' : log.status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {log.medications?.[0]?.medication_name || 'Medication'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(log.taken_at || log.created_at)}
                    </div>
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