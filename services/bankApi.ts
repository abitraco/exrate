import { RateData, BankRateResponse, BankRateRecord } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';

// Constants from User
const ACCESS_TOKEN = 'cb0c9226c6d3bbd3c05529531ba7ce740bfd03709feb9583c8158737b053a916';
const ISCD = '000013'; // From example
const FINTECH_APSNO = '001'; // From example
const API_SVC_CD = 'DrawingTransferA'; // From example

const TARGET_CURRENCIES = ['USD', 'EUR', 'CNY', 'JPY'];

const CACHE_PREFIX = 'bank_rate_v1_';

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
    const cleanDate = date.replace(/-/g, '');
    const formattedDateForDisplay = formatDateForDisplay(cleanDate);

    const cacheKey = `${CACHE_PREFIX}${cleanDate}`;
    const cached = localStorage.getItem(cacheKey);

    const now = new Date();
    const isToday = cleanDate === getTodayString();

    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // If today, check if older than 1 hour (3600000 ms)
        if (isToday) {
            if (now.getTime() - timestamp < 3600000) {
                return data;
            }
        } else {
            return data;
        }
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
            Btb: "0001", // Branch code? Assuming 0001 from example
            Crcd: currency,
            Inymd: cleanDate
        };

        try {
            const response = await fetch('https://nhopenapi.nonghyup.com/svcapi/InquireExchangeRate.nh', {
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
                console.warn(`API Error for ${currency}: ${json.Header["Rsms "]}`);
                return null;
            }

            if (json.REC && json.REC.length > 0) {
                const rec = json.REC[0]; // Assuming one record per currency/date
                return {
                    id: `${cleanDate}-${currency}`,
                    countryCode: getCountryCode(currency),
                    currencyName: getCurrencyName(currency),
                    currencyCode: currency,
                    rate: parseFloat(rec.BrgnBsrt), // Using Base Rate as primary
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

    // If we got data, save to cache
    if (validResults.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
            data: validResults,
            timestamp: now.getTime()
        }));
        return validResults;
    } else {
        return generateMockBankData(cleanDate);
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
