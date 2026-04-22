import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePolling — fetches on mount then every `interval` ms.
 * Cleans up on unmount. Ignores stale responses after unmount.
 */
export function usePolling(fetchFn, interval = 30000, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (mounted.current) { setData(result); setError(null); }
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    mounted.current = true;
    fetch();
    const id = setInterval(fetch, interval);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetch, interval]);

  return { data, loading, error, refetch: fetch };
}

/**
 * usePrices — polls live prices every `interval` ms.
 * Triggers a CSS flash animation when a price changes.
 */
export function usePrices(symbols, interval = 30000) {
  const [prices,  setPrices]  = useState({});
  const [updated, setUpdated] = useState(null);
  const prevRef = useRef({});

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { pricesAPI } = await import('../api');
        const result = await pricesAPI.get(symbols);
        if (cancelled || !result?.prices) return;

        Object.entries(result.prices).forEach(([sym, q]) => {
          const prev = prevRef.current[sym];
          if (prev && q.price && q.price !== prev) {
            const elId = `price-${sym.replace(/[^a-z0-9]/gi, '-')}`;
            const el   = document.getElementById(elId);
            if (el) {
              el.classList.remove('flash-green', 'flash-red');
              void el.offsetWidth;   // force reflow
              el.classList.add(q.price > prev ? 'flash-green' : 'flash-red');
            }
          }
          if (q.price) prevRef.current[sym] = q.price;
        });
        setPrices(result.prices);
        setUpdated(result.updated);
      } catch { /* silent — stale data is fine */ }
    };

    load();
    const id = setInterval(load, interval);
    return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(symbols), interval]);

  return { prices, updated };
}