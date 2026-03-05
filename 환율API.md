# 환율 정보 API 가이드 (Exchange Rate API Guide)

이 문서는 주요 통화(USD, EUR, CNY, JPY, GBP)에 대한 대 원화(KRW) 환율 데이터를 제공하는 API 가이드입니다.
네이버 금융의 고시 환율을 기반으로 하며, 평일 근무 시간 동안 주기적으로 업데이트됩니다.

## 1. 개요 (Overview)

- **Base URL**: `https://exrate.abitra.co`
- **데이터 출처**: 네이버 금융 (일일시세)
- **제공 통화**: USD(미국), EUR(유럽연합), CNY(중국), JPY(일본), GBP(영국)
- **업데이트 주기**: 평일 09:00 ~ 22:00, 30분 간격 (GitHub Actions 기반)
- **인증 방식**: 별도의 API Key 없이 호출 가능 (Public)

## 2. 엔드포인트 (Endpoints)

### 2.1. 전체 환율 히스토리 (Daily Rates History)
최근 90일간의 일별 환율 데이터를 제공합니다. 차트/그래프 구현에 적합합니다.

- **URL**: `/rates.json`
- **Method**: `GET`
- **Content-Type**: `application/json`

**요청 예시 (cURL)**
```bash
curl -X GET https://exrate.abitra.co/rates.json
```

**응답 예시**
```json
[
  {
    "id": "20260202-USD",
    "currencyCode": "USD",
    "currencyName": "미국 달러",
    "date": "2026-02-02",
    "rate": 1452.50,       
    "cashBuy": 1477.91,    
    "cashSell": 1427.09,   
    "ttSell": 1466.70,     
    "ttBuy": 1438.30,      
    "baseRate": 1452.50    
  },
  ...
]
```

### 2.2. 최신 환율 (Latest Rates)
가장 마지막으로 업데이트된 오늘의 현재 환율 정보를 제공합니다. 대시보드 등의 요약 정보 표시에 적합합니다.

- **URL**: `/latest_rates.json`
- **Method**: `GET`
- **Content-Type**: `application/json`

**요청 예시 (cURL)**
```bash
curl -X GET https://exrate.abitra.co/latest_rates.json
```

**응답 예시**
```json
[
  {
    "id": "20260202-USD",
    "currencyCode": "USD", 
    "rate": 1452.50,
    "date": "2026-02-02",
    "timestamp": "2026-02-02T15:30:00.000Z",
    "ttSend": 1466.70,
    "ttReceive": 1438.30,
    ...
  }
]
```

## 3. 응답 필드 설명 (Response Fields)

응답 JSON 객체에 포함된 주요 필드 설명입니다.

| 필드명 (Field) | 타입 | 설명 | 비고 |
|:--- |:--- |:--- |:--- |
| `currencyCode` | String | 통화 코드 | 예: USD, EUR, JPY |
| `date` | String | 기준 일자 | YYYY-MM-DD |
| `rate` / `baseRate` | Number | 매매 기준율 | Trading Base Rate |
| `cashBuy` | Number | 현찰 살 때 환율 | 고객이 현찰을 살 때 적용되는 환율 |
| `cashSell` | Number | 현찰 팔 때 환율 | 고객이 현찰을 팔 때 적용되는 환율 |
| `ttSell` / `ttSend` | Number | 송금 보낼 때 환율 | 전신환 매도율 (Bank Selling Rate) |
| `ttBuy` / `ttReceive` | Number | 송금 받을 때 환율 | 전신환 매입율 (Bank Buying Rate) |
| `timestamp` | String | 데이터 생성 시각 | `latest_rates.json` 전용 (ISO 8601) |

> **참고**: `rates.json`에서는 송금 환율이 `ttSell`/`ttBuy`로 표기되며, `latest_rates.json`에서는 `ttSend`/`ttReceive`로 표기됩니다. (값은 동일한 의미를 가집니다)

## 4. 기타 사항 (Notes)

- **CORS(Cross-Origin Resource Sharing)**: 모든 도메인에서의 접근이 허용되어 있습니다. (`Access-Control-Allow-Origin: *`)
- **데이터 정확성**: 본 API 데이터는 참고용이며, 실제 금융 거래 시에는 해당 금융기관의 고시 환율을 확인하시기 바랍니다.
- **제공 환경**: Vercel 및 GitHub Pages를 통해 정적(Static) 파일 형태로 서빙되므로 응답 속도가 빠르고 안정적입니다.
