const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CURRENCIES,
  PAGE_SIZE,
  buildPricesUrl,
  fetchJson,
  fetchRatesSince,
  getCutoffDate,
  normalizeRate,
} = require('./naver-rates.cjs');

const USD = CURRENCIES.find(({ code }) => code === 'USD');

const samplePayload = (date = '2026-09-21') => ({
  localTradedAt: date,
  closePrice: '1,384.00',
  cashBuyValue: '1,408.22',
  cashSellValue: '1,359.78',
  sendValue: '1,397.50',
  receiveValue: '1,370.50',
});

test('normalizes the Naver JSON schema into numeric rate data', () => {
  assert.deepEqual(normalizeRate(samplePayload(), USD), {
    id: '20260921-USD',
    countryCode: 'US',
    currencyName: '미국 달러',
    currencyCode: 'USD',
    rate: 1384,
    date: '2026-09-21',
    type: 'bank',
    cashBuy: 1408.22,
    cashSell: 1359.78,
    ttSend: 1397.5,
    ttReceive: 1370.5,
    baseRate: 1384,
  });
});

test('rejects malformed API data instead of silently writing zeroes', () => {
  assert.throws(
    () => normalizeRate({ ...samplePayload(), closePrice: null }, USD),
    /Invalid closePrice/,
  );
  assert.throws(
    () => normalizeRate({ ...samplePayload(), localTradedAt: '2026-02-30' }, USD),
    /Invalid localTradedAt/,
  );
});

test('uses a 60-record page and calculates the cutoff by the KST calendar date', () => {
  const url = new URL(buildPricesUrl('FX_USDKRW', 2));
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('pageSize'), String(PAGE_SIZE));
  assert.equal(getCutoffDate(90, new Date('2026-09-20T15:30:00Z')), '2026-06-23');
});

test('retries transient failures but fails fast for a retired endpoint', async () => {
  let transientAttempts = 0;
  const payload = [samplePayload()];
  const result = await fetchJson('https://example.test/rates', {
    fetchImpl: async () => {
      transientAttempts += 1;
      return transientAttempts === 1
        ? new Response('', { status: 503 })
        : Response.json(payload);
    },
    sleep: async () => {},
    onRetry: () => {},
  });
  assert.deepEqual(result, payload);
  assert.equal(transientAttempts, 2);

  let goneAttempts = 0;
  await assert.rejects(
    fetchJson('https://example.test/retired', {
      fetchImpl: async () => {
        goneAttempts += 1;
        return new Response('', { status: 410 });
      },
      sleep: async () => {},
      onRetry: () => {},
    }),
    /HTTP 410/,
  );
  assert.equal(goneAttempts, 1);
});

test('paginates, filters by cutoff, and removes duplicate records', async () => {
  const normalized = (date) => normalizeRate(samplePayload(date), USD);
  const pageOne = Array.from({ length: PAGE_SIZE }, (_, index) =>
    normalized(index === PAGE_SIZE - 1 ? '2026-06-25' : '2026-09-21'),
  );
  const pageTwo = [
    normalized('2026-06-25'),
    normalized('2026-06-23'),
    normalized('2026-06-22'),
  ];
  const requestedPages = [];

  const rates = await fetchRatesSince(USD, '2026-06-23', {
    fetchPage: async (_currency, page) => {
      requestedPages.push(page);
      return page === 1 ? pageOne : pageTwo;
    },
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(
    rates.map(({ date }) => date).sort(),
    ['2026-06-23', '2026-06-25', '2026-09-21'],
  );
});
