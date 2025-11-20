# 환율 데이터 출처

네이버 금융 일일시세 테이블을 스크레이핑하여 사용합니다. (API 키 불필요)

- USD: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW  
- EUR: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_EURKRW  
- CNY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_CNYKRW  
- JPY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_JPYKRW  

프록시
- Vercel: `/api/naver/:path*` → `https://finance.naver.com/:path*`
- 로컬: Vite `server.proxy`로 `/api/naver`을 동일하게 우회
