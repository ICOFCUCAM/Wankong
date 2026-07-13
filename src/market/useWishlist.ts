import { useState, useEffect, useCallback } from 'react';

// Saved items (wishlist) — localStorage-backed, synced across components via a
// custom event (same pattern as useCompare).

const KEY = 'smartkong_wishlist';
const EVENT = 'sk-wishlist-change';

function read(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const toggle = useCallback((id: string): boolean => {
    const cur = read();
    if (cur.includes(id)) { write(cur.filter(x => x !== id)); return false; }
    write([...cur, id]); return true;
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  return { ids, count: ids.length, toggle, has };
}
