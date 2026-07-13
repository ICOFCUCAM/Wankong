import { useState, useEffect, useCallback } from 'react';

// Shared "compare tray" — a small set of product IDs the shopper is comparing,
// persisted in localStorage and synced across components via a storage event.

const KEY = 'smartkong_compare';
const MAX = 4;
const EVENT = 'sk-compare-change';

function read(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.slice(0, MAX) : []; }
  catch { return []; }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  window.dispatchEvent(new Event(EVENT));
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    if (cur.includes(id)) write(cur.filter(x => x !== id));
    else if (cur.length < MAX) write([...cur, id]);
    return read();
  }, []);

  const remove = useCallback((id: string) => write(read().filter(x => x !== id)), []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, count: ids.length, max: MAX, toggle, remove, clear, has, isFull: ids.length >= MAX };
}
