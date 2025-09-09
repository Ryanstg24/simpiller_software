import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { scanSessionId, medicationId, patientId, scheduleId, scanData } = await request.json();

    if (!scanSessionId || !medicationId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: scanSessionId, medicationId, patientId' },
        { status: 400 }
      );
    }

    // Update scan session status to completed
    const { error: sessionError } = await supabase
      .from('medication_scan_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
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
      const { data: schedule } = await supabase
        .from('medication_schedules')
        .select('id')
        .eq('medication_id', medicationId)
        .eq('is_active', true)
        .single();
      finalScheduleId = schedule?.id || null;
    }

    // Create medication log entry
    const eventKey = new Date().toISOString().slice(0, 13); // YYYYMMDDH format
    const { data: logEntry, error: logError } = await supabase
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
    const { error: medicationError } = await supabase
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
 * Calculate and update patient compliance score
 */
async function updateComplianceScore(patientId: string, medicationId: string) {
  try {
    // Get all medication logs for this patient and medication in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabase
      .from('medication_logs')
      .select('status, event_date')
      .eq('patient_id', patientId)
      .eq('medication_id', medicationId)
      .gte('event_date', thirtyDaysAgo.toISOString())
      .order('event_date', { ascending: true });

    if (logsError) {
      console.error('Error fetching medication logs for compliance:', logsError);
      return;
    }

    // Get expected doses (from medication schedules)
    const { data: schedules, error: schedulesError } = await supabase
      .from('medication_schedules')
      .select('time_of_day, days_of_week')
      .eq('medication_id', medicationId)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Error fetching medication schedules for compliance:', schedulesError);
      return;
    }

    // Calculate compliance score
    const totalExpectedDoses = calculateExpectedDoses(schedules, thirtyDaysAgo);
    const takenDoses = logs.filter(log => log.status === 'taken').length;
    const complianceScore = totalExpectedDoses > 0 ? (takenDoses / totalExpectedDoses) * 100 : 100;

    // Update patient compliance score (you might want to create a compliance_scores table)
    // For now, we'll store it in a patient field or create a separate table
    console.log(`Compliance score for patient ${patientId}, medication ${medicationId}: ${complianceScore.toFixed(2)}%`);

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
