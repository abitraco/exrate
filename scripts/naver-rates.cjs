const fs = require('fs');
const path = require('path');

const API_ROOT = 'https://api.stock.naver.com/marketindex/exchange';
const PAGE_SIZE = 60;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 15_000;

const CURRENCIES = Object.freeze([
  Object.freeze({ code: 'USD', name: '미국 달러', country: 'US', marketIndexCd: 'FX_USDKRW' }),
  Object.freeze({ code: 'EUR', name: '유로', country: 'EU', marketIndexCd: 'FX_EURKRW' }),
  Object.freeze({ code: 'CNY', name: '중국 위안', country: 'CN', marketIndexCd: 'FX_CNYKRW' }),
  Object.freeze({ code: 'JPY', name: '일본 엔', country: 'JP', marketIndexCd: 'FX_JPYKRW' }),
  Object.freeze({ code: 'GBP', name: '영국 파운드', country: 'GB', marketIndexCd: 'FX_GBPKRW' }),
]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getKstDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getCutoffDate = (daysBack, date = new Date()) => {
  if (!Number.isInteger(daysBack) || daysBack < 0) {
    throw new Error(`daysBack must be a non-negative integer: ${daysBack}`);
  }

  const currentKstDate = getKstDate(date);
  const cutoff = new Date(`${currentKstDate}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - daysBack);
  return cutoff.toISOString().slice(0, 10);
};

const parseNumber = (value, fieldName) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (normalized === '') {
    throw new Error(`Invalid ${fieldName}: ${JSON.stringify(value)}`);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}: ${JSON.stringify(value)}`);
  }
  return parsed;
};

const validateDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid localTradedAt: ${JSON.stringify(value)}`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid localTradedAt: ${JSON.stringify(value)}`);
  }
  return value;
};

const normalizeRate = (payload, currency) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Rate item must be an object');
  }

  const date = validateDate(payload.localTradedAt);
  const baseRate = parseNumber(payload.closePrice, 'closePrice');

  return {
    id: `${date.replace(/-/g, '')}-${currency.code}`,
    countryCode: currency.country,
    currencyName: currency.name,
    currencyCode: currency.code,
    rate: baseRate,
    date,
    type: 'bank',
    cashBuy: parseNumber(payload.cashBuyValue, 'cashBuyValue'),
    cashSell: parseNumber(payload.cashSellValue, 'cashSellValue'),
    ttSend: parseNumber(payload.sendValue, 'sendValue'),
    ttReceive: parseNumber(payload.receiveValue, 'receiveValue'),
    baseRate,
  };
};

const buildPricesUrl = (marketIndexCd, page) => {
  const url = new URL(`${API_ROOT}/${encodeURIComponent(marketIndexCd)}/prices`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(PAGE_SIZE));
  return url.toString();
};

const fetchJson = async (url, options = {}) => {
  const {
    fetchImpl = globalThis.fetch,
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    sleep = wait,
    onRetry = (message) => console.warn(message),
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required');
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; exrate/2.0; +https://github.com/abitraco/exrate)',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const error = new Error(`Naver API request failed ${url}: HTTP ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        const error = new Error(`Naver API returned a non-array payload for ${url}`);
        error.retryable = true;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      const retryable = error.retryable !== false;
      if (!retryable || attempt === retries) {
        break;
      }

      const delayMs = 500 * 2 ** (attempt - 1);
      onRetry(`Naver API attempt ${attempt}/${retries} failed; retrying in ${delayMs}ms: ${error.message}`);
      await sleep(delayMs);
    }
  }

  throw lastError;
};

const fetchRatePage = async (currency, page, options = {}) => {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`page must be a positive integer: ${page}`);
  }

  const url = buildPricesUrl(currency.marketIndexCd, page);
  const payload = await fetchJson(url, options);
  return payload.map((item, index) => {
    try {
      return normalizeRate(item, currency);
    } catch (error) {
      throw new Error(`Invalid ${currency.code} rate at page ${page}, item ${index}: ${error.message}`, {
        cause: error,
      });
    }
  });
};

const fetchRatesSince = async (currency, cutoffDate, options = {}) => {
  validateDate(cutoffDate);
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const fetchPage = options.fetchPage ?? fetchRatePage;
  const ratesById = new Map();

  for (let page = 1; page <= maxPages; page += 1) {
    const pageRates = await fetchPage(currency, page, options);
    if (!Array.isArray(pageRates)) {
      throw new Error(`Rate page must be an array for ${currency.code}, page ${page}`);
    }
    if (pageRates.length === 0) {
      if (page === 1) throw new Error(`Naver API returned no rates for ${currency.code}`);
      break;
    }

    for (const rate of pageRates) {
      if (rate.date >= cutoffDate) ratesById.set(rate.id, rate);
    }

    const oldestDate = pageRates.reduce(
      (oldest, rate) => (rate.date < oldest ? rate.date : oldest),
      pageRates[0].date,
    );
    if (oldestDate < cutoffDate || pageRates.length < PAGE_SIZE) {
      return [...ratesById.values()];
    }
  }

  throw new Error(`Exceeded ${maxPages} pages while fetching ${currency.code} rates since ${cutoffDate}`);
};

const fetchLatestRate = async (currency, options = {}) => {
  const rates = await fetchRatePage(currency, 1, options);
  if (rates.length === 0) throw new Error(`Naver API returned no rates for ${currency.code}`);
  return rates[0];
};

const writeJsonAtomically = (outputPath, value) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}.${process.pid}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
};

module.exports = {
  API_ROOT,
  CURRENCIES,
  PAGE_SIZE,
  buildPricesUrl,
  fetchJson,
  fetchLatestRate,
  fetchRatePage,
  fetchRatesSince,
  getCutoffDate,
  getKstDate,
  normalizeRate,
  writeJsonAtomically,
};
