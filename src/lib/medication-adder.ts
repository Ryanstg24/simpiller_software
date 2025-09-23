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
        medicationData.medicationInfo.name
      );

      if (existingMedication) {
        console.log(`[Medication Adder] Medication already exists for patient, updating instead`);
        return await this.updateExistingMedication(existingMedication.id, medicationData);
      }

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

  private async checkExistingMedication(patientId: string, medicationName: string): Promise<ExistingMedication | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('medications')
        .select('id, name, status')
        .eq('patient_id', patientId)
        .ilike('name', `%${medicationName}%`)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('[Medication Adder] Error checking existing medication:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
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
      
      const updateData = {
        strength: medicationInfo.strength || '',
        dosage: medicationInfo.dosage || '',
        instructions: medicationInfo.instructions || '',
        quantity: medicationInfo.quantity || '',
        refills: medicationInfo.refills || '0',
        prescriber: medicationInfo.prescriber || '',
        ndc: medicationInfo.ndc || '',
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

      return {
        success: true,
        medicationId: medicationId,
        message: `Updated existing medication: ${medicationInfo.name}`
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
   * Create medication schedules for the patient based on their time preferences
   */
  async createMedicationSchedules(patientId: string, medicationId: string): Promise<void> {
    try {
      // Get patient's time preferences
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('morning_time, afternoon_time, evening_time, bedtime_time')
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

      switch (timeOfDay) {
        case 'morning':
          scheduledTime = patient.morning_time || '08:00';
          break;
        case 'afternoon':
          scheduledTime = patient.afternoon_time || '14:00';
          break;
        case 'evening':
          scheduledTime = patient.evening_time || '18:00';
          break;
        case 'bedtime':
          scheduledTime = patient.bedtime_time || '22:00';
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
