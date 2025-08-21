import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import TwilioService from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get all active medications that need to be taken at the current time
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select(`
        id,
        medication_name,
        dosage,
        time_of_day,
        frequency_per_day,
        patient_id,
        patients (
          id,
          first_name,
          last_name,
          phone1,
          phone1_verified
        )
      `)
      .eq('status', 'active')
      .not('patients.phone1', 'is', null)
      .eq('patients.phone1_verified', true);

    if (medicationsError) {
      console.error('Error fetching medications:', medicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch medications' },
        { status: 500 }
      );
    }

    const alertsSent = [];
    const errors = [];

    for (const medication of medications || []) {
      try {
        const patient = medication.patients;
        if (!patient || !patient.phone1) continue;

        // Parse time_of_day to check if it matches current time
        const timeOfDay = medication.time_of_day;
        if (!timeOfDay) continue;

        // Check if this medication should be taken now
        const shouldSendAlert = checkIfMedicationDue(timeOfDay, currentTime);
        
        if (!shouldSendAlert) continue;

        // Check if we already sent an alert for this medication today
        const today = now.toISOString().split('T')[0];
        const { data: existingAlert } = await supabase
          .from('medication_alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('medication_ids', [medication.id])
          .gte('sent_at', `${today}T00:00:00`)
          .lte('sent_at', `${today}T23:59:59`)
          .eq('alert_type', 'sms_reminder')
          .single();

        if (existingAlert) {
          console.log(`Alert already sent today for medication ${medication.id}`);
          continue;
        }

        // Create scan session
        const { data: scanSession, error: sessionError } = await supabase
          .from('medication_scan_sessions')
          .insert({
            patient_id: patient.id,
            medication_ids: [medication.id],
            scheduled_time: now.toISOString(),
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
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const scanLink = `${baseUrl}/scan/${scanSession.id}`;

        // Format phone number
        const formattedPhone = TwilioService.formatPhoneNumber(patient.phone1);

        // Send SMS reminder
        const reminder = {
          patientName: `${patient.first_name} ${patient.last_name}`,
          medicationNames: [medication.medication_name],
          scheduledTime: now.toISOString(),
          scanLink,
          patientPhone: formattedPhone,
        };

        const smsSent = await TwilioService.sendMedicationReminder(reminder);

        if (smsSent) {
          // Log the alert
          await supabase
            .from('medication_alerts')
            .insert({
              patient_id: patient.id,
              medication_ids: [medication.id],
              alert_type: 'sms_reminder',
              scheduled_time: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              scan_session_id: scanSession.id,
            });

          alertsSent.push({
            patientId: patient.id,
            medicationId: medication.id,
            scanSessionId: scanSession.id,
          });

          console.log(`SMS alert sent to ${patient.first_name} ${patient.last_name} for ${medication.medication_name}`);
        } else {
          errors.push(`Failed to send SMS for medication ${medication.id}`);
        }

      } catch (error) {
        console.error(`Error processing medication ${medication.id}:`, error);
        errors.push(`Error processing medication ${medication.id}: ${error}`);
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
function checkIfMedicationDue(timeOfDay: string, currentTime: string): boolean {
  // Parse time_of_day which could be formats like:
  // "morning (06:00:00)", "afternoon (12:00:00)", "evening (18:00:00)"
  // or "custom (14:30:00)"
  
  const timeMatch = timeOfDay.match(/\((\d{2}:\d{2}:\d{2})\)/);
  if (!timeMatch) return false;

  const medicationTime = timeMatch[1];
  
  // Allow a 5-minute window around the scheduled time
  const currentMinutes = timeToMinutes(currentTime);
  const medicationMinutes = timeToMinutes(medicationTime);
  
  const timeDiff = Math.abs(currentMinutes - medicationMinutes);
  return timeDiff <= 5; // 5-minute window
}

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
} 