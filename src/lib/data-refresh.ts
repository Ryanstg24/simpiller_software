import { QueryClient } from '@tanstack/react-query';

/**
 * Utility functions for robust data refresh and cache invalidation
 */

export interface RefreshOptions {
  invalidateRelated?: boolean;
  refetchImmediately?: boolean;
  timeout?: number;
}

/**
 * Safely invalidate and optionally refetch queries with timeout protection
 */
export async function safeInvalidateQueries(
  queryClient: QueryClient,
  queryKey: string[],
  options: RefreshOptions = {}
): Promise<void> {
  const {
    invalidateRelated = true,
    refetchImmediately = true,
    timeout = 10000
  } = options;

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query invalidation timeout')), timeout)
    );

    // Create the invalidation promise
    const invalidationPromise = (async () => {
      // Invalidate the main query
      await queryClient.invalidateQueries({ queryKey });
      
      // Optionally invalidate related queries
      if (invalidateRelated) {
        const relatedKeys = getRelatedQueryKeys(queryKey[0]);
        for (const relatedKey of relatedKeys) {
          queryClient.invalidateQueries({ queryKey: relatedKey });
        }
      }
      
      // Optionally refetch immediately
      if (refetchImmediately) {
        await queryClient.refetchQueries({ queryKey });
      }
    })();

    // Race between invalidation and timeout
    await Promise.race([invalidationPromise, timeoutPromise]);
    
  } catch (error) {
    console.error('Error during query invalidation:', error);
    // Don't throw - we want the app to continue working even if refresh fails
  }
}

/**
 * Get related query keys that should be invalidated when a main query changes
 */
function getRelatedQueryKeys(mainKey: string): string[][] {
  const relatedMap: Record<string, string[][]> = {
    'patients': [
      ['medications'],
      ['dashboard-stats'],
      ['analytics'],
      ['billing-analytics']
    ],
    'medications': [
      ['dashboard-stats'],
      ['analytics'],
      ['billing-analytics']
    ],
    'users': [
      ['dashboard-stats']
    ],
    'organizations': [
      ['dashboard-stats'],
      ['billing-analytics']
    ]
  };

  return relatedMap[mainKey] || [];
}

/**
 * Refresh patient-related data
 */
export async function refreshPatientData(
  queryClient: QueryClient,
  options: RefreshOptions = {}
): Promise<void> {
  await safeInvalidateQueries(queryClient, ['patients'], options);
}

/**
 * Refresh medication-related data
 */
export async function refreshMedicationData(
  queryClient: QueryClient,
  options: RefreshOptions = {}
): Promise<void> {
  await safeInvalidateQueries(queryClient, ['medications'], options);
}

/**
 * Refresh all dashboard data
 */
export async function refreshDashboardData(
  queryClient: QueryClient,
  options: RefreshOptions = {}
): Promise<void> {
  const dashboardKeys = [
    ['patients'],
    ['medications'],
    ['dashboard-stats'],
    ['analytics']
  ];

  for (const key of dashboardKeys) {
    await safeInvalidateQueries(queryClient, key, {
      ...options,
      invalidateRelated: false // We're handling related keys manually
    });
  }
}

/**
 * Debounced refresh function to prevent excessive API calls
 */
export function createDebouncedRefresh(
  queryClient: QueryClient,
  queryKey: string[],
  delay: number = 1000
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (options: RefreshOptions = {}) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      await safeInvalidateQueries(queryClient, queryKey, options);
      timeoutId = null;
    }, delay);
  };
}
