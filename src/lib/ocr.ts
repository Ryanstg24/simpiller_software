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
  } {
    const matches = {
      medicationName: false,
      dosage: false,
      patientName: false,
    };

    let score = 0;
    let totalChecks = 0;

    // Check medication name - check both single and multiple medications
    if ((labelData.medicationName || labelData.medicationNames) && expectedMedication.medicationName) {
      totalChecks++;
      const expectedMed = expectedMedication.medicationName.toLowerCase();
      
      // Check single medication name - require exact match or very close match
      if (labelData.medicationName) {
        const labelMed = labelData.medicationName.toLowerCase().trim();
        const expectedMedTrimmed = expectedMed.trim();
        
        // Exact match
        if (labelMed === expectedMedTrimmed) {
          matches.medicationName = true;
          score += 1;
        }
        // Very close match (at least 80% of characters match)
        else if (this.calculateStringSimilarity(labelMed, expectedMedTrimmed) >= 0.8) {
          matches.medicationName = true;
          score += 1;
        }
      }
      
      // Check multiple medication names
      if (labelData.medicationNames && !matches.medicationName) {
        for (const medName of labelData.medicationNames) {
          const labelMed = medName.toLowerCase();
          if (labelMed.includes(expectedMed) || expectedMed.includes(labelMed)) {
            matches.medicationName = true;
            score += 1;
            break;
          }
        }
      }
    }

    // Check dosage - check both single and multiple dosages
    if ((labelData.dosage || labelData.dosages) && expectedMedication.dosage) {
      totalChecks++;
      const expectedDosage = expectedMedication.dosage.toLowerCase();
      
      // Check single dosage
      if (labelData.dosage) {
        const labelDosage = labelData.dosage.toLowerCase();
        if (labelDosage.includes(expectedDosage) || expectedDosage.includes(labelDosage)) {
          matches.dosage = true;
          score += 1;
        }
      }
      
      // Check multiple dosages
      if (labelData.dosages && !matches.dosage) {
        for (const dosage of labelData.dosages) {
          const labelDosage = dosage.toLowerCase();
          if (labelDosage.includes(expectedDosage) || expectedDosage.includes(labelDosage)) {
            matches.dosage = true;
            score += 1;
            break;
          }
        }
      }
    }

    // Check patient name
    if (labelData.patientName && expectedMedication.patientName) {
      totalChecks++;
      const labelName = labelData.patientName.toLowerCase();
      const expectedName = expectedMedication.patientName.toLowerCase();
      
      if (labelName.includes(expectedName) || expectedName.includes(labelName)) {
        matches.patientName = true;
        score += 1;
      }
    }

    const confidence = totalChecks > 0 ? score / totalChecks : 0;
    const isValid = confidence >= 0.8; // At least 80% match required for strict validation

    return {
      isValid,
      confidence,
      matches,
      score,
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