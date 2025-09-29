import { RPJParser } from './rpj-parser';
import { PatientMatcher } from './patient-matcher';
import { MedicationAdder } from './medication-adder';

// Conditional imports to avoid build issues
let SFTPService: typeof import('./sftp-service').SFTPService;
let CHAUTAUQUA_SFTP_CONFIG: typeof import('./sftp-service').CHAUTAUQUA_SFTP_CONFIG;

export interface ProcessingResult {
  success: boolean;
  processedFiles: number;
  successfulMedications: number;
  failedMedications: number;
  errors: string[];
  summary: string;
}

export class SFTPProcessor {
  private sftpService: InstanceType<typeof import('./sftp-service').SFTPService> | null;
  private patientMatcher: PatientMatcher;
  private medicationAdder: MedicationAdder;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.sftpService = null;
    this.patientMatcher = new PatientMatcher(organizationId);
    this.medicationAdder = new MedicationAdder();
  }

  private async initializeSFTP(): Promise<void> {
    if (!SFTPService) {
      try {
        const sftpModule = await import('./sftp-service');
        SFTPService = sftpModule.SFTPService;
        CHAUTAUQUA_SFTP_CONFIG = sftpModule.CHAUTAUQUA_SFTP_CONFIG;
      } catch (error) {
        console.error('[SFTP Processor] Failed to import SFTP service:', error);
        throw new Error('SFTP service not available');
      }
    }
    if (!this.sftpService) {
      this.sftpService = new SFTPService(CHAUTAUQUA_SFTP_CONFIG);
    }
  }

  /**
   * Main processing method - checks for new files and processes them
   */
  async processNewFiles(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      processedFiles: 0,
      successfulMedications: 0,
      failedMedications: 0,
      errors: [],
      summary: ''
    };

    try {
      console.log('[SFTP Processor] Starting SFTP processing for The Chautauqua Center');

      // Initialize SFTP service
      await this.initializeSFTP();

      // Ensure SFTP service is available
      if (!this.sftpService) {
        throw new Error('SFTP service failed to initialize');
      }

      // Connect to SFTP
      await this.sftpService.connect();

      // Get list of .rpj files
      const files = await this.sftpService.listFiles();
      
      if (files.length === 0) {
        console.log('[SFTP Processor] No new .rpj files found');
        result.success = true;
        result.summary = 'No new files to process';
        return result;
      }

      console.log(`[SFTP Processor] Found ${files.length} .rpj files to process`);

      // Process each file
      for (const filename of files) {
        try {
          console.log(`[SFTP Processor] Processing file: ${filename}`);
          
          // Read the file
          const file = await this.sftpService.readFile(filename);
          
          // Parse the RPJ file
          const medicationDataList = RPJParser.parseRPJFile(file);
          
          if (medicationDataList.length === 0) {
            console.warn(`[SFTP Processor] No valid medication data found in ${filename}`);
            await this.sftpService.moveFileToCompleted(filename);
            result.processedFiles++;
            continue;
          }

          console.log(`[SFTP Processor] Found ${medicationDataList.length} medication records in ${filename}`);

          // Process each medication record
          let fileSuccessCount = 0;
          let fileFailureCount = 0;

          for (const medicationData of medicationDataList) {
            try {
              // Validate the data
              if (!RPJParser.validateParsedData(medicationData)) {
                console.warn(`[SFTP Processor] Invalid medication data in ${filename}`);
                fileFailureCount++;
                continue;
              }

              // Find the patient
              const patientMatch = await this.patientMatcher.findPatient(medicationData);
              
              if (!patientMatch) {
                console.log(`[SFTP Processor] Patient not found in Simpiller: ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}`);
                fileFailureCount++;
                continue;
              }

              // Add medication to patient
              const addResult = await this.medicationAdder.addMedicationToPatient(patientMatch, medicationData);
              
              if (addResult.success) {
                console.log(`[SFTP Processor] Successfully added medication: ${medicationData.medicationInfo.name} for patient ${patientMatch.patient.first_name} ${patientMatch.patient.last_name}`);
                fileSuccessCount++;
                
                // Create medication schedules
                if (addResult.medicationId) {
                  await this.medicationAdder.createMedicationSchedules(patientMatch.patient.id, addResult.medicationId);
                }
              } else {
                console.error(`[SFTP Processor] Failed to add medication: ${addResult.error}`);
                fileFailureCount++;
                result.errors.push(`Failed to add ${medicationData.medicationInfo.name} for ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}: ${addResult.error}`);
              }

            } catch (error) {
              console.error(`[SFTP Processor] Error processing medication record:`, error);
              fileFailureCount++;
              result.errors.push(`Error processing medication record: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          // Move file to completed folder regardless of individual record success/failure
          await this.sftpService.moveFileToCompleted(filename);
          result.processedFiles++;
          result.successfulMedications += fileSuccessCount;
          result.failedMedications += fileFailureCount;

          console.log(`[SFTP Processor] Completed processing ${filename}: ${fileSuccessCount} successful, ${fileFailureCount} failed`);

        } catch (error) {
          console.error(`[SFTP Processor] Error processing file ${filename}:`, error);
          result.errors.push(`Error processing file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
          
          // Still try to move the file to completed to avoid reprocessing
          try {
            await this.sftpService.moveFileToCompleted(filename);
            result.processedFiles++;
          } catch (moveError) {
            console.error(`[SFTP Processor] Failed to move file ${filename} to completed:`, moveError);
            result.errors.push(`Failed to move file ${filename} to completed: ${moveError instanceof Error ? moveError.message : String(moveError)}`);
          }
        }
      }

      result.success = true;
      result.summary = `Processed ${result.processedFiles} files: ${result.successfulMedications} medications added successfully, ${result.failedMedications} failed`;

    } catch (error) {
      console.error('[SFTP Processor] Fatal error during processing:', error);
      result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      result.summary = 'Processing failed due to fatal error';
    } finally {
      // Always disconnect
      try {
        if (this.sftpService) {
          await this.sftpService.disconnect();
        }
      } catch (error) {
        console.error('[SFTP Processor] Error disconnecting from SFTP:', error);
      }
    }

    return result;
  }

  /**
   * Test the SFTP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initializeSFTP();
      
      // Ensure SFTP service is available
      if (!this.sftpService) {
        throw new Error('SFTP service failed to initialize');
      }
      
      await this.sftpService.connect();
      const isConnected = await this.sftpService.isConnected();
      await this.sftpService.disconnect();
      return isConnected;
    } catch (error) {
      console.error('[SFTP Processor] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get The Chautauqua Center organization ID
   */
  static async getChautauquaOrganizationId(): Promise<string | null> {
    return await PatientMatcher.getChautauquaOrganizationId();
  }
}
