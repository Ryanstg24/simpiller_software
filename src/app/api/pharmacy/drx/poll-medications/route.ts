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

export async function GET(request: NextRequest) {
  try {
    // Get all synced patients
    const { data: syncedPatients, error: syncError } = await supabaseAdmin
      .from('drx_patient_sync')
      .select('patient_id, drx_patient_id, last_sync_status')
      .eq('last_sync_status', 'success');

    if (syncError) {
      console.error('[DRx Poll API] Error fetching synced patients:', syncError);
      return NextResponse.json(
        { error: 'Failed to fetch synced patients', details: syncError.message },
        { status: 500 }
      );
    }

    if (!syncedPatients || syncedPatients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No synced patients found',
        stats: {
          total: 0,
          processed: 0,
          created: 0,
          updated: 0,
          errors: 0,
        },
      });
    }

    const stats = {
      total: syncedPatients.length,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    // Process each synced patient
    for (const sync of syncedPatients) {
      try {
        const result = await drxIntegration.syncMedicationsFromDRx(sync.patient_id);
        
        stats.processed++;
        stats.created += result.created;
        stats.updated += result.updated;
        
        if (result.errors.length > 0) {
          stats.errors += result.errors.length;
          stats.errorDetails.push(...result.errors);
        }
      } catch (error) {
        stats.errors++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        stats.errorDetails.push(`Patient ${sync.patient_id}: ${errorMsg}`);
        console.error(`[DRx Poll API] Error syncing medications for patient ${sync.patient_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Medication polling completed',
      stats: {
        total: stats.total,
        processed: stats.processed,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors,
        errorDetails: stats.errorDetails.slice(0, 10), // Limit error details
      },
    });

  } catch (error) {
    console.error('[DRx Poll API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

