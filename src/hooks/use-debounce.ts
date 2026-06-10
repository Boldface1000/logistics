import { useEffect, useState } from "react";

/**
 * Debounce ANY value (typically a search term) so downstream effects /
 * queries only fire after `delay` ms of stillness.
 *
 * Critical: prevents one DB query per keystroke. Defaults: 300ms.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
