import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling(fetchFn, interval = 30000, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const mounted = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback(async () => {
    try   { const r = await fetchFn(); if (mounted.current) { setData(r); setError(null); } }
    catch (e) { if (mounted.current) setError(e.message); }
    finally   { if (mounted.current) setLoading(false); }
  }, deps); // eslint-disable-line
  useEffect(() => {
    mounted.current = true;
    fetch();
    const id = setInterval(fetch, interval);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetch, interval]);
  return { data, loading, error, refetch: fetch };
}

export function usePrices(symbols, interval = 30000) {
  const [prices,  setPrices]  = useState({});
  const [updated, setUpdated] = useState(null);
  const prev = useRef({});
  useEffect(() => {
    if (!symbols?.length) return;
    let gone = false;
    const load = async () => {
      try {
        const { pricesAPI } = await import('../api');
        const r = await pricesAPI.get(symbols);
        if (gone || !r?.prices) return;
        Object.entries(r.prices).forEach(([sym, q]) => {
          if (prev.current[sym] && q.price !== prev.current[sym]) {
            const el = document.getElementById(`price-${sym.replace(/[^a-z0-9]/gi,'-')}`);
            if (el) { el.classList.remove('flash-green','flash-red'); void el.offsetWidth; el.classList.add(q.price > prev.current[sym] ? 'flash-green' : 'flash-red'); }
          }
          prev.current[sym] = q.price;
        });
        setPrices(r.prices); setUpdated(r.updated);
      } catch {}
    };
    load();
    const id = setInterval(load, interval);
    return () => { gone = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(symbols), interval]);
  return { prices, updated };
}