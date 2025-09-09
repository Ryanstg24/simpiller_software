'use client';

import { useState } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  CheckCircle, 
  XCircle
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";

interface TestSMSResponse {
  success: boolean;
  message: string;
  testMode: boolean;
  scanLink: string;
  reminder: {
    patientName: string;
    patientPhone: string;
    medicationNames: string[];
    scheduledTime: string;
  };
}

export default function SMSTestPage() {
  const userInfo = useUserDisplay();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestSMSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    patientName: 'John Doe',
    patientPhone: '+1234567890',
    medicationNames: 'Advil, Tylenol',
    scheduledTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), // Local time
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('🚀 Form submitted!');
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestData = {
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        medicationNames: formData.medicationNames.split(',').map(name => name.trim()),
        scheduledTime: formData.scheduledTime,
      };
      console.log('📤 Sending request to /api/sms/test-send with data:', requestData);
      
      const response = await fetch('/api/sms/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Response received:', response.status, response.statusText);
      const data = await response.json();
      console.log('📋 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      setResult(data);
    } catch (err) {
      console.error('💥 Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      patientName: 'John Doe',
      patientPhone: '+1234567890',
      medicationNames: 'Advil, Tylenol',
      scheduledTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    });
    setResult(null);
    setError(null);
  };

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/sms-test" />
        
        <div className="flex-1 overflow-auto">
          <Header 
            title="SMS Test" 
            subtitle="Test SMS functionality during development"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            <div className="max-w-2xl mx-auto">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-black">SMS Test Console</h1>
                <p className="text-gray-600 mt-2">
                  Test SMS functionality locally. Messages will be logged to the console instead of being sent.
                </p>
              </div>

              {/* Test Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="mr-2 h-5 w-5 text-black" />
                    Send Test SMS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="patientName" className="text-black">Patient Name</Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('patientName', e.target.value)}
                        placeholder="John Doe"
                        required
                        className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="patientPhone" className="text-black">Patient Phone Number</Label>
                      <Input
                        id="patientPhone"
                        value={formData.patientPhone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('patientPhone', e.target.value)}
                        placeholder="+1234567890"
                        required
                        className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Use E.164 format (+1XXXXXXXXXX)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="medicationNames" className="text-black">Medications</Label>
                      <Input
                        id="medicationNames"
                        value={formData.medicationNames}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('medicationNames', e.target.value)}
                        placeholder="Advil, Tylenol"
                        required
                        className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Separate multiple medications with commas
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="scheduledTime" className="text-black">Scheduled Time</Label>
                      <Input
                        id="scheduledTime"
                        type="datetime-local"
                        value={formData.scheduledTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('scheduledTime', e.target.value)}
                        required
                        className="bg-white text-black border-gray-300 placeholder:text-gray-500"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex-1 bg-black hover:bg-gray-800 text-white"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Test SMS
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleReset}
                      >
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Results */}
              {error && (
                <Card className="mb-6 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      <h3 className="text-lg font-medium text-red-900">Error</h3>
                    </div>
                    <p className="text-red-700 mt-2">{error}</p>
                  </CardContent>
                </Card>
              )}

              {result && (
                <Card className="mb-6 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="text-lg font-medium text-green-900">Success!</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status:</p>
                        <p className="text-green-700">{result.message}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Test Mode:</p>
                        <p className="text-gray-900">{result.testMode ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Scan Link:</p>
                        <a 
                          href={result.scanLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {result.scanLink}
                        </a>
                      </div>
                      
                      {result.testMode && (
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-2">Message Preview:</p>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>To:</strong> {result.reminder.patientPhone}</p>
                            <p><strong>Body:</strong></p>
                            <div className="bg-white p-3 rounded border text-gray-800">
                              {result.reminder.patientName && result.reminder.medicationNames && (
                                (() => {
                                  const time = new Date(result.reminder.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                                  const nameParts = result.reminder.patientName.split(' ');
                                  const firstName = nameParts[0];
                                  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
                                  const displayName = `${firstName} ${lastInitial}`;
                                  return `Hi ${displayName}! It's time to take your ${time} medication. Please scan your medication label to confirm: ${result.scanLink}`;
                                })()
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 