# Bank Exchange Rate Dashboard

This app shows daily bank exchange rates (USD, EUR, CNY, JPY) from a pre-built static JSON file.

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
- The client only reads `public/rates.json`; no runtime calls to naver.com are made in the browser.
- GitHub Actions scrapes Naver Finance and commits `public/rates.json` every 30 minutes on KST weekdays (skipping weekends and 22:00–06:00).
- Build/update static rates locally:
  ```bash
  npm run build:rates
  ```
  This writes `public/rates.json`; commit and deploy to update the server copy.

## Notes
- No customs API calls remain in the codebase.
