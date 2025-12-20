import { createClient } from '@supabase/supabase-js';
import { ParsedMedicationData, RPJParser } from './rpj-parser';
import { PatientMatch } from './patient-matcher';

interface ExistingMedication {
  id: string;
  name: string;
  status: string;
}

interface MedicationRecord {
  id: string;
  patient_id: string;
  name: string;
  strength: string;
  dosage: string;
  instructions: string;
  quantity: string;
  refills: string;
  prescriber: string;
  ndc: string;
  status: string;
  source: string;
  time_of_day: string;
  created_at: string;
  updated_at: string;
  raw_import_data: string;
}

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

export interface MedicationAddResult {
  success: boolean;
  medicationId?: string;
  error?: string;
  message: string;
}

export class MedicationAdder {
  /**
   * Add a medication to a patient's profile based on parsed RPJ data
   */
  async addMedicationToPatient(
    patientMatch: PatientMatch,
    medicationData: ParsedMedicationData
  ): Promise<MedicationAddResult> {
    try {
      console.log(`[Medication Adder] Adding medication for patient ${patientMatch.patient.first_name} ${patientMatch.patient.last_name}`);

      // Check if medication already exists for this patient
      const existingMedication = await this.checkExistingMedication(
        patientMatch.patient.id,
        medicationData.medicationInfo.name,
        medicationData.medicationInfo.ndc
      );

      if (existingMedication) {
        console.log(`[Medication Adder] Medication already exists for patient, updating instead`);
        // Still update time preferences even if medication exists
        await this.updatePatientTimePreferences(patientMatch.patient.id, medicationData);
        return await this.updateExistingMedication(existingMedication.id, medicationData);
      }

      // Update patient time preferences based on adminTime from RPJ file
      await this.updatePatientTimePreferences(patientMatch.patient.id, medicationData);

      // Create new medication entry
      const medicationRecord = await this.createMedicationRecord(patientMatch.patient.id, medicationData);

      if (medicationRecord) {
        console.log(`[Medication Adder] Successfully added medication: ${medicationData.medicationInfo.name}`);
        return {
          success: true,
          medicationId: medicationRecord.id,
          message: `Added medication: ${medicationData.medicationInfo.name}`
        };
      } else {
        return {
          success: false,
          error: 'Failed to create medication record',
          message: 'Failed to add medication to patient profile'
        };
      }

    } catch (error) {
      console.error('[Medication Adder] Error adding medication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Error adding medication to patient profile'
      };
    }
  }

