import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Twilio will POST form-encoded data. We can parse it from the request text.
export async function POST(request: Request) {
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);

    const from = params.get('From') || '';
    const body = (params.get('Body') || '').trim().toUpperCase();

    if (!from) {
      return new NextResponse('Missing From', { status: 400 });
    }

    // Normalize phone: keep last 10 digits for matching stored patient phones
    const normalize = (p: string) => p.replace(/\D/g, '').slice(-10);
    const phone10 = normalize(from);

    // Find patient by phone1
    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .select('id, phone1, rtm_status')
      .or(`phone1.ilike.%${phone10}%`) // loose match
      .limit(1)
      .single();

    if (patientErr || !patient) {
      console.warn('Inbound SMS: patient not found for phone', from);
      return new NextResponse('OK');
    }

    if (body === 'STOP' || body === 'UNSUBSCRIBE' || body === 'CANCEL') {
      // Set RTM inactive and record alert
      await supabase
        .from('patients')
        .update({ rtm_status: 'inactive' })
        .eq('id', patient.id);

      await supabase
        .from('alerts')
        .insert({
          patient_id: patient.id,
          alert_type: 'sms_stop',
          status: 'open',
          message: 'Patient replied STOP to SMS. RTM set to inactive.',
        });

      // Twilio expects a 200; we can echo a short response
      return new NextResponse('You have been unsubscribed.');
    }

    if (body === 'START' || body === 'UNSTOP' || body === 'YES') {
      await supabase
        .from('patients')
        .update({ rtm_status: 'active' })
        .eq('id', patient.id);
      return new NextResponse('You have been re-subscribed.');
    }

    return new NextResponse('OK');
  } catch (e) {
    console.error('Inbound SMS error', e);
    return new NextResponse('Server error', { status: 500 });
  }
}


