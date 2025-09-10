import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    console.log('[Populate] Starting medication schedules population');

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

    // Get all active medications with their patient time preferences
    const { data: medications, error: medicationsError } = await supabaseAdmin
      .from('medications')
      .select(`
        id,
        patient_id,
        name,
        time_of_day,
        status,
        patients (
          id,
          first_name,
          last_name,
          morning_time,
          afternoon_time,
          evening_time,
          bedtime,
          timezone
        )
      `)
      .eq('status', 'active');

    if (medicationsError) {
      console.error('[Populate] Error fetching medications:', medicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch medications' },
        { status: 500 }
      );
    }

    if (!medications || medications.length === 0) {
      console.log('[Populate] No active medications found');
      return NextResponse.json({
        success: true,
        message: 'No active medications found',
        schedulesCreated: 0
      });
    }

    console.log('[Populate] Medications loaded', { count: medications.length });

    let schedulesCreated = 0;
    const errors = [];

    for (const medication of medications) {
      try {
        type Patient = {
          id: string;
          first_name: string;
          last_name: string;
          morning_time?: string;
          afternoon_time?: string;
          evening_time?: string;
          bedtime?: string;
          timezone?: string;
        };

        const patientsRelation = (medication as { patients: Patient | Patient[] | null }).patients;
        const patient: Patient | null = Array.isArray(patientsRelation)
          ? (patientsRelation[0] ?? null)
          : patientsRelation;

        if (!patient) continue;

        // Clear existing schedules for this medication
        await supabaseAdmin
          .from('medication_schedules')
          .delete()
          .eq('medication_id', medication.id);

        // Parse time_of_day to create schedules
        console.log('[Populate] Processing medication', { 
          id: medication.id, 
          name: medication.name, 
          time_of_day: medication.time_of_day,
          patientId: patient.id,
          patientName: `${patient.first_name} ${patient.last_name}`,
          patientTimes: {
            morning: patient.morning_time,
            afternoon: patient.afternoon_time,
            evening: patient.evening_time,
            bedtime: patient.bedtime
          }
        });
        
        if (medication.time_of_day) {
          const times = medication.time_of_day.split(',').map((t: string) => t.trim()).filter((t: string) => t);
          console.log('[Populate] Parsed times:', times);
          
          for (const timeStr of times) {
            let time = '';
            const scheduleData: {
              medication_id: string;
              days_of_week: number;
              is_active: boolean;
              alert_sms: boolean;
              alert_email: boolean;
              alert_advance_minutes: number;
              time_of_day?: string;
            } = {
              medication_id: medication.id,
              days_of_week: 127, // All days of week (bitmap: 1=Sunday, 2=Monday, etc.)
              is_active: true,
              alert_sms: true,
              alert_email: false,
              alert_advance_minutes: 15
            };

            // Handle both formats: "morning (06:00:00)" and just "morning"
            if (timeStr.includes('(') && timeStr.includes(')')) {
              // Extract time from format like "morning (06:00:00)"
              const timeMatch = timeStr.match(/\(([^)]+)\)/);
              if (timeMatch) {
                time = timeMatch[1];
              }
            } else {
              // Use patient's time preferences for simple time names
              switch (timeStr.toLowerCase().trim()) {
                case 'morning':
                  time = patient.morning_time || '06:00';
                  break;
                case 'afternoon':
                  time = patient.afternoon_time || '12:00';
                  break;
                case 'evening':
                  time = patient.evening_time || '18:00';
                  break;
                case 'bedtime':
                  time = patient.bedtime || '22:00';
                  break;
                default:
                  console.log('[Populate] Unknown time string:', timeStr);
                  continue;
              }
            }

            // Ensure time is in HH:MM:SS format
            if (time && !time.includes(':')) {
              time = `${time}:00`;
            }
            if (time && time.split(':').length === 2) {
              time = `${time}:00`;
            }

            if (time) {
              scheduleData.time_of_day = time;
              console.log('[Populate] Creating schedule with data:', scheduleData);

              // Create the schedule
              const { error: scheduleError } = await supabaseAdmin
                .from('medication_schedules')
                .insert(scheduleData);

              if (scheduleError) {
                console.error('[Populate] Error creating schedule', { medicationId: medication.id, time, scheduleError });
                errors.push(`Failed to create schedule for ${medication.name}: ${scheduleError.message}`);
              } else {
                schedulesCreated++;
                console.log('[Populate] Created schedule', { medication: medication.name, time });
              }
            } else {
              console.log('[Populate] No time resolved for timeStr:', timeStr);
            }
          }
        }
      } catch (error) {
        console.error('[Populate] Error processing medication', { medicationId: medication.id, error });
        errors.push(`Error processing ${medication.name}: ${error}`);
      }
    }

    console.log('[Populate] Summary', { schedulesCreated, errors: errors.length });
    return NextResponse.json({
      success: true,
      message: `Medication schedules populated successfully`,
      schedulesCreated,
      errors: errors.length,
      details: errors
    });

  } catch (error) {
    console.error('Error populating medication schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
