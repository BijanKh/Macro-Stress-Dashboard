import { useEffect, useRef } from 'react';

// Polls fn every intervalMs while enabled AND the browser tab is visible.
// Fires immediately when enabled flips true and when the tab becomes
// visible again after being hidden.
export function useVisibilityPolling(fn, intervalMs, enabled) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let timer = null;

    function start() {
      fnRef.current();
      timer = setInterval(() => fnRef.current(), intervalMs);
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        stop();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
