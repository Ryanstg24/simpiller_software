import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Debug endpoint to investigate adherence log grouping issues
 * This helps identify why medications are being grouped into wrong time slots
 */

interface MedicationSchedule {
  id: string;
  medication_id: string;
  time_of_day: string;
  is_active: boolean;
  created_at?: string;
}

interface MedicationInfo {
  id: string;
  name: string;
  time_of_day: string;
}

interface MedicationLog {
  id: string;
  medication_id: string;
  schedule_id?: string | null;
  event_date: string;
  status: string;
  medications?: MedicationInfo | MedicationInfo[];
}

interface MedicationLogWithSchedule extends MedicationLog {
  medication_schedules?: {
    id: string;
    time_of_day: string;
    is_active: boolean;
  } | Array<{
    id: string;
    time_of_day: string;
    is_active: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const date = searchParams.get('date'); // Optional: filter by date (YYYY-MM-DD)
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId parameter is required' },
        { status: 400 }
      );
    }

    // Step 1: Get all medication logs for the patient with their schedule IDs
    const logsQuery = supabase
      .from('medication_logs')
      .select(`
        id,
        medication_id,
        schedule_id,
        event_date,
        status,
        medications (
          id,
          name,
          time_of_day
        )
      `)
      .eq('patient_id', patientId)
      .order('event_date', { ascending: false })
      .limit(100);

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      logsQuery.gte('event_date', startDate.toISOString())
                .lt('event_date', endDate.toISOString());
    }

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) {
      console.error('Error fetching medication logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs', details: logsError },
        { status: 500 }
      );
    }

    // Step 2: Get all schedules for medications in the logs
    const medicationIds = [...new Set(logs?.map(log => log.medication_id) || [])];
    
    const { data: allSchedules, error: schedulesError } = await supabase
      .from('medication_schedules')
      .select('id, medication_id, time_of_day, is_active, created_at')
      .in('medication_id', medicationIds);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
    }

    // Step 3: Get the schedules that are actually referenced in the logs
    const scheduleIds = [...new Set(logs?.map(log => log.schedule_id).filter(Boolean) || [])];
    
    const { data: referencedSchedules, error: refSchedulesError } = await supabase
      .from('medication_schedules')
      .select('id, medication_id, time_of_day, is_active, created_at')
      .in('id', scheduleIds);

    if (refSchedulesError) {
      console.error('Error fetching referenced schedules:', refSchedulesError);
    }

    // Step 4: Now join the logs with their schedules manually to see what the current query returns
    const { data: logsWithSchedules, error: joinError } = await supabase
      .from('medication_logs')
      .select(`
        id,
        medication_id,
        schedule_id,
        event_date,
        status,
        medications (
          id,
          name,
          time_of_day
        ),
        medication_schedules (
          id,
          time_of_day,
          is_active
        )
      `)
      .eq('patient_id', patientId)
      .order('event_date', { ascending: false })
      .limit(100);

    if (joinError) {
      console.error('Error fetching logs with schedules:', joinError);
    }

    // Step 5: Analyze the data
    const analysis = {
      totalLogs: logs?.length || 0,
      logsWithScheduleId: logs?.filter(log => log.schedule_id).length || 0,
      logsWithoutScheduleId: logs?.filter(log => !log.schedule_id).length || 0,
      uniqueMedicationIds: medicationIds.length,
      uniqueScheduleIds: scheduleIds.length,
      potentialIssues: [] as string[]
    };

    // Check for logs with schedule_id that don't match any active schedule
    const activeScheduleIds = new Set(
      (allSchedules || [])
        .filter(s => s.is_active)
        .map(s => s.id)
    );

    logs?.forEach(log => {
      if (log.schedule_id && !activeScheduleIds.has(log.schedule_id)) {
        analysis.potentialIssues.push(
          `Log ${log.id} references schedule ${log.schedule_id} which is not active`
        );
      }
    });

    // Check for medications with multiple schedules
    const schedulesByMedication = new Map<string, MedicationSchedule[]>();
    (allSchedules || []).forEach(schedule => {
      if (!schedulesByMedication.has(schedule.medication_id)) {
        schedulesByMedication.set(schedule.medication_id, []);
      }
      schedulesByMedication.get(schedule.medication_id)!.push(schedule);
    });

    schedulesByMedication.forEach((schedules, medId) => {
      if (schedules.length > 1) {
        const activeCount = schedules.filter(s => s.is_active).length;
        if (activeCount > 1) {
          analysis.potentialIssues.push(
            `Medication ${medId} has ${activeCount} active schedules: ${schedules.map(s => `${s.id} (${s.time_of_day})`).join(', ')}`
          );
        }
      }
    });

    // Check for logs where the joined schedule doesn't match the schedule_id
    if (logsWithSchedules) {
      logsWithSchedules.forEach((log: MedicationLogWithSchedule) => {
        if (log.schedule_id && log.medication_schedules) {
          const joinedSchedule = Array.isArray(log.medication_schedules) 
            ? log.medication_schedules[0] 
            : log.medication_schedules;
          
          if (joinedSchedule && joinedSchedule.id !== log.schedule_id) {
            analysis.potentialIssues.push(
              `Log ${log.id} has schedule_id ${log.schedule_id} but joined schedule is ${joinedSchedule.id} (time: ${joinedSchedule.time_of_day})`
            );
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      patientId,
      date: date || 'all',
      analysis,
      logs: logs?.map((log: MedicationLog) => ({
        id: log.id,
        medication_id: log.medication_id,
        medication_name: Array.isArray(log.medications) ? log.medications[0]?.name : log.medications?.name,
        schedule_id: log.schedule_id,
        event_date: log.event_date,
        status: log.status
      })),
      allSchedules: allSchedules?.map(s => ({
        id: s.id,
        medication_id: s.medication_id,
        time_of_day: s.time_of_day,
        is_active: s.is_active,
        created_at: s.created_at
      })),
      referencedSchedules: referencedSchedules?.map(s => ({
        id: s.id,
        medication_id: s.medication_id,
        time_of_day: s.time_of_day,
        is_active: s.is_active
      })),
      logsWithSchedules: logsWithSchedules?.slice(0, 10).map((log: MedicationLogWithSchedule) => ({
        id: log.id,
        medication_id: log.medication_id,
        medication_name: Array.isArray(log.medications) ? log.medications[0]?.name : log.medications?.name,
        schedule_id: log.schedule_id,
        joined_schedule_id: Array.isArray(log.medication_schedules) 
          ? log.medication_schedules[0]?.id 
          : log.medication_schedules?.id,
        joined_schedule_time: Array.isArray(log.medication_schedules) 
          ? log.medication_schedules[0]?.time_of_day 
          : log.medication_schedules?.time_of_day,
        event_date: log.event_date,
        status: log.status
      })),
      schedulesByMedication: Object.fromEntries(
        Array.from(schedulesByMedication.entries()).map(([medId, schedules]) => [
          medId,
          schedules.map(s => ({
            id: s.id,
            time_of_day: s.time_of_day,
            is_active: s.is_active,
            created_at: s.created_at
          }))
        ])
      )
    });

  } catch (error) {
    console.error('Error in adherence investigation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

