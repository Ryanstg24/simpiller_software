'use client';

import { 
  Users, 
  Pill, 
  Bell, 
  Activity
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoading, user } = useAuth();
  const userInfo = useUserDisplay();
  const { stats, loading: statsLoading, error } = useDashboardStats();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-400";
      case "info": return "bg-blue-400";
      case "warning": return "bg-yellow-400";
      case "error": return "bg-red-400";
      default: return "bg-gray-400";
    }
  };

  // Show loading state while auth is initializing or stats are loading
  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">
            {isLoading ? 'Initializing...' : 'Loading dashboard data...'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show error state if there's an error
  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Dashboard" 
              subtitle={`Welcome back, ${userInfo.name}`}
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error loading dashboard: {error}</p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Ensure stats object exists and has default values
  const safeStats = stats || {
    activePatients: 0,
    totalMedications: 0,
    todaysAlerts: 0,
    complianceRate: 0,
    recentActivity: []
  };

  const statsCards = [
    {
      title: "Active Patients",
      value: safeStats.activePatients.toLocaleString(),
      icon: Users,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100"
    },
    {
      title: "Medications",
      value: safeStats.totalMedications.toLocaleString(),
      icon: Pill,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100"
    },
    {
      title: "Today's Alerts",
      value: safeStats.todaysAlerts.toString(),
      icon: Bell,
      iconColor: "text-yellow-600",
      iconBgColor: "bg-yellow-100"
    },
    {
      title: "Compliance Rate",
      value: `${safeStats.complianceRate}%`,
      icon: Activity,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-100"
    }
  ];

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/" />
        <div className="flex-1 overflow-auto">
          <Header 
            title="Dashboard" 
            subtitle={`Welcome back, ${userInfo.name}`}
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          {/* Dashboard Content */}
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
                      <strong>Viewing data for:</strong> {
                        userInfo.role === 'simpiller_admin' ? 'All organizations and patients across the platform' :
                        userInfo.role === 'organization_admin' ? 'Your organization only' :
                        'Your assigned patients only'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((stat, index) => (
                <StatsCard key={index} {...stat} />
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {safeStats.recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent activity to display.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {safeStats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                          <p className="text-sm text-gray-800">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
