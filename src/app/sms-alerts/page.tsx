'use client';

import { useState, useMemo } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { useSMSAlerts } from "@/hooks/use-sms-alerts";
import { AccessDenied } from "@/components/auth/access-denied";
import { Search, Send, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface SMSAlert {
  id: string;
  patient_id: string;
  medication_ids: string[];
  alert_type: 'sms_reminder' | 'follow_up' | 'compliance_summary';
  scheduled_time: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  scan_session_id?: string;
  created_at: string;
  
  // Joined data
  patients?: {
    first_name: string;
    last_name: string;
    phone1: string;
  };
  medications?: Array<{
    medication_name: string;
    dosage: string;
  }>;
}

export default function SMSAlertsPage() {
  const userInfo = useUserDisplay();
  const { 
    alerts, 
    loading, 
    error, 
    refetch, 
    sendReminder, 
    isSendingReminder,
    getAlertStats 
  } = useSMSAlerts();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  const stats = getAlertStats();

  const filteredAlerts = (alerts as SMSAlert[]).filter((alert: SMSAlert) => {
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    if (filterType !== 'all' && alert.alert_type !== filterType) return false;
    
    // Date range filtering
    const alertDate = new Date(alert.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (dateRange) {
      case '1d':
        return daysDiff <= 1;
      case '7d':
        return daysDiff <= 7;
      case '30d':
        return daysDiff <= 30;
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sms_reminder':
        return 'bg-blue-100 text-blue-800';
      case 'follow_up':
        return 'bg-orange-100 text-orange-800';
      case 'compliance_summary':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleResendAlert = (alert: SMSAlert) => {
    if (alert.patients && alert.medication_ids) {
      sendReminder({
        patientId: alert.patient_id,
        medicationIds: alert.medication_ids,
        scheduledTime: new Date().toISOString(),
      });
    }
  };

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/sms-alerts" />
        
        <div className="flex-1 overflow-auto">
          <Header 
            title="SMS Alerts" 
            subtitle="Manage medication reminders and view alert history"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SMS Alerts</h1>
                <p className="text-gray-600">Monitor and manage medication reminder alerts</p>
              </div>
              <Button 
                variant="outline"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Summary Stats */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sent Successfully</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <XCircle className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Failed</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sent Successfully</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <XCircle className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Failed</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="sms_reminder">Reminder</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="compliance_summary">Compliance Summary</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="1d">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Alerts List */}
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Alerts...</h3>
                  <p className="text-gray-600 mb-4">Please wait while we fetch the alert history.</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Alerts</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={() => refetch()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                  <p className="text-gray-600 mb-4">
                    {filterStatus !== 'all' || filterType !== 'all' || dateRange !== 'all'
                      ? 'Try adjusting your filters.'
                      : 'No SMS alerts have been sent yet.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    Alert History ({filteredAlerts.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {filteredAlerts.map((alert) => (
                    <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Send className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-medium text-gray-900">
                                {alert.patients ? `${alert.patients.first_name} ${alert.patients.last_name}` : 'Unknown Patient'}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                                {alert.status}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(alert.alert_type)}`}>
                                {alert.alert_type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {alert.medications && (
                                <p>
                                  <strong>Medications:</strong> {alert.medications.map((m: any) => m.medication_name).join(', ')}
                                </p>
                              )}
                              <p>
                                <strong>Scheduled:</strong> {formatDate(alert.scheduled_time)}
                              </p>
                              {alert.sent_at && (
                                <p>
                                  <strong>Sent:</strong> {formatDate(alert.sent_at)}
                                </p>
                              )}
                              <p>
                                <strong>Created:</strong> {formatDate(alert.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {alert.status === 'failed' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendAlert(alert)}
                              disabled={isSendingReminder}
                            >
                              <RefreshCw className={`mr-2 h-3 w-3 ${isSendingReminder ? 'animate-spin' : ''}`} />
                              Resend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 