  private async checkExistingMedication(
    patientId: string, 
    medicationName: string, 
    ndc?: string
  ): Promise<ExistingMedication | null> {
    try {
      // First, try to match by NDC if available (most reliable)
      // Check active medications first
      if (ndc && ndc.trim()) {
        const { data: ndcMatch, error: ndcError } = await supabaseAdmin
          .from('medications')
          .select('id, name, status')
          .eq('patient_id', patientId)
          .eq('ndc', ndc)
          .eq('status', 'active')
          .limit(1);

        if (!ndcError && ndcMatch && ndcMatch.length > 0) {
          console.log(`[Medication Adder] Found existing active medication by NDC: ${ndc}`);
          return ndcMatch[0];
        }

        // If no active medication found, check for inactive ones (to prevent duplicates)
        const { data: ndcMatchInactive, error: ndcErrorInactive } = await supabaseAdmin
          .from('medications')
          .select('id, name, status')
          .eq('patient_id', patientId)
          .eq('ndc', ndc)
          .neq('status', 'active')
          .limit(1);

        if (!ndcErrorInactive && ndcMatchInactive && ndcMatchInactive.length > 0) {
          console.log(`[Medication Adder] Found existing inactive medication by NDC: ${ndc} - will reactivate`);
          return ndcMatchInactive[0];
        }
      }

      // Second, try exact name match
      // Check active medications first
      const { data: exactMatch, error: exactError } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('patient_id', patientId)
        .ilike('name', medicationName) // Exact case-insensitive match
        .eq('status', 'active')
        .limit(1);

      if (!exactError && exactMatch && exactMatch.length > 0) {
        console.log(`[Medication Adder] Found existing active medication by exact name: ${medicationName}`);
        return exactMatch[0];
      }

      // If no active medication found, check for inactive ones (to prevent duplicates)
      const { data: exactMatchInactive, error: exactErrorInactive } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('patient_id', patientId)
        .ilike('name', medicationName)
        .neq('status', 'active')
        .limit(1);

      if (!exactErrorInactive && exactMatchInactive && exactMatchInactive.length > 0) {
        console.log(`[Medication Adder] Found existing inactive medication by exact name: ${medicationName} - will reactivate`);
        return exactMatchInactive[0];
      }

      // Third, try similar name match (for minor variations)
      // This catches things like "Lisinopril 10mg" vs "Lisinopril"
      // Check active medications first
      const { data: similarMatch, error: similarError } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('patient_id', patientId)
        .ilike('name', `%${medicationName}%`)
        .eq('status', 'active')
        .limit(1);

      if (!similarError && similarMatch && similarMatch.length > 0) {
        // Additional check: ensure the match is reasonable (name contains at least 80% of characters)
        const existingName = similarMatch[0].name.toLowerCase();
        const searchName = medicationName.toLowerCase();
        
        // Only accept if one name contains the other or they're very similar
        if (existingName.includes(searchName) || searchName.includes(existingName)) {
          console.log(`[Medication Adder] Found existing active medication by similar name: ${similarMatch[0].name}`);
          return similarMatch[0];
        }
      }

      // If no active medication found, check for inactive ones (to prevent duplicates)
      const { data: similarMatchInactive, error: similarErrorInactive } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('patient_id', patientId)
        .ilike('name', `%${medicationName}%`)
        .neq('status', 'active')
        .limit(1);

      if (!similarErrorInactive && similarMatchInactive && similarMatchInactive.length > 0) {
        const existingName = similarMatchInactive[0].name.toLowerCase();
        const searchName = medicationName.toLowerCase();
        
        // Only accept if one name contains the other or they're very similar
        if (existingName.includes(searchName) || searchName.includes(existingName)) {
          console.log(`[Medication Adder] Found existing inactive medication by similar name: ${similarMatchInactive[0].name} - will reactivate`);
          return similarMatchInactive[0];
        }
      }

      console.log(`[Medication Adder] No existing medication found for: ${medicationName}`);
      return null;
    } catch (error) {
      console.error('[Medication Adder] Error in checkExistingMedication:', error);
      return null;
    }
  }

