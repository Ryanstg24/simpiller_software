import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for server-side operations
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

// DRx API Configuration
// Base URL: https://staging.drxapp.com/external_api/v1
// API Key should be set in environment variable DRX_API_KEY
// Uses X-DRX-Key header for authentication
const DRX_API_ENDPOINT = process.env.DRX_API_ENDPOINT || 'https://staging.drxapp.com/external_api/v1';
const DRX_API_KEY = process.env.DRX_API_KEY || '';
const DRX_GROUP_NAME = process.env.DRX_GROUP_NAME || 'Simpiller';
const DRX_DOCTOR_ID = process.env.DRX_DOCTOR_ID || 'DRX0000545'; // Format: DRX + 7 digits with leading zeros

// Types for DRx API
export interface DRxPatient {
  id?: string;
  patientId?: string; // DRX API uses patientId in responses
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  groupId?: string;
  [key: string]: unknown; // Allow additional fields from DRx
}

export interface DRxMedication {
  id?: string;
  patientId: string;
  name: string;
  ndc?: string;
  strength?: string;
  format?: string;
  quantity?: number;
  frequency?: number;
  rxNumber?: string;
  rxFilledDate?: string;
  rxRefills?: number;
  status?: string;
  [key: string]: unknown; // Allow additional fields from DRx
}

export interface SimpillerPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  race?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  assigned_pharmacy_id?: string;
}

export interface SimpillerMedication {
  id?: string;
  patient_id: string;
  name: string;
  strength: string;
  format: string;
  dose_count: number;
  quantity: number;
  frequency: number;
  rx_number?: string;
  rx_filled_date?: string;
  rx_refills: number;
  status: string;
  ndc_id?: string;
}

export interface DRxAppointment {
  uid?: string;
  appointmentUniqueId?: string;
  patientId?: string;
  doctorId?: string;
  message?: string;
  [key: string]: unknown; // Allow additional fields from DRx
}

export interface DRxDoctor {
  doctorId: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  imageUrl?: string;
  designation?: string;
  specialization?: string;
  [key: string]: unknown; // Allow additional fields from DRx
}

export interface DRxSyncResult {
  success: boolean;
  drxPatientId?: string;
  drxGroupId?: string;
  drxAppointmentId?: string | null;
  error?: string;
}

export interface MedicationSyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * DRx Integration Service
 * Handles synchronization between Simpiller and DRx pharmacy software
 */
export class DRxIntegrationService {
  private apiEndpoint: string;
  private apiKey: string;
  private groupName: string;

  constructor() {
    this.apiEndpoint = DRX_API_ENDPOINT;
    this.apiKey = DRX_API_KEY;
    this.groupName = DRX_GROUP_NAME;

    if (!this.apiEndpoint || !this.apiKey) {
      console.warn('[DRx Integration] API endpoint or key not configured');
    }
  }

