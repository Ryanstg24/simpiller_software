import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-role client for admin operations
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

/**
 * Twilio Status Callback Webhook
 * 
 * This endpoint receives delivery status updates from Twilio for sent SMS messages.
 * 
 * Possible MessageStatus values:
 * - queued: Message is queued for sending
 * - sent: Message has been sent from Twilio to carrier
 * - delivered: Message was successfully delivered to recipient
 * - failed: Message failed to send
 * - undelivered: Message was sent but not delivered
 * 
 * Error codes (30xxx series):
 * - 30007: Carrier violation (filtered/blocked by carrier)
 * - 30008: Unknown destination handset
 * - 30034: Message blocked (A2P 10DLC registration issue)
 * - 30005: Unknown destination (invalid number)
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);

    // Extract Twilio callback parameters
    const messageSid = params.get('MessageSid') || '';
    const messageStatus = params.get('MessageStatus') || '';
    const to = params.get('To') || '';
    const from = params.get('From') || '';
    const errorCode = params.get('ErrorCode') || null;
    const errorMessage = params.get('ErrorMessage') || null;
    
    // Log the callback for debugging
    console.log('📬 [Status Callback] Received:', {
      sid: messageSid,
      status: messageStatus,
      to,
      from,
      errorCode,
      errorMessage
    });

    // Extract carrier info if available (helps identify Spectrum issues)
    const toCountry = params.get('ToCountry') || '';
    const toState = params.get('ToState') || '';
    const toCity = params.get('ToCity') || '';
    const toZip = params.get('ToZip') || '';

    // Log critical failures (Spectrum issues would show here!)
    if (messageStatus === 'failed' || messageStatus === 'undelivered') {
      console.error('🚨 [Status Callback] MESSAGE FAILED:', {
        sid: messageSid,
        to,
        status: messageStatus,
        errorCode,
        errorMessage,
        location: `${toCity}, ${toState} ${toZip}`,
        country: toCountry
      });

      // Special logging for common carrier blocking issues
      if (errorCode === '30007') {
        console.error('⚠️ CARRIER VIOLATION: Message filtered by carrier (possible Spectrum blocking)');
      } else if (errorCode === '30034') {
        console.error('⚠️ A2P 10DLC ISSUE: Message blocked due to registration requirements');
      }
    }

    // Try to find the patient by phone number
    const phoneDigits = to.replace(/\D/g, '').slice(-10);
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name, phone1')
      .or(`phone1.ilike.%${phoneDigits}%`)
      .limit(1)
      .single();

    // Store delivery status in database
    await supabaseAdmin
      .from('sms_delivery_logs')
      .insert({
        message_sid: messageSid,
        patient_id: patient?.id || null,
        to_number: to,
        from_number: from,
        status: messageStatus,
        error_code: errorCode,
        error_message: errorMessage,
        to_city: toCity,
        to_state: toState,
        to_zip: toZip,
        to_country: toCountry,
        received_at: new Date().toISOString()
      });

    // If message failed, create an alert for the admin
    if ((messageStatus === 'failed' || messageStatus === 'undelivered') && patient) {
      const alertMessage = errorCode === '30007' 
        ? `SMS to ${patient.first_name} ${patient.last_name} was blocked by carrier (possible Spectrum/carrier filtering). Error: ${errorMessage || 'Carrier violation'}`
        : `SMS to ${patient.first_name} ${patient.last_name} failed. Status: ${messageStatus}. Error: ${errorMessage || 'Unknown'}`;

      await supabaseAdmin
        .from('alerts')
        .insert({
          patient_id: patient.id,
          alert_type: 'sms_delivery_failed',
          status: 'open',
          message: alertMessage,
          metadata: {
            message_sid: messageSid,
            error_code: errorCode,
            error_message: errorMessage,
            carrier_location: `${toCity}, ${toState}`
          }
        });

      console.log('🔔 Alert created for failed SMS delivery');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing status callback:', error);
    // Return 200 anyway so Twilio doesn't retry
    return NextResponse.json({ success: false, error: 'Processing error' });
  }
}
