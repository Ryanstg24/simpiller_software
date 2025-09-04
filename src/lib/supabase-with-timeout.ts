import { supabase } from './supabase';

// Create a wrapper function that adds timeout to Supabase requests
export const supabaseWithTimeout = {
  ...supabase,
  
  // Override the from method to add timeout to all queries
  from: (table: string) => {
    const originalFrom = supabase.from(table);
    
    // Add timeout wrapper to select method
    const originalSelect = originalFrom.select.bind(originalFrom);
    originalFrom.select = (columns?: string) => {
      const query = originalSelect(columns);
      
      // Add timeout to the query
      const originalThen = query.then.bind(query);
      query.then = (onFulfilled?: any, onRejected?: any) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout - please try again'));
          }, 10000); // 10 second timeout
        });
        
        return Promise.race([
          originalThen(onFulfilled, onRejected),
          timeoutPromise
        ]);
      };
      
      return query;
    };
    
    return originalFrom;
  }
};

// Utility function to create timeout promises
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Request timeout'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};
