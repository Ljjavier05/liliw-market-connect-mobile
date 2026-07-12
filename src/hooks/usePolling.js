import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Polls a fetch function at a given interval.
 * Pauses in background, resumes on foreground.
 */
export default function usePolling(fetchFn, interval = 5000, deps = []) {
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (appStateRef.current === 'active') fetchFn();
    }, interval);
  }, [fetchFn, interval]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchFn();
    start();

    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        fetchFn();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
