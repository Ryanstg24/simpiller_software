'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { useUserDisplay } from '@/hooks/use-user-display';
import { useOrganizations } from '@/hooks/use-organizations';
import { supabase } from '@/lib/supabase';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Calendar, FileText, FileSpreadsheet, File, Users, CheckCircle, Activity, Clock, Filter, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BillingData {
  patient_id: string;
  patient_name: string;
  provider_name: string;
  cpt_98975: boolean;
  cpt_98975_status: 'eligible' | 'not_eligible' | 'previously_claimed';
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
  const { userOrganizationId, isOrganizationAdmin, isBilling, isSimpillerAdmin } = useAuthV2();
  const { organizations } = useOrganizations();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  const [previousBillingData, setPreviousBillingData] = useState<BillingData[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingMode, setBillingMode] = useState<'per-patient' | 'date-range'>('per-patient');
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

  // Helper to compute current 30-day cycle for a patient
  const computeCurrentCycle = (startISO: string) => {
    const start = new Date(startISO);
    const now = new Date();
    const cycleMs = 30 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - start.getTime();
    const cyclesPassed = Math.floor(elapsed / cycleMs);
    const cycleStart = new Date(start.getTime() + cyclesPassed * cycleMs);
    const cycleEnd = new Date(cycleStart.getTime() + cycleMs);
    return { cycleStart, cycleEnd };
  };

  // Helper to compute previous 30-day cycle for a patient
  const computePreviousCycle = (startISO: string) => {
    const start = new Date(startISO);
    const now = new Date();
    const cycleMs = 30 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - start.getTime();
    const cyclesPassed = Math.floor(elapsed / cycleMs);
    // Go back one cycle
    const cycleStart = new Date(start.getTime() + (cyclesPassed - 1) * cycleMs);
    const cycleEnd = new Date(cycleStart.getTime() + cycleMs);
    return { cycleStart, cycleEnd };
  };

  // Helper function to process billing data for a specific cycle
  const processBillingDataForCycle = useCallback(async (
    patients: Array<{
      id: string;
      first_name: string;
      last_name: string;
      created_at: string;
      cycle_start_date?: string;
      assigned_provider?: Record<string, string> | Record<string, string>[];
    }>,
    cycleType: 'current' | 'previous'
  ): Promise<BillingData[]> => {
    const processedData: BillingData[] = [];

    for (const patient of patients || []) {
      // Determine date range based on billing mode
      let cycleStart: Date;
      let cycleEnd: Date;

      if (billingMode === 'per-patient' && patient.cycle_start_date) {
        // Use patient's individual cycle (current or previous)
        const cycle = cycleType === 'current' 
          ? computeCurrentCycle(patient.cycle_start_date)
          : computePreviousCycle(patient.cycle_start_date);
        cycleStart = cycle.cycleStart;
        cycleEnd = cycle.cycleEnd;
      } else if (billingMode === 'per-patient' && !patient.cycle_start_date) {
        // Fallback: use earliest medication
        const { data: med } = await supabase
          .from('medications')
          .select('created_at')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (med?.created_at) {
          const cycle = cycleType === 'current'
            ? computeCurrentCycle(med.created_at)
            : computePreviousCycle(med.created_at);
          cycleStart = cycle.cycleStart;
          cycleEnd = cycle.cycleEnd;
        } else {
          // Skip patient if no cycle anchor
          continue;
        }
      } else {
        // Use manual date range (previous cycle not applicable for date-range mode)
        cycleStart = new Date(dateRange.start);
        cycleEnd = new Date(dateRange.end);
        cycleEnd.setHours(23, 59, 59, 999);
      }

        // Fetch medication logs for this patient's cycle
        const { data: medicationLogs } = await supabase
          .from('medication_logs')
          .select('event_date, status')
          .eq('patient_id', patient.id)
          .gte('event_date', cycleStart.toISOString())
          .lt('event_date', cycleEnd.toISOString());

        // Fetch provider time logs for this patient's cycle (FIXED: use start_time not created_at)
        const { data: timeLogs } = await supabase
          .from('provider_time_logs')
          .select(`
            activity_type,
            duration_minutes,
            start_time,
            users!provider_id (
              first_name,
              last_name
            )
          `)
          .eq('patient_id', patient.id)
          .gte('start_time', cycleStart.toISOString())
          .lt('start_time', cycleEnd.toISOString());

        // Calculate adherence days (unique days with 'taken' status)
        const adherenceDays = new Set(
          (medicationLogs || [])
            .filter(log => log.status === 'taken')
            .map(log => new Date(log.event_date).toDateString())
        ).size;

        // Calculate provider time by activity type
        const patientCommunicationMinutes = (timeLogs || [])
          .filter(log => log.activity_type === 'patient_communication')
          .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

        const adherenceReviewMinutes = (timeLogs || [])
          .filter(log => log.activity_type === 'adherence_review')
          .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

        const totalProviderTime = patientCommunicationMinutes + adherenceReviewMinutes;

        // CPT Code Eligibility Logic
        
        // CPT 98975: One-time eligibility when patient first achieves 16/30 days adherence
        // Check if this cycle meets the threshold
        const meetsThreshold = adherenceDays >= 16;
        
        // Check if patient has EVER been eligible in any previous cycle
        // We'll check all cycles from patient creation to the END of this current cycle
        let hasBeenEligibleBefore = false;
        
        if (meetsThreshold && patient.created_at) {
          const patientCreatedDate = new Date(patient.created_at);
          
          // Get all medication logs from patient creation to END of current cycle (not including future)
          const { data: allHistoricalLogs } = await supabase
            .from('medication_logs')
            .select('event_date, status')
            .eq('patient_id', patient.id)
            .gte('event_date', patientCreatedDate.toISOString())
            .lt('event_date', cycleEnd.toISOString());
          
          // Calculate all historical cycles and check if any had 16+ days
          const cycleMs = 30 * 24 * 60 * 60 * 1000;
          const now = new Date();
          const elapsed = now.getTime() - patientCreatedDate.getTime();
          const totalCyclesPassed = Math.floor(elapsed / cycleMs);
          
          // Check each previous cycle (not including the current one)
          for (let i = 0; i < totalCyclesPassed; i++) {
            const historicalCycleStart = new Date(patientCreatedDate.getTime() + i * cycleMs);
            const historicalCycleEnd = new Date(historicalCycleStart.getTime() + cycleMs);
            
            // Skip if this is the current cycle we're already processing
            if (historicalCycleStart.getTime() === cycleStart.getTime()) {
              continue;
            }
            
            // Count adherence days for this historical cycle
            const historicalAdherenceDays = new Set(
              (allHistoricalLogs || [])
                .filter(log => {
                  const logDate = new Date(log.event_date);
                  return log.status === 'taken' && 
                         logDate >= historicalCycleStart && 
                         logDate < historicalCycleEnd;
                })
                .map(log => new Date(log.event_date).toDateString())
            ).size;
            
            if (historicalAdherenceDays >= 16) {
              hasBeenEligibleBefore = true;
              break;
            }
          }
        }
        
        // Patient is eligible for 98975 if they meet threshold NOW and have NEVER met it before
        const cpt_98975 = meetsThreshold && !hasBeenEligibleBefore;
        
        // Determine status for display purposes
        let cpt_98975_status: 'eligible' | 'not_eligible' | 'previously_claimed';
        if (cpt_98975) {
          cpt_98975_status = 'eligible';
        } else if (hasBeenEligibleBefore) {
          cpt_98975_status = 'previously_claimed';
        } else {
          cpt_98975_status = 'not_eligible';
        }
        
        // For 98976/77, we need medication class data (to be implemented)
        const cpt_98976_77 = false; // Will be implemented when medication classes are added
        
        const cpt_98980 = patientCommunicationMinutes >= 20 && adherenceReviewMinutes >= 20;
        const cpt_98981 = Math.floor(adherenceReviewMinutes / 20) - (cpt_98980 ? 1 : 0);

        // Get provider name from patient's assigned provider
        let providerName = 'Unassigned';
        try {
          if (patient.assigned_provider) {
            const provider = patient.assigned_provider as Record<string, string> | Record<string, string>[];
            const providerInfo = Array.isArray(provider) ? provider[0] : provider;
            if (providerInfo && providerInfo.first_name && providerInfo.last_name) {
              providerName = `${providerInfo.first_name} ${providerInfo.last_name}`;
            }
          }
        } catch {
          // Fallback to 'Unassigned' if any error
          providerName = 'Unassigned';
        }

      processedData.push({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        provider_name: providerName,
        cpt_98975,
        cpt_98975_status,
        cpt_98976_77,
        cpt_98980,
        cpt_98981: Math.max(0, cpt_98981),
        adherence_days: adherenceDays,
        provider_time_minutes: totalProviderTime,
        patient_communication_minutes: patientCommunicationMinutes,
        adherence_review_minutes: adherenceReviewMinutes,
      });
    }

    return processedData;
  }, [billingMode]);

  const fetchBillingData = useCallback(async () => {
    // Determine which organization to use
    const effectiveOrgId = isSimpillerAdmin ? selectedOrganizationId : userOrganizationId;
    
    if (!effectiveOrgId) return;

    try {
      setLoading(true);

      // Fetch patients for the organization
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          first_name,
          last_name,
          adherence_score,
          created_at,
          cycle_start_date,
          assigned_provider:users!assigned_provider_id (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', effectiveOrgId)
        .eq('is_active', true);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
        return;
      }

      // Process current cycle data
      const currentCycleData = await processBillingDataForCycle(patients || [], 'current');
      setBillingData(currentCycleData);

      // Calculate summary for current cycle
      const currentSummary: BillingSummary = {
        total_patients: currentCycleData.length,
        eligible_98975: currentCycleData.filter(p => p.cpt_98975).length,
        eligible_98976_77: currentCycleData.filter(p => p.cpt_98976_77).length,
        eligible_98980: currentCycleData.filter(p => p.cpt_98980).length,
        total_98981_increments: currentCycleData.reduce((sum, p) => sum + p.cpt_98981, 0),
        total_revenue_potential: 0, // Will calculate based on CPT rates
      };
      setSummary(currentSummary);

      // Process previous cycle data (only for per-patient mode)
      if (billingMode === 'per-patient') {
        const previousCycleData = await processBillingDataForCycle(patients || [], 'previous');
        setPreviousBillingData(previousCycleData);
      } else {
        // Clear previous cycle data in date-range mode
        setPreviousBillingData([]);
      }

    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [userOrganizationId, selectedOrganizationId, isSimpillerAdmin, dateRange, billingMode, processBillingDataForCycle]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Check access after all hooks
  if (!isOrganizationAdmin && !isBilling && !isSimpillerAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access billing information.</p>
        </div>
      </div>
    );
  }

  // Simpiller Admins must select an organization
  if (isSimpillerAdmin && !selectedOrganizationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black">Organization Billing</h1>
            <p className="mt-2 text-black">Track and export billing data for CPT codes</p>
          </div>

          {/* Organization Filter for Simpiller Admins */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Building2 className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-medium text-black">Select Organization</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please select an organization to view their billing data.
            </p>
            <select
              value={selectedOrganizationId}
              onChange={(e) => setSelectedOrganizationId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="">Select an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
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

  // Filter previous cycle data based on current filters
  const filteredPreviousData = previousBillingData.filter(patient => {
    if (filters.showOnlyEligible) {
      return patient.cpt_98975 || patient.cpt_98976_77 || patient.cpt_98980 || patient.cpt_98981 > 0;
    }
    
    if (filters.cpt_98975 && !patient.cpt_98975) return false;
    if (filters.cpt_98976_77 && !patient.cpt_98976_77) return false;
    if (filters.cpt_98980 && !patient.cpt_98980) return false;
    if (filters.cpt_98981 && patient.cpt_98981 === 0) return false;
    
    return true;
  });

  const handleExport = (format: 'csv' | 'excel' | 'pdf', cycleType: 'current' | 'previous' = 'current') => {
    const dataToExport = cycleType === 'current' ? filteredData : filteredPreviousData;
    const cycleSuffix = cycleType === 'current' ? 'current-cycle' : 'previous-cycle';
    const fileName = billingMode === 'per-patient' 
      ? `billing-report-${cycleSuffix}-${new Date().toISOString().split('T')[0]}`
      : `billing-report-${dateRange.start}-to-${dateRange.end}`;

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
      'CPT 98975 Status',
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
        patient.cpt_98975_status === 'eligible' ? 'Eligible' : patient.cpt_98975_status === 'previously_claimed' ? 'Previously Claimed' : 'Not Eligible',
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
        'CPT 98975 Status': patient.cpt_98975_status === 'eligible' ? 'Eligible' : patient.cpt_98975_status === 'previously_claimed' ? 'Previously Claimed' : 'Not Eligible',
        'CPT 98976/77 Eligible': patient.cpt_98976_77 ? 'Yes' : 'No',
        'CPT 98980 Eligible': patient.cpt_98980 ? 'Yes' : 'No',
        'CPT 98981 Increments': patient.cpt_98981
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billing Report');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportPatientBillingSummary = async (patientData: BillingData, cycleType: 'current' | 'previous') => {
    try {
      console.log('Generating patient billing summary PDF...');
      const doc = new jsPDF();
      
      // Add Simpiller logo
      try {
        const logoImg = new Image();
        logoImg.src = '/simpiller_logo25.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        doc.addImage(logoImg, 'PNG', 20, 10, 30, 15);
      } catch (error) {
        console.warn('Logo could not be loaded, using text fallback:', error);
        doc.setFontSize(20);
        doc.setTextColor(51, 139, 202);
        doc.text('simpiller', 20, 20);
      }
      
      // Add title
      doc.setFontSize(16);
      doc.setTextColor(51, 139, 202);
      doc.text('Billing Summary', 150, 20);
      
      // Patient Information
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient:', 20, 35);
      doc.setFont('helvetica', 'normal');
      doc.text(patientData.patient_name, 70, 35);
      
      // Fetch additional patient details for the summary
      const { data: patientDetails } = await supabase
        .from('patients')
        .select('date_of_birth, cycle_start_date')
        .eq('id', patientData.patient_id)
        .single();
      
      if (patientDetails?.date_of_birth) {
        doc.setFont('helvetica', 'bold');
        doc.text('Birth Date:', 20, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(patientDetails.date_of_birth).toLocaleDateString(), 70, 42);
      }
      
      // Calculate cycle dates
      let cycleStart: Date;
      let cycleEnd: Date;
      if (patientDetails?.cycle_start_date) {
        const cycle = cycleType === 'current' 
          ? computeCurrentCycle(patientDetails.cycle_start_date)
          : computePreviousCycle(patientDetails.cycle_start_date);
        cycleStart = cycle.cycleStart;
        cycleEnd = cycle.cycleEnd;
      } else {
        cycleStart = new Date();
        cycleEnd = new Date();
      }
      
      // Setup Codes
      doc.setFont('helvetica', 'bold');
      doc.text('Setup:', 20, 55);
      doc.setFont('helvetica', 'normal');
      const setupCodes = [];
      if (patientData.cpt_98975) setupCodes.push('98975');
      if (patientData.cpt_98976_77) setupCodes.push('98976/98977');
      if (patientData.cpt_98980) setupCodes.push('98980');
      if (patientData.cpt_98981 > 0) setupCodes.push(`98981 (${patientData.cpt_98981} increments)`);
      doc.text(setupCodes.length > 0 ? setupCodes.join(', ') : 'N/A', 70, 55);
      
      // Cycle Information
      doc.setFont('helvetica', 'bold');
      doc.text('Cycle #:', 20, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(cycleType === 'current' ? 'Current' : 'Previous', 70, 68);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Interval Date Range:', 20, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(`${cycleStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()}`, 70, 75);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total Billable Time:', 20, 82);
      doc.setFont('helvetica', 'normal');
      doc.text(`${patientData.provider_time_minutes} minutes`, 70, 82);
      
      // Provider Activity Log
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROVIDER ACTIVITY LOG', 20, 95);
      
      // Fetch provider time logs for this patient's cycle
      console.log(`Fetching time logs for patient ${patientData.patient_id} from ${cycleStart.toISOString()} to ${cycleEnd.toISOString()}`);
      const { data: timeLogs, error: timeLogsError } = await supabase
        .from('provider_time_logs')
        .select(`
          activity_type,
          duration_minutes,
          start_time,
          description,
          users!provider_id (
            first_name,
            last_name
          )
        `)
        .eq('patient_id', patientData.patient_id)
        .gte('start_time', cycleStart.toISOString())
        .lt('start_time', cycleEnd.toISOString())
        .order('start_time', { ascending: false });
      
      if (timeLogsError) {
        console.error('Error fetching time logs:', timeLogsError);
      }
      console.log(`Found ${timeLogs?.length || 0} time logs for patient ${patientData.patient_id}`);
      
      if (timeLogs && timeLogs.length > 0) {
        const logData = timeLogs.map((log: { 
          start_time: string; 
          activity_type: string; 
          duration_minutes: number; 
          description?: string | null;
        }) => {
          const date = new Date(log.start_time).toLocaleDateString();
          const activityType = log.activity_type === 'patient_communication' ? 'Interactive Communication' : 'Medication Review';
          const duration = `${log.duration_minutes} minutes`;
          const description = log.description || '';
          return [date, activityType, duration, description];
        });
        
        autoTable(doc, {
          head: [['Date', 'Activity Type', 'Duration', 'Notes']],
          body: logData,
          startY: 100,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [51, 139, 202] as [number, number, number] },
          alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 45 },
            2: { cellWidth: 20 },
            3: { cellWidth: 90 }
          }
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('No provider activity logged for this cycle.', 20, 105);
      }
      
      const fileName = `billing-summary-${patientData.patient_name.replace(/\s+/g, '-')}-${cycleType}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      console.log('Patient billing summary PDF generated successfully!');
    } catch (error) {
      console.error('Error generating patient billing summary:', error);
      alert('Failed to generate patient billing summary. Please check the console for details.');
    }
  };

  const exportToPDF = (data: BillingData[], fileName: string) => {
    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Billing Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      // Prepare table data
      const tableData = data.map(patient => [
        patient.patient_name,
        patient.provider_name,
        patient.adherence_days.toString(),
        patient.provider_time_minutes.toString(),
        patient.cpt_98975_status === 'eligible' ? 'Eligible' : patient.cpt_98975_status === 'previously_claimed' ? 'Previously Claimed' : 'Not Eligible',
        patient.cpt_98976_77 ? 'Yes' : 'No',
        patient.cpt_98980 ? 'Yes' : 'No',
        patient.cpt_98981.toString()
      ]);

      console.log('Generating table...');
      // Add table using autoTable
      autoTable(doc, {
        head: [['Patient', 'Provider', 'Adherence Days', 'Provider Time (min)', '98975 Status', '98976/77', '98980', '98981']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] as [number, number, number] },
        alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] }
      });

      console.log('Saving PDF...');
      doc.save(`${fileName}.pdf`);
      console.log('PDF saved successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
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

        {/* Organization Filter for Simpiller Admins */}
        {isSimpillerAdmin && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center mb-4">
              <Building2 className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-medium text-black">Organization Filter</h2>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedOrganizationId}
                onChange={(e) => setSelectedOrganizationId(e.target.value)}
                className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {selectedOrganizationId && (
                <span className="text-sm text-gray-600">
                  Viewing billing for: <strong>{organizations.find(o => o.id === selectedOrganizationId)?.name}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Billing Mode Toggle */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-black">Billing Mode</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setBillingMode('per-patient')}
              className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                billingMode === 'per-patient'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center">
                <Users className="h-5 w-5 mb-1" />
                <span>Per-Patient Cycles</span>
                <span className="text-xs mt-1 opacity-80">Uses each patient&apos;s cycle_start_date</span>
              </div>
            </button>
            <button
              onClick={() => setBillingMode('date-range')}
              className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                billingMode === 'date-range'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center">
                <Calendar className="h-5 w-5 mb-1" />
                <span>Date Range</span>
                <span className="text-xs mt-1 opacity-80">Manual date selection</span>
              </div>
            </button>
          </div>
        </div>

        {/* Warning Banner for Date Range Mode */}
        {billingMode === 'date-range' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Date Range Mode Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You&apos;re using manual date range mode. This may not align with individual patient billing cycles.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Each patient has their own 30-day cycle based on their <code className="bg-yellow-100 px-1 py-0.5 rounded">cycle_start_date</code></li>
                    <li>A single date range may only capture partial cycles for some patients</li>
                    <li>Recommended: Use <strong>Per-Patient Cycles</strong> mode for accurate billing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Selector (only shown in date-range mode) */}
        {billingMode === 'date-range' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-medium text-black mb-4">Custom Date Range</h2>
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
        )}

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
          
          {/* Current Cycle Export Buttons */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {billingMode === 'per-patient' ? 'Current Billing Cycle' : 'Current Data'}
            </h3>
            <div className="flex space-x-4">
              <Button onClick={() => handleExport('csv', 'current')} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => handleExport('excel', 'current')} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button onClick={() => handleExport('pdf', 'current')} variant="outline">
                <File className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Previous Cycle Export Buttons (Only shown in per-patient mode) */}
          {billingMode === 'per-patient' && previousBillingData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Previous Billing Cycle</h3>
              <div className="flex space-x-4">
                <Button onClick={() => handleExport('csv', 'previous')} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={() => handleExport('excel', 'previous')} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button onClick={() => handleExport('pdf', 'previous')} variant="outline">
                  <File className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Current Cycle Billing Data Table */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-black">
                {billingMode === 'per-patient' ? 'Current Patient Billing Cycle Data' : 'Patient Billing Data'}
              </h2>
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
                      <div className="flex items-center gap-2">
                        <span>{patient.patient_name}</span>
                        <button
                          onClick={() => exportPatientBillingSummary(patient, 'current')}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Download Patient Billing Summary"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </div>
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
                        patient.cpt_98975_status === 'eligible' 
                          ? 'bg-green-100 text-green-800' 
                          : patient.cpt_98975_status === 'previously_claimed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.cpt_98975_status === 'eligible' 
                          ? 'Eligible' 
                          : patient.cpt_98975_status === 'previously_claimed'
                          ? 'Previously Claimed'
                          : 'Not Eligible'}
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

        {/* Previous Cycle Billing Data Table (Only shown in per-patient mode) */}
        {billingMode === 'per-patient' && previousBillingData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-black">Previous Patient Billing Cycle Data</h2>
                <span className="text-sm text-black">
                  Showing {filteredPreviousData.length} of {previousBillingData.length} patients
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
                  {filteredPreviousData.map((patient) => (
                    <tr key={patient.patient_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{patient.patient_name}</span>
                          <button
                            onClick={() => exportPatientBillingSummary(patient, 'previous')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Download Patient Billing Summary"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
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
                          patient.cpt_98975_status === 'eligible' 
                            ? 'bg-green-100 text-green-800' 
                            : patient.cpt_98975_status === 'previously_claimed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.cpt_98975_status === 'eligible' 
                            ? 'Eligible' 
                            : patient.cpt_98975_status === 'previously_claimed'
                            ? 'Previously Claimed'
                            : 'Not Eligible'}
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
        )}
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
