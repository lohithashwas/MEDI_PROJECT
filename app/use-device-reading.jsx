'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useDeviceReading(endpoint) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const request = useRef(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error();
      const next = await response.json();
      if (!controller.signal.aborted) { setData(next); setStatus('ready'); }
    } catch { if (!controller.signal.aborted) { setData(null); setStatus('unavailable'); } }
  }, [endpoint]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => { clearInterval(timer); request.current?.abort(); }; }, [refresh]);
  return { data, status, refresh };
}
