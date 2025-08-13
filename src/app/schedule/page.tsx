'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Pill, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";

export default function SchedulePage() {
  const userInfo = useUserDisplay();

  const scheduleItems = [
    {
      id: 1,
      time: "08:00",
      patient: "John Doe",
      medication: "Lisinopril",
      dosage: "10mg",
      status: "completed",
      type: "morning"
    },
    {
      id: 2,
      time: "08:30",
      patient: "Sarah Wilson",
      medication: "Metformin",
      dosage: "500mg",
      status: "completed",
      type: "morning"
    },
    {
      id: 3,
      time: "12:00",
      patient: "Mike Johnson",
      medication: "Atorvastatin",
      dosage: "20mg",
      status: "upcoming",
      type: "afternoon"
    },
    {
      id: 4,
      time: "14:00",
      patient: "Emily Davis",
      medication: "Amlodipine",
      dosage: "5mg",
      status: "overdue",
      type: "afternoon"
    },
    {
      id: 5,
      time: "18:00",
      patient: "Sarah Wilson",
      medication: "Metformin",
      dosage: "500mg",
      status: "upcoming",
      type: "evening"
    },
    {
      id: 6,
      time: "20:00",
      patient: "John Doe",
      medication: "Omeprazole",
      dosage: "20mg",
      status: "upcoming",
      type: "evening"
    },
    {
      id: 7,
      time: "22:00",
      patient: "Mike Johnson",
      medication: "Losartan",
      dosage: "50mg",
      status: "upcoming",
      type: "night"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'overdue': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'upcoming': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTimeGroup = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const groupedSchedule = scheduleItems.reduce((groups, item) => {
    const group = getTimeGroup(item.time);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, typeof scheduleItems>);

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/schedule" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Schedule" 
            subtitle="View medication schedules and upcoming doses"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                <p className="text-gray-800">View medication schedules and upcoming doses</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar View
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Pill className="mr-2 h-4 w-4" />
                  Add Schedule
                </Button>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming</p>
                      <p className="text-2xl font-bold text-gray-900">4</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-8 w-8 text-red-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-gray-900">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Alerts</p>
                      <p className="text-2xl font-bold text-gray-900">3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Timeline */}
            <div className="space-y-6">
              {Object.entries(groupedSchedule).map(([timeGroup, items]) => (
                <Card key={timeGroup}>
                  <CardHeader>
                    <CardTitle className="text-gray-900">
                      {timeGroup === 'morning' && 'Morning (6:00 AM - 12:00 PM)'}
                      {timeGroup === 'afternoon' && 'Afternoon (12:00 PM - 6:00 PM)'}
                      {timeGroup === 'evening' && 'Evening (6:00 PM - 10:00 PM)'}
                      {timeGroup === 'night' && 'Night (10:00 PM - 6:00 AM)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {getStatusIcon(item.status)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.time}</p>
                              <p className="text-xs text-gray-600">{item.patient}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Pill className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">{item.medication}</span>
                              <span className="text-sm text-gray-600">({item.dosage})</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
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