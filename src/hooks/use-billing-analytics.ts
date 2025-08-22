import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface BillingOrganization {
  id: string;
  name: string;
  setup_fee: number;
  patient_count: number;
  monthly_revenue: number;
  total_revenue: number;
  created_at: string;
  status: 'active' | 'inactive';
  // New fields for billing distinction
  is_new_this_month: boolean;
  monthly_billing_amount: number; // Only patient fees, no setup fee
  setup_fee_billing_amount: number; // Setup fee if new this month
}

export interface BillingSummary {
  totalOrganizations: number;
  totalPatients: number;
  totalSetupFees: number;
  totalMonthlyRevenue: number;
  totalRevenue: number;
  organizations: BillingOrganization[];
  // New fields for billing distinction
  newOrganizationsThisMonth: number;
  totalMonthlyBilling: number; // Only recurring patient fees
  totalSetupFeeBilling: number; // Only setup fees for new orgs
}

export interface BillingFilters {
  organizationId?: string;
  dateRange?: {
    start: string; // YYYY-MM format for month selection
    end: string;   // YYYY-MM format for month selection
  };
  status?: 'active' | 'inactive' | 'all';
  billingMonth?: string; // YYYY-MM format for monthly billing
}

const MONTHLY_PATIENT_FEE = 50; // $50 per patient per month
const SETUP_FEE = 100; // Default setup fee

