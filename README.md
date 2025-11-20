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

## Bank API configuration (NH Open API)
- Endpoint: `https://developers.nonghyup.com/InquireExchangeRate.nh`
- API guide: https://developers.nonghyup.com/guide/GU_1000
- Set these environment variables (Vercel project settings or `.env`):
  - `VITE_NH_ISCD` (required)
  - `VITE_NH_ACCESS_TOKEN` (required)
  - `VITE_NH_FINTECH_APSNO` (default: `001`)
  - `VITE_NH_API_SVC_CD` (default: `DrawingTransferA`)
- Optional: `VITE_ALLOW_MOCK=true` to show mock data when API is unavailable (defaults to on in dev).
- Proxy/CORS: Vercel rewrite routes `/api/nh` → NH API. Frontend uses `/api/nh` by default via `VITE_NH_API_URL` (optional override).

## Notes
- No customs API calls remain in the codebase.
- If the NH API call fails and mock fallback is allowed, demo data will show; set the required env vars in production to see live rates.
