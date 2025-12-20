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

    // Get all time logs for this patient (no date filtering)
    const { data: allLogs, error: allLogsError } = await supabase
      .from('provider_time_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('start_time', { ascending: false });

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('id', patientId)
      .single();

    // Get earliest medication
    const { data: med, error: medError } = await supabase
      .from('medications')
      .select('created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      patient: patient || null,
      patientError: patientError?.message || null,
      medication: med || null,
      medicationError: medError?.message || null,
      allTimeLogs: allLogs || [],
      timeLogsError: allLogsError?.message || null,
      totalLogs: allLogs?.length || 0
    });

  } catch (error) {
    console.error('Error in time logs debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
