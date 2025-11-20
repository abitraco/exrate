# NH Bank Exchange Rate API

- Endpoint: `https://developers.nonghyup.com/InquireExchangeRate.nh`
- Must update when you test:
  - `Iscd`: your institution code (replace the sample)
  - `AccessToken`: your issued token (replace the sample)
- API guide: https://developers.nonghyup.com/guide/GU_1000
- Env variables (set in Vercel or `.env`):
  - `VITE_NH_ISCD` (required)
  - `VITE_NH_ACCESS_TOKEN` (required)
  - `VITE_NH_FINTECH_APSNO` (default `001`)
  - `VITE_NH_API_SVC_CD` (default `DrawingTransferA`)

## Sample request body
```json
{
  "Header": {
    "ApiNm": "InquireExchangeRate",
    "Tsymd": "20251120",
    "Trtm": "112428",
    "Iscd": "000013",
    "FintechApsno": "001",
    "ApiSvcCd": "DrawingTransferA",
    "IsTuno": "234332453212344",
    "AccessToken": "cb0c9226c6d3bbd3c05529531ba7ce740bfd03709feb9583c8158737b053a916"
  },
  "Btb": "0001",
  "Crcd": "USD",
  "Inymd": "20251120"
}
```

> Replace `Iscd` and `AccessToken` with your real values before calling the API.
