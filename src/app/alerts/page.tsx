'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, Bell, AlertTriangle, Clock, XCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";

export default function AlertsPage() {
  const userInfo = useUserDisplay();

  const alerts = [
    { id: 1, type: "missed_dose", patient: "Emily Davis", medication: "Amlodipine", message: "Missed dose - 2 hours overdue", time: "2 hours ago", status: "pending", priority: "high" },
    { id: 2, type: "medication_due", patient: "Sarah Wilson", medication: "Metformin", message: "Medication due in 30 minutes", time: "30 minutes ago", status: "pending", priority: "medium" },
    { id: 3, type: "low_compliance", patient: "Mike Johnson", medication: "Atorvastatin", message: "Compliance rate below 80%", time: "1 hour ago", status: "acknowledged", priority: "medium" },
    { id: 4, type: "medication_due", patient: "John Doe", medication: "Lisinopril", message: "Medication due now", time: "5 minutes ago", status: "pending", priority: "high" },
    { id: 5, type: "system_alert", patient: "System", medication: "N/A", message: "SMS service temporarily unavailable", time: "10 minutes ago", status: "resolved", priority: "low" },
    { id: 6, type: "missed_dose", patient: "Emily Davis", medication: "Omeprazole", message: "Missed dose - 4 hours overdue", time: "4 hours ago", status: "pending", priority: "high" }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'missed_dose': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'medication_due': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low_compliance': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'system_alert': return <Bell className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'missed_dose': return 'Missed Dose';
      case 'medication_due': return 'Medication Due';
      case 'low_compliance': return 'Low Compliance';
      case 'system_alert': return 'System Alert';
      default: return 'Alert';
    }
  };

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/alerts" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Alerts" 
            subtitle="Monitor medication alerts and system notifications"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
                <p className="text-gray-800">Monitor medication alerts and system notifications</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  Mark All Read
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Bell className="mr-2 h-4 w-4" />
                  New Alert
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search alerts..."
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {alert.patient !== 'System' ? `${alert.patient} - ${alert.medication}` : alert.message}
                            </h3>
                            <p className="text-sm text-gray-800 mt-1">
                              {alert.patient === 'System' ? alert.message : alert.message}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                              {alert.status}
                            </span>
                            <span className={`text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                              {alert.priority}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{getTypeLabel(alert.type)}</span>
                            <span>•</span>
                            <span>{alert.time}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              Acknowledge
                            </Button>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 