import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import TwilioService from '@/lib/twilio';

// Ensure Node.js runtime (not Edge) and disable caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    // Per Vercel docs, set CRON_SECRET in project env. Vercel will send
    // Authorization: Bearer <CRON_SECRET>. They also include x-vercel-cron header.
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const hasVercelCronHeader = !!request.headers.get('x-vercel-cron');
    const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}` && !hasVercelCronHeader) {
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      // If no secret configured, require Vercel cron header
      if (!hasVercelCronHeader) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const now = new Date();

    // Get all active medication schedules that need to be taken at the current time
    const { data: schedules, error: schedulesError } = await supabase
      .from('medication_schedules')
      .select(`
        id,
        time_of_day,
        is_active,
        alert_sms,
        alert_advance_minutes,
        medications (
          id,
          name,
          patient_id,
          status,
          patients (
            id,
            first_name,
            last_name,
            phone1,
            phone1_verified,
            rtm_status,
            timezone
          )
        )
      `)
      .eq('is_active', true)
      .eq('alert_sms', true)
      .eq('medications.status', 'active')
      .not('medications.patients.phone1', 'is', null)
      .eq('medications.patients.phone1_verified', true)
      .eq('medications.patients.rtm_status', 'active');

    if (schedulesError) {
      console.error('Error fetching medication schedules:', schedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch medication schedules' },
        { status: 500 }
      );
    }

    const alertsSent = [];
    const errors = [];

    for (const schedule of schedules || []) {
      try {
        type Patient = {
          id: string;
          first_name: string;
          last_name: string;
          phone1: string;
          phone1_verified: boolean;
          rtm_status?: string;
          timezone?: string;
        };

        type Medication = {
          id: string;
          name: string;
          patient_id: string;
          status: string;
          patients: Patient | Patient[] | null;
        };

        const medsRelation = (schedule as { medications: Medication | Medication[] | null }).medications;
        const medication: Medication | null = Array.isArray(medsRelation) ? (medsRelation[0] ?? null) : medsRelation;
        if (!medication) continue;

        const patientRelation = medication.patients;
        const patient: Patient | null = Array.isArray(patientRelation) ? (patientRelation[0] ?? null) : patientRelation;
        if (!patient || !patient.phone1) continue;
        if (patient.rtm_status && patient.rtm_status !== 'active') continue;

        // Determine patient's local time (defaults to America/New_York if missing)
        const timeZone = patient.timezone || 'America/New_York';
        const localNowStr = now.toLocaleString('en-US', { timeZone });
        const localNow = new Date(localNowStr);
        const localHour = localNow.getHours();
        const localMinute = localNow.getMinutes();

        // Check if this schedule should trigger an alert now based on patient's local time
        const shouldSendAlert = checkIfMedicationDue(schedule.time_of_day, localHour, localMinute, schedule.alert_advance_minutes, 5);
        
        if (!shouldSendAlert) continue;

        // Check if we already sent an alert for this medication schedule today
        const today = now.toISOString().split('T')[0];
        const { data: existingAlert } = await supabase
          .from('medication_alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('medication_id', medication.id)
          .eq('schedule_id', schedule.id)
          .gte('sent_at', `${today}T00:00:00`)
          .lte('sent_at', `${today}T23:59:59`)
          .eq('alert_type', 'sms')
          .single();

        if (existingAlert) {
          console.log(`Alert already sent today for medication ${medication.id} schedule ${schedule.id}`);
          continue;
        }

        // Compute the scheduled time for TODAY in the patient's timezone, then convert to UTC ISO
        const [hh, mm] = String(schedule.time_of_day).split(':').map(Number);
        const tzOffsetMs = localNow.getTime() - now.getTime();
        const scheduledLocal = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), hh || 0, mm || 0, 0, 0);
        const scheduledUtcIso = new Date(scheduledLocal.getTime() - tzOffsetMs).toISOString();

        // Create scan session
        const { data: scanSession, error: sessionError } = await supabase
          .from('medication_scan_sessions')
          .insert({
            patient_id: patient.id,
            medication_ids: [medication.id],
            scheduled_time: scheduledUtcIso,
            status: 'pending',
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating scan session:', sessionError);
          errors.push(`Failed to create scan session for medication ${medication.id}`);
          continue;
        }

        // Generate scan link
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://simpiller-software.vercel.app';
        const scanLink = `${baseUrl}/scan/${scanSession.id}`;

        // Format phone number
        const formattedPhone = TwilioService.formatPhoneNumber(patient.phone1);

        // Send SMS reminder
        const reminder = {
          patientName: `${patient.first_name} ${patient.last_name}`,
          medicationNames: [medication.name],
          scheduledTime: scheduledUtcIso,
          scanLink,
          patientPhone: formattedPhone,
        };

        const smsSent = await TwilioService.sendMedicationReminder(reminder);

        if (smsSent) {
          // Log the alert
          await supabase
            .from('alerts')
            .insert({
              patient_id: patient.id,
              medication_id: medication.id,
              schedule_id: schedule.id,
              alert_type: 'sms',
              scheduled_time: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              message: `Hi ${patient.first_name} ${patient.last_name.charAt(0)}.! It's time to take your ${new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} medication. Please scan your medication label to confirm: ${scanLink}`,
              recipient: formattedPhone,
            });

          alertsSent.push({
            patientId: patient.id,
            medicationId: medication.id,
            scheduleId: schedule.id,
            scanSessionId: scanSession.id,
          });

          console.log(`SMS alert sent to ${patient.first_name} ${patient.last_name} for ${medication.name}`);
        } else {
          errors.push(`Failed to send SMS for medication ${medication.id}`);
        }

      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        errors.push(`Error processing schedule ${schedule.id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      alertsSent: alertsSent.length,
      errors: errors.length,
      details: {
        alertsSent,
        errors,
      },
    });

  } catch (error) {
    console.error('Error in medication alerts cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if a medication should be taken at the current time
 */
function checkIfMedicationDue(
  timeOfDay: string,
  currentHour: number,
  currentMinute: number,
  advanceMinutes: number = 15,
  toleranceMinutes: number = 0
): boolean {
  // timeOfDay is now in HH:MM:SS format from medication_schedules table
  const medicationTime = timeOfDay;
  
  // Allow advance notification window (default 15 minutes before)
  const currentMinutes = currentHour * 60 + currentMinute;
  const medicationMinutes = timeToMinutes(medicationTime);
  
  // Check if current time is within the advance window before the scheduled time
  const timeDiff = medicationMinutes - currentMinutes;
  // Also allow a small tolerance after the exact time in case the cron runs slightly late
  return (timeDiff >= -toleranceMinutes && timeDiff <= advanceMinutes);
}

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
} 