import { createClient } from '@supabase/supabase-js';
import { ParsedMedicationData } from './rpj-parser';

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

export interface PatientMatch {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    phone1?: string;
    organization_id: string;
  };
  matchScore: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

export class PatientMatcher {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Find a patient in The Chautauqua Center organization based on parsed medication data
   */
  async findPatient(medicationData: ParsedMedicationData): Promise<PatientMatch | null> {
    try {
      console.log(`[Patient Matcher] Searching for patient: ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}`);

      // First, try exact match
      const exactMatch = await this.findExactMatch(medicationData);
      if (exactMatch) {
        console.log(`[Patient Matcher] Found exact match for ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}`);
        return exactMatch;
      }

      // If no exact match, try fuzzy matching
      const fuzzyMatch = await this.findFuzzyMatch(medicationData);
      if (fuzzyMatch) {
        console.log(`[Patient Matcher] Found fuzzy match for ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}`);
        return fuzzyMatch;
      }

      console.log(`[Patient Matcher] No match found for ${medicationData.patientInfo.firstName} ${medicationData.patientInfo.lastName}`);
      return null;

    } catch (error) {
      console.error('[Patient Matcher] Error finding patient:', error);
      throw error;
    }
  }

  private async findExactMatch(medicationData: ParsedMedicationData): Promise<PatientMatch | null> {
    const { firstName, lastName, dateOfBirth, phone } = medicationData.patientInfo;

    // Build query for exact match
    let query = supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, phone1, organization_id')
      .eq('organization_id', this.organizationId)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName);

    // Add additional filters if available
    if (dateOfBirth) {
      const formattedDOB = this.formatDateOfBirth(dateOfBirth);
      if (formattedDOB) {
        query = query.eq('date_of_birth', formattedDOB);
      }
    }

    if (phone) {
      const formattedPhone = this.formatPhone(phone);
      if (formattedPhone) {
        query = query.eq('phone1', formattedPhone);
      }
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('[Patient Matcher] Error in exact match query:', error);
      return null;
    }

    if (data && data.length > 0) {
      return {
        patient: data[0],
        matchScore: 100,
        matchType: 'exact'
      };
    }

    return null;
  }

  private async findFuzzyMatch(medicationData: ParsedMedicationData): Promise<PatientMatch | null> {
    const { firstName, lastName } = medicationData.patientInfo;

    // Get all patients in the organization for fuzzy matching
    const { data: allPatients, error } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, phone1, organization_id')
      .eq('organization_id', this.organizationId);

    if (error) {
      console.error('[Patient Matcher] Error fetching patients for fuzzy match:', error);
      return null;
    }

    if (!allPatients || allPatients.length === 0) {
      return null;
    }

    // Calculate similarity scores
    const matches = allPatients.map(patient => {
      const firstNameScore = this.calculateStringSimilarity(
        firstName.toLowerCase(),
        patient.first_name.toLowerCase()
      );
      const lastNameScore = this.calculateStringSimilarity(
        lastName.toLowerCase(),
        patient.last_name.toLowerCase()
      );

      // Weighted score (last name is more important)
      const totalScore = (firstNameScore * 0.4) + (lastNameScore * 0.6);

      return {
        patient,
        matchScore: totalScore,
        matchType: totalScore >= 0.8 ? 'fuzzy' : 'partial' as 'fuzzy' | 'partial'
      };
    });

    // Sort by score and return the best match if it's above threshold
    matches.sort((a, b) => b.matchScore - a.matchScore);
    const bestMatch = matches[0];

    // Only return if similarity is above 80%
    if (bestMatch && bestMatch.matchScore >= 0.8) {
      return bestMatch;
    }

    return null;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private formatDateOfBirth(dob: string): string | null {
    try {
      // Handle various date formats
      const date = new Date(dob);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      return null;
    }
  }

  private formatPhone(phone: string): string | null {
    try {
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');
      
      // Handle different phone number formats
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length === 11 && digits[0] === '1') {
        return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get The Chautauqua Center organization ID
   */
  static async getChautauquaOrganizationId(): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .ilike('name', '%chautauqua%')
        .limit(1);

      if (error) {
        console.error('[Patient Matcher] Error fetching Chautauqua organization:', error);
        return null;
      }

      return data && data.length > 0 ? data[0].id : null;
    } catch (error) {
      console.error('[Patient Matcher] Error getting Chautauqua organization ID:', error);
      return null;
    }
  }
}
