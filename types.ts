// Represents a single exchange rate record from the API
export interface ExchangeRateRecord {
    resultCode: string;
    resultMsg: string;
    cntySgn: string; // Country Code (e.g., US)
    mtryUtNm: string; // Currency Name (e.g., United States Dollar)
    fxrt: string; // Exchange Rate (string from XML, needs parsing)
    currSgn: string; // Currency Code (e.g., USD)
    aplyBgnDt: string; // Application Start Date (YYYYMMDD)
    imexTp: string; // '1' for Export, '2' for Import
}

// Cleaned up internal model
export interface RateData {
    id: string;
    countryCode: string;
    currencyName: string;
    currencyCode: string;
    rate: number;
    date: string; // YYYY-MM-DD format for UI
    type: 'export' | 'import' | 'bank';
    cashBuy?: number;
    cashSell?: number;
    ttBuy?: number;
    ttSell?: number;
    baseRate?: number;
}

export enum RateType {
    EXPORT = '1',
    IMPORT = '2'
}

export type Language = 'KO' | 'EN';

export interface ApiConfig {
    serviceKey: string;
}

// For Charting
export interface ChartDataPoint {
    date: string;
    USD?: number;
    JPY?: number;
    EUR?: number;
    CNY?: number;
    [key: string]: number | string | undefined;
}

export interface BankRateRecord {
    RgsnTmbt: string; // Registration Time?
    Crcd: string; // Currency Code
    CshBnrt: string; // Cash Buy Rate
    CshSlrt: string; // Cash Sell Rate
    TlchPrnlBnrt: string; // TT Buy Rate
    TlchPrnlSlrt: string; // TT Sell Rate
    "TcBnrt T/C": string; // TC Buy
    "TcSlrt T/C": string; // TC Sell
    BrgnBsrt: string; // Base Rate
}

export interface BankRateResponse {
    Header: {
        ApiNm: string;
        Tsymd: string;
        Trtm: string;
        Iscd: string;
        FintechApsno: string;
        ApiSvcCd: string;
        IsTuno: string;
        Rpcd: string;
        "Rsms ": string;
    };
    Iqtcnt: string;
    REC: BankRateRecord[];
}