  /**
   * Make authenticated request to DRx API
   * Uses 'X-DRX-Key' header for authentication
   */
  private async makeDRxRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<Response> {
    const url = `${this.apiEndpoint}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'X-DRX-Key': this.apiKey, // DRX API uses 'X-DRX-Key' header
      'Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://app.simpiller.com',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      // Handle authentication errors
      if (response.status === 401) {
        const errorText = await response.text();
        throw new Error(`DRx API authentication failed (401): ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('[DRx Integration] Request failed:', error);
      throw new Error(`DRx API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          const waitTime = delay * Math.pow(2, attempt);
          console.log(`[DRx Integration] Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Map Simpiller patient to DRx patient format
   */
  mapSimpillerPatientToDRx(patient: SimpillerPatient): DRxPatient {
    return {
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      phone: patient.phone1,
      email: patient.email,
      address: {
        street1: patient.street1,
        street2: patient.street2,
        city: patient.city,
        state: patient.state,
        postalCode: patient.postal_code,
        country: patient.country || 'US',
      },
      groupId: this.groupName,
    };
  }

  /**
   * Map DRx patient to Simpiller patient format
   */
  mapDRxPatientToSimpiller(drxPatient: DRxPatient): Partial<SimpillerPatient> {
    return {
      first_name: drxPatient.firstName,
      last_name: drxPatient.lastName,
      date_of_birth: drxPatient.dateOfBirth,
      phone1: drxPatient.phone,
      email: drxPatient.email,
      street1: drxPatient.address?.street1,
      street2: drxPatient.address?.street2,
      city: drxPatient.address?.city,
      state: drxPatient.address?.state,
      postal_code: drxPatient.address?.postalCode,
      country: drxPatient.address?.country || 'US',
    };
  }

  /**
   * Map DRx medication to Simpiller medication format
   */
  mapDRxMedicationToSimpiller(drxMedication: DRxMedication, patientId: string): Partial<SimpillerMedication> {
    // Parse strength and format from medication name if needed
    const strength = drxMedication.strength || '';
    const format = drxMedication.format || '';
    
    // Default values if not provided
    const doseCount = 1; // Default, should be parsed from instructions if available
    const quantity = drxMedication.quantity || 30; // Default quantity
    const frequency = drxMedication.frequency || 1; // Default once per day
    
    return {
      patient_id: patientId,
      name: drxMedication.name,
      strength: strength,
      format: format,
      dose_count: doseCount,
      quantity: quantity,
      frequency: frequency,
      rx_number: drxMedication.rxNumber,
      rx_filled_date: drxMedication.rxFilledDate,
      rx_refills: drxMedication.rxRefills || 0,
      status: drxMedication.status === 'active' || drxMedication.status === 'filled' ? 'active' : 'discontinued',
      ndc_id: drxMedication.ndc,
    };
  }

  /**
   * Get first available doctor from DRx
   * Used for appointment booking when syncing patients
   */
  async getDRxDoctors(): Promise<string> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.makeDRxRequest('/doctor/GetAll', 'GET');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DRx API error fetching doctors: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const doctorsData = await response.json();
      const doctors: DRxDoctor[] = doctorsData.results || doctorsData || [];
      
      if (!doctors || doctors.length === 0) {
        throw new Error('No doctors available in DRx system');
      }

      // Return first doctor's ID
      const firstDoctor = doctors[0];
      if (!firstDoctor.doctorId) {
        throw new Error('Doctor data missing doctorId field');
      }

      return firstDoctor.doctorId;
    } catch (error) {
      console.error('[DRx Integration] Error fetching doctors:', error);
      throw error;
    }
  }

  /**
   * Get DRx patient ID by querying patient list
   * Used to find patient ID after appointment creation
   */
  async getDRxPatientId(patientName: string, phoneNumber?: string): Promise<string | null> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.makeDRxRequest('/patient/getall', 'GET');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DRx API error fetching patients: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const patientsData = await response.json();
      const patients: DRxPatient[] = patientsData.results || patientsData || [];
      
      // Search for patient by name and optionally phone
      const [firstName, lastName] = patientName.split(' ').filter(Boolean);
      
      for (const patient of patients) {
        const nameMatch = patient.firstName === firstName && patient.lastName === lastName;
        const phoneMatch = !phoneNumber || patient.phone === phoneNumber;
        
        // DRX API returns patientId in responses
        const patientId = patient.patientId || patient.id;
        if (nameMatch && phoneMatch && patientId) {
          return patientId;
        }
      }

