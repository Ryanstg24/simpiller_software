'use client';

import { useState } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  Users, 
  Pill, 
  Calendar, 
  Download, 
  DollarSign, 
  Building2, 
  Filter,
  FileText,
  RefreshCw
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAnalytics } from "@/hooks/use-analytics";
import { 
  useBillingAnalytics, 
  downloadBillingReport, 
  BillingFilters 
} from "@/hooks/use-billing-analytics";

export default function AnalyticsPage() {
  const userInfo = useUserDisplay();
  const { data: regularData, loading: regularLoading, error: regularError } = useAnalytics();
  
  // Billing analytics state
  const [billingFilters, setBillingFilters] = useState<BillingFilters>({
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const { 
    data: billingData, 
    loading: billingLoading, 
    error: billingError 
  } = useBillingAnalytics(billingFilters);

  // Determine if user is Simpiller Admin
  const isSimpillerAdmin = userInfo.role === 'simpiller_admin';

  const handleDownloadReport = () => {
    if (billingData?.organizations) {
      const date = new Date().toISOString().split('T')[0];
      downloadBillingReport(billingData.organizations, `simpiller-billing-report-${date}.csv`);
    }
  };

  const handleFilterChange = (key: keyof BillingFilters, value: any) => {
    setBillingFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setBillingFilters({
      status: 'all'
    });
  };

  // Show loading state
  if ((isSimpillerAdmin && billingLoading) || (!isSimpillerAdmin && regularLoading)) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Analytics" 
              subtitle={isSimpillerAdmin ? "Billing Analytics & Revenue Tracking" : "View insights and performance metrics"}
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-900">Loading analytics...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show error state
  if ((isSimpillerAdmin && billingError) || (!isSimpillerAdmin && regularError)) {
    const error = isSimpillerAdmin ? billingError : regularError;
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Analytics" 
              subtitle={isSimpillerAdmin ? "Billing Analytics & Revenue Tracking" : "View insights and performance metrics"}
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error loading analytics: {error}</p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Simpiller Admin Billing Analytics View
  if (isSimpillerAdmin && billingData) {
    const billingMetrics = [
      { 
        title: "Total Organizations", 
        value: billingData.totalOrganizations.toLocaleString(), 
        icon: Building2, 
        color: "text-blue-600",
        subtitle: "Active organizations"
      },
      { 
        title: "Total Patients", 
        value: billingData.totalPatients.toLocaleString(), 
        icon: Users, 
        color: "text-green-600",
        subtitle: "Across all organizations"
      },
      { 
        title: "Monthly Revenue", 
        value: `$${billingData.totalMonthlyRevenue.toLocaleString()}`, 
        icon: DollarSign, 
        color: "text-purple-600",
        subtitle: "Recurring monthly"
      },
      { 
        title: "Total Revenue", 
        value: `$${billingData.totalRevenue.toLocaleString()}`, 
        icon: TrendingUp, 
        color: "text-orange-600",
        subtitle: "Setup + Monthly fees"
      }
    ];

    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Billing Analytics" 
              subtitle="Revenue tracking and organization billing"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />

            <main className="p-6">
              {/* Page Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Billing Analytics</h1>
                  <p className="text-gray-600">Revenue tracking and organization billing for Simpiller</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                  <Button 
                    onClick={handleDownloadReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Filter Organizations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <select
                          value={billingFilters.status || 'all'}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="all">All Organizations</option>
                          <option value="active">Active Only</option>
                          <option value="inactive">Inactive Only</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Date Range Start</Label>
                        <Input
                          type="date"
                          value={billingFilters.dateRange?.start || ''}
                          onChange={(e) => handleFilterChange('dateRange', {
                            ...billingFilters.dateRange,
                            start: e.target.value
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Date Range End</Label>
                        <Input
                          type="date"
                          value={billingFilters.dateRange?.end || ''}
                          onChange={(e) => handleFilterChange('dateRange', {
                            ...billingFilters.dateRange,
                            end: e.target.value
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" onClick={clearFilters} size="sm">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Organization Billing Details</CardTitle>
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
                            Setup Fee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patients
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monthly Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {billingData.organizations.map((org) => (
                          <tr key={org.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {org.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${org.setup_fee.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {org.patient_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${org.monthly_revenue.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${org.total_revenue.toFixed(2)}
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(org.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Regular Analytics View for Organization Admins and Providers
  if (!isSimpillerAdmin && regularData) {
    const metrics = [
      { 
        title: "Overall Compliance", 
        value: regularData.overallCompliance > 0 ? `${regularData.overallCompliance}%` : "Not tracked", 
        change: "N/A", 
        changeType: "neutral" as "increase" | "decrease" | "neutral", 
        icon: TrendingUp, 
        color: "text-green-600" 
      },
      { 
        title: "Active Patients", 
        value: regularData.activePatients.toLocaleString(), 
        change: "N/A", 
        changeType: "neutral" as "increase" | "decrease" | "neutral", 
        icon: Users, 
        color: "text-blue-600" 
      },
      { 
        title: "Medications", 
        value: regularData.totalMedications.toLocaleString(), 
        change: "N/A", 
        changeType: "neutral" as "increase" | "decrease" | "neutral", 
        icon: Pill, 
        color: "text-purple-600" 
      },
      { 
        title: "Days Since Last Alert", 
        value: regularData.daysSinceLastAlert > 0 ? regularData.daysSinceLastAlert.toString() : "N/A", 
        change: "N/A", 
        changeType: "neutral" as "increase" | "decrease" | "neutral", 
        icon: Calendar, 
        color: "text-yellow-600" 
      }
    ];

    return (
      <ProtectedRoute requiredRoles={['organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Analytics" 
              subtitle="View insights and performance metrics"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />

            <main className="p-6">
              {/* Role Context */}
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Viewing analytics for:</strong> {
                          userInfo.role === 'organization_admin' ? 'Your organization only' :
                          'Your assigned patients only'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                  <p className="text-gray-600">View insights and performance metrics</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Last 30 Days
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {metrics.map((metric, index) => {
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
                            <p className={`text-sm font-medium ${
                              metric.changeType === 'increase' ? 'text-green-600' : 
                              metric.changeType === 'decrease' ? 'text-red-600' : 
                              'text-gray-600'
                            }`}>
                              {metric.change === 'N/A' ? 'No historical data' : `${metric.change} from last month`}
                            </p>
                          </div>
                          <Icon className={`h-8 w-8 ${metric.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Compliance Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Compliance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between space-x-2">
                      {regularData.complianceTrend.map((trendData, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div
                            className="w-8 bg-blue-500 rounded-t"
                            style={{ height: `${(trendData.compliance / 100) * 200}px` }}
                          ></div>
                          <p className="text-xs text-gray-600 mt-2">{trendData.month}</p>
                          <p className="text-xs font-medium text-gray-900">{trendData.compliance}%</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Medication Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Medication Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {regularData.medicationTypes.map((medType, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium text-gray-900">{medType.type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${medType.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">{medType.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {regularData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className={`w-2 h-2 ${
                          activity.type === 'compliance_improved' ? 'bg-green-400' :
                          activity.type === 'new_patient' ? 'bg-blue-400' :
                          activity.type === 'medication_added' ? 'bg-purple-400' :
                          'bg-yellow-400'
                        } rounded-full`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                          <p className="text-sm text-gray-600">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return null;
} 