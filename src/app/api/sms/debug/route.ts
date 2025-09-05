import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const isTestMode = process.env.SMS_TEST_MODE === 'true';

    const config = {
      accountSid: accountSid ? 'Set' : 'Missing',
      authToken: authToken ? 'Set' : 'Missing',
      messagingServiceSid: messagingServiceSid ? 'Set' : 'Missing',
      isTestMode,
      actualTestModeValue: process.env.SMS_TEST_MODE,
    };

    // If we have credentials, try to validate them with Twilio
    let twilioValidation = null;
    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken);
        const account = await client.api.accounts(accountSid).fetch();
        twilioValidation = {
          status: 'Valid',
          accountName: account.friendlyName,
          accountStatus: account.status,
        };
      } catch (error) {
        twilioValidation = {
          status: 'Invalid',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Check messaging service if we have the SID
    let messagingServiceInfo = null;
    if (messagingServiceSid && accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken);
        const service = await client.messaging.v1.services(messagingServiceSid).fetch();
        messagingServiceInfo = {
          status: 'Valid',
          friendlyName: service.friendlyName,
          serviceStatus: 'Active', // Twilio messaging services don't have a status field
        };
      } catch (error) {
        messagingServiceInfo = {
          status: 'Invalid',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return NextResponse.json({
      success: true,
      config,
      twilioValidation,
      messagingServiceInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in SMS debug:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
