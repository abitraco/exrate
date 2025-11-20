import { RateData } from '../types';
import { formatDateForDisplay, getTodayString } from '../utils/dateUtils';

// Naver finance scrape (proxied to avoid CORS)
const CURRENCIES = [
    { code: 'USD', name: '미국 달러', country: 'US', marketIndexCd: 'FX_USDKRW' },
    { code: 'EUR', name: '유로', country: 'EU', marketIndexCd: 'FX_EURKRW' },
    { code: 'CNY', name: '중국 위안', country: 'CN', marketIndexCd: 'FX_CNYKRW' },
    { code: 'JPY', name: '일본 엔', country: 'JP', marketIndexCd: 'FX_JPYKRW' },
];

// Use Vercel rewrite in production; Vite proxy in dev
const NAVER_PROXY_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_NAVER_PROXY_BASE) || '/api/naver';
const MAX_PAGES = 12; // safety cap
const DAYS_BACK = 90; // ~3 months
const CACHE_KEY = 'naver_fx_cache_v1';

const decodeEucKr = async (response: Response) => {
    const buf = await response.arrayBuffer();
    try {
        return new TextDecoder('euc-kr').decode(buf);
    } catch {
        return new TextDecoder().decode(buf);
    }
};

const parseTable = (html: string, currencyCode: string, currencyName: string, countryCode: string): RateData[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = Array.from(doc.querySelectorAll('table tbody tr'));

    const cleanNumber = (text: string) => {
        const cleaned = text.replace(/,/g, '').replace(/[^\d.\-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const results: RateData[] = [];

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 7) return;

        const rawDate = cells[0].textContent?.trim() || '';
        if (!rawDate) return;
        const yyyyMMdd = rawDate.replace(/\./g, '');
        const formattedDate = formatDateForDisplay(yyyyMMdd);

        const baseRate = cleanNumber(cells[1].textContent || '');
        const cashBuy = cleanNumber(cells[3].textContent || '');
        const cashSell = cleanNumber(cells[4].textContent || '');
        const remittanceSend = cleanNumber(cells[5].textContent || ''); // 송금 보낼 때
        const remittanceReceive = cleanNumber(cells[6].textContent || ''); // 송금 받을 때

        results.push({
            id: `${yyyyMMdd}-${currencyCode}`,
            countryCode,
            currencyName,
            currencyCode,
            rate: baseRate,
            date: formattedDate,
            type: 'bank',
            cashBuy,
            cashSell,
            ttSell: remittanceSend,
            ttBuy: remittanceReceive,
            baseRate
        });
    });

    return results;
};

export const fetchBankRates = async (): Promise<RateData[]> => {
    const today = formatDateForDisplay(getTodayString());

    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cachedByCurrency: Record<string, RateData[]> = cachedRaw ? JSON.parse(cachedRaw) : {};

    const saveCache = (data: Record<string, RateData[]>) => {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    };

    const upsert = (list: RateData[], item: RateData) => {
        const idx = list.findIndex(r => r.id === item.id);
        if (idx >= 0) list[idx] = item;
        else list.push(item);
    };

    const cutoff = (() => {
        const d = new Date();
        d.setDate(d.getDate() - DAYS_BACK);
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    const fetchCurrency = async (c: typeof CURRENCIES[number]) => {
        const cached = cachedByCurrency[c.code] || [];
        const cachedPast = cached.filter(r => r.date !== today);
        const collected: RateData[] = [...cachedPast];

        const needsFullFetch = cachedPast.length === 0;

        if (needsFullFetch) {
            let page = 1;
            let done = false;
            while (!done && page <= MAX_PAGES) {
                const url = `${NAVER_PROXY_BASE}/marketindex/exchangeDailyQuote.naver?marketindexCd=${c.marketIndexCd}&page=${page}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Naver fetch failed for ${c.code} page ${page}: ${res.status}`);
                const html = await decodeEucKr(res);
                const rates = parseTable(html, c.code, c.name, c.country);
                if (rates.length === 0) break;

                const filtered = rates.filter(r => {
                    const d = new Date(r.date);
                    return d >= cutoff;
                });
                filtered.forEach(r => upsert(collected, r));

                const oldest = rates[rates.length - 1];
                const oldestDate = new Date(oldest.date);
                if (oldestDate < cutoff) {
                    done = true;
                } else {
                    page += 1;
                }
            }
        } else {
            // Only fetch first page for today to refresh latest
            const url = `${NAVER_PROXY_BASE}/marketindex/exchangeDailyQuote.naver?marketindexCd=${c.marketIndexCd}&page=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Naver fetch failed for ${c.code} page 1: ${res.status}`);
            const html = await decodeEucKr(res);
            const rates = parseTable(html, c.code, c.name, c.country);
            rates.forEach(r => upsert(collected, r));
        }

        // Save back cache without today's data (only past dates)
        cachedByCurrency[c.code] = collected.filter(r => r.date !== today);

        return collected;
    };

    const results = await Promise.all(CURRENCIES.map(fetchCurrency));
    saveCache(cachedByCurrency);

    return results.flat();
};
