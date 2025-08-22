import { NextRequest, NextResponse } from 'next/server';
import OCRService from '@/lib/ocr';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { imageData, scanSessionId, expectedMedication } = await request.json();

    if (!imageData || !scanSessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData and scanSessionId' },
        { status: 400 }
      );
    }

    // Process the image using OCR
    const ocrResult = await OCRService.extractTextFromImage(imageData);
    const labelData = OCRService.parseMedicationLabel(ocrResult);

    // Validate against expected medication if provided
    let validationResult = null;
    if (expectedMedication) {
      validationResult = OCRService.validateMedicationLabel(labelData, expectedMedication);
    }

    // Upload image to storage (optional - for audit trail)
    let imageUrl = null;
    try {
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const fileName = `medication-scans/${scanSessionId}-${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medication-scans')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('medication-scans')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    } catch (uploadError) {
      console.warn('Failed to upload image:', uploadError);
      // Continue without image upload
    }

    // Create medication log entry
    const logData = {
      patient_id: null, // This will be updated once the scan session is linked
      medication_id: null, // This will be updated once the scan session is linked
      scan_method: 'api', // Assuming this is an API scan
      scanned_medication_name: labelData.medicationName,
      scanned_dosage: labelData.dosage,
      image_url: imageUrl,
      ocr_data: {
        fullText: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData: labelData,
        validation: validationResult,
      },
      verification_score: validationResult?.confidence || 0,
      session_token: scanSessionId,
      status: validationResult?.isValid ? 'verified' : 'failed',
      taken_at: new Date().toISOString(),
    };

    const { data: logEntry, error: logError } = await supabase
      .from('medication_logs')
      .insert(logData)
      .select()
      .single();

    if (logError) {
      console.error('Failed to create medication log:', logError);
      return NextResponse.json(
        { error: 'Failed to log medication scan' },
        { status: 500 }
      );
    }

    // Update scan session status
    await supabase
      .from('medication_scan_sessions')
      .update({ 
        status: validationResult?.isValid ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanSessionId);

    // Update compliance score if scan was successful
    if (validationResult?.isValid) {
      try {
        // Call the compliance calculation function
        await supabase.rpc('calculate_compliance_score', {
          patient_id: null, // This will be updated once the scan session is linked
        });
      } catch (complianceError) {
        console.warn('Failed to update compliance score:', complianceError);
      }
    }

    return NextResponse.json({
      success: true,
      isValid: validationResult?.isValid,
      confidence: validationResult?.confidence,
      matches: validationResult?.matches,
      extractedData: labelData,
      ocrText: ocrResult.text,
      logEntry,
    });

  } catch (error) {
    console.error('Error processing medication scan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 