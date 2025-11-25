# 환율 데이터 출처

네이버 금융 일일시세 테이블을 스크레이핑하여 사용합니다. (API 키 불필요)

- USD: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW  
- EUR: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_EURKRW  
- CNY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_CNYKRW  
- JPY: https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_JPYKRW  

동작 방식
- 모든 데이터(과거 약 90일 + 오늘)는 `public/rates.json`에 저장되어 있으며, 클라이언트는 이 정적 파일만 읽습니다.
- 브라우저에서는 네이버를 직접 조회하지 않습니다. (라이브 스크레이핑 없음)
- GitHub Actions를 통해 평일 오전 6시~오후 10시까지 매 30분마다 데이터를 자동 업데이트합니다.
  - 스크립트(`npm run build:rates`)가 네이버에서 최근 90일 데이터를 스크레이핑
  - 오늘 데이터를 포함한 전체 데이터를 `public/rates.json`에 저장
  - 변경사항을 자동 커밋하여 배포 


정적 데이터 생성
```bash
npm run build:rates   # public/rates.json 생성/업데이트
```
생성 후 커밋/배포하면 서버에서 과거 데이터가 제공됩니다.

프록시
- Vercel: `/api/naver/:path*` → `https://finance.naver.com/:path*`
- 로컬: Vite `server.proxy`로 `/api/naver`을 동일하게 우회
