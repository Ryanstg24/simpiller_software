'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Pill, Calendar, Download } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAnalytics } from "@/hooks/use-analytics";

export default function AnalyticsPage() {
  const userInfo = useUserDisplay();
  const { data, loading, error } = useAnalytics();

  const getActivityColor = (type: string) => {
    switch (type) {
      case "compliance_improved": return "bg-green-400";
      case "new_patient": return "bg-blue-400";
      case "medication_added": return "bg-purple-400";
      case "alert_resolved": return "bg-yellow-400";
      default: return "bg-gray-400";
    }
  };

  // Show loading state
  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Analytics" 
              subtitle="View insights and performance metrics"
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
  if (error) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/analytics" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Analytics" 
              subtitle="View insights and performance metrics"
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

  const metrics = [
    { 
      title: "Overall Compliance", 
      value: data.overallCompliance > 0 ? `${data.overallCompliance}%` : "Not tracked", 
      change: "N/A", 
      changeType: "neutral" as "increase" | "decrease" | "neutral", 
      icon: TrendingUp, 
      color: "text-green-600" 
    },
    { 
      title: "Active Patients", 
      value: data.activePatients.toLocaleString(), 
      change: "N/A", 
      changeType: "neutral" as "increase" | "decrease" | "neutral", 
      icon: Users, 
      color: "text-blue-600" 
    },
    { 
      title: "Medications", 
      value: data.totalMedications.toLocaleString(), 
      change: "N/A", 
      changeType: "neutral" as "increase" | "decrease" | "neutral", 
      icon: Pill, 
      color: "text-purple-600" 
    },
    { 
      title: "Days Since Last Alert", 
      value: data.daysSinceLastAlert > 0 ? data.daysSinceLastAlert.toString() : "N/A", 
      change: "N/A", 
      changeType: "neutral" as "increase" | "decrease" | "neutral", 
      icon: Calendar, 
      color: "text-yellow-600" 
    }
  ];

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
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
                        userInfo.role === 'simpiller_admin' ? 'All organizations and patients across the platform' :
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
                <p className="text-gray-900">View insights and performance metrics</p>
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
                          <p className="text-sm font-medium text-gray-900">
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
                    {data.complianceTrend.map((trendData, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-8 bg-blue-500 rounded-t"
                          style={{ height: `${(trendData.compliance / 100) * 200}px` }}
                        ></div>
                        <p className="text-xs text-gray-900 mt-2">{trendData.month}</p>
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
                    {data.medicationTypes.map((medType, index) => (
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
                  {data.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <p className="text-sm text-gray-900">{activity.time}</p>
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