/* Fetch latest FX rates from Naver Finance and write to public/latest_rates.json. */
const path = require('path');
const {
  CURRENCIES,
  fetchLatestRate,
  writeJsonAtomically,
} = require('./naver-rates.cjs');

const OUT_PATH = path.join(__dirname, '..', 'public', 'latest_rates.json');

const toLatestRate = (rate, timestamp) => ({
  id: rate.id,
  countryCode: rate.countryCode,
  currencyName: rate.currencyName,
  currencyCode: rate.currencyCode,
  rate: rate.rate,
  date: rate.date,
  type: rate.type,
  cashBuy: rate.cashBuy,
  cashSell: rate.cashSell,
  ttSend: rate.ttSend,
  ttReceive: rate.ttReceive,
  timestamp,
});

async function build() {
  const generationTimestamp = new Date().toISOString();
  const latest = [];

  for (const currency of CURRENCIES) {
    const rate = await fetchLatestRate(currency);
    latest.push(toLatestRate(rate, generationTimestamp));
  }

  if (latest.length !== CURRENCIES.length) {
    throw new Error(`Expected ${CURRENCIES.length} latest rates, received ${latest.length}`);
  }

  latest.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  writeJsonAtomically(OUT_PATH, latest);
  console.log(`Saved ${latest.length} latest records to ${OUT_PATH}`);
}

if (require.main === module) {
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { build, toLatestRate };
