# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based exchange rate dashboard that displays daily bank exchange rates (USD, EUR, CNY, JPY) from a pre-built static JSON file. The app is built with Vite, TypeScript, and React 19, using Recharts for visualization.

## Key Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Data Management
```bash
npm run build:rates  # Scrape exchange rates from Naver Finance and update public/rates.json
```

This command runs [scripts/build-rates.cjs](scripts/build-rates.cjs), which:
- Scrapes Naver Finance for the last 90 days of exchange rates for USD, EUR, CNY, JPY
- Parses EUC-KR encoded HTML using cheerio and iconv-lite
- Writes results to [public/rates.json](public/rates.json)
- Used by GitHub Actions to auto-update rates every 30 minutes during KST weekdays (06:00-22:00)

## Architecture

### Data Flow

1. **Client-side**: [App.tsx](App.tsx) fetches from `/rates.json` (static file, no live API calls in browser)
2. **Data fetching**: [services/bankApi.ts](services/bankApi.ts) provides `fetchBankRates()` with memoization
3. **Scraping**: [scripts/build-rates.cjs](scripts/build-rates.cjs) scrapes Naver Finance to rebuild `rates.json`
4. **Automation**: [.github/workflows/update-rates.yml](.github/workflows/update-rates.yml) runs the scraper every 30 minutes (KST weekdays 06:00-22:00)

### Component Structure

- [App.tsx](App.tsx) - Main app with multi-language support (KO/EN), manages state and data fetching
- [components/Header.tsx](components/Header.tsx) - Header with language toggle
- [components/StatCard.tsx](components/StatCard.tsx) - Individual currency rate cards with change indicators
- [components/RateChart.tsx](components/RateChart.tsx) - Recharts-based line chart for trends
- [components/RateTable.tsx](components/RateTable.tsx) - Searchable table of all rates with cash/TT buy/sell rates

### Type System

[types.ts](types.ts) contains all shared interfaces:
- `RateData` - Core exchange rate data model with optional bank-specific fields (cashBuy, cashSell, ttBuy, ttSell)
- `ExchangeRateRecord` - Legacy API record format (no longer used)
- `ChartDataPoint` - Data structure for charts with date and currency rates
- `Language` - 'KO' | 'EN'

### Key Implementation Details

1. **No live scraping in browser**: Client only reads static `public/rates.json`. All scraping happens server-side via GitHub Actions or manual `npm run build:rates`.

2. **Multi-language**: Translation dictionary in [App.tsx](App.tsx:11-71) with `TRANSLATIONS` object for KO/EN.

3. **Data processing**:
   - [App.tsx](App.tsx:88-109) sorts by date descending, groups by date to find latest/previous for change indicators
   - Chart data aggregates rates by date for time-series visualization

4. **Path alias**: `@/*` maps to root directory (see [tsconfig.json](tsconfig.json:24-26) and [vite.config.ts](vite.config.ts:8-10))

## Important Notes

- **No customs API**: The codebase no longer uses customs API (mentioned in README)
- **Naver Finance scraping**: Uses EUC-KR encoding, parses HTML tables with cheerio
- **GitHub Actions auth**: Uses `GITHUB_TOKEN` for automated commits ([.github/workflows/update-rates.yml](.github/workflows/update-rates.yml:34-63))
- **TypeScript strict mode**: Enabled in tsconfig.json with unused variable checks
- **React 19**: Uses latest React version with new features
