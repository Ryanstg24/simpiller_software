import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId parameter is required' },
        { status: 400 }
      );
    }

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, created_at')
      .eq('id', patientId)
      .single();

    if (patientError) {
      console.error('Patient error:', patientError);
      return NextResponse.json(
        { error: `Patient not found: ${patientError.message}` },
        { status: 404 }
      );
    }

    // Get earliest medication for cycle calculation
    const { data: med, error: medError } = await supabase
      .from('medications')
      .select('created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    let cycleInfo = null;
    if (med) {
      const start = new Date(med.created_at as string);
      const now = new Date();
      const cycleMs = 30 * 24 * 60 * 60 * 1000;
      const elapsed = now.getTime() - start.getTime();
      const cyclesPassed = Math.floor(elapsed / cycleMs);
      const cycleStart = new Date(start.getTime() + cyclesPassed * cycleMs);
      const cycleEnd = new Date(cycleStart.getTime() + cycleMs);
      
      cycleInfo = {
        medicationStart: med.created_at,
        cycleStart: cycleStart.toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        daysLeft: Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      };
    }

    // Get all provider time logs for this patient
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('provider_time_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('start_time', { ascending: false });

    // Get medication logs for adherence calculation
    const { data: medicationLogs, error: medicationLogsError } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('event_date', { ascending: false });

    // Calculate progress within current cycle
    let communicationMinutes = 0;
    let adherenceMinutes = 0;
    let adherenceDays = 0;

    if (cycleInfo && timeLogs) {
      const cycleStart = new Date(cycleInfo.cycleStart);
      const cycleEnd = new Date(cycleInfo.cycleEnd);
      
      for (const log of timeLogs) {
        const logTime = new Date(log.start_time);
        if (logTime >= cycleStart && logTime < cycleEnd) {
          if (log.activity_type === 'patient_communication') {
            communicationMinutes += Number(log.duration_minutes || 0);
          }
          if (log.activity_type === 'adherence_review') {
            adherenceMinutes += Number(log.duration_minutes || 0);
          }
        }
      }
    }

    if (cycleInfo && medicationLogs) {
      const cycleStart = new Date(cycleInfo.cycleStart);
      const cycleEnd = new Date(cycleInfo.cycleEnd);
      const daySet = new Set<string>();
      
      for (const log of medicationLogs) {
        const logTime = new Date(log.event_date);
        if (logTime >= cycleStart && logTime < cycleEnd) {
          const status = log.status || '';
          if ((status.startsWith('taken') || status === 'taken') && log.event_date) {
            const d = new Date(log.event_date);
            const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
            daySet.add(dayKey);
          }
        }
      }
      adherenceDays = daySet.size;
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        created_at: patient.created_at
      },
      cycleInfo,
      progress: {
        communicationMinutes,
        adherenceMinutes,
        adherenceDays
      },
      timeLogs: timeLogs || [],
      medicationLogs: medicationLogs || [],
      errors: {
        timeLogsError: timeLogsError?.message,
        medicationLogsError: medicationLogsError?.message
      }
    });

  } catch (error) {
    console.error('Error in patient progress debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
