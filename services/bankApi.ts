import { RateData, BankRateResponse } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';

// NH Open API credentials: set these in Vercel/localhost for real data
// @ts-ignore import.meta is defined in Vite runtime
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' ? process.env : {});
const ACCESS_TOKEN = String(env.VITE_NH_ACCESS_TOKEN || env.REACT_APP_NH_ACCESS_TOKEN || '').trim();
const ISCD = String(env.VITE_NH_ISCD || env.REACT_APP_NH_ISCD || '').trim();
const FINTECH_APSNO = String(env.VITE_NH_FINTECH_APSNO || env.REACT_APP_NH_FINTECH_APSNO || '001').trim();
const API_SVC_CD = String(env.VITE_NH_API_SVC_CD || env.REACT_APP_NH_API_SVC_CD || 'DrawingTransferA').trim();
const ALLOW_MOCK = Boolean(env.DEV || env.VITE_ALLOW_MOCK === 'true' || env.REACT_APP_ALLOW_MOCK === 'true');

const TARGET_CURRENCIES = ['USD', 'EUR', 'CNY', 'JPY'];
const CACHE_PREFIX = 'bank_rate_v1_';

const hasCredentials = () => Boolean(ACCESS_TOKEN && ISCD);
const getErrMsg = (json: BankRateResponse) => json.Header['Rsms '] || (json as any).Header?.Rsms || 'Unknown error';

// Helper to generate random IsTuno
const generateIsTuno = () => {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${timestamp}${random}`.slice(0, 20);
};

const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const getTimeString = () => {
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${hour}${minute}${second}`;
};

export const fetchBankRates = async (date: string): Promise<RateData[]> => {
    if (!hasCredentials()) {
        console.warn('[BankAPI] Missing ISCD/AccessToken. Set VITE_NH_ISCD and VITE_NH_ACCESS_TOKEN for live data.');
        return ALLOW_MOCK ? generateMockBankData(date.replace(/-/g, '')) : [];
    }

    const cleanDate = date.replace(/-/g, '');
    const formattedDateForDisplay = formatDateForDisplay(cleanDate);

    const cacheKey = `${CACHE_PREFIX}${cleanDate}`;
    const cached = localStorage.getItem(cacheKey);

    const now = new Date();
    const isToday = cleanDate === getTodayString();

    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (!isToday) {
            console.log(`[Cache] Using cached data for ${cleanDate}`);
            return data;
        }
        if (now.getTime() - timestamp < 3600000) {
            console.log(`[Cache] Using cached data for today (${cleanDate})`);
            return data;
        }
        console.log(`[API] Cache expired for today, fetching new data...`);
    } else if (!isToday) {
        console.log(`[API] No cache for past date ${cleanDate}, fetching...`);
    } else {
        console.log(`[API] No cache for today ${cleanDate}, fetching...`);
    }

    // Fetch from API
    const fetchPromises = TARGET_CURRENCIES.map(async (currency) => {
        const requestBody = {
            Header: {
                ApiNm: "InquireExchangeRate",
                Tsymd: getTodayString(),
                Trtm: getTimeString(),
                Iscd: ISCD,
                FintechApsno: FINTECH_APSNO,
                ApiSvcCd: API_SVC_CD,
                IsTuno: generateIsTuno(),
                AccessToken: ACCESS_TOKEN
            },
            Btb: "0001",
            Crcd: currency,
            Inymd: cleanDate
        };

        try {
            const response = await fetch('https://developers.nonghyup.com/InquireExchangeRate.nh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const json: BankRateResponse = await response.json();

            if (json.Header.Rpcd !== '00000') {
                console.warn(`API Error for ${currency}: ${getErrMsg(json)}`);
                return null;
            }

            if (json.REC && json.REC.length > 0) {
                const rec = json.REC[0]; // Assuming one record per currency/date
                return {
                    id: `${cleanDate}-${currency}`,
                    countryCode: getCountryCode(currency),
                    currencyName: getCurrencyName(currency),
                    currencyCode: currency,
                    rate: parseFloat(rec.BrgnBsrt), // Base Rate
                    date: formattedDateForDisplay,
                    type: 'bank',
                    cashBuy: parseFloat(rec.CshBnrt),
                    cashSell: parseFloat(rec.CshSlrt),
                    ttBuy: parseFloat(rec.TlchPrnlBnrt),
                    ttSell: parseFloat(rec.TlchPrnlSlrt),
                    baseRate: parseFloat(rec.BrgnBsrt)
                } as RateData;
            }
            return null;
        } catch (e) {
            console.error(`Fetch failed for ${currency}`, e);
            return null;
        }
    });

    const fetchedResults = await Promise.all(fetchPromises);
    const validResults = fetchedResults.filter((r): r is RateData => r !== null);

    if (validResults.length > 0) {
        console.log(`[API] Successfully fetched ${validResults.length} rates for ${cleanDate}, saving to cache...`);
        localStorage.setItem(cacheKey, JSON.stringify({
            data: validResults,
            timestamp: now.getTime()
        }));
        return validResults;
    } else {
        if (ALLOW_MOCK) {
            console.warn(`[Mock] API failed for ${cleanDate}, using mock data`);
            const mockData = generateMockBankData(cleanDate);
            if (!isToday) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: mockData,
                    timestamp: now.getTime()
                }));
            }
            return mockData;
        }
        console.warn(`[API] No data and mock disabled for ${cleanDate}`);
        return [];
    }
};

const getCountryCode = (currency: string) => {
    switch (currency) {
        case 'USD': return 'US';
        case 'EUR': return 'EU';
        case 'CNY': return 'CN';
        case 'JPY': return 'JP';
        default: return 'XX';
    }
};

const getCurrencyName = (currency: string) => {
    switch (currency) {
        case 'USD': return '미국 달러';
        case 'EUR': return '유로';
        case 'CNY': return '중국 위안';
        case 'JPY': return '일본 엔';
        default: return currency;
    }
};

const generateMockBankData = (date: string): RateData[] => {
    const formattedDate = formatDateForDisplay(date);
    const seed = parseInt(date) % 100;
    const noise = (base: number) => base + (Math.sin(seed) * base * 0.05);

    return TARGET_CURRENCIES.map(currency => {
        let base = 1000;
        if (currency === 'USD') base = 1350;
        if (currency === 'EUR') base = 1450;
        if (currency === 'CNY') base = 190;
        if (currency === 'JPY') base = 900;

        const rate = noise(base);
        return {
            id: `${date}-${currency}`,
            countryCode: getCountryCode(currency),
            currencyName: getCurrencyName(currency),
            currencyCode: currency,
            rate: rate,
            date: formattedDate,
            type: 'bank',
            cashBuy: rate * 1.02,
            cashSell: rate * 0.98,
            ttBuy: rate * 1.01,
            ttSell: rate * 0.99,
            baseRate: rate
        };
    });
};
