# Bank Exchange Rate Dashboard

This app shows daily bank exchange rates (USD, EUR, CNY, JPY) fetched from the NH Open API. Customs data and related APIs have been removed; only bank rates remain.

## Setup
1) Install dependencies:
```bash
npm install
```
2) Run locally:
```bash
npm run dev
```

## Data source
- Scrapes daily quote tables from Naver Finance:
  - USD: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW
  - EUR: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_EURKRW
  - CNY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_CNYKRW
  - JPY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_JPYKRW
- Past data (약 90일) is pre-scraped into a static file `public/rates.json` and served with the app. Only today’s data is fetched live (page 1) to refresh the latest rate.
- Build/update static rates locally:
  ```bash
  npm run build:rates
  ```
  This writes `public/rates.json`; commit and deploy to update the server copy.
- CORS/proxy:
  - Vercel rewrite: `/api/naver/:path*` → `https://finance.naver.com/:path*`
  - Local dev: Vite proxy forwards `/api/naver` to `https://finance.naver.com`

## Notes
- No customs API calls remain in the codebase.
- If the NH API call fails and mock fallback is allowed, demo data will show; set the required env vars in production to see live rates.
