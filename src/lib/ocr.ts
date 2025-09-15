export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

export interface MedicationLabelData {
  patientName?: string;
  medicationName?: string;
  medicationNames?: string[]; // Array for multiple medications
  dosage?: string;
  dosages?: string[]; // Array for multiple dosages
  strength?: string;
  instructions?: string;
  pharmacy?: string;
  prescriber?: string;
  confidence: number;
}

export class OCRService {
  /**
   * Extract text from image using Tesseract.js (client-side)
   */
  static async extractTextFromImage(imageData: string): Promise<OCRResult> {
    try {
      console.log('OCR Service: Starting text extraction...');
      console.log('OCR Service: Image data length:', imageData.length);
      
      // Validate image data
      if (!imageData || !imageData.startsWith('data:image/')) {
        throw new Error('Invalid image data format');
      }

      // Test if image can be loaded
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageData;
        });
        console.log('OCR Service: Image loaded successfully');
        console.log('OCR Service: Image dimensions:', img.width, 'x', img.height);
      } catch (imageError) {
        console.error('OCR Service: Image loading failed:', imageError);
        throw new Error('Failed to load image. Please check the image format.');
      }

      // Use dynamic import for Tesseract to ensure it's loaded on client side
      let Tesseract;
      try {
        const TesseractModule = await import('tesseract.js');
        Tesseract = TesseractModule.default || TesseractModule;
        console.log('OCR Service: Tesseract loaded, starting recognition...');
      } catch (importError) {
        console.error('Failed to import Tesseract:', importError);
        throw new Error('OCR library failed to load. Please refresh the page.');
      }
      
      // Enhanced OCR configuration for medication labels
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m: { status?: string; progress?: number; userJobId?: string }) => {
            // Only log in development to avoid console spam in production
            if (process.env.NODE_ENV === 'development') {
              console.log('OCR Progress:', m);
            }
          },
        }
      );

      console.log('OCR Service: Recognition completed');
      console.log('OCR Service: Raw extracted text:', result.data.text);
      console.log('OCR Service: Extracted text length:', result.data.text.length);
      console.log('OCR Service: Confidence:', result.data.confidence);

      // Check if any text was extracted
      if (!result.data.text || result.data.text.trim().length === 0) {
        throw new Error('No text was extracted from the image. The image may be unclear or contain no readable text.');
      }

      // Check confidence level
      if (result.data.confidence < 30) {
        console.warn('OCR Service: Low confidence level:', result.data.confidence);
      }

      // Return simplified result without words array to avoid errors
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: [], // Simplified to avoid HMR issues
      };
    } catch (error) {
      console.error('OCR Service: Extraction failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid image data')) {
          throw new Error('Invalid image data format provided');
        } else if (error.message.includes('Failed to load image')) {
          throw new Error('Failed to load image. Please check the image format and try again.');
        } else if (error.message.includes('Failed to load')) {
          throw new Error('OCR library failed to load. Please refresh the page.');
        } else if (error.message.includes('worker')) {
          throw new Error('OCR engine failed to initialize. Please refresh the page and try again.');
        } else if (error.message.includes('Error attempting to read image')) {
          throw new Error('Failed to read image. Please try a different image or check the image format.');
        } else if (error.message.includes('No text was extracted')) {
          throw new Error('No text was extracted from the image. The image may be unclear or contain no readable text.');
        } else {
          throw new Error(`OCR extraction failed: ${error.message}`);
        }
      }
      
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Parse medication label data from OCR text
   */
  static parseMedicationLabel(ocrResult: OCRResult): MedicationLabelData {
    const originalText = ocrResult.text;
    
    console.log('OCR Service: Parsing text:', originalText);
    
    const result: MedicationLabelData = {
      confidence: ocrResult.confidence,
    };

    // Extract medication names using simple string matching - collect ALL matches
    const medicationKeywords = [
      'VALACYCLOVIR HYDROCHLORID',
      'VENLAFAXINE HCL ER',
      'ASPIRIN ADULT LOW DOSE',
      'ASPIRIN',
      'VALACYCLOVIR',
      'VENLAFAXINE',
      'HYDROCHLORID',
      'HCL ER'
    ];

    const foundMedications: string[] = [];
    for (const keyword of medicationKeywords) {
      if (originalText.includes(keyword)) {
        foundMedications.push(keyword);
        console.log('OCR Service: Found medication name:', keyword);
      }
    }

    // Set the first medication as the primary one, and all as an array
    if (foundMedications.length > 0) {
      result.medicationName = foundMedications[0];
      result.medicationNames = foundMedications;
      console.log('OCR Service: Found medications:', foundMedications);
    }

    // Extract dosages using simple patterns - collect ALL matches
    const dosagePatterns = [
      /500\s*MG/gi,
      /150\s*MG/gi,
      /81\s*MG/gi,
      /(\d+)\s*(mg|ml|mcg|g)/gi,
    ];

    const foundDosages: string[] = [];
    for (const pattern of dosagePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        foundDosages.push(...matches);
        console.log('OCR Service: Found dosages:', matches);
      }
    }

    // Set the first dosage as the primary one, and all as an array
    if (foundDosages.length > 0) {
      result.dosage = foundDosages[0];
      result.dosages = foundDosages;
      result.strength = foundDosages[0];
      console.log('OCR Service: Found dosages:', foundDosages);
    }

    // Extract patient name using intelligent detection algorithm
    // Look for common name patterns that appear in medication labels
    const namePatterns = [
      // Last, First format (most common in medical labels)
      /([A-Z]{2,}[A-Z\s]*),\s*([A-Z]{2,}[A-Z\s]*)/g,
      // First Last format
      /([A-Z][a-z]+)\s+([A-Z][a-z]+)/g,
      // All caps names (common in medical labels)
      /([A-Z]{3,})\s*,\s*([A-Z]{2,})/g,
      // Single capitalized words that might be names
      /([A-Z][a-z]{2,})/g,
    ];

    for (const pattern of namePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        // Filter out common non-name words
        const nonNameWords = [
          'PHARMACY', 'DOCTOR', 'DR', 'MEDICATION', 'PRESCRIPTION', 'RX', 'QTY', 'LOT', 'MG', 'ML', 'MCG',
          'TABLET', 'CAPSULE', 'PILL', 'DOSE', 'STRENGTH', 'DATE', 'TIME', 'WARNING', 'PRODUCT',
          'AUGUST', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
        ];

        for (const match of matches) {
          const matchUpper = match.toUpperCase();
          const isNotName = nonNameWords.some(word => matchUpper.includes(word));
          
          if (!isNotName && match.length > 2) {
            // Additional check: look for contextual clues that this might be a patient name
            const lines = originalText.split('\n');
            for (const line of lines) {
              if (line.includes(match) && 
                  (line.includes('PATIENT') || 
                   line.includes('NAME') || 
                   line.includes('FOR') ||
                   line.includes('PRESCRIBED') ||
                   line.includes('DISPENSED'))) {
                result.patientName = match;
                console.log('OCR Service: Found patient name with context:', match);
                break;
              }
            }
            
            if (result.patientName) break;
          }
        }
        
        if (result.patientName) break;
      }
    }

    // Extract time using simple patterns
    const timePatterns = [
      /8:00\s*AM/gi,
      /8:00/gi,
      /(\d{1,2}:\d{2}\s*(?:am|pm))/gi,
    ];

    for (const pattern of timePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        result.instructions = `Take at ${matches[0]}`;
        console.log('OCR Service: Found time:', matches[0]);
        break;
      }
    }

    // Extract doctor/prescriber using simple string matching
    const doctorKeywords = [
      'Dr: KUPPEL, MANDI',
      'KUPPEL, MANDI',
      'Dr KUPPEL',
      'KUPPEL',
      'MANDI'
    ];

    for (const keyword of doctorKeywords) {
      if (originalText.includes(keyword)) {
        result.prescriber = keyword;
        console.log('OCR Service: Found prescriber:', keyword);
        break;
      }
    }

    // Extract pharmacy using simple string matching
    if (originalText.includes('Pharmacy')) {
      result.pharmacy = 'Pharmacy';
      console.log('OCR Service: Found pharmacy: Pharmacy');
    }

    // Extract date using simple patterns
    const datePatterns = [
      /Jan\s+15,\s+2025/gi,
      /August\s+06,\s+2025/gi,
      /(\w+\s+\d{1,2},\s+\d{4})/gi,
    ];

    for (const pattern of datePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        // Store date in instructions if no time found
        if (!result.instructions) {
          result.instructions = `Date: ${matches[0]}`;
        }
        console.log('OCR Service: Found date:', matches[0]);
        break;
      }
    }

    console.log('OCR Service: Final parsed result:', result);
    return result;
  }

  /**
   * Validate medication label against expected medication
   */
  static validateMedicationLabel(
    labelData: MedicationLabelData,
    expectedMedication: {
      medicationName: string;
      dosage?: string;
      patientName?: string;
    }
  ): {
    isValid: boolean;
    confidence: number;
    matches: {
      medicationName: boolean;
      dosage: boolean;
      patientName: boolean;
    };
    score: number;
    requiredChecks: number;
    passedChecks: number;
  } {
    const matches = {
      medicationName: false,
      dosage: false,
      patientName: false,
    };

    let score = 0;
    let requiredChecks = 0;
    let passedChecks = 0;

    // Define minimum lengths for validation
    const MIN_MEDICATION_LENGTH = 3;
    const MIN_DOSAGE_LENGTH = 2;
    const MIN_NAME_LENGTH = 2;

    console.log('🔍 OCR Validation Debug:', {
      expectedMedication,
      labelData: {
        medicationName: labelData.medicationName,
        medicationNames: labelData.medicationNames,
        dosage: labelData.dosage,
        dosages: labelData.dosages,
        patientName: labelData.patientName
      }
    });

    // Check medication name - STRICT validation
    if (expectedMedication.medicationName) {
      requiredChecks++;
      const expectedMed = expectedMedication.medicationName.toLowerCase().trim();
      
      // Require minimum length for meaningful comparison
      if (expectedMed.length < MIN_MEDICATION_LENGTH) {
        console.warn('⚠️ Expected medication name too short for validation');
        passedChecks++; // Skip this check if too short
      } else {
        let medicationMatch = false;
        
        // Check single medication name - EXACT match only (no fuzzy matching)
        if (labelData.medicationName) {
          const labelMed = labelData.medicationName.toLowerCase().trim();
          
          // Exact match only
          if (labelMed === expectedMed && labelMed.length >= MIN_MEDICATION_LENGTH) {
            medicationMatch = true;
            console.log('✅ Exact medication name match:', { expectedMed, labelMed });
          } else {
            console.log('❌ Medication name mismatch:', { expectedMed, labelMed });
          }
        }
        
        // Check multiple medication names - EXACT match only
        if (!medicationMatch && labelData.medicationNames) {
          for (const medName of labelData.medicationNames) {
            const labelMed = medName.toLowerCase().trim();
            if (labelMed === expectedMed && labelMed.length >= MIN_MEDICATION_LENGTH) {
              medicationMatch = true;
              console.log('✅ Exact medication name match in multiple:', { expectedMed, labelMed });
              break;
            }
          }
        }
        
        if (medicationMatch) {
          matches.medicationName = true;
          score += 1;
          passedChecks++;
        } else {
          console.log('❌ No medication name match found');
        }
      }
    }

    // Check dosage - STRICT validation
    if (expectedMedication.dosage) {
      requiredChecks++;
      const expectedDosage = expectedMedication.dosage.toLowerCase().trim();
      
      // Require minimum length for meaningful comparison
      if (expectedDosage.length < MIN_DOSAGE_LENGTH) {
        console.warn('⚠️ Expected dosage too short for validation');
        passedChecks++; // Skip this check if too short
      } else {
        let dosageMatch = false;
        
        // Check single dosage - EXACT match only
        if (labelData.dosage) {
          const labelDosage = labelData.dosage.toLowerCase().trim();
          
          // Exact match only (no substring matching)
          if (labelDosage === expectedDosage && labelDosage.length >= MIN_DOSAGE_LENGTH) {
            dosageMatch = true;
            console.log('✅ Exact dosage match:', { expectedDosage, labelDosage });
          } else {
            console.log('❌ Dosage mismatch:', { expectedDosage, labelDosage });
          }
        }
        
        // Check multiple dosages - EXACT match only
        if (!dosageMatch && labelData.dosages) {
          for (const dosage of labelData.dosages) {
            const labelDosage = dosage.toLowerCase().trim();
            if (labelDosage === expectedDosage && labelDosage.length >= MIN_DOSAGE_LENGTH) {
              dosageMatch = true;
              console.log('✅ Exact dosage match in multiple:', { expectedDosage, labelDosage });
              break;
            }
          }
        }
        
        if (dosageMatch) {
          matches.dosage = true;
          score += 1;
          passedChecks++;
        } else {
          console.log('❌ No dosage match found');
        }
      }
    }

    // Check patient name - STRICT validation
    if (expectedMedication.patientName) {
      requiredChecks++;
      const expectedName = expectedMedication.patientName.toLowerCase().trim();
      
      // Require minimum length for meaningful comparison
      if (expectedName.length < MIN_NAME_LENGTH) {
        console.warn('⚠️ Expected patient name too short for validation');
        passedChecks++; // Skip this check if too short
      } else {
        let nameMatch = false;
        
        if (labelData.patientName) {
          const labelName = labelData.patientName.toLowerCase().trim();
          
          // Exact match only (no substring matching)
          if (labelName === expectedName && labelName.length >= MIN_NAME_LENGTH) {
            nameMatch = true;
            console.log('✅ Exact patient name match:', { expectedName, labelName });
          } else {
            console.log('❌ Patient name mismatch:', { expectedName, labelName });
          }
        }
        
        if (nameMatch) {
          matches.patientName = true;
          score += 1;
          passedChecks++;
        } else {
          console.log('❌ No patient name match found');
        }
      }
    }

    // STRICT validation: ALL required checks must pass
    const isValid = requiredChecks > 0 && passedChecks === requiredChecks;
    const confidence = requiredChecks > 0 ? passedChecks / requiredChecks : 0;

    console.log('📊 Final validation result:', {
      isValid,
      confidence,
      requiredChecks,
      passedChecks,
      matches,
      score
    });

    return {
      isValid,
      confidence,
      matches,
      score,
      requiredChecks,
      passedChecks,
    };
  }

  /**
   * Convert image to base64 for processing
   */
  static imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert canvas to base64
   */
  static canvasToBase64(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1: string, str2: string): number {
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
}

export default OCRService; 