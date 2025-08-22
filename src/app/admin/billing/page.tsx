'use client';

import { useState } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  Building2, 
  Users, 
  TrendingUp, 
  Download, 
  Filter,
  Eye,
  FileText
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { AccessDenied } from "@/components/auth/access-denied";
import { 
  useBillingAnalytics, 
  downloadBillingReport, 
  BillingFilters,
  BillingOrganization
} from "@/hooks/use-billing-analytics";
import { SetupFeeModal } from "@/components/admin/setup-fee-modal";

export default function BillingPage() {
  const userInfo = useUserDisplay();
  const { isSimpillerAdmin } = useAuth();
  
  // Billing analytics state
  const [billingFilters, setBillingFilters] = useState<BillingFilters>({
    status: 'all',
    billingMonth: new Date().toISOString().slice(0, 7) // Current month YYYY-MM
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'pdf'>('csv');
  const [showSetupFeeModal, setShowSetupFeeModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<{
    id: string;
    name: string;
    setup_fee: number;
  } | null>(null);
  
  const { 
    data: billingData, 
    loading: billingLoading, 
    error: billingError 
  } = useBillingAnalytics(billingFilters);

  if (!isSimpillerAdmin) {
    return <AccessDenied message="Simpiller Admin access required." />;
  }

  const handleDownloadReport = (organizationId?: string) => {
    if (!billingData?.organizations) return;
    
    const organizations = organizationId 
      ? billingData.organizations.filter(org => org.id === organizationId)
      : billingData.organizations;
    
    downloadBillingReport(organizations, downloadFormat, undefined, billingFilters.billingMonth);
  };

  const handleEditSetupFee = (org: BillingOrganization) => {
    setEditingOrganization({
      id: org.id,
      name: org.name,
      setup_fee: org.setup_fee
    });
    setShowSetupFeeModal(true);
  };

  const handleSetupFeeUpdate = () => {
    // Refresh the billing data after setup fee update
    window.location.reload();
  };

  const handleFilterChange = (key: keyof BillingFilters, value: string | undefined) => {
    setBillingFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setBillingFilters({
      status: 'all',
      billingMonth: new Date().toISOString().slice(0, 7)
    });
    setSelectedOrganization(null);
  };

  const filteredOrganizations = billingData?.organizations || [];
  const currentMonthName = billingFilters.billingMonth 
    ? new Date(billingFilters.billingMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  // Show loading state
  if (billingLoading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/billing" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Billing Management" 
              subtitle="Revenue tracking and organization billing"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-900">Loading billing data...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show error state
  if (billingError) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/billing" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Billing Management" 
              subtitle="Revenue tracking and organization billing"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error loading billing data: {billingError}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-2"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!billingData) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/billing" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Billing Management" 
              subtitle="Revenue tracking and organization billing"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">No billing data available.</p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const billingMetrics = [
    { 
      title: "Total Organizations", 
      value: billingData.totalOrganizations.toLocaleString(), 
      icon: Building2, 
      color: "text-blue-600",
      subtitle: "Active organizations"
    },
    { 
      title: "New This Month", 
      value: billingData.newOrganizationsThisMonth.toLocaleString(), 
      icon: Users, 
      color: "text-green-600",
      subtitle: "New organizations"
    },
    { 
      title: "Monthly Billing", 
      value: `$${billingData.totalMonthlyBilling.toLocaleString()}`, 
      icon: DollarSign, 
      color: "text-purple-600",
      subtitle: "Recurring patient fees"
    },
    { 
      title: "Setup Fee Billing", 
      value: `$${billingData.totalSetupFeeBilling.toLocaleString()}`, 
      icon: TrendingUp, 
      color: "text-orange-600",
      subtitle: "One-time setup fees"
    }
  ];

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/admin/billing" />
        <div className="flex-1 overflow-auto">
          <Header 
            title="Billing Management" 
            subtitle="Revenue tracking and organization billing"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
                <p className="text-gray-600">Revenue tracking and organization billing for {currentMonthName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  💡 <strong>Billing Logic:</strong> New organizations this month pay setup fee + monthly fees. 
                  Existing organizations pay only monthly fees.
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <div className="flex items-center space-x-2">
                  <select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value as 'csv' | 'pdf')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-black focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <Button 
                    onClick={() => handleDownloadReport()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download {downloadFormat.toUpperCase()}
                  </Button>
                </div>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base text-black">Filter Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-black">Billing Month</Label>
                      <Input
                        type="month"
                        value={billingFilters.billingMonth || ''}
                        onChange={(e) => handleFilterChange('billingMonth', e.target.value)}
                        className="mt-1 bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Select any month to view historical billing</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-black">Status</Label>
                      <select
                        value={billingFilters.status || 'all'}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 bg-white text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="all">All Organizations</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-black">Date Range Start</Label>
                      <Input
                        type="month"
                        value={billingFilters.dateRange?.start || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...billingFilters.dateRange,
                          start: e.target.value
                        })}
                        className="mt-1 bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Start month for date range</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-black">Date Range End</Label>
                      <Input
                        type="month"
                        value={billingFilters.dateRange?.end || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...billingFilters.dateRange,
                          end: e.target.value
                        })}
                        className="mt-1 bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">End month for date range</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" onClick={clearFilters} size="sm" className="bg-white text-black border-gray-300 hover:bg-gray-50">
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {billingMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            {metric.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                          <p className="text-sm text-gray-600">{metric.subtitle}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${metric.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Organizations Table */}
            <Card key={`billing-table-${billingFilters.billingMonth}`}>
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Organization Billing Details - {billingFilters.billingMonth 
                    ? new Date(billingFilters.billingMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                  }
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Click on an organization to view detailed billing information. New organizations this month are highlighted.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monthly Fees
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New This Month
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Setup Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Billing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrganizations.map((org) => (
                        <tr key={org.id} className={`hover:bg-gray-50 ${org.is_new_this_month ? 'bg-green-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {org.name}
                            {org.is_new_this_month && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                NEW
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {org.patient_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${org.monthly_billing_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {org.is_new_this_month ? 'Yes' : 'No'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${org.setup_fee_billing_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${(org.monthly_billing_amount + org.setup_fee_billing_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              org.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {org.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrganization(org.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSetupFee(org)}
                                title="Edit Setup Fee"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadReport(org.id)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Organization Detail Modal */}
            {selectedOrganization && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Organization Details
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrganization(null)}
                    >
                      ×
                    </Button>
                  </div>
                  
                  {(() => {
                    const org = filteredOrganizations.find(o => o.id === selectedOrganization);
                    if (!org) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Organization Name</Label>
                            <p className="text-lg font-semibold text-gray-900">{org.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Status</Label>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              org.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {org.status}
                            </span>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Patient Count</Label>
                            <p className="text-lg font-semibold text-gray-900">{org.patient_count}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Setup Fee</Label>
                            <div className="flex items-center space-x-2">
                              <p className="text-lg font-semibold text-gray-900">${org.setup_fee.toFixed(2)}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrganization(null);
                                  handleEditSetupFee(org);
                                }}
                                className="ml-2"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Monthly Revenue</Label>
                            <p className="text-lg font-semibold text-gray-900">${org.monthly_revenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Total Revenue</Label>
                            <p className="text-lg font-semibold text-gray-900">${org.total_revenue.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedOrganization(null)}
                          >
                            Close
                          </Button>
                          <Button
                            onClick={() => handleDownloadReport(org.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Report
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Setup Fee Modal */}
            {editingOrganization && (
              <SetupFeeModal
                organization={editingOrganization}
                isOpen={showSetupFeeModal}
                onClose={() => {
                  setShowSetupFeeModal(false);
                  setEditingOrganization(null);
                }}
                onUpdate={handleSetupFeeUpdate}
              />
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 