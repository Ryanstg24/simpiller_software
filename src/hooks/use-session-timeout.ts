import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({
  timeoutMinutes = 30,
  onTimeout,
  enabled = true
}: UseSessionTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    console.log(`[Session Timeout] Setting timeout for ${timeoutMinutes} minutes`);
    
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      console.log(`[Session Timeout] Timeout fired. Time since last activity: ${Math.round(timeSinceLastActivity / 1000)}s, Required: ${timeoutMs / 1000}s`);
      
      if (timeSinceLastActivity >= timeoutMs) {
        console.log('[Session Timeout] Session timeout reached, signing out user');
        onTimeout();
      } else {
        console.log('[Session Timeout] Timeout fired but not enough time passed, resetting...');
        resetTimeout();
      }
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, onTimeout, enabled]);

  const updateActivity = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    console.log(`[Session Timeout] Activity detected. Time since last activity: ${Math.round(timeSinceLastActivity / 1000)}s`);
    lastActivityRef.current = now;
    resetTimeout(); // Reset the timeout when activity is detected
  }, [enabled, resetTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // Set up activity listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, resetTimeout, updateActivity]);

  return {
    resetTimeout,
    updateActivity
  };
}
