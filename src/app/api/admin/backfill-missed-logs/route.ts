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

export async function POST(request: NextRequest) {
  try {
    console.log('[Backfill Missed Logs] Starting backfill process...');

    // Find all expired scan sessions that are inactive (expired but no missed logs created)
    const { data: expiredSessions, error: sessionsError } = await supabaseAdmin
      .from('medication_scan_sessions')
      .select('id, patient_id, medication_ids, scheduled_time, expires_at, is_active')
      .eq('is_active', false) // Inactive sessions (expired)
      .lt('expires_at', new Date().toISOString()); // Sessions that have expired

    if (sessionsError) {
      console.error('[Backfill Missed Logs] Error fetching expired sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch expired sessions' },
        { status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('[Backfill Missed Logs] No expired sessions found');
      return NextResponse.json({
        success: true,
        message: 'No expired sessions to backfill',
        processedCount: 0
      });
    }

    console.log(`[Backfill Missed Logs] Found ${expiredSessions.length} expired sessions to backfill`);

    let processedCount = 0;
    let missedLogsCreated = 0;
    const errors = [];

    for (const session of expiredSessions) {
      try {
        // Check if missed logs already exist for this session
        const { data: existingLogs, error: checkError } = await supabaseAdmin
          .from('medication_logs')
          .select('id')
          .eq('patient_id', session.patient_id)
          .in('medication_id', session.medication_ids)
          .eq('status', 'missed')
          .gte('event_date', session.scheduled_time)
          .lt('event_date', new Date(new Date(session.scheduled_time).getTime() + 24 * 60 * 60 * 1000).toISOString()); // Within 24 hours of scheduled time

        if (checkError) {
          console.error(`[Backfill Missed Logs] Error checking existing logs for session ${session.id}:`, checkError);
          errors.push(`Session ${session.id}: Failed to check existing logs`);
          continue;
        }

        // If missed logs already exist, skip this session
        if (existingLogs && existingLogs.length > 0) {
          console.log(`[Backfill Missed Logs] Session ${session.id} already has missed logs, skipping`);
          continue;
        }

        // Get medication details for this session
        const { data: medications, error: medsError } = await supabaseAdmin
          .from('medications')
          .select('id, name, strength, format')
          .in('id', session.medication_ids)
          .eq('status', 'active');

        if (medsError || !medications) {
          console.error(`[Backfill Missed Logs] Error fetching medications for session ${session.id}:`, medsError);
          errors.push(`Session ${session.id}: Failed to fetch medications`);
          continue;
        }

        // Create missed medication logs for each medication in the expired session
        for (const medicationId of session.medication_ids) {
          try {
            const medication = medications.find(med => med.id === medicationId);
            if (!medication) {
              console.warn(`[Backfill Missed Logs] Medication ${medicationId} not found for session ${session.id}`);
              continue;
            }

            // Create missed medication log
            const { error: logError } = await supabaseAdmin
              .from('medication_logs')
              .insert({
                medication_id: medicationId,
                patient_id: session.patient_id,
                schedule_id: null,
                event_key: new Date(session.scheduled_time).toISOString().slice(0, 13), // YYYYMMDDH format
                event_date: session.scheduled_time, // Use scheduled time, not current time
                status: 'missed',
                source: 'backfill_expired_session',
                raw_scan_data: JSON.stringify({ 
                  reason: 'backfill_expired_session', 
                  sessionId: session.id,
                  scheduledTime: session.scheduled_time,
                  backfilledAt: new Date().toISOString(),
                  medicationName: medication.name
                })
              });

            if (logError) {
              console.error(`[Backfill Missed Logs] Error creating missed log for medication ${medicationId}:`, logError);
              errors.push(`Session ${session.id}: Failed to create missed log for medication ${medicationId}`);
            } else {
              missedLogsCreated++;
              console.log(`[Backfill Missed Logs] Created missed log for medication ${medicationId} (${medication.name})`);
            }
          } catch (error) {
            console.error(`[Backfill Missed Logs] Exception creating missed log for medication ${medicationId}:`, error);
            errors.push(`Session ${session.id}: Exception creating missed log for medication ${medicationId}`);
          }
        }

        processedCount++;
        console.log(`[Backfill Missed Logs] Processed session ${session.id} for patient ${session.patient_id}`);

      } catch (error) {
        console.error(`[Backfill Missed Logs] Error processing session ${session.id}:`, error);
        errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Backfill Missed Logs] Completed. Processed ${processedCount} sessions, created ${missedLogsCreated} missed logs with ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Backfilled ${processedCount} expired sessions and created ${missedLogsCreated} missed medication logs`,
      processedCount,
      missedLogsCreated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Backfill Missed Logs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill missed logs' },
      { status: 500 }
    );
  }
}
