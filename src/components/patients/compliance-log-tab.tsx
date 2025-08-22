'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { Patient } from '@/hooks/use-patients';
import { Activity, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceLogTabProps {
  patient: Patient;
}

interface MedicationLog {
  id: string;
  patient_id: string;
  medication_id: string;
  scan_method: string;
  scanned_medication_name?: string;
  scanned_dosage?: string;
  image_url?: string;
  ocr_data?: any;
  verification_score: number;
  session_token: string;
  status: 'verified' | 'failed' | 'pending';
  taken_at: string;
  created_at: string;
  
  // Joined data
  medications?: {
    medication_name: string;
    dosage: string;
  };
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

export function ComplianceLogTab({ patient }: ComplianceLogTabProps) {
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [complianceScores, setComplianceScores] = useState<ComplianceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    if (patient) {
      fetchComplianceData();
    }
  }, [patient, fetchComplianceData]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);

      // Fetch medication logs
      let logsQuery = supabase
        .from('medication_logs')
        .select(`
          *,
          medications (
            medication_name,
            dosage
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (selectedMonth) {
        const startDate = new Date(selectedMonth + '-01');
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        logsQuery = logsQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching medication logs:', logsError);
      } else {
        setLogs(logsData || []);
      }

      // Fetch compliance scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('compliance_scores')
        .select('*')
        .eq('patient_id', patient.id)
        .order('month_year', { ascending: false });

      if (scoresError) {
        console.error('Error fetching compliance scores:', scoresError);
      } else {
        setComplianceScores(scoresData || []);
      }

    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthCompliance = () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    return complianceScores.find(score => {
      const scoreMonth = new Date(score.month_year).toISOString().slice(0, 7);
      return scoreMonth === currentMonth;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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
          <p className="mt-2 text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Medication Compliance</h3>
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
              <div className="text-sm text-gray-600">Compliance Rate</div>
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
          <h4 className="text-lg font-medium text-gray-900 mb-4">Historical Compliance</h4>
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
                  <div className="text-sm text-gray-600">Compliance</div>
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
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(log.taken_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {log.medications?.medication_name || log.scanned_medication_name || 'Unknown Medication'}
                        </span>
                        {log.scanned_dosage && (
                          <span className="text-sm text-gray-600">
                            ({log.scanned_dosage})
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Verification Score:</span> {(log.verification_score * 100).toFixed(1)}%
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Scan Method:</span> {log.scan_method}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {log.status === 'verified' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
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