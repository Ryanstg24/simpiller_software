import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OCRService, { type OCRResult, type MedicationLabelData } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const { 
      sessionToken, 
      imageData, 
      medicationId,
      scanMethod = 'camera' 
    } = await request.json();

    if (!sessionToken || !imageData || !medicationId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionToken, imageData, medicationId' },
        { status: 400 }
      );
    }

    // Get scan session
    const { data: scanSession, error: sessionError } = await supabase
      .from('medication_scan_sessions')
      .select(`
        *,
        patients (
          first_name,
          last_name
        ),
        medications (
          medication_name,
          dosage,
          strength
        )
      `)
      .eq('id', sessionToken)
      .single();

    if (sessionError || !scanSession) {
      return NextResponse.json(
        { error: 'Invalid or expired scan session' },
        { status: 404 }
      );
    }

    // Check if session is expired
    if (new Date() > new Date(scanSession.expires_at)) {
      return NextResponse.json(
        { error: 'Scan session has expired' },
        { status: 410 }
      );
    }

    // Check if session is already completed
    if (scanSession.status === 'completed') {
      return NextResponse.json(
        { error: 'Scan session already completed' },
        { status: 409 }
      );
    }

    // Process OCR
    let ocrResult: OCRResult;
    try {
      ocrResult = await OCRService.extractTextFromImage(imageData);
    } catch (error) {
      console.error('OCR processing failed:', error);
      return NextResponse.json(
        { error: 'Failed to process image. Please try again with a clearer photo.' },
        { status: 500 }
      );
    }

    // Parse medication label data
    const labelData = OCRService.parseMedicationLabel(ocrResult);

    // Get expected medication data
    const expectedMedication = {
      medicationName: scanSession.medications?.medication_name || '',
      dosage: scanSession.medications?.dosage || '',
      patientName: `${scanSession.patients?.first_name} ${scanSession.patients?.last_name}`,
    };

    // Validate medication label
    const validation = OCRService.validateMedicationLabel(labelData, expectedMedication);

    // Upload image to storage (optional - for audit trail)
    let imageUrl = null;
    try {
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      const fileName = `medication-scans/${sessionToken}-${Date.now()}.jpg`;
      
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
      patient_id: scanSession.patient_id,
      medication_id: medicationId,
      scan_method,
      scanned_medication_name: labelData.medicationName,
      scanned_dosage: labelData.dosage,
      image_url: imageUrl,
      ocr_data: {
        fullText: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData: labelData,
        validation: validation,
      },
      verification_score: validation.confidence,
      session_token: sessionToken,
      status: validation.isValid ? 'verified' : 'failed',
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
        status: validation.isValid ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionToken);

    // Update compliance score if scan was successful
    if (validation.isValid) {
      try {
        // Call the compliance calculation function
        await supabase.rpc('calculate_compliance_score', {
          patient_id: scanSession.patient_id,
        });
      } catch (complianceError) {
        console.warn('Failed to update compliance score:', complianceError);
      }
    }

    return NextResponse.json({
      success: true,
      isValid: validation.isValid,
      confidence: validation.confidence,
      matches: validation.matches,
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