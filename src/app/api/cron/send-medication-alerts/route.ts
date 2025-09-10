import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    console.log('[CRON] send-medication-alerts start', { utcNow: now.toISOString() });

    // Use service-role client for RLS-safe reads and writes
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

    // Get all active medication schedules that need to be taken at the current time
    const { data: schedules, error: schedulesError } = await supabaseAdmin
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
      .eq('medications.patients.rtm_status', 'active');

    if (schedulesError) {
      console.error('Error fetching medication schedules:', schedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch medication schedules' },
        { status: 500 }
      );
    }
    console.log('[CRON] Schedules fetched', { count: (schedules || []).length });

    // Diagnostic: if no schedules, try to inspect recent rows to understand why
    if (!schedules || schedules.length === 0) {
      try {
        type DiagPatient = { id: string; rtm_status?: string | null; phone1?: string | null; timezone?: string | null };
        type DiagMedication = { id: string; status: string; patients: DiagPatient | DiagPatient[] | null };
        type DiagScheduleRow = { id: string; time_of_day: string; is_active: boolean; alert_sms: boolean; medications: DiagMedication | DiagMedication[] | null };

        const { data: diagSchedules } = await supabaseAdmin
          .from('medication_schedules')
          .select(`id, time_of_day, is_active, alert_sms, medications ( id, status, patients ( id, rtm_status, phone1, timezone ) )`)
          .limit(20);
        const diagSample = (diagSchedules as DiagScheduleRow[] | null) || [];
        console.log('[CRON][DIAG] Sample schedules', {
          sampleCount: diagSample.length,
          sample: diagSample.map((s: DiagScheduleRow) => {
            const meds = s.medications;
            const med = Array.isArray(meds) ? meds[0] : meds;
            const pat = med?.patients;
            const patient = Array.isArray(pat) ? pat[0] : pat;
            return {
              id: s.id,
              time_of_day: s.time_of_day,
              is_active: s.is_active,
              alert_sms: s.alert_sms,
              medStatus: med?.status,
              patientStatus: patient?.rtm_status,
              hasPhone: !!patient?.phone1,
              tz: patient?.timezone,
            };
          })
        });
      } catch (e) {
        console.warn('[CRON][DIAG] Failed to fetch sample schedules', e);
      }
    }

    const alertsSent = [];
    const errors = [];

    // Group schedules by patient and scheduled time to create one session per patient per time
    const scheduleGroups = new Map<string, typeof schedules>();
    
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
        const localNowStr = now.toLocaleString('en-US', { timeZone, hour12: false });
        const localNow = new Date(localNowStr);
        const localHour = localNow.getHours();
        const localMinute = localNow.getMinutes();

        // Check if this schedule should trigger an alert now based on patient's local time
        const advance = schedule.alert_advance_minutes ?? 15;
        const tolerance = 7;
        const schedMinutes = timeToMinutes(schedule.time_of_day);
        const nowMinutes = localHour * 60 + localMinute;
        console.log('[CRON] Candidate schedule check', {
          scheduleId: (schedule as { id: string }).id,
          medicationId: medication.id,
          patientId: patient.id,
          timezone: timeZone,
          scheduleTime: schedule.time_of_day,
          localNowIso: localNow.toISOString(),
          localHour,
          localMinute,
          advance,
          tolerance,
          schedMinutes,
          nowMinutes,
          delta: schedMinutes - nowMinutes
        });
        const shouldSendAlert = checkIfMedicationDue(schedule.time_of_day, localHour, localMinute, advance, tolerance);
        console.log('[CRON] shouldSendAlert', { scheduleId: (schedule as { id: string }).id, medicationId: medication.id, patientId: patient.id, shouldSendAlert });
        
        if (!shouldSendAlert) continue;

        // Create a unique key for this patient and scheduled time
        const [hh, mm] = String(schedule.time_of_day).split(':').map(Number);
        const scheduledLocal = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), hh || 0, mm || 0, 0, 0);
        const groupKey = `${patient.id}-${scheduledLocal.toISOString()}`;
        
        if (!scheduleGroups.has(groupKey)) {
          scheduleGroups.set(groupKey, []);
        }
        scheduleGroups.get(groupKey)!.push(schedule);
        
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        errors.push(`Error processing schedule ${schedule.id}: ${error}`);
      }
    }

    // Process each group (one session per patient per time)
    for (const [groupKey, groupSchedules] of scheduleGroups) {
      try {
        // Get patient and medication info from the first schedule (all schedules in group have same patient/time)
        const firstSchedule = groupSchedules[0];
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

        const medsRelation = (firstSchedule as { medications: Medication | Medication[] | null }).medications;
        const medication: Medication | null = Array.isArray(medsRelation) ? (medsRelation[0] ?? null) : medsRelation;
        if (!medication) continue;

        const patientRelation = medication.patients;
        const patient: Patient | null = Array.isArray(patientRelation) ? (patientRelation[0] ?? null) : patientRelation;
        if (!patient || !patient.phone1) continue;
        if (patient.rtm_status && patient.rtm_status !== 'active') continue;

        // Determine patient's local time (defaults to America/New_York if missing)
        const timeZone = patient.timezone || 'America/New_York';
        const localNowStr = now.toLocaleString('en-US', { timeZone, hour12: false });
        const localNow = new Date(localNowStr);

        // Check if we already sent an alert for this patient today at this time
        const today = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
        const startIso = new Date(today.getTime() - (localNow.getTime() - now.getTime())).toISOString();
        const endIso = new Date(new Date(today.getTime() + 24*60*60*1000).getTime() - (localNow.getTime() - now.getTime())).toISOString();
        console.log('[CRON] Existing alert window (UTC)', { startIso, endIso });
        
        // Check if any alert was already sent for this patient today
        const { data: existingAlert } = await supabaseAdmin
          .from('alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .gte('sent_at', startIso)
          .lt('sent_at', endIso)
          .eq('alert_type', 'sms')
          .single();

        if (existingAlert) {
          console.log('[CRON] Alert already sent today for patient', { patientId: patient.id });
          continue;
        }

        // Collect all medication IDs and names for this group
        const medicationIds: string[] = [];
        const medicationNames: string[] = [];
        
        for (const schedule of groupSchedules) {
          const scheduleMedsRelation = (schedule as { medications: Medication | Medication[] | null }).medications;
          const scheduleMedication: Medication | null = Array.isArray(scheduleMedsRelation) ? (scheduleMedsRelation[0] ?? null) : scheduleMedsRelation;
          if (scheduleMedication) {
            medicationIds.push(scheduleMedication.id);
            medicationNames.push(scheduleMedication.name);
          }
        }

        // Compute the scheduled time for TODAY in the patient's timezone, then convert to UTC ISO
        const [hh, mm] = String(firstSchedule.time_of_day).split(':').map(Number);
        const tzOffsetMs = localNow.getTime() - now.getTime();
        const scheduledLocal = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), hh || 0, mm || 0, 0, 0);
        const scheduledUtcIso = new Date(scheduledLocal.getTime() - tzOffsetMs).toISOString();
        console.log('[CRON] Creating scan session for group', { 
          groupKey, 
          patientId: patient.id, 
          medicationCount: medicationIds.length,
          medicationIds,
          scheduledLocal: scheduledLocal.toISOString(), 
          scheduledUtcIso 
        });

        // Create scan session with all medications
        const sessionToken = `cron-${patient.id}-${Date.now()}`;
        const { data: scanSession, error: sessionError } = await supabaseAdmin
          .from('medication_scan_sessions')
          .insert({
            patient_id: patient.id,
            session_token: sessionToken,
            medication_ids: medicationIds,
            scheduled_time: scheduledUtcIso,
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
            is_active: true
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating scan session:', sessionError);
          errors.push(`Failed to create scan session for patient ${patient.id}`);
          continue;
        }

        // Generate scan link
        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://simpiller-software.vercel.app';
        const scanLink = `${baseUrl}/scan/${scanSession.session_token}`;

        // Format phone number
        const formattedPhone = TwilioService.formatPhoneNumber(patient.phone1);

        // Send SMS reminder with all medication names
        const reminder = {
          patientName: `${patient.first_name} ${patient.last_name}`,
          medicationNames: medicationNames,
          scheduledTime: scheduledUtcIso,
          scanLink,
          patientPhone: formattedPhone,
        };

        const smsSent = await TwilioService.sendMedicationReminder(reminder);
        console.log('[CRON] SMS attempted', { patientId: patient.id, medicationCount: medicationIds.length, smsSent });

        if (smsSent) {
          // Log alerts for each medication
          for (const schedule of groupSchedules) {
            const scheduleMedsRelation = (schedule as { medications: Medication | Medication[] | null }).medications;
            const scheduleMedication: Medication | null = Array.isArray(scheduleMedsRelation) ? (scheduleMedsRelation[0] ?? null) : scheduleMedsRelation;
            if (scheduleMedication) {
              await supabaseAdmin
                .from('alerts')
                .insert({
                  patient_id: patient.id,
                  medication_id: scheduleMedication.id,
                  schedule_id: schedule.id,
                  alert_type: 'sms',
                  scheduled_time: now.toISOString(),
                  sent_at: now.toISOString(),
                  status: 'sent',
                  message: `Hi ${patient.first_name} ${patient.last_name.charAt(0)}.! It's time to take your ${localNow.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })} medications. Please scan your medication label to confirm: ${scanLink}`,
                  recipient: formattedPhone,
                });
            }
          }

          alertsSent.push({
            patientId: patient.id,
            medicationIds: medicationIds,
            scheduleIds: groupSchedules.map(s => s.id),
            scanSessionToken: scanSession.session_token,
          });

          console.log('[CRON] SMS alert sent', { 
            patientId: patient.id, 
            medicationCount: medicationIds.length,
            scanSessionToken: scanSession.session_token 
          });
        } else {
          console.warn('[CRON] Failed to send SMS', { patientId: patient.id, medicationCount: medicationIds.length });
          errors.push(`Failed to send SMS for patient ${patient.id}`);
        }

      } catch (error) {
        console.error(`Error processing schedule group ${groupKey}:`, error);
        errors.push(`Error processing schedule group ${groupKey}: ${error}`);
      }
    }

    console.log('[CRON] Summary', { alertsSent: alertsSent.length, errors: errors.length });
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