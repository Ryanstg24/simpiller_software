'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUserDisplay } from '@/hooks/use-user-display';
import { supabase } from '@/lib/supabase';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Calendar, FileText, FileSpreadsheet, File, Users, CheckCircle, Activity, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Type definition for jsPDF autoTable extension
interface AutoTableOptions {
  head: string[][];
  body: string[][];
  startY: number;
  styles: {
    fontSize: number;
  };
  headStyles: {
    fillColor: number[];
  };
  alternateRowStyles: {
    fillColor: number[];
  };
}

interface BillingData {
  patient_id: string;
  patient_name: string;
  provider_name: string;
  cpt_98975: boolean;
  cpt_98976_77: boolean;
  cpt_98980: boolean;
  cpt_98981: number; // Number of 20-minute increments
  adherence_days: number;
  provider_time_minutes: number;
  patient_communication_minutes: number;
  adherence_review_minutes: number;
}

interface BillingSummary {
  total_patients: number;
  eligible_98975: number;
  eligible_98976_77: number;
  eligible_98980: number;
  total_98981_increments: number;
  total_revenue_potential: number;
}

function BillingPageContent() {
  const { userOrganizationId, isOrganizationAdmin, isBilling } = useAuth();
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // Filtering options
  const [filters, setFilters] = useState({
    cpt_98975: false,
    cpt_98976_77: false,
    cpt_98980: false,
    cpt_98981: false,
    showOnlyEligible: false,
  });

  const fetchBillingData = useCallback(async () => {
    if (!userOrganizationId) return;

    try {
      setLoading(true);

      // Calculate date range for the selected period
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Fetch patients for the organization
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          first_name,
          last_name,
          adherence_score,
          created_at,
          users!assigned_provider_id (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', userOrganizationId)
        .eq('is_active', true);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
        return;
      }

      // Fetch medication logs for adherence tracking
      const { data: medicationLogs, error: logsError } = await supabase
        .from('medication_logs')
        .select('patient_id, event_date, status')
        .in('patient_id', patients?.map(p => p.id) || [])
        .gte('event_date', startDate.toISOString())
        .lte('event_date', endDate.toISOString());

      if (logsError) {
        console.error('Error fetching medication logs:', logsError);
        return;
      }

      // Fetch provider time logs
      const { data: timeLogs, error: timeLogsError } = await supabase
        .from('provider_time_logs')
        .select(`
          patient_id,
          activity_type,
          duration_minutes,
          users!provider_id (
            first_name,
            last_name
          )
        `)
        .in('patient_id', patients?.map(p => p.id) || [])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (timeLogsError) {
        console.error('Error fetching time logs:', timeLogsError);
        return;
      }

      // Process billing data
      const processedData: BillingData[] = (patients || []).map(patient => {
        const patientLogs = medicationLogs?.filter(log => log.patient_id === patient.id) || [];
        const patientTimeLogs = timeLogs?.filter(log => log.patient_id === patient.id) || [];

        // Calculate adherence days (unique days with 'taken' status)
        const adherenceDays = new Set(
          patientLogs
            .filter(log => log.status === 'taken')
            .map(log => new Date(log.event_date).toDateString())
        ).size;

        // Calculate provider time by activity type
        const patientCommunicationMinutes = patientTimeLogs
          .filter(log => log.activity_type === 'patient_communication')
          .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

        const adherenceReviewMinutes = patientTimeLogs
          .filter(log => log.activity_type === 'adherence_review')
          .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

        const totalProviderTime = patientCommunicationMinutes + adherenceReviewMinutes;

        // CPT Code Eligibility Logic
        const isOnboarded = new Date(patient.created_at) <= startDate;
        const cpt_98975 = isOnboarded && adherenceDays >= 16;
        
        // For 98976/77, we need medication class data (to be implemented)
        const cpt_98976_77 = false; // Will be implemented when medication classes are added
        
        const cpt_98980 = patientCommunicationMinutes >= 20 && adherenceReviewMinutes >= 20;
        const cpt_98981 = Math.floor(adherenceReviewMinutes / 20) - (cpt_98980 ? 1 : 0);

        return {
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          provider_name: patient.users && patient.users.length > 0 ? `${patient.users[0].first_name} ${patient.users[0].last_name}` : 'Unassigned',
          cpt_98975,
          cpt_98976_77,
          cpt_98980,
          cpt_98981: Math.max(0, cpt_98981),
          adherence_days: adherenceDays,
          provider_time_minutes: totalProviderTime,
          patient_communication_minutes: patientCommunicationMinutes,
          adherence_review_minutes: adherenceReviewMinutes,
        };
      });

      setBillingData(processedData);

      // Calculate summary
      const summary: BillingSummary = {
        total_patients: processedData.length,
        eligible_98975: processedData.filter(p => p.cpt_98975).length,
        eligible_98976_77: processedData.filter(p => p.cpt_98976_77).length,
        eligible_98980: processedData.filter(p => p.cpt_98980).length,
        total_98981_increments: processedData.reduce((sum, p) => sum + p.cpt_98981, 0),
        total_revenue_potential: 0, // Will calculate based on CPT rates
      };

      setSummary(summary);

    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [userOrganizationId, dateRange]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Check access after all hooks
  if (!isOrganizationAdmin && !isBilling) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access billing information.</p>
        </div>
      </div>
    );
  }

  // Filter data based on current filters
  const filteredData = billingData.filter(patient => {
    if (filters.showOnlyEligible) {
      return patient.cpt_98975 || patient.cpt_98976_77 || patient.cpt_98980 || patient.cpt_98981 > 0;
    }
    
    if (filters.cpt_98975 && !patient.cpt_98975) return false;
    if (filters.cpt_98976_77 && !patient.cpt_98976_77) return false;
    if (filters.cpt_98980 && !patient.cpt_98980) return false;
    if (filters.cpt_98981 && patient.cpt_98981 === 0) return false;
    
    return true;
  });

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const dataToExport = filteredData;
    const fileName = `billing-report-${dateRange.start}-to-${dateRange.end}`;

    if (format === 'csv') {
      exportToCSV(dataToExport, fileName);
    } else if (format === 'excel') {
      exportToExcel(dataToExport, fileName);
    } else if (format === 'pdf') {
      exportToPDF(dataToExport, fileName);
    }
  };

  const exportToCSV = (data: BillingData[], fileName: string) => {
    const headers = [
      'Patient Name',
      'Provider Name',
      'Adherence Days',
      'Provider Time (min)',
      'Patient Communication (min)',
      'Adherence Review (min)',
      'CPT 98975 Eligible',
      'CPT 98976/77 Eligible',
      'CPT 98980 Eligible',
      'CPT 98981 Increments'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(patient => [
        `"${patient.patient_name}"`,
        `"${patient.provider_name}"`,
        patient.adherence_days,
        patient.provider_time_minutes,
        patient.patient_communication_minutes,
        patient.adherence_review_minutes,
        patient.cpt_98975 ? 'Yes' : 'No',
        patient.cpt_98976_77 ? 'Yes' : 'No',
        patient.cpt_98980 ? 'Yes' : 'No',
        patient.cpt_98981
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (data: BillingData[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(patient => ({
        'Patient Name': patient.patient_name,
        'Provider Name': patient.provider_name,
        'Adherence Days': patient.adherence_days,
        'Provider Time (min)': patient.provider_time_minutes,
        'Patient Communication (min)': patient.patient_communication_minutes,
        'Adherence Review (min)': patient.adherence_review_minutes,
        'CPT 98975 Eligible': patient.cpt_98975 ? 'Yes' : 'No',
        'CPT 98976/77 Eligible': patient.cpt_98976_77 ? 'Yes' : 'No',
        'CPT 98980 Eligible': patient.cpt_98980 ? 'Yes' : 'No',
        'CPT 98981 Increments': patient.cpt_98981
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing Report');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportToPDF = (data: BillingData[], fileName: string) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Billing Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    // Prepare table data
    const tableData = data.map(patient => [
      patient.patient_name,
      patient.provider_name,
      patient.adherence_days.toString(),
      patient.provider_time_minutes.toString(),
      patient.cpt_98975 ? 'Yes' : 'No',
      patient.cpt_98976_77 ? 'Yes' : 'No',
      patient.cpt_98980 ? 'Yes' : 'No',
      patient.cpt_98981.toString()
    ]);

    // Add table
    (doc as jsPDF & { autoTable: (options: AutoTableOptions) => void }).autoTable({
      head: [['Patient', 'Provider', 'Adherence Days', 'Provider Time (min)', '98975', '98976/77', '98980', '98981']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`${fileName}.pdf`);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Organization Billing</h1>
          <p className="mt-2 text-black">Track and export billing data for CPT codes</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4">Billing Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchBillingData} className="w-full bg-black text-white hover:bg-gray-800">
                <Calendar className="h-4 w-4 mr-2" />
                Update Data
              </Button>
            </div>
          </div>
        </div>

        {/* Filtering Options */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4">Filter Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showOnlyEligible"
                checked={filters.showOnlyEligible}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyEligible: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showOnlyEligible" className="ml-2 text-sm text-black">
                Show Only Eligible
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cpt_98975"
                checked={filters.cpt_98975}
                onChange={(e) => setFilters(prev => ({ ...prev, cpt_98975: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cpt_98975" className="ml-2 text-sm text-black">
                CPT 98975 Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cpt_98976_77"
                checked={filters.cpt_98976_77}
                onChange={(e) => setFilters(prev => ({ ...prev, cpt_98976_77: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cpt_98976_77" className="ml-2 text-sm text-black">
                CPT 98976/77 Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cpt_98980"
                checked={filters.cpt_98980}
                onChange={(e) => setFilters(prev => ({ ...prev, cpt_98980: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cpt_98980" className="ml-2 text-sm text-black">
                CPT 98980 Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cpt_98981"
                checked={filters.cpt_98981}
                onChange={(e) => setFilters(prev => ({ ...prev, cpt_98981: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cpt_98981" className="ml-2 text-sm text-black">
                CPT 98981 Only
              </label>
            </div>
            <div className="flex items-center">
              <Button 
                onClick={() => setFilters({
                  cpt_98975: false,
                  cpt_98976_77: false,
                  cpt_98980: false,
                  cpt_98981: false,
                  showOnlyEligible: false,
                })}
                variant="outline"
                size="sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_patients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">98975 Eligible</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.eligible_98975}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">98980 Eligible</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.eligible_98980}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">98981 Increments</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_98981_increments}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4">Export Data</h2>
          <div className="flex space-x-4">
            <Button onClick={() => handleExport('csv')} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => handleExport('excel')} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => handleExport('pdf')} variant="outline">
              <File className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Billing Data Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-black">Patient Billing Data</h2>
              <span className="text-sm text-black">
                Showing {filteredData.length} of {billingData.length} patients
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adherence Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    98975
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    98976/77
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    98980
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    98981
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((patient) => (
                  <tr key={patient.patient_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {patient.patient_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.adherence_days}/16
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.provider_time_minutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        patient.cpt_98975 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.cpt_98975 ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        patient.cpt_98976_77 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.cpt_98976_77 ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        patient.cpt_98980 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.cpt_98980 ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.cpt_98981} increments
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const userInfo = useUserDisplay();
  
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        <Sidebar currentPage="/billing" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Organization Billing" 
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <BillingPageContent />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
