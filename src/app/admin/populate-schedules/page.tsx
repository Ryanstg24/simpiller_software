'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function PopulateSchedulesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    schedulesCreated?: number;
    errors?: number;
    details?: string[];
  } | null>(null);

  const populateSchedules = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/populate-medication-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to populate schedules',
        details: [String(error)]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={["simpiller_admin"]}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Populate Medication Schedules</CardTitle>
              <CardDescription>
                This will create medication schedules based on patient medication times and preferences.
                Run this after adding new medications or updating patient time preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={populateSchedules}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Populating Schedules...
                  </>
                ) : (
                  'Populate Medication Schedules'
                )}
              </Button>

              {result && (
                <div className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <h3 className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? 'Success!' : 'Error'}
                    </h3>
                  </div>
                  
                  <div className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    <p>{result.message || result.error}</p>
                    
                    {result.schedulesCreated !== undefined && (
                      <p className="mt-2">
                        <strong>Schedules Created:</strong> {result.schedulesCreated}
                      </p>
                    )}
                    
                    {result.errors !== undefined && result.errors > 0 && (
                      <p className="mt-2">
                        <strong>Errors:</strong> {result.errors}
                      </p>
                    )}
                    
                    {result.details && result.details.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium">Details:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {result.details.map((detail: string, index: number) => (
                            <li key={index} className="text-xs">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-medium">What this does:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Reads all active medications and their time preferences</li>
                  <li>Creates entries in the medication_schedules table</li>
                  <li>Uses patient time preferences (morning_time, afternoon_time, evening_time)</li>
                  <li>Handles custom times and multiple daily doses</li>
                  <li>Clears existing schedules before creating new ones</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
