import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all time logs from the table (no filtering)
    const { data: allLogs, error: allLogsError } = await supabase
      .from('provider_time_logs')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(100);

    // Get all patients
    const { data: allPatients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .limit(100);

    return NextResponse.json({
      success: true,
      totalTimeLogs: allLogs?.length || 0,
      totalPatients: allPatients?.length || 0,
      timeLogs: allLogs || [],
      patients: allPatients || [],
      errors: {
        timeLogsError: allLogsError?.message || null,
        patientsError: patientsError?.message || null
      }
    });

  } catch (error) {
    console.error('Error in all time logs debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
