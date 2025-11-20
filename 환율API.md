# 환율 데이터 출처

네이버 금융 일일시세 테이블을 스크레이핑하여 사용합니다. (API 키 불필요)

- USD: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW  
- EUR: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_EURKRW  
- CNY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_CNYKRW  
- JPY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_JPYKRW  

동작 방식
- 과거 데이터(최근 약 90일)는 `public/rates.json`에 사전 수집해 배포 시 함께 제공됩니다.
- 오늘 데이터만 네이버 1페이지를 라이브로 조회해 최신 값으로 갱신합니다.

정적 데이터 생성
```bash
npm run build:rates   # public/rates.json 생성/업데이트
```
생성 후 커밋/배포하면 서버에서 과거 데이터가 제공됩니다.

프록시
- Vercel: `/api/naver/:path*` → `https://finance.naver.com/:path*`
- 로컬: Vite `server.proxy`로 `/api/naver`을 동일하게 우회
