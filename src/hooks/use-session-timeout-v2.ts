'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutV2Options {
  timeoutMinutes?: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useSessionTimeoutV2({
  timeoutMinutes = 30,
  onTimeout,
  enabled = true
}: UseSessionTimeoutV2Options) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      if (timeSinceLastActivity >= timeoutMs) {
        console.log('[Session Timeout V2] Session timeout reached, signing out user');
        onTimeout();
      } else {
        // Not enough time has passed, reset the timeout
        resetTimeout();
      }
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, onTimeout, enabled]);

  const updateActivity = useCallback(() => {
    if (!enabled) return;
    lastActivityRef.current = Date.now();
    resetTimeout();
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

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Set initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, updateActivity, resetTimeout]);
}
