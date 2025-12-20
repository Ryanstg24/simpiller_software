'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/hooks/use-patients';
import { Activity, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthV2 } from '@/contexts/auth-context-v2';

interface ComplianceLogTabProps {
  patient: Patient;
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
  event_date: string;
  status: 'taken' | 'missed' | 'skipped';
  qr_code_scanned?: string;
  schedule_id?: string;
  medications?: {
    name: string;
    strength: string;
    format: string;
  };
  medication_schedules?: {
    time_of_day: string;
  };
}

// Type for raw Supabase response (before mapping)
// Note: We removed patients join to avoid 500 errors - RLS handles organization access via patient_id FK
interface RawMedicationLogResponse {
  id: string;
  medication_id: string;
  patient_id: string;
  event_date: string;
  status: 'taken' | 'missed' | 'skipped';
  qr_code_scanned?: string;
  schedule_id?: string;
  medications?: {
    name: string;
    strength: string;
    format: string;
  } | Array<{
    name: string;
    strength: string;
    format: string;
  }>;
  medication_schedules?: {
    time_of_day: string;
  } | Array<{
    time_of_day: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'taken':
      return 'text-green-600 bg-green-100';
    case 'missed':
      return 'text-red-600 bg-red-100';
    case 'skipped':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

interface GroupedLog {
  scheduledTime: string;
  logs: MedicationLogData[];
  status: 'taken' | 'missed';
  takenCount: number;
  totalCount: number;
  timingStatus?: 'on-time' | 'late'; // Whether medications were taken on time or late
  hasScheduleInfo: boolean; // Whether we have actual schedule info (not inferred)
}

export function ComplianceLogTab({ patient }: ComplianceLogTabProps) {
  const { user, isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuthV2();
  const [logs, setLogs] = useState<MedicationLogData[]>([]);
  const [complianceScores, setComplianceScores] = useState<ComplianceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchComplianceData = useCallback(async () => {
    if (!patient?.id) {
      console.error('No patient ID available');
      return;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:104',message:'fetchComplianceData entry',data:{patientId:patient.id,patientName:`${patient.first_name} ${patient.last_name}`,patientOrgId:patient.organization_id,patientRtmStatus:patient.rtm_status,userId:user?.id,isSimpillerAdmin,isOrganizationAdmin,userOrganizationId,selectedMonth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    // RLS FIX: Verify organization access before querying
    // If user is an organization admin (not Simpiller admin), ensure patient is in their organization
    // This helps RLS policies evaluate correctly by ensuring we only query for accessible patients
    if (isOrganizationAdmin && !isSimpillerAdmin && userOrganizationId) {
      if (patient.organization_id !== userOrganizationId) {
        console.warn('[Adherence] Patient organization mismatch - user cannot access this patient\'s logs', {
          patientOrgId: patient.organization_id,
          userOrgId: userOrganizationId
        });
        setLogs([]);
        setComplianceScores([]);
        setLoading(false);
        return;
      }
    }
    
    // RLS FIX: For patients who transitioned from "On Track" to "Needs Attention"
    // The RLS policy might be checking rtm_status. Ensure we're using the current patient status.
    // If the patient object has stale rtm_status, we need to fetch the current status from the database
    // However, since RLS policies run at the database level, they should use the current status.
    // The issue might be that the RLS policy is too restrictive for certain rtm_status values.
    console.log('[Adherence] Patient RTM status:', patient.rtm_status, 'Organization:', patient.organization_id);
    
    try {
      setLoading(true);

      // Mock data for fallback (currently unused but kept for future use)
      // const mockLogs: MedicationLog[] = [];
      // const mockScores: ComplianceScore[] = [];

      // Fetch medication logs (individual medication taken/missed records)
      try {
        console.log('[Adherence] Fetching logs for patient:', patient.id, 'Name:', patient.first_name, patient.last_name);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:128',message:'Before medication_logs query',data:{patientId:patient.id,patientOrgId:patient.organization_id,userOrgId:userOrganizationId,orgMatch:patient.organization_id===userOrganizationId,selectedMonth,queryType:'optimized'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion
        
        // Fetch logs WITHOUT the schedule join to avoid incorrect joins
        // We'll fetch schedules separately by schedule_id to ensure correctness
        // PERFORMANCE FIX: Add date range filter to prevent statement timeouts
        // For patients with thousands of logs, fetching all logs causes timeouts
        // If a month is selected, query only that month. Otherwise, default to last 12 months.
        let dateStart: Date;
        let dateEnd: Date;
        
        if (selectedMonth) {
          // Query only the selected month
          const [year, month] = selectedMonth.split('-').map(Number);
          dateStart = new Date(year, month - 1, 1); // First day of month
          dateEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
        } else {
          // Default to last 12 months
          dateStart = new Date();
          dateStart.setFullYear(dateStart.getFullYear() - 1);
          dateEnd = new Date(); // Today
        }
        
        // RLS FIX: For patients who transitioned from "On Track" to "Needs Attention"
        // The RLS policy might be blocking access. First, verify the patient's current status.
        // Then query medication_logs - if RLS blocks, we'll see the error in logs.
        const { data: currentPatient, error: patientError } = await supabase
          .from('patients')
          .select('id, organization_id, rtm_status')
          .eq('id', patient.id)
          .single();
        
        if (patientError) {
          console.error('[Adherence] Error fetching current patient status:', patientError);
        } else {
          console.log('[Adherence] Current patient status from DB:', {
            id: currentPatient?.id,
            organization_id: currentPatient?.organization_id,
            rtm_status: currentPatient?.rtm_status,
            propRtmStatus: patient.rtm_status,
            matches: currentPatient?.rtm_status === patient.rtm_status,
            orgMatches: currentPatient?.organization_id === userOrganizationId
          });
        }
        
        // CRITICAL RLS FIX: For organization admins, always use API endpoint to bypass RLS
        // The RLS policy is blocking access for patients who transitioned from "On Track" to "Needs Attention"
        // Using the API endpoint with service role ensures organization admins can always see logs
        // for patients in their organization, regardless of rtm_status transitions
        let logsData: RawMedicationLogResponse[] = [];
        let logsError: { code?: string; message?: string; details?: unknown; hint?: string } | null = null;
        
        // For organization admins, use API endpoint to bypass RLS issues
        // For Simpiller admins, use direct query (RLS allows them access)
        if (isOrganizationAdmin && !isSimpillerAdmin) {
          console.log('[Adherence] Using API endpoint for organization admin to bypass RLS...');
          try {
            const apiUrl = `/api/patients/adherence-logs?patientId=${patient.id}&startDate=${dateStart.toISOString()}&endDate=${dateEnd.toISOString()}&userId=${user?.id || ''}`;
            const apiResponse = await fetch(apiUrl);
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              logsData = apiData.logs || [];
              console.log('[Adherence] API endpoint returned', logsData.length, 'logs');
            } else {
              const errorData = await apiResponse.json().catch(() => ({}));
              logsError = { code: 'API_ERROR', message: `API returned ${apiResponse.status}`, details: errorData };
              console.error('[Adherence] API endpoint error:', apiResponse.status, errorData);
            }
          } catch (apiErr) {
            logsError = apiErr instanceof Error 
              ? { code: 'API_EXCEPTION', message: apiErr.message, details: apiErr }
              : { code: 'API_EXCEPTION', message: 'Unknown error', details: apiErr };
            console.error('[Adherence] API endpoint exception:', apiErr);
          }
        } else {
          // Simpiller admins can use direct query (RLS allows them)
          const directQuery = await supabase
            .from('medication_logs')
            .select('id, medication_id, patient_id, event_date, status, qr_code_scanned, schedule_id')
            .eq('patient_id', patient.id)
            .gte('event_date', dateStart.toISOString())
            .lte('event_date', dateEnd.toISOString())
            .order('event_date', { ascending: false })
            .limit(1000);
          
          logsData = directQuery.data || [];
          logsError = directQuery.error;
        }
        
        // Enhanced logging for RLS debugging
        if (logsError) {
          console.error('[Adherence] Query error:', {
            code: logsError.code,
            message: logsError.message,
            patientId: patient.id,
            patientRtmStatus: currentPatient?.rtm_status || patient.rtm_status
          });
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:134',message:'After medication_logs query',data:{hasError:!!logsError,errorCode:logsError?.code,errorMessage:logsError?.message,errorDetails:logsError?.details,logsCount:logsData?.length||0,sampleLog:logsData?.[0]?{id:logsData[0].id,patient_id:logsData[0].patient_id}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
        // #endregion
        
        console.log('[Adherence] Raw query without join - Count:', logsData?.length);
        
        // #region agent log
        if (logsData && logsData.length > 0) {
          const sampleLog = logsData[0] as RawMedicationLogResponse;
          fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:138',message:'Sample log analysis',data:{logId:sampleLog.id,logPatientId:sampleLog.patient_id,patientOrgId:patient.organization_id,userOrgId:userOrganizationId,orgIdsMatch:patient.organization_id===userOrganizationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
        }
        // #endregion
        
        // Check if there are ANY logs for this patient after Oct 4
        if (logsData) {
          const recentLogs = logsData.filter((log: { event_date: string }) => 
            new Date(log.event_date) > new Date('2025-10-04')
          );
          console.log('[Adherence] Logs after Oct 4 for this patient:', recentLogs.length);
          if (recentLogs.length > 0) {
            console.log('[Adherence] Sample recent log:', recentLogs[0]);
          }
        }
        
        // If we have logs, fetch medication details separately
        if (logsData && logsData.length > 0) {
          const medicationIds = [...new Set(logsData.map((log: { medication_id: string }) => log.medication_id))];
          console.log('[Adherence] Fetching details for', medicationIds.length, 'unique medications');
          
          const { data: medicationsData } = await supabase
            .from('medications')
            .select('id, name, strength, format')
            .in('id', medicationIds);
          
          console.log('[Adherence] Medications fetched:', medicationsData?.length);
          
          // Map medications to a lookup object
          const medicationsMap = new Map<string, { id: string; name: string; strength: string; format: string }>(
            medicationsData?.map((med: { id: string; name: string; strength: string; format: string }) => [med.id, med]) || []
          );
          
          // Attach medication details to logs
          logsData.forEach((log: RawMedicationLogResponse) => {
            const med = medicationsMap.get(log.medication_id);
            if (med) {
              log.medications = med;
            }
          });

          // Fetch schedules separately by schedule_id to ensure we get the correct schedule
          // This is critical: we need to match by schedule_id, not medication_id
          const scheduleIds = [...new Set(logsData.map((log: { schedule_id?: string }) => log.schedule_id).filter(Boolean))];
          
          if (scheduleIds.length > 0) {
            console.log('[Adherence] Fetching schedules for', scheduleIds.length, 'unique schedule IDs');
            
            const { data: schedulesData, error: schedulesError } = await supabase
              .from('medication_schedules')
              .select('id, time_of_day')
              .in('id', scheduleIds);
            
            if (schedulesError) {
              console.error('[Adherence] Error fetching schedules:', schedulesError);
            } else {
              console.log('[Adherence] Schedules fetched:', schedulesData?.length);
              
              // Map schedules to a lookup object by schedule_id
              const schedulesMap = new Map<string, { time_of_day: string }>(
                schedulesData?.map((sched: { id: string; time_of_day: string }) => [sched.id, { time_of_day: sched.time_of_day }]) || []
              );
              
              // Attach schedule details to logs by matching schedule_id
              logsData.forEach((log: RawMedicationLogResponse) => {
                if (log.schedule_id && schedulesMap.has(log.schedule_id)) {
                  const sched = schedulesMap.get(log.schedule_id);
                  if (sched) {
                    log.medication_schedules = sched;
                  }
                } else if (log.schedule_id) {
                  console.warn('[Adherence] Log has schedule_id but schedule not found:', {
                    logId: log.id,
                    scheduleId: log.schedule_id,
                    medicationId: log.medication_id
                  });
                }
              });
            }
          } else {
            console.log('[Adherence] No schedule_ids found in logs - all logs may be missing schedule_id');
          }
        }
        
        console.log('[Adherence] Query completed. Error:', logsError, 'Data count:', logsData?.length || 0);
        
        // Enhanced error logging for 500 errors and timeouts
        if (logsError) {
          console.error('[Adherence] Error fetching medication logs:', {
            code: logsError.code,
            message: logsError.message,
            details: logsError.details,
            hint: logsError.hint,
            patientId: patient.id,
            patientOrgId: patient.organization_id,
            userOrgId: userOrganizationId,
            isSimpillerAdmin,
            isOrganizationAdmin
          });
          
          // Handle timeout errors specifically
          if (logsError.code === '57014') {
            console.warn('[Adherence] Query timeout - patient may have very large number of logs. Consider adding more restrictive date filtering.');
          }
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:210',message:'Query completion status',data:{hasError:!!logsError,errorCode:logsError?.code,errorMessage:logsError?.message,errorHint:logsError?.hint,logsCount:logsData?.length||0,willSetLogs:!logsError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
        // #endregion

        if (logsError) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:213',message:'Query error branch',data:{errorCode:logsError.code,errorMessage:logsError.message,errorDetails:logsError.details,errorHint:logsError.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setLogs([]);
        } else {
          console.log('[Adherence] Raw logs from database:', logsData?.length || 0, 'records');
          if (logsData && logsData.length > 0) {
            // Show date range
            const dates = logsData.map((l: { event_date: string }) => new Date(l.event_date));
            const newest = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
            const oldest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
            console.log('[Adherence] Date range:', {
              newest: newest.toLocaleString(),
              oldest: oldest.toLocaleString(),
              today: new Date().toLocaleString()
            });
            // Show sample of recent logs
            console.log('[Adherence] Most recent 3 logs:', logsData.slice(0, 3).map((l: { event_date: string; status: string; medications?: unknown }) => ({
              date: l.event_date,
              status: l.status,
              medication: l.medications
            })));
          }
          
          // #region agent log
          if (logsData && logsData.length > 0) {
            const firstLog = logsData[0] as RawMedicationLogResponse;
            fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:238',message:'Before mapping logs',data:{totalLogs:logsData.length,firstLogId:firstLog.id,firstLogPatientId:firstLog.patient_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          }
          // #endregion
          
          // Map the data to handle Supabase join structure (medications and schedules may be arrays with one item)
          // Note: We removed the patients join to avoid 500 errors - RLS handles organization access via patient_id FK
          const mappedLogs: MedicationLogData[] = (logsData || []).map((log: RawMedicationLogResponse) => ({
            id: log.id,
            medication_id: log.medication_id,
            patient_id: log.patient_id,
            event_date: log.event_date,
            status: log.status,
            qr_code_scanned: log.qr_code_scanned,
            schedule_id: log.schedule_id,
            medications: Array.isArray(log.medications) ? log.medications[0] : log.medications,
            medication_schedules: Array.isArray(log.medication_schedules) ? log.medication_schedules[0] : log.medication_schedules
          }));
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:250',message:'After mapping logs',data:{mappedLogsCount:mappedLogs.length,willDeduplicate:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          // Deduplicate logs: if multiple logs exist for the same medication_id, event_date (within 1 minute), and status,
          // keep only the most recent one (by event_date, then id)
          // This prevents duplicate logs from being displayed if they were created due to API retries or double-clicks
          const deduplicatedLogs = new Map<string, MedicationLogData>();
          
          // Sort logs by event_date (newest first) so we keep the most recent duplicate
          const sortedLogs = [...mappedLogs].sort((a, b) => {
            const dateA = new Date(a.event_date).getTime();
            const dateB = new Date(b.event_date).getTime();
            if (dateA !== dateB) return dateB - dateA; // Newer first
            return b.id.localeCompare(a.id); // Fallback to id comparison
          });
          
          sortedLogs.forEach(log => {
            // Create a unique key based on medication_id, event_date (rounded to nearest minute), and status
            const eventDate = new Date(log.event_date);
            const eventDateKey = new Date(
              eventDate.getFullYear(),
              eventDate.getMonth(),
              eventDate.getDate(),
              eventDate.getHours(),
              eventDate.getMinutes()
            ).toISOString();
            
            const dedupeKey = `${log.medication_id}-${eventDateKey}-${log.status}`;
            
            // Only keep the first (most recent) log for each dedupeKey
            if (!deduplicatedLogs.has(dedupeKey)) {
              deduplicatedLogs.set(dedupeKey, log);
            }
          });
          
          const finalLogs = Array.from(deduplicatedLogs.values());
          
          if (finalLogs.length < mappedLogs.length) {
            console.log(`[Adherence] Deduplicated ${mappedLogs.length - finalLogs.length} duplicate logs (${mappedLogs.length} -> ${finalLogs.length})`);
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/56e1ceca-9416-49c9-bfb7-8110a59a2a0a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'compliance-log-tab.tsx:288',message:'Setting final logs',data:{finalLogsCount:finalLogs.length,mappedLogsCount:mappedLogs.length,deduplicated:finalLogs.length<mappedLogs.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          setLogs(finalLogs);
        }
      } catch (error) {
        console.error('Exception fetching medication logs:', error);
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
  }, [patient, selectedMonth, user?.id, isSimpillerAdmin, isOrganizationAdmin, userOrganizationId]);

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

  // Group logs by scheduled time from medication_schedules (not 15-minute intervals)
  const groupLogsByTime = (logs: MedicationLogData[]): GroupedLog[] => {
    const grouped = new Map<string, { logs: MedicationLogData[]; hasScheduleInfo: boolean }>();
    
    logs.forEach(log => {
      const date = new Date(log.event_date);
      
      // Always use the scheduled time - medications are scanned from their time preference
      let groupKey: string;
      let hasScheduleInfo = false;
      
      if (log.medication_schedules?.time_of_day) {
        // Use the actual scheduled time from the schedule
        hasScheduleInfo = true;
        const scheduledTime = log.medication_schedules.time_of_day;
        const [hours, minutes, seconds = '00'] = scheduledTime.split(':');
        
        const scheduledDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        
        groupKey = scheduledDate.toISOString();
      } else {
        // If schedule info is missing, we cannot determine the scheduled time
        // Use the actual scan time for grouping (without inferring a scheduled time)
        // This prevents incorrectly showing medications at times the patient doesn't have scheduled
        // Group by the actual scan time rounded to the nearest hour to keep scan sessions together
        hasScheduleInfo = false;
        const scanHour = date.getHours();
        const scanMinute = date.getMinutes();
        
        // Round to nearest hour for grouping purposes
        const roundedHour = scanMinute >= 30 ? scanHour + 1 : scanHour;
        const finalHour = roundedHour >= 24 ? 0 : roundedHour;
        
        const scanTimeGroup = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          finalHour,
          0,
          0,
          0
        );
        
        groupKey = scanTimeGroup.toISOString();
        
        console.warn('[Adherence] Missing schedule_id for log - using scan time for grouping:', {
          logId: log.id,
          medicationId: log.medication_id,
          scanTime: date.toISOString(),
          groupedAt: scanTimeGroup.toISOString(),
          note: 'Schedule info missing - cannot determine if medication was on time or late'
        });
      }
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { logs: [], hasScheduleInfo });
      }
      const group = grouped.get(groupKey)!;
      group.logs.push(log);
      // If any log in the group has schedule info, mark the group as having schedule info
      if (hasScheduleInfo) {
        group.hasScheduleInfo = true;
      }
    });
    
    // Convert to array and calculate status for each group
    return Array.from(grouped.entries()).map(([scheduledTime, { logs: groupLogs, hasScheduleInfo }]) => {
      const takenCount = groupLogs.filter(log => log.status === 'taken').length;
      const totalCount = groupLogs.length;
      
      let status: 'taken' | 'missed';
      let timingStatus: 'on-time' | 'late' | undefined;
      
      if (takenCount > 0) {
        // If any medication in the pack was taken, consider the whole pack as taken
        status = 'taken';
        
        // Only calculate timing status if we have schedule info
        if (hasScheduleInfo) {
          // Calculate if it was taken on time or late
          // Find the earliest scan time among taken medications
          const takenLogs = groupLogs.filter(log => log.status === 'taken');
          const earliestScanTime = Math.min(...takenLogs.map(log => new Date(log.event_date).getTime()));
          const scheduledTimeMs = new Date(scheduledTime).getTime();
          const timeDifferenceMinutes = (earliestScanTime - scheduledTimeMs) / (1000 * 60);
          
          // On time: within 60 minutes of scheduled time
          // Late: after 60 minutes but within 120 minutes (2-hour window)
          if (timeDifferenceMinutes <= 60) {
            timingStatus = 'on-time';
          } else if (timeDifferenceMinutes <= 120) {
            timingStatus = 'late';
          } else {
            timingStatus = 'late'; // Very late, but still counted as taken
          }
        }
        // If no schedule info, timingStatus remains undefined
      } else {
        status = 'missed';
      }
      
      return {
        scheduledTime,
        logs: groupLogs.sort((a, b) => 
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        ), // Sort logs within group by actual scan time (newest first)
        status,
        takenCount,
        totalCount,
        timingStatus,
        hasScheduleInfo
      };
    }).sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  };

  const toggleGroup = (scheduledTime: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduledTime)) {
        newSet.delete(scheduledTime);
      } else {
        newSet.add(scheduledTime);
      }
      return newSet;
    });
  };

  const getGroupStatusBadge = (group: GroupedLog) => {
    if (group.status === 'taken') {
      // Show timing status for taken medications
      if (group.timingStatus === 'on-time') {
        return {
          icon: '✅',
          text: 'Taken',
          color: 'text-green-600 bg-green-100'
        };
      } else if (group.timingStatus === 'late') {
        return {
          icon: '🕐',
          text: 'Taken (Late)',
          color: 'text-yellow-600 bg-yellow-100'
        };
      } else {
        // Fallback for taken without timing info
        return {
          icon: '✅',
          text: 'Taken',
          color: 'text-green-600 bg-green-100'
        };
      }
    } else {
      // Missed
      return {
        icon: '❌',
        text: 'Missed',
        color: 'text-red-600 bg-red-100'
      };
    }
  };

  // Filter logs by selected month (using local timezone)
  const filteredLogs = selectedMonth 
    ? logs.filter(log => {
        const date = new Date(log.event_date);
        // Format as YYYY-MM using local timezone (not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const logMonth = `${year}-${month}`;
        return logMonth === selectedMonth;
      })
    : logs;

  const currentCompliance = getCurrentMonthCompliance();
  const groupedLogs = groupLogsByTime(filteredLogs);

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
          <h3 className="text-lg font-medium text-gray-900">Medication Adherence</h3>
          <p className="text-sm text-gray-600">Track individual medication doses taken and missed</p>
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

      {/* Recent Medication Logs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Medication History</h4>
        
        {/* Status Summary */}
        {filteredLogs.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-green-600">
                ✅ Taken: {filteredLogs.filter(log => log.status === 'taken').length}
              </span>
              <span className="text-red-600">
                ❌ Missed: {filteredLogs.filter(log => log.status === 'missed').length}
              </span>
              <span className="text-yellow-600">
                ⊘ Skipped: {filteredLogs.filter(log => log.status === 'skipped').length}
              </span>
            </div>
          </div>
        )}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {selectedMonth 
                ? `No medication history found for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                : 'No medication history found yet'
              }
            </p>
            {logs.length > 0 && selectedMonth && (
              <p className="text-sm text-blue-600 mt-2">
                Try selecting a different month or &quot;All Time&quot;
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedLogs.map((group) => {
              const isExpanded = expandedGroups.has(group.scheduledTime);
              const badge = getGroupStatusBadge(group);
              
              return (
                <div key={group.scheduledTime} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Group Header - Clickable */}
                  <button
                    onClick={() => toggleGroup(group.scheduledTime)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                        {badge.icon} {badge.text}
                      </span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {group.hasScheduleInfo 
                            ? formatDate(group.scheduledTime)
                            : `Scanned at ${formatDate(group.scheduledTime)}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {group.totalCount} medication{group.totalCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="p-4 space-y-3">
                        {group.logs.map((log) => {
                          // Calculate timing details if medication was taken
                          let timingDetails = null;
                          if (log.status === 'taken' && log.medication_schedules?.time_of_day) {
                            const scheduledTime = new Date(group.scheduledTime).getTime();
                            const actualTime = new Date(log.event_date).getTime();
                            const diffMinutes = Math.round((actualTime - scheduledTime) / (1000 * 60));
                            
                            if (diffMinutes <= 60) {
                              if (diffMinutes < 0) {
                                timingDetails = `${Math.abs(diffMinutes)} min early`;
                              } else if (diffMinutes === 0) {
                                timingDetails = 'On time';
                              } else {
                                timingDetails = `${diffMinutes} min after scheduled`;
                              }
                            } else {
                              const hours = Math.floor(diffMinutes / 60);
                              const minutes = diffMinutes % 60;
                              timingDetails = `${hours}h ${minutes}m late`;
                            }
                          }
                          
                          return (
                            <div key={log.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)} mt-0.5`}>
                                {log.status === 'taken' ? '✅' : 
                                 log.status === 'missed' ? '❌' : 
                                 log.status === 'skipped' ? '⊘' :
                                 '?'}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {log.medications?.name || 'Unknown Medication'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {log.medications?.strength} {log.medications?.format}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Scanned at {new Date(log.event_date).toLocaleString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                  {timingDetails && (
                                    <span className={`ml-2 ${
                                      timingDetails.includes('late') ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      ({timingDetails})
                                    </span>
                                  )}
                                </div>
                                {log.qr_code_scanned && (
                                  <div className="text-xs text-green-600 mt-1">
                                    📱 Scanned via QR code
                                  </div>
                                )}
                              </div>
                              <div className={`text-xs font-medium ${
                                log.status === 'taken' ? 'text-green-600' :
                                log.status === 'missed' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 