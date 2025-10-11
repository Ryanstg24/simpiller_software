import { NextRequest, NextResponse } from 'next/server';

interface TestOCRRequest {
  medicationName: string;
  dosage: string;
  patientName: string;
  scheduledTime: string;
  scanMethod: 'single_image' | 'multiple_images' | 'video_capture';
  testDescription: string;
  capturedImages: string[];
}

interface TestOCRResponse {
  success: boolean;
  message: string;
  testMode: boolean;
  scanLink: string;
  pillBottle: {
    medicationName: string;
    dosage: string;
    patientName: string;
    scheduledTime: string;
    scanMethod: string;
  };
  ocrResults?: {
    extractedText: string;
    confidence: number;
    parsedData: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: TestOCRRequest = await request.json();
    
    console.log('🧪 OCR PB Test Request:', {
      medicationName: body.medicationName,
      dosage: body.dosage,
      patientName: body.patientName,
      scheduledTime: body.scheduledTime,
      scanMethod: body.scanMethod,
      testDescription: body.testDescription,
      imageCount: body.capturedImages.length
    });

    // Validate required fields
    if (!body.medicationName || !body.dosage || !body.patientName || !body.scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields: medicationName, dosage, patientName, scheduledTime' },
        { status: 400 }
      );
    }

    // Validate scan method
    const validScanMethods = ['single_image', 'multiple_images', 'video_capture'];
    if (!validScanMethods.includes(body.scanMethod)) {
      return NextResponse.json(
        { error: 'Invalid scan method. Must be one of: single_image, multiple_images, video_capture' },
        { status: 400 }
      );
    }

    // Validate images based on scan method
    if (body.scanMethod === 'single_image' && body.capturedImages.length !== 1) {
      return NextResponse.json(
        { error: 'Single image method requires exactly 1 image' },
        { status: 400 }
      );
    }

    if (body.scanMethod === 'multiple_images' && body.capturedImages.length < 2) {
      return NextResponse.json(
        { error: 'Multiple images method requires at least 2 images' },
        { status: 400 }
      );
    }

    // Simulate OCR processing based on scan method
    let ocrResults;
    
    if (body.capturedImages.length > 0) {
      // Simulate different OCR results based on scan method
      const baseText = `Medication: ${body.medicationName}\nDosage: ${body.dosage}\nPatient: ${body.patientName}\nTime: ${new Date(body.scheduledTime).toLocaleTimeString()}`;
      
      let extractedText = baseText;
      let confidence = 0.85;

      switch (body.scanMethod) {
        case 'single_image':
          extractedText = `${baseText}\n\n[Single Image OCR]\nThis is a simulated result from a single front-facing image of the pill bottle.`;
          confidence = 0.75; // Lower confidence for single image
          break;
          
        case 'multiple_images':
          extractedText = `${baseText}\n\n[Multiple Images OCR]\nLeft Side: ${body.medicationName} - ${body.dosage}\nMiddle: Patient: ${body.patientName}\nRight Side: Time: ${new Date(body.scheduledTime).toLocaleTimeString()}\n\nCombined result from multiple angles provides better accuracy.`;
          confidence = 0.92; // Higher confidence for multiple images
          break;
          
        case 'video_capture':
          extractedText = `${baseText}\n\n[Video Capture OCR]\nContinuous scanning of the rotating bottle captured:\n- Full label text from all angles\n- Better text recognition on curved surfaces\n- Improved confidence through multiple frames`;
          confidence = 0.88; // Good confidence for video
          break;
      }

      ocrResults = {
        extractedText,
        confidence,
        parsedData: {
          medicationName: body.medicationName,
          dosage: body.dosage,
          patientName: body.patientName,
          scheduledTime: body.scheduledTime,
          scanMethod: body.scanMethod,
          imageCount: body.capturedImages.length,
          processingTime: Math.random() * 2000 + 1000, // Simulate processing time
        }
      };
    }

    // Generate secure test scan link with unique token (no sensitive data in URL)
    const testToken = `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const scanLink = `https://simpiller-software.vercel.app/scan/test/${testToken}`;

    const response: TestOCRResponse = {
      success: true,
      message: `OCR PB test completed successfully using ${body.scanMethod.replace('_', ' ')} method`,
      testMode: true,
      scanLink,
      pillBottle: {
        medicationName: body.medicationName,
        dosage: body.dosage,
        patientName: body.patientName,
        scheduledTime: body.scheduledTime,
        scanMethod: body.scanMethod,
      },
      ocrResults
    };

    console.log('✅ OCR PB Test Response:', {
      success: response.success,
      message: response.message,
      scanMethod: response.pillBottle.scanMethod,
      hasOCRResults: !!response.ocrResults,
      confidence: response.ocrResults?.confidence
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ OCR PB Test Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process OCR PB test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
