/* Fetch recent FX rates from Naver Finance and write to public/rates.json */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

const CURRENCIES = [
  { code: 'USD', name: '미국 달러', country: 'US', marketIndexCd: 'FX_USDKRW' },
  { code: 'EUR', name: '유로', country: 'EU', marketIndexCd: 'FX_EURKRW' },
  { code: 'CNY', name: '중국 위안', country: 'CN', marketIndexCd: 'FX_CNYKRW' },
  { code: 'JPY', name: '일본 엔', country: 'JP', marketIndexCd: 'FX_JPYKRW' },
];

const DAYS_BACK = 90;
const MAX_PAGES = 12;
const OUT_PATH = path.join(__dirname, '..', 'public', 'rates.json');

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
  const results = [];
  $('table tbody tr').each((_, el) => {
    const tds = $(el).find('td');
    if (tds.length < 7) return;
    const rawDate = $(tds[0]).text().trim();
    if (!rawDate) return;
    const yyyyMMdd = rawDate.replace(/\./g, '');
    const formattedDate = `${yyyyMMdd.slice(0, 4)}-${yyyyMMdd.slice(4, 6)}-${yyyyMMdd.slice(6, 8)}`;
    const num = (idx) => parseFloat($(tds[idx]).text().replace(/,/g, '')) || 0;
    const baseRate = num(1);
    const cashBuy = num(3);
    const cashSell = num(4);
    const ttSend = num(5);
    const ttReceive = num(6);
    results.push({
      id: `${yyyyMMdd}-${currency.code}`,
      countryCode: currency.country,
      currencyName: currency.name,
      currencyCode: currency.code,
      rate: baseRate,
      date: formattedDate,
      type: 'bank',
      cashBuy,
      cashSell,
      ttSell: ttSend,
      ttBuy: ttReceive,
      baseRate,
    });
  });
  return results;
};

const cutoffDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_BACK);
  d.setHours(0, 0, 0, 0);
  return d;
})();

const withinCutoff = (dateStr) => {
  const d = new Date(dateStr);
  return d >= cutoffDate;
};

async function build() {
  const all = [];

  for (const currency of CURRENCIES) {
    let page = 1;
    let done = false;
    while (!done && page <= MAX_PAGES) {
      const html = await fetchPageHtml(currency.marketIndexCd, page);
      const rates = parseTable(html, currency);
      if (rates.length === 0) break;
      const keep = rates.filter((r) => withinCutoff(r.date));
      all.push(...keep);
      const oldestDate = new Date(rates[rates.length - 1].date);
      if (oldestDate < cutoffDate) {
        done = true;
      } else {
        page += 1;
      }
    }
  }

  // Sort descending by date then code
  all.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return a.currencyCode.localeCompare(b.currencyCode);
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2), 'utf8');
  console.log(`Saved ${all.length} records to ${OUT_PATH}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
