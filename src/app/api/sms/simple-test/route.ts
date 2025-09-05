import { NextRequest, NextResponse } from 'next/server';
import { TwilioService } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const testMessage = message || 'This is a test SMS from Simpiller. If you receive this, SMS is working correctly!';

    console.log('🧪 Simple SMS Test:');
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Message: ${testMessage}`);
    console.log(`   Test Mode: ${TwilioService.isTestMode()}`);

    const result = await TwilioService.sendSMS({
      to: phoneNumber,
      body: testMessage,
    });

    if (result) {
      return NextResponse.json({
        success: true,
        message: TwilioService.isTestMode() 
          ? 'Test SMS logged to console (test mode enabled)' 
          : 'SMS sent successfully',
        testMode: TwilioService.isTestMode(),
        phoneNumber,
        smsMessage: testMessage,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in simple SMS test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
