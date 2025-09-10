'use client';

import {
  Home,
  Users,
  Pill,
  Calendar,
  Bell,
  Settings,
  Building2,
  Activity,
  Phone,
  LogOut,
  TestTube,
  Eye
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Patients', href: '/patients', icon: Users, requiredRole: 'provider' },
  { name: 'Medications', href: '/medications', icon: Pill, requiredRole: 'provider' },
  { name: 'Schedule', href: '/schedule', icon: Calendar, requiredRole: 'provider' },
  { name: 'Alerts', href: '/alerts', icon: Bell, requiredRole: 'provider' },
  { name: 'SMS Test', href: '/sms-test', icon: TestTube, requiredRole: 'simpiller_admin' },
  { name: 'Analytics', href: '/analytics', icon: Activity, requiredRole: 'organization_admin' },
  { name: 'Facilities', href: '/facilities', icon: Building2, requiredRole: 'organization_admin' },
  { name: 'Pharmacies', href: '/pharmacies', icon: Building2, requiredRole: 'organization_admin' },
  { name: 'Organization Users', href: '/organization-users', icon: Users, requiredRole: 'organization_admin' },
  { name: 'Admin', href: '/admin', icon: Settings, requiredRole: 'simpiller_admin' },
];

interface SidebarProps {
  currentPage?: string;
}

export function Sidebar({ currentPage = '/' }: SidebarProps) {
  const { signOut, user, isSimpillerAdmin, isOrganizationAdmin, isProvider } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect to login page as fallback
      window.location.href = '/login';
    }
  };

  // Filter navigation items based on user roles (fine-grained)
  const filteredNavigation = navigation.filter(item => {
    const role = item.requiredRole;
    if (!role) return true;
    if (role === 'simpiller_admin') return isSimpillerAdmin;
    if (role === 'organization_admin') return isOrganizationAdmin; // Simpiller admins do not see org-admin-only items
    if (role === 'provider') return isSimpillerAdmin || isOrganizationAdmin || isProvider;
    return true;
  });

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">Simpiller</h1>
        <p className="text-sm text-gray-500 mt-1">Medication Management</p>
      </div>

      <nav className="flex-1">
        <div className="px-4 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center px-3 py-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-blue-600 font-medium text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email || 'User'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full mt-2 flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
} 