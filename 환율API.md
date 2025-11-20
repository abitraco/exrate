환율조회: 

API가이드: https://developers.nonghyup.com/guide/GU_2070

- Request example: 
{
    "Header": {
        "ApiNm": "InquireExchangeRate",
        "Tsymd": "20191212",
        "Trtm": "112428",
        "Iscd": "000013",
        "FintechApsno": "001",
        "ApiSvcCd": "DrawingTransferA",
        "IsTuno": "234332453212344",
        "AccessToken": "10b74dd7f5f0f521ecdc7ade82f793bdfc119c3635d2e5303ae6aba0c93d4246"
    },
    "Btb": "0001",
    "Crcd": "USD",
    "Inymd": "20191213"
}

- Response example: 
{
    "Header": {
    "ApiNm": "InquireExchangeRate",
    "Tsymd": "20191213",
    "Trtm": "135339",
    "Iscd": "000013",
    "FintechApsno": "001",
    "ApiSvcCd": "DrawingTransferA",
    "IsTuno": "201912130000000001",
    "Rpcd": "00000",
    "Rsms ": "정상처리되었습니다"
    },
    "Iqtcnt": "1",
    "REC": [
    {
        "RgsnTmbt": "0001",
        "Crcd": "USD",
        "CshBnrt": "1156.01",
        "CshSlrt": "1197.19",
        "TlchPrnlBnrt": "1188.00",
        "TlchPrnlSlrt": "1165.20",
        "TcBnrt T/C": "1190.71",
        "TcSlrt T/C": "1162.49",
        "BrgnBsrt": "1176.60"
    }
    ]
}

# AccessToken: cb0c9226c6d3bbd3c05529531ba7ce740bfd03709feb9583c8158737b053a916