  private async createMedicationRecord(patientId: string, medicationData: ParsedMedicationData): Promise<MedicationRecord | null> {
    try {
      const medicationInfo = medicationData.medicationInfo;
      
      // Prepare medication data
      const medicationRecord = {
        patient_id: patientId,
        name: medicationInfo.name,
        strength: medicationInfo.strength || '',
        dosage: medicationInfo.dosage || '',
        instructions: medicationInfo.instructions || '',
        quantity: medicationInfo.quantity || '',
        refills: medicationInfo.refills || '0',
        prescriber: medicationInfo.prescriber || '',
        ndc: medicationInfo.ndc || '',
        status: 'active',
        source: 'sftp_import',
        time_of_day: this.determineTimeOfDay(medicationInfo.adminTime || '', medicationInfo.instructions || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Store raw RPJ data for reference
        raw_import_data: JSON.stringify({
          source: 'chautauqua_sftp',
          import_date: new Date().toISOString(),
          prescription_info: medicationData.prescriptionInfo,
          raw_rpj_data: medicationData.rawData
        })
      };

      const { data, error } = await supabaseAdmin
        .from('medications')
        .insert(medicationRecord)
        .select()
        .single();

      if (error) {
        console.error('[Medication Adder] Error creating medication record:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[Medication Adder] Error in createMedicationRecord:', error);
      throw error;
    }
  }

  private async updateExistingMedication(medicationId: string, medicationData: ParsedMedicationData): Promise<MedicationAddResult> {
    try {
      const medicationInfo = medicationData.medicationInfo;
      
      // First, check if the medication is inactive - if so, we'll reactivate it
      const { data: existingMed, error: fetchError } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('id', medicationId)
        .single();

      if (fetchError) {
        console.error('[Medication Adder] Error fetching medication for update:', fetchError);
        throw fetchError;
      }

      const wasInactive = existingMed && existingMed.status !== 'active';
      
      const updateData = {
        strength: medicationInfo.strength || '',
        dosage: medicationInfo.dosage || '',
        instructions: medicationInfo.instructions || '',
        quantity: medicationInfo.quantity || '',
        refills: medicationInfo.refills || '0',
        prescriber: medicationInfo.prescriber || '',
        ndc: medicationInfo.ndc || '',
        // Reactivate if it was inactive (prevents duplicates from pharmacy updates)
        status: 'active',
        updated_at: new Date().toISOString(),
        // Update raw import data
        raw_import_data: JSON.stringify({
          source: 'chautauqua_sftp',
          import_date: new Date().toISOString(),
          prescription_info: medicationData.prescriptionInfo,
          raw_rpj_data: medicationData.rawData
        })
      };

      const { error } = await supabaseAdmin
        .from('medications')
        .update(updateData)
        .eq('id', medicationId);

      if (error) {
        console.error('[Medication Adder] Error updating medication:', error);
        throw error;
      }

      const actionMessage = wasInactive 
        ? `Reactivated and updated existing medication: ${medicationInfo.name}`
        : `Updated existing medication: ${medicationInfo.name}`;

      console.log(`[Medication Adder] ${actionMessage}`);

      return {
        success: true,
        medicationId: medicationId,
        message: actionMessage
      };
    } catch (error) {
      console.error('[Medication Adder] Error in updateExistingMedication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Error updating existing medication'
      };
    }
  }

  private determineTimeOfDay(adminTime: string, instructions: string): string {
    // First try to determine from administration time
    if (adminTime) {
      const time = RPJParser.convertAdministrationTime(adminTime);
      const hour = parseInt(time.split(':')[0], 10);
      
      if (hour >= 5 && hour < 12) {
        return 'morning';
      } else if (hour >= 12 && hour < 17) {
        return 'afternoon';
      } else if (hour >= 17 && hour < 22) {
        return 'evening';
      } else {
        return 'bedtime';
      }
    }

    // Fallback to instruction parsing
    if (!instructions) {
      return 'morning'; // Default to morning
    }

    const lowerInstructions = instructions.toLowerCase();

    if (lowerInstructions.includes('morning') || lowerInstructions.includes('am')) {
      return 'morning';
    } else if (lowerInstructions.includes('afternoon') || lowerInstructions.includes('noon')) {
      return 'afternoon';
    } else if (lowerInstructions.includes('evening') || lowerInstructions.includes('pm')) {
      return 'evening';
    } else if (lowerInstructions.includes('bedtime') || lowerInstructions.includes('night')) {
      return 'bedtime';
    } else if (lowerInstructions.includes('twice daily') || lowerInstructions.includes('bid')) {
      return 'morning'; // Default to morning for twice daily
    } else if (lowerInstructions.includes('three times daily') || lowerInstructions.includes('tid')) {
      return 'morning'; // Default to morning for three times daily
    } else if (lowerInstructions.includes('four times daily') || lowerInstructions.includes('qid')) {
      return 'morning'; // Default to morning for four times daily
    }

    return 'morning'; // Default fallback
  }

  /**
   * Update patient time preferences based on adminTime from RPJ import
   * Supports multiple time slots per period (morning, afternoon, evening, bedtime)
   */
  private async updatePatientTimePreferences(
    patientId: string, 
    medicationData: ParsedMedicationData
  ): Promise<void> {
    try {
      const adminTime = medicationData.medicationInfo.adminTime;
      
      // Only update if we have an adminTime
      if (!adminTime || !adminTime.trim()) {
        console.log('[Medication Adder] No adminTime provided, skipping time preference update');
        return;
      }

      // Convert adminTime (e.g., "0900") to HH:MM format (e.g., "09:00")
      const formattedTime = RPJParser.convertAdministrationTime(adminTime);
      console.log(`[Medication Adder] Updating time preferences with: ${formattedTime} from adminTime: ${adminTime}`);

      // Determine which period this time belongs to
      const hour = parseInt(formattedTime.split(':')[0], 10);
      let period: 'morning' | 'afternoon' | 'evening' | 'bedtime';
      let arrayField: string;
      let singleField: string;

      if (hour >= 5 && hour < 12) {
        period = 'morning';
        arrayField = 'morning_times';
        singleField = 'morning_time';
      } else if (hour >= 12 && hour < 17) {
        period = 'afternoon';
        arrayField = 'afternoon_times';
        singleField = 'afternoon_time';
      } else if (hour >= 17 && hour < 22) {
        period = 'evening';
        arrayField = 'evening_times';
        singleField = 'evening_time';
      } else {
        period = 'bedtime';
        arrayField = 'bedtime_times';
        singleField = 'bedtime';
      }

      // Get current patient time preferences
      const { data: patient, error: fetchError } = await supabaseAdmin
        .from('patients')
        .select(`${arrayField}, ${singleField}`)
        .eq('id', patientId)
        .single();

      if (fetchError || !patient) {
        console.error('[Medication Adder] Error fetching patient for time preference update:', fetchError);
        return;
      }

      // Get existing times array (or empty array if null)
      // Using type assertion for dynamic property access
      const existingTimes: string[] = (patient as unknown as Record<string, string[] | string | null>)[arrayField] as string[] || [];
      
      // Check if this time already exists in the array
      if (existingTimes.includes(formattedTime)) {
        console.log(`[Medication Adder] Time ${formattedTime} already exists in ${period} preferences`);
        return;
      }

      // Add the new time to the array
      const updatedTimes = [...existingTimes, formattedTime];
      
      // Sort times chronologically
      updatedTimes.sort((a, b) => {
        const [aHour, aMin] = a.split(':').map(Number);
        const [bHour, bMin] = b.split(':').map(Number);
        return (aHour * 60 + aMin) - (bHour * 60 + bMin);
      });

      console.log(`[Medication Adder] Adding ${formattedTime} to ${period} times: ${updatedTimes.join(', ')}`);

      // Prepare update object
      const updateData: Record<string, unknown> = {
        [arrayField]: updatedTimes,
        // Also update the single field with the first time for backward compatibility
        [singleField]: updatedTimes[0],
        updated_at: new Date().toISOString()
      };

      // Update the patient record
      const { error: updateError } = await supabaseAdmin
        .from('patients')
        .update(updateData)
        .eq('id', patientId);

      if (updateError) {
        console.error('[Medication Adder] Error updating patient time preferences:', updateError);
      } else {
        console.log(`[Medication Adder] Successfully updated ${period} time preferences for patient`);
      }

    } catch (error) {
      console.error('[Medication Adder] Error in updatePatientTimePreferences:', error);
      // Don't throw - we don't want time preference updates to block medication import
    }
  }

  /**
   * Create medication schedules for the patient based on their time preferences
   * Supports multiple time slots - uses the most recent time from the array
   */
  async createMedicationSchedules(patientId: string, medicationId: string): Promise<void> {
    try {
      // Get patient's time preferences (both arrays and single fields)
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select(`
          morning_time, afternoon_time, evening_time, bedtime,
          morning_times, afternoon_times, evening_times, bedtime_times
        `)
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        console.error('[Medication Adder] Error fetching patient time preferences:', patientError);
        return;
      }

      // Get medication details
      const { data: medication, error: medError } = await supabaseAdmin
        .from('medications')
        .select('time_of_day')
        .eq('id', medicationId)
        .single();

      if (medError || !medication) {
        console.error('[Medication Adder] Error fetching medication details:', medError);
        return;
      }

      // Create schedule based on medication's time_of_day
      const timeOfDay = medication.time_of_day;
      let scheduledTime = '';

      // Helper function to get the latest time from array or fallback to single field
      const getLatestTime = (
        timesArray: string[] | null, 
        singleTime: string | null, 
        defaultTime: string
      ): string => {
        if (timesArray && timesArray.length > 0) {
          // Return the last (most recent) time from the array
          return timesArray[timesArray.length - 1];
        }
        return singleTime || defaultTime;
      };

      switch (timeOfDay) {
        case 'morning':
          scheduledTime = getLatestTime(patient.morning_times, patient.morning_time, '08:00');
          break;
        case 'afternoon':
          scheduledTime = getLatestTime(patient.afternoon_times, patient.afternoon_time, '14:00');
          break;
        case 'evening':
          scheduledTime = getLatestTime(patient.evening_times, patient.evening_time, '18:00');
          break;
        case 'bedtime':
          scheduledTime = getLatestTime(patient.bedtime_times, patient.bedtime, '22:00');
          break;
        default:
          scheduledTime = '08:00';
      }

      // Create medication schedule
      const { error: scheduleError } = await supabaseAdmin
        .from('medication_schedules')
        .insert({
          medication_id: medicationId,
          patient_id: patientId,
          scheduled_time: scheduledTime,
          time_of_day: timeOfDay,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (scheduleError) {
        console.error('[Medication Adder] Error creating medication schedule:', scheduleError);
      } else {
        console.log(`[Medication Adder] Created schedule for medication ${medicationId} at ${scheduledTime}`);
      }

    } catch (error) {
      console.error('[Medication Adder] Error creating medication schedules:', error);
    }
  }
}
