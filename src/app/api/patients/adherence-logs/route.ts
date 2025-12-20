import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Use service-role client for RLS-safe operations
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
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId parameter is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated and has access
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user roles to verify organization access
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('name, organization_id')
      .eq('user_id', user.id);

    const isSimpillerAdmin = userRoles?.some(role => role.name === 'simpiller_admin');
    const orgAdminRole = userRoles?.find(role => role.name === 'organization_admin');
    const userOrganizationId = orgAdminRole?.organization_id;

    // Fetch patient to verify organization access
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id, organization_id, rtm_status')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Verify organization access (unless Simpiller admin)
    if (!isSimpillerAdmin) {
      if (!userOrganizationId || patient.organization_id !== userOrganizationId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Build query with date range if provided
    let query = supabaseAdmin
      .from('medication_logs')
      .select('id, medication_id, patient_id, event_date, status, qr_code_scanned, schedule_id')
      .eq('patient_id', patientId)
      .order('event_date', { ascending: false })
      .limit(1000);

    if (startDate) {
      query = query.gte('event_date', startDate);
    }
    if (endDate) {
      query = query.lte('event_date', endDate);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching medication logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs', details: logsError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: logs?.length || 0,
      logs: logs || []
    });

  } catch (error) {
    console.error('Error in adherence logs API endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

