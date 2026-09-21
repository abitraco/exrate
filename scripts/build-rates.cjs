/* Fetch recent FX rates from Naver Finance and write to public/rates.json. */
const path = require('path');
const {
  CURRENCIES,
  fetchRatesSince,
  getCutoffDate,
  writeJsonAtomically,
} = require('./naver-rates.cjs');

const DAYS_BACK = 90;
const OUT_PATH = path.join(__dirname, '..', 'public', 'rates.json');

const toHistoricalRate = (rate) => ({
  id: rate.id,
  countryCode: rate.countryCode,
  currencyName: rate.currencyName,
  currencyCode: rate.currencyCode,
  rate: rate.rate,
  date: rate.date,
  type: rate.type,
  cashBuy: rate.cashBuy,
  cashSell: rate.cashSell,
  ttSell: rate.ttSend,
  ttBuy: rate.ttReceive,
  baseRate: rate.baseRate,
});

async function build() {
  const cutoffDate = getCutoffDate(DAYS_BACK);
  const all = [];

  for (const currency of CURRENCIES) {
    const rates = await fetchRatesSince(currency, cutoffDate);
    if (rates.length === 0) {
      throw new Error(`No ${currency.code} rates found since ${cutoffDate}`);
    }
    all.push(...rates.map(toHistoricalRate));
  }

  all.sort((a, b) => b.date.localeCompare(a.date) || a.currencyCode.localeCompare(b.currencyCode));
  writeJsonAtomically(OUT_PATH, all);
  console.log(`Saved ${all.length} records since ${cutoffDate} to ${OUT_PATH}`);
}

if (require.main === module) {
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { build, toHistoricalRate };
