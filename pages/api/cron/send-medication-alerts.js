import { supabase } from '../../lib/supabase';
import TwilioService from '../../lib/twilio';

export default async function handler(req, res) {
  // Verify the request is from Vercel cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`🕐 Running medication alerts cron at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // Get all active medication schedules with their medications and patients
    const { data: schedules, error: schedulesError } = await supabase
      .from('medication_schedules')
      .select(`
        *,
        medications!inner (
          id,
          name,
          patient_id,
          status,
          patients!inner (
            id,
            first_name,
            last_name,
            phone1,
            phone1_verified
          )
        )
      `)
      .eq('is_active', true)
      .eq('alert_sms', true)
      .eq('medications.status', 'active')
      .eq('medications.patients.phone1_verified', true);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      return res.status(500).json({ error: 'Failed to fetch schedules' });
    }

    if (!schedules || schedules.length === 0) {
      console.log('No active schedules found');
      return res.status(200).json({ message: 'No active schedules found' });
    }

    const alertsSent = [];
    const errors = [];

    for (const schedule of schedules || []) {
      try {
        const medication = schedule.medications;
        if (!medication || Array.isArray(medication)) continue;
        
        const patient = medication.patients;
        if (!patient || Array.isArray(patient) || !patient.phone1) continue;

        // Check if this schedule should trigger an alert now
        const shouldSendAlert = checkIfMedicationDue(schedule.time_of_day, currentHour, currentMinute, schedule.alert_advance_minutes);
        
        if (!shouldSendAlert) continue;

        // Check if we already sent an alert today for this schedule
        const today = new Date().toISOString().split('T')[0];
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('medication_id', medication.id)
          .eq('schedule_id', schedule.id)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);

        if (existingAlert && existingAlert.length > 0) {
          console.log(`Alert already sent today for medication ${medication.id} schedule ${schedule.id}`)
          continue;
        }

        // Create scan session for this medication
        const { data: scanSession, error: scanSessionError } = await supabase
          .from('medication_scan_sessions')
          .insert({
            patient_id: patient.id,
            medication_ids: [medication.id],
            scan_token: crypto.randomUUID(),
            status: 'pending',
            scheduled_time: schedule.time_of_day
          })
          .select()
          .single();

        if (scanSessionError) {
          console.error('Error creating scan session:', scanSessionError);
          errors.push(`Failed to create scan session for medication ${medication.id}`);
          continue;
        }

        // Send SMS reminder
        const reminder = {
          patientName: `${patient.first_name} ${patient.last_name}`,
          patientPhone: patient.phone1,
          scheduledTime: new Date().toISOString(), // Current time
          scanLink: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/scan/${scanSession.scan_token}`
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
              alert_type: 'medication_reminder',
              message: `Hi ${patient.first_name}! It's time to take your medication. Please scan your medication label to confirm.`,
              status: 'sent',
              sent_at: new Date().toISOString()
            });

          alertsSent.push({
            patientId: patient.id,
            medicationId: medication.id,
            scheduleId: schedule.id
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

    return res.status(200).json({
      success: true,
      alertsSent: alertsSent.length,
      errors: errors.length,
      details: {
        alertsSent,
        errors
      }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ 
      error: 'Cron job failed',
      details: error.message 
    });
  }
}

/**
 * Check if a medication is due based on time of day and advance minutes
 */
function checkIfMedicationDue(timeOfDay, currentHour, currentMinute, advanceMinutes = 15) {
  // timeOfDay is in HH:MM:SS format from medication_schedules table
  const medicationTime = timeOfDay;
  
  // Allow advance notification window (default 15 minutes before)
  const currentMinutes = currentHour * 60 + currentMinute;
  const medicationMinutes = timeToMinutes(medicationTime);
  
  // Check if current time is within the advance window before the scheduled time
  const timeDiff = medicationMinutes - currentMinutes;
  return timeDiff >= 0 && timeDiff <= advanceMinutes;
}

/**
 * Convert time string (HH:MM:SS) to minutes
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
