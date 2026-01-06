import { NextRequest, NextResponse } from 'next/server';
import { drxIntegration } from '@/lib/drx-integration';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, pharmacyId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id, assigned_pharmacy_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Verify pharmacy is the partnered pharmacy
    const targetPharmacyId = pharmacyId || patient.assigned_pharmacy_id;
    if (!targetPharmacyId) {
      return NextResponse.json(
        { error: 'Patient must be assigned to a pharmacy' },
        { status: 400 }
      );
    }

    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, is_partner')
      .eq('id', targetPharmacyId)
      .single();

    if (!pharmacy?.is_partner) {
      return NextResponse.json(
        { error: 'Patient must be assigned to partnered pharmacy' },
        { status: 400 }
      );
    }

    // Sync patient to DRx
    const result = await drxIntegration.syncPatientToDRx(patientId, targetPharmacyId);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to sync patient to DRx',
          success: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Patient synced to DRx successfully',
      drxPatientId: result.drxPatientId,
      drxGroupId: result.drxGroupId,
    });

  } catch (error) {
    console.error('[DRx Sync API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

