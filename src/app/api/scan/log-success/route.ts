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
    const { scanSessionId, medicationId, patientId, scheduleId, scanData } = await request.json();

    if (!scanSessionId || !medicationId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: scanSessionId, medicationId, patientId' },
        { status: 400 }
      );
    }

    // Pull scheduled_time to determine on_time/overdue/missed windows
    const { data: sessionRow } = await supabaseAdmin
      .from('medication_scan_sessions')
      .select('scheduled_time')
      .eq('id', scanSessionId)
      .single();

    const now = new Date();
    const scheduledAt = sessionRow?.scheduled_time ? new Date(sessionRow.scheduled_time) : null;
    let timeliness: 'on_time' | 'overdue' | 'missed' = 'on_time';
    if (scheduledAt) {
      const diffMin = (now.getTime() - scheduledAt.getTime()) / 60000;
      if (diffMin > 180) timeliness = 'missed';
      else if (diffMin > 60) timeliness = 'overdue';
    }

    // If scan window expired, mark missed and block success
    if (timeliness === 'missed') {
      await supabaseAdmin
        .from('medication_logs')
        .insert({
          medication_id: medicationId,
          patient_id: patientId,
          schedule_id: scheduleId || null,
          event_key: new Date().toISOString().slice(0, 13),
          event_date: now.toISOString(),
          status: 'missed',
          source: 'qr_scan',
          raw_scan_data: JSON.stringify({ reason: 'window_expired', scheduledAt, now }),
        });
      return NextResponse.json({ error: 'Scan window expired. Marked as missed.' }, { status: 400 });
    }

    // Update scan session to completed
    const { error: sessionError } = await supabaseAdmin
      .from('medication_scan_sessions')
      .update({ 
        is_active: false
      })
      .eq('id', scanSessionId);

    if (sessionError) {
      console.error('Error updating scan session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to update scan session' },
        { status: 500 }
      );
    }

    // Find the schedule_id if not provided
    let finalScheduleId = scheduleId;
    if (!finalScheduleId) {
      const { data: schedule } = await supabaseAdmin
        .from('medication_schedules')
        .select('id')
        .eq('medication_id', medicationId)
        .eq('is_active', true)
        .single();
      finalScheduleId = schedule?.id || null;
    }

    // Create medication log entry (this also feeds Adherance log)
    const eventKey = new Date().toISOString().slice(0, 13); // YYYYMMDDH format
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('medication_logs')
      .insert({
        medication_id: medicationId,
        patient_id: patientId,
        schedule_id: finalScheduleId,
        event_key: eventKey,
        event_date: new Date().toISOString(),
        status: 'taken',
        qr_code_scanned: scanData?.qrCode || null,
        raw_scan_data: JSON.stringify(scanData),
        source: 'qr_scan',
        alert_sent_at: new Date().toISOString(),
        alert_type: 'sms',
        alert_response: 'scanned'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating medication log:', logError);
      return NextResponse.json(
        { error: 'Failed to create medication log' },
        { status: 500 }
      );
    }

    // Update medication last_dose_at
    const { error: medicationError } = await supabaseAdmin
      .from('medications')
      .update({ 
        last_dose_at: new Date().toISOString()
      })
      .eq('id', medicationId);

    if (medicationError) {
      console.error('Error updating medication last_dose_at:', medicationError);
      // Don't fail the request for this, just log it
    }

    // Calculate and update compliance score
    await updateComplianceScore(patientId, medicationId);

    return NextResponse.json({
      success: true,
      message: 'Scan logged successfully',
      logEntry
    });

  } catch (error) {
    console.error('Error logging scan success:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate and update patient compliance score for ALL medications
 */
async function updateComplianceScore(patientId: string, medicationId: string) {
  try {
    // Get all medication logs for this patient in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('medication_id, status, event_date')
      .eq('patient_id', patientId)
      .gte('event_date', thirtyDaysAgo.toISOString())
      .order('event_date', { ascending: true });

    if (logsError) {
      console.error('Error fetching medication logs for compliance:', logsError);
      return;
    }

    // Get all active medications for this patient
    const { data: medications, error: medicationsError } = await supabaseAdmin
      .from('medications')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (medicationsError) {
      console.error('Error fetching medications for compliance:', medicationsError);
      return;
    }

    // Get all schedules for this patient's medications
    const medicationIds = medications.map(m => m.id);
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('medication_schedules')
      .select('medication_id, time_of_day, days_of_week')
      .in('medication_id', medicationIds)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Error fetching medication schedules for compliance:', schedulesError);
      return;
    }

    // Calculate total expected doses across all medications
    const totalExpectedDoses = schedules.reduce((total, schedule) => {
      const scheduleData = [{ time_of_day: schedule.time_of_day, days_of_week: schedule.days_of_week }];
      return total + calculateExpectedDoses(scheduleData, thirtyDaysAgo);
    }, 0);

    // Calculate total taken doses across all medications
    const takenDoses = logs.filter(log => log.status === 'taken').length;
    
    // Calculate overall compliance score
    const complianceScore = totalExpectedDoses > 0 ? (takenDoses / totalExpectedDoses) * 100 : 100;

    // Ensure compliance score is an integer between 0 and 100
    const roundedScore = Math.max(0, Math.min(100, Math.round(complianceScore)));

    // Persist rolling 30-day adherence (compliance) score on patient
    // Try to update adherence_score, but don't fail if the column doesn't exist or has constraints
    try {
      console.log(`Attempting to update adherence_score to ${roundedScore} for patient ${patientId}`);
      
      const { error: patientUpdateError } = await supabaseAdmin
        .from('patients')
        .update({ adherence_score: roundedScore })
        .eq('id', patientId);
      
      if (patientUpdateError) {
        console.error('Error updating patient adherence_score:', patientUpdateError);
        console.log('Adherence score update failed, but scan logging will continue');
        
        // Try to get more info about the patient record
        const { data: patientData, error: patientFetchError } = await supabaseAdmin
          .from('patients')
          .select('id, first_name, last_name, adherence_score')
          .eq('id', patientId)
          .single();
        
        if (patientFetchError) {
          console.error('Error fetching patient data:', patientFetchError);
        } else {
          console.log('Current patient data:', patientData);
        }
      } else {
        console.log(`Successfully updated adherence score to ${roundedScore}% for patient ${patientId}`);
      }
    } catch (updateError) {
      console.error('Exception updating patient adherence_score:', updateError);
      console.log('Adherence score update failed, but scan logging will continue');
    }

    console.log(`Overall compliance score for patient ${patientId}: ${roundedScore}% (${takenDoses}/${totalExpectedDoses} doses, calculated: ${complianceScore.toFixed(2)}%)`);

  } catch (error) {
    console.error('Error updating compliance score:', error);
  }
}

/**
 * Calculate expected number of doses based on schedules
 */
function calculateExpectedDoses(schedules: Array<{ time_of_day: string; days_of_week: number }>, startDate: Date): number {
  let totalExpected = 0;
  const endDate = new Date();

  for (const schedule of schedules) {
    const daysOfWeek = schedule.days_of_week; // Bitmap: 1=Sunday, 2=Monday, etc.

    // Count days from startDate to endDate that match the schedule
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      const dayBit = Math.pow(2, dayOfWeek); // Convert to bitmap position
      
      if (daysOfWeek & dayBit) {
        totalExpected++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return totalExpected;
}
