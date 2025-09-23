import { MedicationFile } from './sftp-service';

export interface ParsedMedicationData {
  patientInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
  };
  medicationInfo: {
    name: string;
    strength?: string;
    dosage?: string;
    instructions?: string;
    quantity?: string;
    refills?: string;
    prescriber?: string;
    ndc?: string;
    adminTime?: string; // Administration time from column J
  };
  prescriptionInfo: {
    prescriptionNumber?: string;
    dateFilled?: string;
    pharmacy?: string;
  };
  rawData: string;
}

export class RPJParser {
  /**
   * Parse an RPJ file content to extract medication and patient information
   * RPJ files from The Chautauqua Center are tilde-delimited with 30 columns (A-AD)
   */
  static parseRPJFile(file: MedicationFile): ParsedMedicationData[] {
    try {
      console.log(`[RPJ Parser] Parsing file: ${file.filename}`);
      
      const lines = file.content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('Empty RPJ file');
      }

      // Parse each line as a separate medication record
      const parsedData: ParsedMedicationData[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim()) {
          const medicationData = this.parseTildeDelimitedLine(line, i);
          if (medicationData) {
            parsedData.push(medicationData);
          }
        }
      }

      console.log(`[RPJ Parser] Successfully parsed ${file.filename} - found ${parsedData.length} medication records`);
      return parsedData;

    } catch (error) {
      console.error(`[RPJ Parser] Error parsing ${file.filename}:`, error);
      throw new Error(`Failed to parse RPJ file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse a single tilde-delimited line according to The Chautauqua Center format
   * Column mapping based on their documentation:
   * 00 A PATIENT NAME (Last, First)
   * 01 B PATIENT_ID
   * 02 C PATIENT_FACILITY
   * 03 D UNIT
   * 04 E LOCATION
   * 05 F ROOM
   * 06 G BED
   * 07 H NDC
   * 08 I ADMINISTRATION DATE
   * 09 J ADMINISTRATION TIME
   * 10 K QUANTITY
   * 11 L DOCTOR NAME
   * 12 M RX NUMBER
   * 13 N WARNING LABELS
   * 14 O INSTRUCTIONS
   * 15 P DRUG NAME
   * 16 Q DRUG GENERIC NAME
   * 17 R BAG TYPE
   * 18 S TECH
   * 19 T RPH
   * 20 U BRAND NAME
   * 21 V DRUG DESCRIPTION
   * 22 W DRUG DOSAGE FORM
   * 23 X CUSTOM 1
   * 24 Y CUSTOM 2
   * 25 Z CUSTOM 3
   * 26 AA INVOICE NUMBER
   * 27 AB FILL NUMBER
   * 28 AC PATIENT FACILITY NUMBER
   * 29 AD PRN
   */
  private static parseTildeDelimitedLine(line: string, lineNumber: number): ParsedMedicationData | null {
    try {
      const columns = line.split('~');
      
      if (columns.length < 30) {
        console.warn(`[RPJ Parser] Line ${lineNumber} has only ${columns.length} columns, expected 30`);
        return null;
      }

      // Extract patient name (column A - Last, First format)
      const rawPatientName = this.cleanString(columns[0]);
      const patientNameParts = rawPatientName.split(',');
      const lastName = this.cleanString(patientNameParts[0] || '');
      const firstName = this.cleanString(patientNameParts[1] || '');

      if (!firstName || !lastName) {
        console.warn(`[RPJ Parser] Line ${lineNumber} has invalid patient name: ${rawPatientName}`);
        return null;
      }

      // Extract medication information
      const drugName = this.cleanString(columns[15]); // P DRUG NAME
      const drugGeneric = this.cleanString(columns[16]); // Q DRUG GENERIC NAME
      const drugBrand = this.cleanString(columns[20]); // U BRAND NAME
      const drugDescription = this.cleanString(columns[21]); // V DRUG DESCRIPTION
      const drugDosageForm = this.cleanString(columns[22]); // W DRUG DOSAGE FORM
      
      // Use brand name if available, otherwise use generic name, otherwise use drug name
      const medicationName = drugBrand || drugGeneric || drugName;
      
      if (!medicationName) {
        console.warn(`[RPJ Parser] Line ${lineNumber} has no medication name`);
        return null;
      }

      // Extract other relevant information
      const ndc = this.cleanString(columns[7]); // H NDC
      const quantity = this.cleanString(columns[10]); // K QUANTITY
      const instructions = this.cleanString(columns[14]); // O INSTRUCTIONS
      const doctorName = this.cleanString(columns[11]); // L DOCTOR NAME
      const rxNumber = this.cleanString(columns[12]); // M RX NUMBER
      const adminDate = this.cleanString(columns[8]); // I ADMINISTRATION DATE
      const adminTime = this.cleanString(columns[9]); // J ADMINISTRATION TIME
      const fillNumber = this.cleanString(columns[27]); // AB FILL NUMBER
      const prn = this.cleanString(columns[29]); // AD PRN

      return {
        patientInfo: {
          firstName,
          lastName,
          dateOfBirth: '', // Not available in this format
          phone: '', // Not available in this format
          address: '' // Not available in this format
        },
        medicationInfo: {
          name: medicationName,
          strength: drugDescription,
          dosage: drugDosageForm,
          instructions: instructions,
          quantity: quantity,
          refills: fillNumber,
          prescriber: doctorName,
          ndc: ndc,
          adminTime: adminTime
        },
        prescriptionInfo: {
          prescriptionNumber: rxNumber,
          dateFilled: adminDate,
          pharmacy: 'The Chautauqua Center'
        },
        rawData: line
      };

    } catch (error) {
      console.error(`[RPJ Parser] Error parsing line ${lineNumber}:`, error);
      return null;
    }
  }

  private static cleanString(str: string): string {
    return str ? str.trim().replace(/\s+/g, ' ') : '';
  }

  /**
   * Validate that the parsed data contains the minimum required information
   */
  static validateParsedData(data: ParsedMedicationData): boolean {
    const hasPatientName = data.patientInfo.firstName && data.patientInfo.lastName;
    const hasMedication = data.medicationInfo.name;
    
    if (!hasPatientName) {
      console.warn('[RPJ Parser] Missing patient name information');
      return false;
    }
    
    if (!hasMedication) {
      console.warn('[RPJ Parser] Missing medication information');
      return false;
    }
    
    return true;
  }

  /**
   * Convert administration time from their format (e.g., "0900", "2000") to our time format
   */
  static convertAdministrationTime(adminTime: string): string {
    if (!adminTime || adminTime.length < 4) {
      return '08:00'; // Default to 8 AM
    }

    try {
      // Convert "0900" to "09:00" format
      const hours = adminTime.substring(0, 2);
      const minutes = adminTime.substring(2, 4);
      
      // Validate hours and minutes
      const hourNum = parseInt(hours, 10);
      const minuteNum = parseInt(minutes, 10);
      
      if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
        return `${hours}:${minutes}`;
      }
    } catch (error) {
      console.warn(`[RPJ Parser] Invalid administration time format: ${adminTime}`);
    }
    
    return '08:00'; // Default fallback
  }
}