      return null;
    } catch (error) {
      console.error('[DRx Integration] Error fetching patient ID:', error);
      return null;
    }
  }

  /**
   * Sync patient to DRx API by creating a patient directly
   * Uses POST /external_api/v1/patients endpoint
   */
  async syncPatientToDRx(patientId: string, pharmacyId?: string): Promise<DRxSyncResult> {
    try {
      // Fetch patient from database
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        throw new Error(`Patient not found: ${patientError?.message || 'Unknown error'}`);
      }

      // Check if pharmacy is the partnered pharmacy
      if (pharmacyId) {
        const { data: pharmacy } = await supabaseAdmin
          .from('pharmacies')
          .select('*')
          .eq('id', pharmacyId)
          .single();

        if (!pharmacy?.is_partner) {
          throw new Error('Patient must be assigned to partnered pharmacy');
        }
      }

      // Format dateOfBirth to YYYY-MM-DD format (ISO format) as required by DRX API
      let formattedDateOfBirth: string | undefined = undefined;
      if (patient.date_of_birth) {
        try {
          const date = new Date(patient.date_of_birth);
          if (!isNaN(date.getTime())) {
            // Extract YYYY-MM-DD from date
            formattedDateOfBirth = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.warn('[DRx Integration] Error formatting dateOfBirth:', error);
        }
      }

      // Validate required fields
      if (!patient.first_name || !patient.last_name) {
        throw new Error('Patient first_name and last_name are required');
      }

      if (!formattedDateOfBirth) {
        throw new Error('Patient date_of_birth is required');
      }

      // Map gender: must be 'M' or 'F' for DRX API
      let formattedGender: string | undefined = undefined;
      if (patient.gender) {
        const genderUpper = patient.gender.toUpperCase();
        if (genderUpper === 'M' || genderUpper === 'F') {
          formattedGender = genderUpper;
        } else {
          // Default to 'M' if gender is not M or F
          console.warn(`[DRx Integration] Gender '${patient.gender}' is not M or F, defaulting to M`);
          formattedGender = 'M';
        }
      } else {
        // Default to 'M' if gender is not provided
        formattedGender = 'M';
      }

      // Build phone_numbers array
      const phoneNumbers: Array<{ phone_type: string; number: string }> = [];
      if (patient.phone1) {
        // Remove any non-digit characters from phone number
        const cleanedPhone1 = patient.phone1.replace(/\D/g, '');
        if (cleanedPhone1) {
          phoneNumbers.push({
            phone_type: 'cell',
            number: cleanedPhone1
          });
        }
      }
      if (patient.phone2) {
        const cleanedPhone2 = patient.phone2.replace(/\D/g, '');
        if (cleanedPhone2) {
          phoneNumbers.push({
            phone_type: 'home',
            number: cleanedPhone2
          });
        }
      }

      // Build addresses array
      const addresses: Array<{ street: string; city: string; state: string; zip: string; type_: string }> = [];
      if (patient.street1 && patient.city && patient.state && patient.postal_code) {
        addresses.push({
          street: patient.street1,
          city: patient.city,
          state: patient.state,
          zip: patient.postal_code,
          type_: 'default'
        });
      }

      // Build request body according to new DRX API format
      const requestBody = {
        patient: {
          first_name: patient.first_name,
          last_name: patient.last_name,
          dob: formattedDateOfBirth,
          gender: formattedGender,
          delivery_method: 'Ship', // As specified by user
          notify_method: '0', // Default notify method
          race: patient.race || 'Human' // Default to 'Human' if not provided
        },
        phone_numbers: phoneNumbers,
        addresses: addresses,
        allergies: [] // Empty array for now, can be populated later if needed
      };

      console.log('[DRx Integration] Creating patient with:', JSON.stringify(requestBody, null, 2));

      const patientResponse = await this.retryRequest(async () => {
        return await this.makeDRxRequest('/patients', 'POST', requestBody);
      });

      if (!patientResponse.ok) {
        const errorText = await patientResponse.text();
        let errorData = {};
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
        }
        console.error('[DRx Integration] Patient creation failed:', {
          status: patientResponse.status,
          statusText: patientResponse.statusText,
          url: `${this.apiEndpoint}/patients`,
          error: errorData,
          errorText: errorText
        });
        throw new Error(`DRx API error creating patient: ${patientResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const patientData = await patientResponse.json();
      
      // Extract patient ID from response
      // The response format may vary, so we try multiple possible fields
      let drxPatientId: string | undefined = undefined;
      if (patientData.id) {
        drxPatientId = String(patientData.id);
      } else if (patientData.patient_id) {
        drxPatientId = String(patientData.patient_id);
      } else if (patientData.patientId) {
        drxPatientId = String(patientData.patientId);
      } else if (patientData.data?.id) {
        drxPatientId = String(patientData.data.id);
      }

      if (!drxPatientId) {
        console.warn('[DRx Integration] Could not extract patient ID from response:', patientData);
        // Try to find patient by querying
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const foundPatientId = await this.getDRxPatientId(patientName, patient.phone1 || undefined);
        if (foundPatientId) {
          drxPatientId = foundPatientId;
        }
      }
      
      const drxGroupId = this.groupName;

      // Store sync status in database
      const { error: syncError } = await supabaseAdmin
        .from('drx_patient_sync')
        .upsert({
          patient_id: patientId,
          drx_patient_id: drxPatientId,
          drx_group_id: drxGroupId,
          drx_appointment_id: null, // No longer using appointments
          last_sync_status: 'success',
          synced_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'patient_id'
        });

      if (syncError) {
        console.error('[DRx Integration] Error storing sync status:', syncError);
        // Don't throw - sync was successful, just status storage failed
      }

      return {
        success: true,
        drxPatientId,
        drxGroupId,
        drxAppointmentId: undefined, // No longer using appointments
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Store error status
      try {
        await supabaseAdmin
          .from('drx_patient_sync')
          .upsert({
            patient_id: patientId,
            last_sync_status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'patient_id'
          });
      } catch (err) {
        console.error('[DRx Integration] Error storing error status:', err);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get medications from DRx for a patient
   */
  async getDRxMedications(patientId: string): Promise<DRxMedication[]> {
    try {
      // Get DRx patient ID from sync table
      const { data: syncData } = await supabaseAdmin
        .from('drx_patient_sync')
        .select('drx_patient_id')
        .eq('patient_id', patientId)
        .single();

      if (!syncData?.drx_patient_id) {
        throw new Error('Patient not synced to DRx');
      }

      // Fetch medications from DRx API
      // Note: The DRX Connect API documentation doesn't show medication endpoints.
      // This endpoint may need to be confirmed with DRx support or may be available
      // through a different API path (e.g., /prescription/getall or similar).
      // Documentation: https://admin.digitalrx.io/drx-connect/documentation.htm
      const response = await this.retryRequest(async () => {
        // Try prescription/medication endpoint - adjust based on actual DRx API
        return await this.makeDRxRequest(`/prescription/getall?patientId=${syncData.drx_patient_id}`, 'GET');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DRx API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const medications = await response.json();
      return Array.isArray(medications) ? medications : [medications];
    } catch (error) {
      console.error('[DRx Integration] Error fetching medications:', error);
      throw error;
    }
  }

  /**
   * Sync medications from DRx to Simpiller
   * Fetches medications from DRx and creates/updates them in Simpiller
   */
  async syncMedicationsFromDRx(patientId: string): Promise<MedicationSyncResult> {
    const result: MedicationSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      // Get medications from DRx
      const drxMedications = await this.getDRxMedications(patientId);

      // Get existing medications for this patient
      const { data: existingMedications } = await supabaseAdmin
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active');

      const existingMap = new Map<string, SimpillerMedication>();
      existingMedications?.forEach(med => {
        if (med.ndc_id) {
          existingMap.set(med.ndc_id, med as SimpillerMedication);
        }
        // Also index by name+strength as fallback
        const key = `${med.name}_${med.strength}`;
        if (!existingMap.has(key)) {
          existingMap.set(key, med as SimpillerMedication);
        }
      });

      // Process each medication
      for (const drxMed of drxMedications) {
        try {
          const simpillerMed = this.mapDRxMedicationToSimpiller(drxMed, patientId);
          
          // Try to find existing medication by NDC or name+strength
          let existingMed: SimpillerMedication | undefined;
          if (drxMed.ndc) {
            existingMed = existingMap.get(drxMed.ndc);
          }
          if (!existingMed && drxMed.name && simpillerMed.strength) {
            existingMed = existingMap.get(`${drxMed.name}_${simpillerMed.strength}`);
          }

          if (existingMed?.id) {
            // Update existing medication
            const { error: updateError } = await supabaseAdmin
              .from('medications')
              .update({
                ...simpillerMed,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingMed.id);

            if (updateError) {
              result.errors.push(`Failed to update medication ${drxMed.name}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          } else {
            // Create new medication
            const { error: createError } = await supabaseAdmin
              .from('medications')
              .insert({
                ...simpillerMed,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (createError) {
              result.errors.push(`Failed to create medication ${drxMed.name}: ${createError.message}`);
            } else {
              result.created++;
            }
          }
        } catch (medError) {
          const errorMsg = medError instanceof Error ? medError.message : 'Unknown error';
          result.errors.push(`Error processing medication ${drxMed.name}: ${errorMsg}`);
        }
      }

      // Update last medication sync time
      try {
        await supabaseAdmin
          .from('drx_patient_sync')
          .update({
            last_medication_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('patient_id', patientId);
      } catch (err) {
        console.error('[DRx Integration] Error updating sync time:', err);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Get sync status for a patient
   */
  async getSyncStatus(patientId: string) {
    const { data, error } = await supabaseAdmin
      .from('drx_patient_sync')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  }
}

// Export singleton instance
export const drxIntegration = new DRxIntegrationService();

