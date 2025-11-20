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

## Bank API configuration
- Endpoint: `https://developers.nonghyup.com/InquireExchangeRate.nh`
- Required fields when calling:
  - `Iscd` (institution code) **must use your issued value**
  - `AccessToken` **must use your issued value**
- Sample AccessToken currently in code (for testing):\
  `cb0c9226c6d3bbd3c05529531ba7ce740bfd03709feb9583c8158737b053a916`
- API guide: https://developers.nonghyup.com/guide/GU_1000

## Notes
- No customs API calls remain in the codebase.
- If the NH API call fails, the UI falls back to mock data for demo purposes.
