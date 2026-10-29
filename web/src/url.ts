// UI state lives in the query string (GitHub Pages has no SPA fallback, so no paths).
// ?fish=<id> opens the detail; filters use q, area, rarity, bait, status, bred, view.

export function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Replaces the query without adding history entries; empty values are removed. */
export function writeParams(values: Record<string, string | null | undefined>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(values)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState(window.history.state, '', url);
}
