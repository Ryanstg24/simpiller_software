import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import TwilioService from '@/lib/twilio';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { patientId, medicationIds, scheduledTime } = await request.json();

    if (!patientId || !medicationIds || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, medicationIds, scheduledTime' },
        { status: 400 }
      );
    }

    // Fetch patient and medication data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('first_name, last_name, phone1')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (!patient.phone1) {
      return NextResponse.json(
        { error: 'Patient does not have a phone number' },
        { status: 400 }
      );
    }

    // Fetch medications
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select('medication_name, dosage')
      .in('id', medicationIds)
      .eq('status', 'active');

    if (medicationsError || !medications) {
      return NextResponse.json(
        { error: 'Failed to fetch medications' },
        { status: 500 }
      );
    }

    // Create scan session
    const { data: scanSession, error: sessionError } = await supabase
      .from('medication_scan_sessions')
      .insert({
        patient_id: patientId,
        medication_ids: medicationIds,
        scheduled_time: scheduledTime,
        status: 'pending',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to create scan session' },
        { status: 500 }
      );
    }

    // Generate unique scan link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const scanLink = `${baseUrl}/scan/${scanSession.id}`;

    // Format phone number
    const formattedPhone = TwilioService.formatPhoneNumber(patient.phone1);

    // Send SMS reminder
    const reminder = {
      patientName: `${patient.first_name} ${patient.last_name}`,
      medicationNames: medications.map(m => m.medication_name),
      scheduledTime,
      scanLink,
      patientPhone: formattedPhone,
    };

    const smsSent = await TwilioService.sendMedicationReminder(reminder);

    if (!smsSent) {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Log the alert
    await supabase
      .from('medication_alerts')
      .insert({
        patient_id: patientId,
        medication_ids: medicationIds,
        alert_type: 'sms_reminder',
        scheduled_time: scheduledTime,
        sent_at: new Date().toISOString(),
        status: 'sent',
        scan_session_id: scanSession.id,
      });

    return NextResponse.json({
      success: true,
      message: 'SMS reminder sent successfully',
      scanSessionId: scanSession.id,
      scanLink,
    });

  } catch (error) {
    console.error('Error sending SMS reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 