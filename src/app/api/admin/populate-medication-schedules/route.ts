import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    console.log('🔄 Starting medication schedules population...');

    // Get all active medications with their patient time preferences
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select(`
        id,
        patient_id,
        name,
        time_of_day,
        custom_time,
        status,
        patients (
          id,
          first_name,
          last_name,
          morning_time,
          afternoon_time,
          evening_time,
          timezone
        )
      `)
      .eq('status', 'active');

    if (medicationsError) {
      console.error('Error fetching medications:', medicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch medications' },
        { status: 500 }
      );
    }

    if (!medications || medications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active medications found',
        schedulesCreated: 0
      });
    }

    let schedulesCreated = 0;
    const errors = [];

    for (const medication of medications) {
      try {
        const patient = medication.patients;
        if (!patient) continue;

        // Clear existing schedules for this medication
        await supabase
          .from('medication_schedules')
          .delete()
          .eq('medication_id', medication.id);

        // Parse time_of_day to create schedules
        if (medication.time_of_day) {
          const times = medication.time_of_day.split(',').map((t: string) => t.trim()).filter((t: string) => t);
          
          for (const timeStr of times) {
            let time = '';
            let scheduleData: any = {
              medication_id: medication.id,
              days_of_week: 127, // All days of week (bitmap: 1=Sunday, 2=Monday, etc.)
              is_active: true,
              alert_sms: true,
              alert_email: false,
              alert_advance_minutes: 15
            };

            // Extract time from format like "morning (06:00:00)"
            if (timeStr.includes('(') && timeStr.includes(')')) {
              const timeMatch = timeStr.match(/\(([^)]+)\)/);
              if (timeMatch) {
                time = timeMatch[1];
              }
            } else if (timeStr === 'custom' && medication.custom_time) {
              time = medication.custom_time;
            } else {
              // Use patient's time preferences
              switch (timeStr.toLowerCase()) {
                case 'morning':
                  time = patient.morning_time || '06:00';
                  break;
                case 'afternoon':
                  time = patient.afternoon_time || '12:00';
                  break;
                case 'evening':
                  time = patient.evening_time || '18:00';
                  break;
                default:
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

              // Create the schedule
              const { error: scheduleError } = await supabase
                .from('medication_schedules')
                .insert(scheduleData);

              if (scheduleError) {
                console.error(`Error creating schedule for medication ${medication.id}:`, scheduleError);
                errors.push(`Failed to create schedule for ${medication.name}: ${scheduleError.message}`);
              } else {
                schedulesCreated++;
                console.log(`✅ Created schedule for ${medication.name} at ${time}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing medication ${medication.id}:`, error);
        errors.push(`Error processing ${medication.name}: ${error}`);
      }
    }

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
