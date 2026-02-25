import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { drxIntegration } from '@/lib/drx-integration';

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

/** DRx webhook payload: Prescription Fill Object (e.g. for Print event) */
interface DRxPrescriptionFillPayload {
  patientId?: string;
  patient_id?: string;
  [key: string]: unknown;
}

/**
 * DRx webhook receiver (Print status).
 * When a prescription fill enters "Print" status, DRx POSTs here.
 * We resolve the DRx patient to Simpiller patient and sync medications from DRx into Simpiller.
 * Uses same DRx API as rest of app (DRX_API_ENDPOINT); for production use e.g. https://derosa.drxapp.com/external_api/v1
 */
export async function POST(request: NextRequest) {
  try {
    const headerKey = process.env.DRX_WEBHOOK_HEADER_KEY;
    const headerValue = process.env.DRX_WEBHOOK_HEADER_VALUE;

    if (headerKey && headerValue) {
      const receivedValue = request.headers.get(headerKey);
      if (receivedValue !== headerValue) {
        console.warn('[DRx Webhook] Unauthorized: missing or invalid webhook header');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = (await request.json()) as DRxPrescriptionFillPayload;
    const drxPatientId = body.patientId ?? body.patient_id;

    if (!drxPatientId) {
      console.warn('[DRx Webhook] Payload missing patientId:', JSON.stringify(body).slice(0, 200));
      return NextResponse.json(
        { error: 'Payload missing patientId' },
        { status: 400 }
      );
    }

    const { data: syncRow, error: syncError } = await supabaseAdmin
      .from('drx_patient_sync')
      .select('patient_id')
      .eq('drx_patient_id', String(drxPatientId))
      .single();

    if (syncError || !syncRow?.patient_id) {
      console.warn('[DRx Webhook] No Simpiller patient for DRx patient:', drxPatientId, syncError?.message);
      return NextResponse.json(
        { error: 'Patient not linked to Simpiller' },
        { status: 404 }
      );
    }

    const result = await drxIntegration.syncMedicationsFromDRx(syncRow.patient_id);

    if (!result.success && result.errors.length > 0) {
      console.error('[DRx Webhook] Sync had errors:', result.errors);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      stats: { created: result.created, updated: result.updated, errors: result.errors.length },
    });
  } catch (error) {
    console.error('[DRx Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