export function useBillingAnalytics(filters: BillingFilters = {}) {
  const [data, setData] = useState<BillingSummary>({
    totalOrganizations: 0,
    totalPatients: 0,
    totalSetupFees: 0,
    totalMonthlyRevenue: 0,
    totalRevenue: 0,
    organizations: [],
    newOrganizationsThisMonth: 0,
    totalMonthlyBilling: 0,
    totalSetupFeeBilling: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isSimpillerAdmin } = useAuth();

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user || !isSimpillerAdmin) {
        setError('Access denied. Simpiller Admin privileges required.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Determine billing month (default to current month)
        const billingMonth = filters.billingMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
        const billingMonthStart = new Date(billingMonth + '-01');
        const billingMonthEnd = new Date(billingMonthStart.getFullYear(), billingMonthStart.getMonth() + 1, 0);

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
        if (filters.organizationId) {
          organizationsQuery = organizationsQuery.eq('id', filters.organizationId);
        }

        if (filters.status && filters.status !== 'all') {
          organizationsQuery = organizationsQuery.eq('is_active', filters.status === 'active');
        }

        if (filters.dateRange) {
          // Convert month format (YYYY-MM) to proper date range for database query
          const startDate = filters.dateRange.start ? new Date(filters.dateRange.start + '-01') : null;
          const endDate = filters.dateRange.end ? new Date(filters.dateRange.end + '-01') : null;
          
          if (startDate) {
            organizationsQuery = organizationsQuery.gte('created_at', startDate.toISOString());
          }
          if (endDate) {
            // Set to end of the month
            const endOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
            organizationsQuery = organizationsQuery.lte('created_at', endOfMonth.toISOString());
          }
        }

        const { data: organizationsData, error: organizationsError } = await organizationsQuery;

        if (organizationsError) {
          console.error('Error fetching organizations:', organizationsError);
          setData({
            totalOrganizations: 0,
            totalPatients: 0,
            totalSetupFees: 0,
            totalMonthlyRevenue: 0,
            totalRevenue: 0,
            organizations: [],
            newOrganizationsThisMonth: 0,
            totalMonthlyBilling: 0,
            totalSetupFeeBilling: 0
          });
          setLoading(false);
          return;
        }

        // Get patient counts for each organization
        const organizationsWithPatients = await Promise.all(
          (organizationsData || []).map(async (org) => {
            try {
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
                  status: (org.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
                  is_new_this_month: false,
                  monthly_billing_amount: 0,
                  setup_fee_billing_amount: 0
                };
              }

              const patientCount = patientsData?.length || 0;
              const monthlyRevenue = patientCount * MONTHLY_PATIENT_FEE;
              const totalRevenue = SETUP_FEE + monthlyRevenue;

              // Check if organization is new this month
              const orgCreatedAt = new Date(org.created_at);
              const isNewThisMonth = orgCreatedAt >= billingMonthStart && orgCreatedAt <= billingMonthEnd;

              // Calculate billing amounts for this month
              const monthlyBillingAmount = monthlyRevenue; // Always bill for patients
              const setupFeeBillingAmount = isNewThisMonth ? SETUP_FEE : 0; // Only bill setup fee if new

              return {
                id: org.id,
                name: org.name,
                setup_fee: SETUP_FEE,
                patient_count: patientCount,
                monthly_revenue: monthlyRevenue,
                total_revenue: totalRevenue,
                created_at: org.created_at,
                status: (org.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
                is_new_this_month: isNewThisMonth,
                monthly_billing_amount: monthlyBillingAmount,
                setup_fee_billing_amount: setupFeeBillingAmount
              };
            } catch (error) {
              console.error(`Error processing organization ${org.id}:`, error);
              return {
                id: org.id,
                name: org.name,
                setup_fee: SETUP_FEE,
                patient_count: 0,
                monthly_revenue: 0,
                total_revenue: SETUP_FEE,
                created_at: org.created_at,
                status: (org.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
                is_new_this_month: false,
                monthly_billing_amount: 0,
                setup_fee_billing_amount: 0
              };
            }
          })
        );

        // Calculate totals
        const totalOrganizations = organizationsWithPatients.length;
        const totalPatients = organizationsWithPatients.reduce((sum, org) => sum + org.patient_count, 0);
        const totalSetupFees = organizationsWithPatients.reduce((sum, org) => sum + org.setup_fee, 0);
        const totalMonthlyRevenue = totalPatients * MONTHLY_PATIENT_FEE;
        const totalRevenue = totalSetupFees + totalMonthlyRevenue;

        // Calculate billing-specific totals
        const newOrganizationsThisMonth = organizationsWithPatients.filter(org => org.is_new_this_month).length;
        const totalMonthlyBilling = organizationsWithPatients.reduce((sum, org) => sum + org.monthly_billing_amount, 0);
        const totalSetupFeeBilling = organizationsWithPatients.reduce((sum, org) => sum + org.setup_fee_billing_amount, 0);

        setData({
          totalOrganizations,
          totalPatients,
          totalSetupFees,
          totalMonthlyRevenue,
          totalRevenue,
          organizations: organizationsWithPatients,
          newOrganizationsThisMonth,
          totalMonthlyBilling,
          totalSetupFeeBilling
        });

      } catch (err) {
        console.error('Error fetching billing analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
        setData({
          totalOrganizations: 0,
          totalPatients: 0,
          totalSetupFees: 0,
          totalMonthlyRevenue: 0,
          totalRevenue: 0,
          organizations: [],
          newOrganizationsThisMonth: 0,
          totalMonthlyBilling: 0,
          totalSetupFeeBilling: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [user, isSimpillerAdmin, filters.organizationId, filters.status, filters.dateRange, filters.billingMonth]);

  return { data, loading, error };
}

// Helper function to generate CSV data for download
export function generateBillingCSV(organizations: BillingOrganization[]): string {
  const headers = [
    'Organization Name',
    'Setup Fee ($)',
    'Patient Count',
    'Monthly Patient Fees ($)',
    'New This Month',
    'Setup Fee Billing ($)',
    'Monthly Billing ($)',
    'Total Billing This Month ($)',
    'Created Date',
    'Status'
  ];

  const rows = organizations.map(org => [
    org.name,
    org.setup_fee.toFixed(2),
    org.patient_count.toString(),
    org.monthly_revenue.toFixed(2),
    org.is_new_this_month ? 'Yes' : 'No',
    org.setup_fee_billing_amount.toFixed(2),
    org.monthly_billing_amount.toFixed(2),
    (org.setup_fee_billing_amount + org.monthly_billing_amount).toFixed(2),
    new Date(org.created_at).toLocaleDateString(),
    org.status
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

// Helper function to generate PDF data for download
export function generateBillingPDF(organizations: BillingOrganization[], billingMonth?: string): string {
  const month = billingMonth || new Date().toISOString().slice(0, 7);
  const monthName = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  
  let pdfContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; }
        .new-org { background-color: #e8f5e8; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Simpiller Billing Report</h1>
        <h2>${monthName}</h2>
      </div>
      
      <div class="summary">
        <h3>Billing Summary</h3>
        <p><strong>Total Organizations:</strong> ${organizations.length}</p>
        <p><strong>New Organizations This Month:</strong> ${organizations.filter(org => org.is_new_this_month).length}</p>
        <p><strong>Total Monthly Billing:</strong> $${organizations.reduce((sum, org) => sum + org.monthly_billing_amount, 0).toFixed(2)}</p>
        <p><strong>Total Setup Fee Billing:</strong> $${organizations.reduce((sum, org) => sum + org.setup_fee_billing_amount, 0).toFixed(2)}</p>
        <p><strong>Total Billing This Month:</strong> $${organizations.reduce((sum, org) => sum + org.monthly_billing_amount + org.setup_fee_billing_amount, 0).toFixed(2)}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Organization</th>
            <th>Patients</th>
            <th>Monthly Fees</th>
            <th>New This Month</th>
            <th>Setup Fee</th>
            <th>Total Billing</th>
          </tr>
        </thead>
        <tbody>
  `;

  organizations.forEach(org => {
    const isNew = org.is_new_this_month;
    const totalBilling = org.monthly_billing_amount + org.setup_fee_billing_amount;
    pdfContent += `
      <tr class="${isNew ? 'new-org' : ''}">
        <td>${org.name}</td>
        <td>${org.patient_count}</td>
        <td>$${org.monthly_billing_amount.toFixed(2)}</td>
        <td>${isNew ? 'Yes' : 'No'}</td>
        <td>$${org.setup_fee_billing_amount.toFixed(2)}</td>
        <td class="total">$${totalBilling.toFixed(2)}</td>
      </tr>
    `;
  });

  pdfContent += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  return pdfContent;
}

// Helper function to download report file
export function downloadBillingReport(organizations: BillingOrganization[], format: 'csv' | 'pdf' = 'csv', filename?: string, billingMonth?: string) {
  const month = billingMonth || new Date().toISOString().slice(0, 7);
  const date = new Date().toISOString().split('T')[0];
  
  if (!filename) {
    const orgName = organizations.length === 1 ? organizations[0]?.name : 'all-organizations';
    filename = `simpiller-billing-${orgName}-${month}-${date}.${format}`;
  }

  let content: string;
  let mimeType: string;

  if (format === 'csv') {
    content = generateBillingCSV(organizations);
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = generateBillingPDF(organizations, billingMonth);
    mimeType = 'text/html;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
} 