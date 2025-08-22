import { NextRequest, NextResponse } from 'next/server';
import TwilioService from '@/lib/twilio';

console.log('📁 SMS API route loaded');

export async function POST(request: NextRequest) {
  console.log('🚀 SMS API POST method called');
  try {
    console.log('🚀 SMS Test API called');
    
    const { patientName, patientPhone, medicationNames, scheduledTime } = await request.json();
    console.log('📋 Request data:', { patientName, patientPhone, medicationNames, scheduledTime });

    if (!patientName || !patientPhone || !medicationNames || !scheduledTime) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: patientName, patientPhone, medicationNames, scheduledTime' },
        { status: 400 }
      );
    }

    // Generate a test scan link
    const testScanLink = `http://localhost:3000/scan/test-${Date.now()}`;
    console.log('🔗 Generated scan link:', testScanLink);

    // Format phone number
    const formattedPhone = TwilioService.formatPhoneNumber(patientPhone);
    console.log('📞 Formatted phone:', formattedPhone);

    // Send test SMS reminder
    const reminder = {
      patientName,
      medicationNames: Array.isArray(medicationNames) ? medicationNames : [medicationNames],
      scheduledTime,
      scanLink: testScanLink,
      patientPhone: formattedPhone,
    };
    console.log('📱 Sending reminder:', reminder);

    const smsSent = await TwilioService.sendMedicationReminder(reminder);
    console.log('📤 SMS sent result:', smsSent);

    if (!smsSent) {
      console.log('❌ SMS sending failed');
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

    const isTestMode = TwilioService.isTestMode();
    console.log('🧪 Test mode:', isTestMode);

    console.log('✅ SMS API completed successfully');
    return NextResponse.json({
      success: true,
      message: isTestMode ? 'Test SMS logged successfully' : 'SMS sent successfully',
      testMode: isTestMode,
      scanLink: testScanLink,
      reminder,
    });

  } catch (error) {
    console.error('💥 Error in SMS API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 