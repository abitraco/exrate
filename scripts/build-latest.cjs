/* Fetch latest FX rates from Naver Finance and write to public/latest_rates.json */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

const CURRENCIES = [
    { code: 'USD', name: '미국 달러', country: 'US', marketIndexCd: 'FX_USDKRW' },
    { code: 'EUR', name: '유로', country: 'EU', marketIndexCd: 'FX_EURKRW' },
    { code: 'CNY', name: '중국 위안', country: 'CN', marketIndexCd: 'FX_CNYKRW' },
    { code: 'JPY', name: '일본 엔', country: 'JP', marketIndexCd: 'FX_JPYKRW' },
    { code: 'GBP', name: '영국 파운드', country: 'GB', marketIndexCd: 'FX_GBPKRW' },
];

const OUT_PATH = path.join(__dirname, '..', 'public', 'latest_rates.json');

const fetchPageHtml = async (marketIndexCd, page) => {
    const url = `https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=${marketIndexCd}&page=${page}`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RateScraper/1.0)' },
    });
    if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
    const buf = await res.arrayBuffer();
    return iconv.decode(Buffer.from(buf), 'euc-kr');
};

const parseTable = (html, currency) => {
    const $ = cheerio.load(html);
    // Only get the first row for the latest rate
    const el = $('table tbody tr').first();
    const tds = $(el).find('td');
    if (tds.length < 7) return null;

    const rawDate = $(tds[0]).text().trim();
    if (!rawDate) return null;

    const yyyyMMdd = rawDate.replace(/\./g, '');
    const formattedDate = `${yyyyMMdd.slice(0, 4)}-${yyyyMMdd.slice(4, 6)}-${yyyyMMdd.slice(6, 8)}`;
    const num = (idx) => parseFloat($(tds[idx]).text().replace(/,/g, '')) || 0;

    const baseRate = num(1);
    const cashBuy = num(3);
    const cashSell = num(4);
    const ttSend = num(5);
    const ttReceive = num(6);

    return {
        id: `${yyyyMMdd}-${currency.code}`,
        countryCode: currency.country,
        currencyName: currency.name,
        currencyCode: currency.code,
        rate: baseRate,
        date: formattedDate,
        type: 'bank',
        cashBuy,
        cashSell,
        ttSend,
        ttReceive,
        timestamp: new Date().toISOString() // Add generation timestamp
    };
};

async function build() {
    const latest = [];

    for (const currency of CURRENCIES) {
        try {
            // Just fetch page 1
            const html = await fetchPageHtml(currency.marketIndexCd, 1);
            const rate = parseTable(html, currency);
            if (rate) {
                latest.push(rate);
            }
        } catch (e) {
            console.error(`Failed to fetch ${currency.code}:`, e.message);
        }
    }

    // Sort by code for consistency
    latest.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(latest, null, 2), 'utf8');
    console.log(`Saved ${latest.length} latest records to ${OUT_PATH}`);
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
