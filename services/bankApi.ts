import { RateData } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';

// Naver finance scrape (proxied to avoid CORS)
const CURRENCIES = [
    { code: 'USD', name: '미국 달러', country: 'US', marketIndexCd: 'FX_USDKRW' },
    { code: 'EUR', name: '유로', country: 'EU', marketIndexCd: 'FX_EURKRW' },
    { code: 'CNY', name: '중국 위안', country: 'CN', marketIndexCd: 'FX_CNYKRW' },
    { code: 'JPY', name: '일본 엔', country: 'JP', marketIndexCd: 'FX_JPYKRW' },
];

// Use Vercel rewrite in production; Vite proxy in dev
const NAVER_PROXY_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_NAVER_PROXY_BASE) || '/api/naver';

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
    const fetches = CURRENCIES.map(async (c) => {
        const url = `${NAVER_PROXY_BASE}/marketindex/exchangeDailyQuote.naver?marketindexCd=${c.marketIndexCd}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Naver fetch failed for ${c.code}: ${res.status}`);
        const html = await decodeEucKr(res);
        return parseTable(html, c.code, c.name, c.country);
    });

    const results = await Promise.all(fetches);
    return results.flat();
};
