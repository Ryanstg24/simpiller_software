'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RLSDebug() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const info: any = {};

    try {
      // Test 1: Check current user
      info.currentUser = user;
      info.userId = user?.id;

      // Test 2: Check if we can access users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', user?.id)
        .single();
      
      info.userQuery = { data: userData, error: userError };

      // Test 3: Check if we can access organizations table
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1);
      
      info.orgQuery = { data: orgData, error: orgError };

      // Test 4: Check if we can access facilities table
      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select('id, name')
        .limit(1);
      
      info.facilityQuery = { data: facilityData, error: facilityError };

      // Test 5: Check if we can access patients table
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .limit(1);
      
      info.patientQuery = { data: patientData, error: patientError };

      // Test 6: Check user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id, name, organization_id');
      
      info.roleQuery = { data: roleData, error: roleError };

      // Test 7: Check user role assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          role_id,
          user_roles (
            name,
            organization_id
          )
        `)
        .eq('user_id', user?.id);
      
      info.assignmentQuery = { data: assignmentData, error: assignmentError };

    } catch (error) {
      info.exception = error;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-red-600">RLS Debug (Remove in Production)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDiagnostics} disabled={loading} className="mb-4">
          {loading ? 'Running Diagnostics...' : 'Run RLS Diagnostics'}
        </Button>
        
        {Object.keys(debugInfo).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Debug Information:</h4>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 