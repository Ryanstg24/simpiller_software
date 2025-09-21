import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-role client for RLS-safe operations
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

export async function GET(request: NextRequest) {
  try {
    console.log('[Process Expired Sessions] Starting expired session processing...');

    // Find all expired scan sessions that haven't been processed yet
    const now = new Date();
    const { data: expiredSessions, error: sessionsError } = await supabaseAdmin
      .from('medication_scan_sessions')
      .select('id, patient_id, medication_ids, scheduled_time, expires_at, is_active, processed_for_missed')
      .lt('expires_at', now.toISOString()) // Sessions that have expired
      .eq('is_active', true) // Still active (never scanned)
      .is('processed_for_missed', null); // Not yet processed for missed logging

    if (sessionsError) {
      console.error('[Process Expired Sessions] Error fetching expired sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch expired sessions' },
        { status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('[Process Expired Sessions] No expired sessions found');
      return NextResponse.json({
        success: true,
        message: 'No expired sessions to process',
        processedCount: 0
      });
    }

    console.log(`[Process Expired Sessions] Found ${expiredSessions.length} expired sessions to process`);

    let processedCount = 0;
    const errors = [];

    for (const session of expiredSessions) {
      try {
        // Get medication details for this session
        const { data: medications, error: medsError } = await supabaseAdmin
          .from('medications')
          .select('id, name, strength, format')
          .in('id', session.medication_ids)
          .eq('status', 'active');

        if (medsError || !medications) {
          console.error(`[Process Expired Sessions] Error fetching medications for session ${session.id}:`, medsError);
          errors.push(`Session ${session.id}: Failed to fetch medications`);
          continue;
        }

        // Log each medication as missed
        for (const medication of medications) {
          const eventKey = new Date(session.scheduled_time).toISOString().slice(0, 13); // YYYYMMDDH format
          
          const { error: logError } = await supabaseAdmin
            .from('medication_logs')
            .insert({
              medication_id: medication.id,
              patient_id: session.patient_id,
              schedule_id: null, // Will be determined by the system
              event_key: eventKey,
              event_date: new Date(session.scheduled_time).toISOString(), // Use scheduled time, not current time
              status: 'missed',
              source: 'expired_session',
              raw_scan_data: JSON.stringify({
                reason: 'session_expired',
                sessionId: session.id,
                scheduledTime: session.scheduled_time,
                expiredAt: session.expires_at,
                processedAt: now.toISOString()
              }),
            });

          if (logError) {
            console.error(`[Process Expired Sessions] Error logging missed medication ${medication.id}:`, logError);
            errors.push(`Session ${session.id}, Medication ${medication.id}: ${logError.message}`);
          } else {
            console.log(`[Process Expired Sessions] Logged missed medication: ${medication.name} for patient ${session.patient_id}`);
          }
        }

        // Mark session as processed for missed logging
        const { error: updateError } = await supabaseAdmin
          .from('medication_scan_sessions')
          .update({ 
            processed_for_missed: now.toISOString(),
            is_active: false // Also deactivate the session
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`[Process Expired Sessions] Error updating session ${session.id}:`, updateError);
          errors.push(`Session ${session.id}: Failed to update session status`);
        } else {
          processedCount++;
          console.log(`[Process Expired Sessions] Processed session ${session.id} for patient ${session.patient_id}`);
        }

      } catch (error) {
        console.error(`[Process Expired Sessions] Error processing session ${session.id}:`, error);
        errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Process Expired Sessions] Completed. Processed ${processedCount} sessions with ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} expired sessions`,
      processedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Process Expired Sessions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to process expired sessions' },
      { status: 500 }
    );
  }
}
