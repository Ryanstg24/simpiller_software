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

    // Fetch all medication logs for the patient
    const { data: logs, error } = await supabase
      .from('medication_logs')
      .select(`
        id,
        medication_id,
        patient_id,
        status,
        event_date,
        created_at,
        taken_at,
        raw_scan_data,
        scanned_medication_name,
        scanned_dosage,
        medications (
          name,
          strength,
          format
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medication logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: logs?.length || 0,
      logs: logs || []
    });

  } catch (error) {
    console.error('Error in medication logs debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
