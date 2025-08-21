import { NextRequest, NextResponse } from 'next/server';
import TwilioService from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const { patientName, patientPhone, medicationNames, scheduledTime } = await request.json();

    if (!patientName || !patientPhone || !medicationNames || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields: patientName, patientPhone, medicationNames, scheduledTime' },
        { status: 400 }
      );
    }

    // Generate a test scan link
    const testScanLink = `http://localhost:3000/scan/test-${Date.now()}`;

    // Format phone number
    const formattedPhone = TwilioService.formatPhoneNumber(patientPhone);

    // Send test SMS reminder
    const reminder = {
      patientName,
      medicationNames: Array.isArray(medicationNames) ? medicationNames : [medicationNames],
      scheduledTime,
      scanLink: testScanLink,
      patientPhone: formattedPhone,
    };

    const smsSent = await TwilioService.sendMedicationReminder(reminder);

    if (!smsSent) {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

    const isTestMode = TwilioService.isTestMode();

    return NextResponse.json({
      success: true,
      message: isTestMode ? 'Test SMS logged successfully' : 'SMS sent successfully',
      testMode: isTestMode,
      scanLink: testScanLink,
      reminder,
    });

  } catch (error) {
    console.error('Error sending test SMS:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 