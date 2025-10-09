'use client';

import { 
  Users, 
  AlertTriangle, 
  UserPlus, 
  Activity
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuthV2 } from "@/contexts/auth-context-v2";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { StatsCardSkeleton } from "@/components/ui/loading-skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoading, user } = useAuthV2();
  const userInfo = useUserDisplay();
  const { stats, loading: statsLoading, error } = useDashboardStats();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);


  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Initializing...</p>
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
    totalPatients: 0,
    needsAttention: 0,
    newPatientsThisMonth: 0,
    activePatients: 0,
    recentActivity: []
  };

  const statsCards = [
    {
      title: "Total Patients",
      value: safeStats.totalPatients.toLocaleString(),
      icon: Users,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100"
    },
    {
      title: "Needs Attention",
      value: safeStats.needsAttention.toLocaleString(),
      icon: AlertTriangle,
      iconColor: "text-red-600",
      iconBgColor: "bg-red-100"
    },
    {
      title: "New This Month",
      value: safeStats.newPatientsThisMonth.toLocaleString(),
      icon: UserPlus,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100"
    },
    {
      title: "Active Patients",
      value: safeStats.activePatients.toLocaleString(),
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
              {statsLoading ? (
                <>
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </>
              ) : (
                statsCards.map((stat, index) => (
                  <StatsCard key={index} {...stat} />
                ))
              )}
            </div>

            {/* Charts Section - Coming Soon */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Dashboard</h3>
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Activity className="h-16 w-16 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Charts Coming Soon</h4>
                <p className="text-gray-600">
                  We&apos;re building interactive charts for adherence trends, patient status distribution, 
                  medication compliance heatmap, and cycle progress tracking.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
