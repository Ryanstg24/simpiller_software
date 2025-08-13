'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
    
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the login form if user is already logged in
  if (user && !authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">Simpiller</h1>
          <p className="mt-2 text-gray-800">Healthcare Medication Management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-gray-900">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-800">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-800">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-800">
          <p className="font-semibold mb-2">Test Credentials:</p>
          <div className="space-y-2 text-xs">
            <div className="bg-blue-50 p-2 rounded border">
              <p className="font-medium text-blue-800">Simpiller Admin</p>
              <p><strong>Email:</strong> admin@simpiller.com</p>
              <p><strong>Password:</strong> password123</p>
            </div>
            <div className="bg-green-50 p-2 rounded border">
              <p className="font-medium text-green-800">Organization Admin</p>
              <p><strong>Email:</strong> orgadmin@simpiller.com</p>
              <p><strong>Password:</strong> password</p>
            </div>
            <div className="bg-purple-50 p-2 rounded border">
              <p className="font-medium text-purple-800">Provider</p>
              <p><strong>Email:</strong> provider@simpiller.com</p>
              <p><strong>Password:</strong> password</p>
            </div>
            <div className="bg-yellow-50 p-2 rounded border">
              <p className="font-medium text-yellow-800">Billing</p>
              <p><strong>Email:</strong> billing@simpiller.com</p>
              <p><strong>Password:</strong> password</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600 italic">
            * These credentials are for testing purposes only and will be removed before launch
          </p>
        </div>
      </div>
    </div>
  );
} 