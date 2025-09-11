'use client';

import { usePatientsOptimized } from '@/hooks/use-patients-optimized';
import { useMedicationsOptimized } from '@/hooks/use-medications-optimized';
import { OptimizedLoading, CardSkeleton, TableSkeleton } from '@/components/ui/optimized-loading';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Users, Pill } from 'lucide-react';

export default function PerformanceTestPage() {
  const {
    data: patients,
    loading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
    invalidateCache: invalidatePatientsCache
  } = usePatientsOptimized();

  const {
    data: medications,
    loading: medicationsLoading,
    error: medicationsError,
    refetch: refetchMedications,
    invalidateCache: invalidateMedicationsCache
  } = useMedicationsOptimized();

  const handleRefreshAll = () => {
    refetchPatients();
    refetchMedications();
  };

  const handleClearCache = () => {
    invalidatePatientsCache();
    invalidateMedicationsCache();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Test Page</h1>
          <p className="text-gray-600">Testing optimized data loading and caching</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cache Controls</h2>
          <div className="flex space-x-4">
            <Button onClick={handleRefreshAll} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All Data
            </Button>
            <Button onClick={handleClearCache} variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </div>

        {/* Patients Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Patients ({patients?.length || 0})
            </h2>
            <Button onClick={refetchPatients} size="sm" variant="outline">
              Refresh
            </Button>
          </div>
          
          <OptimizedLoading
            loading={patientsLoading}
            error={patientsError}
            fallback={<TableSkeleton rows={3} />}
          >
            <div className="space-y-2">
              {patients?.map((patient) => (
                <div key={patient.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                  <div className="text-sm text-gray-600">
                    {patient.email} • {patient.phone}
                  </div>
                </div>
              ))}
            </div>
          </OptimizedLoading>
        </div>

        {/* Medications Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Pill className="h-5 w-5 mr-2" />
              Medications ({medications?.length || 0})
            </h2>
            <Button onClick={refetchMedications} size="sm" variant="outline">
              Refresh
            </Button>
          </div>
          
          <OptimizedLoading
            loading={medicationsLoading}
            error={medicationsError}
            fallback={<TableSkeleton rows={3} />}
          >
            <div className="space-y-2">
              {medications?.map((medication) => (
                <div key={medication.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{medication.name}</div>
                  <div className="text-sm text-gray-600">
                    {medication.strength} • {medication.format} • Patient: {medication.patients?.first_name} {medication.patients?.last_name}
                  </div>
                </div>
              ))}
            </div>
          </OptimizedLoading>
        </div>
      </div>
    </div>
  );
}
