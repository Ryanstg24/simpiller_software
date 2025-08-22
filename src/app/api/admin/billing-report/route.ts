import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SETUP_FEE = 500; // $500 setup fee per organization
const MONTHLY_PATIENT_FEE = 50; // $50 per patient per month

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json or csv

    // Build query for organizations
    let organizationsQuery = supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        is_active
      `);

    // Apply filters
    if (organizationId) {
      organizationsQuery = organizationsQuery.eq('id', organizationId);
    }

    if (status && status !== 'all') {
      organizationsQuery = organizationsQuery.eq('is_active', status === 'active');
    }

    if (startDate) {
      organizationsQuery = organizationsQuery.gte('created_at', startDate);
    }

    if (endDate) {
      organizationsQuery = organizationsQuery.lte('created_at', endDate);
    }

    const { data: organizationsData, error: organizationsError } = await organizationsQuery;

    if (organizationsError) {
      console.error('Error fetching organizations:', organizationsError);
      return NextResponse.json(
        { error: 'Failed to fetch organization data' },
        { status: 500 }
      );
    }

    // Get patient counts for each organization
    const organizationsWithPatients = await Promise.all(
      (organizationsData || []).map(async (org) => {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        if (patientsError) {
          console.error(`Error fetching patients for organization ${org.id}:`, patientsError);
          return {
            id: org.id,
            name: org.name,
            setup_fee: SETUP_FEE,
            patient_count: 0,
            monthly_revenue: 0,
            total_revenue: SETUP_FEE,
            created_at: org.created_at,
            status: org.is_active ? 'active' : 'inactive'
          };
        }

        const patientCount = patientsData?.length || 0;
        const monthlyRevenue = patientCount * MONTHLY_PATIENT_FEE;
        const totalRevenue = SETUP_FEE + monthlyRevenue;

        return {
          id: org.id,
          name: org.name,
          setup_fee: SETUP_FEE,
          patient_count: patientCount,
          monthly_revenue: monthlyRevenue,
          total_revenue: totalRevenue,
          created_at: org.created_at,
          status: org.is_active ? 'active' : 'inactive'
        };
      })
    );

    // Calculate totals
    const totalOrganizations = organizationsWithPatients.length;
    const totalPatients = organizationsWithPatients.reduce((sum, org) => sum + org.patient_count, 0);
    const totalSetupFees = totalOrganizations * SETUP_FEE;
    const totalMonthlyRevenue = totalPatients * MONTHLY_PATIENT_FEE;
    const totalRevenue = totalSetupFees + totalMonthlyRevenue;

    const reportData = {
      summary: {
        totalOrganizations,
        totalPatients,
        totalSetupFees,
        totalMonthlyRevenue,
        totalRevenue,
        generatedAt: new Date().toISOString(),
        filters: {
          organizationId,
          status,
          startDate,
          endDate
        }
      },
      organizations: organizationsWithPatients
    };

    // Return CSV format if requested
    if (format === 'csv') {
      const headers = [
        'Organization Name',
        'Setup Fee ($)',
        'Patient Count',
        'Monthly Revenue ($)',
        'Total Revenue ($)',
        'Created Date',
        'Status'
      ];

      const rows = organizationsWithPatients.map(org => [
        org.name,
        org.setup_fee.toFixed(2),
        org.patient_count.toString(),
        org.monthly_revenue.toFixed(2),
        org.total_revenue.toFixed(2),
        new Date(org.created_at).toLocaleDateString(),
        org.status
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="billing-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON format (default)
    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Error generating billing report:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing report' },
      { status: 500 }
    );
  }
} 