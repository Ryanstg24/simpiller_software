'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, Settings, Shield, DollarSign } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { AccessDenied } from "@/components/auth/access-denied";
import Link from "next/link";

export default function AdminPage() {
  const userInfo = useUserDisplay();
  const { isSimpillerAdmin } = useAuth();

  if (!isSimpillerAdmin) {
    return <AccessDenied message="Simpiller Admin access required." />;
  }

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/admin" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Admin Dashboard" 
            subtitle="System administration and management"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-800">Manage organizations, facilities, and system settings</p>
              </div>
            </div>

            {/* Admin Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Organizations Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Organizations</CardTitle>
                      <p className="text-sm text-gray-600">Manage healthcare organizations</p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Create, edit, and manage healthcare organizations in the system.
                    </p>
                    <div className="flex space-x-2">
                      <Link href="/admin/organizations/add">
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Organization
                        </Button>
                      </Link>
                      <Link href="/admin/organizations">
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Billing Management</CardTitle>
                      <p className="text-sm text-gray-600">Revenue tracking and invoicing</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Track revenue, view organization billing, and generate invoices.
                    </p>
                    <div className="flex space-x-2">
                      <Link href="/admin/billing">
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                          <DollarSign className="mr-2 h-4 w-4" />
                          View Billing
                        </Button>
                      </Link>
                      <Link href="/admin/billing">
                        <Button variant="outline" size="sm">
                          Download Reports
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Facilities Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Facilities</CardTitle>
                      <p className="text-sm text-gray-600">Manage healthcare facilities</p>
                    </div>
                    <Building2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Create and manage facilities across all organizations.
                    </p>
                    <div className="flex space-x-2">
                      <Link href="/facilities">
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Facility
                        </Button>
                      </Link>
                      <Link href="/facilities">
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Users</CardTitle>
                      <p className="text-sm text-gray-600">Manage system users</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Manage user accounts, roles, and permissions.
                    </p>
                    <div className="flex space-x-2">
                      <Link href="/admin/users/add">
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="mr-2 h-4 w-4" />
                          Add User
                        </Button>
                      </Link>
                      <Link href="/admin/users">
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pharmacies Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Pharmacies</CardTitle>
                      <p className="text-sm text-gray-600">Manage healthcare pharmacies</p>
                    </div>
                    <Shield className="h-8 w-8 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Create and manage healthcare pharmacies.
                    </p>
                    <div className="flex space-x-2">
                      <Link href="/admin/pharmacies">
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Pharmacy
                        </Button>
                      </Link>
                      <Link href="/admin/pharmacies">
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Settings */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">System Settings</CardTitle>
                      <p className="text-sm text-gray-600">Configure system preferences</p>
                    </div>
                    <Settings className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Manage system-wide settings and configurations.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics & Reports */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Analytics</CardTitle>
                      <p className="text-sm text-gray-600">System-wide analytics</p>
                    </div>
                    <Building2 className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      View system-wide analytics and performance metrics.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">System Health</CardTitle>
                      <p className="text-sm text-gray-600">Monitor system status</p>
                    </div>
                    <Building2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Monitor system health, performance, and uptime.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 