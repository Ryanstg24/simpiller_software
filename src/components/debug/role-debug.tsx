'use client';

import { useAuth } from '@/contexts/auth-context';

export function RoleDebug() {
  const { 
    user, 
    userRoles, 
    isSimpillerAdmin, 
    isOrganizationAdmin, 
    isProvider, 
    isBilling 
  } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-gray-900 mb-2">Role Debug Info</h3>
      <div className="text-xs space-y-1">
        <p><strong>User ID:</strong> {user?.id || 'None'}</p>
        <p><strong>User Email:</strong> {user?.email || 'None'}</p>
        <p><strong>User Roles Array:</strong></p>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(userRoles, null, 2)}
        </pre>
        <p><strong>Boolean Flags:</strong></p>
        <ul className="ml-4">
          <li>isSimpillerAdmin: {isSimpillerAdmin ? '✅' : '❌'}</li>
          <li>isOrganizationAdmin: {isOrganizationAdmin ? '✅' : '❌'}</li>
          <li>isProvider: {isProvider ? '✅' : '❌'}</li>
          <li>isBilling: {isBilling ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  );
} 