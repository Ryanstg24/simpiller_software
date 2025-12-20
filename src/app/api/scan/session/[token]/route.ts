import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-role client for RLS-safe reads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    console.log('[Session API] Fetching session for token:', token);
    console.log('[Session API] Request URL:', request.url);

    // Fetch the scan session by session_token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('medication_scan_sessions')
      .select(`
        id,
        patient_id,
        session_token,
        medication_ids,
        scheduled_time,
        expires_at,
        is_active,
        created_at,
        patients (
          id,
          first_name,
          last_name,
          timezone
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .single();

    if (sessionError) {
      console.error('[Session API] Error fetching session:', sessionError);
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    if (!session) {
      console.log('[Session API] No session found for token:', token);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now > expiresAt) {
      console.log('[Session API] Session expired for token:', token);
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    // Fetch medication details for the session
    const { data: medications, error: medicationsError } = await supabaseAdmin
      .from('medications')
      .select(`
        id,
        name,
        strength,
        format
      `)
      .in('id', session.medication_ids);

    if (medicationsError) {
      console.error('[Session API] Error fetching medications:', medicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication details' },
        { status: 500 }
      );
    }

    // Format the response to match what the scan page expects
    const response = {
      id: session.id,
      patient_id: session.patient_id,
      medication_ids: session.medication_ids,
      session_token: session.session_token,
      is_active: session.is_active,
      created_at: session.created_at,
      scheduled_time: session.scheduled_time,
      patients: session.patients,
      medications: medications?.[0] || null // The scan page expects a single medication object
    };

    console.log('[Session API] Returning session data:', {
      id: response.id,
      patient_id: response.patient_id,
      medication_count: session.medication_ids.length,
      scheduled_time: response.scheduled_time
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
