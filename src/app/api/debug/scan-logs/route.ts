import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    // Fetch medication logs for the patient
    const { data: logs, error: logsError } = await supabase
      .from('medication_logs')
      .select(`
        *,
        medications (
          id,
          name,
          strength,
          format
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('Error fetching medication logs:', logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // Fetch scan sessions for the patient
    const { data: scanSessions, error: scanSessionsError } = await supabase
      .from('medication_scan_sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (scanSessionsError) {
      console.error('Error fetching scan sessions:', scanSessionsError);
      return NextResponse.json({ error: scanSessionsError.message }, { status: 500 });
    }

    // Fetch patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, adherence_score')
      .eq('id', patientId)
      .single();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    return NextResponse.json({
      patient,
      medicationLogs: logs,
      scanSessions: scanSessions,
      summary: {
        totalLogs: logs?.length || 0,
        totalScanSessions: scanSessions?.length || 0,
        recentLogs: logs?.slice(0, 3) || [],
        recentScanSessions: scanSessions?.slice(0, 3) || []
      }
    });
  } catch (error) {
    console.error('Error in debug scan-logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
