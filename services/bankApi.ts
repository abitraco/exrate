import { RateData } from '../types';

// Static JSON refreshed by GitHub Actions (no live scraping in client)
const STATIC_RATES_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STATIC_RATES_URL) ||
  '/rates.json';

const fetchStaticRates = (() => {
  let memo: Promise<RateData[]> | null = null;
  return () => {
    if (!memo) {
      memo = fetch(STATIC_RATES_URL).then(res => {
        if (!res.ok) throw new Error(`Failed to load static rates: ${res.status}`);
        return res.json();
      });
    }
    return memo;
  };
})();

export const fetchBankRates = async (): Promise<RateData[]> => {
  const staticRates = await fetchStaticRates();

  // Ensure uniqueness and order by date descending
  const mergedMap = new Map<string, RateData>();
  staticRates.forEach(r => mergedMap.set(r.id, r));
  const merged = Array.from(mergedMap.values());
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return merged;
};
