import React, { useEffect, useState, useMemo } from 'react';
import { RateData, ChartDataPoint, Language } from './types';
import { fetchBankRates } from './services/bankApi';
import Header from './components/Header';
import StatCard from './components/StatCard';
import RateChart from './components/RateChart';
import RateTable from './components/RateTable';
import { Info } from 'lucide-react';

// Translation Dictionary
const TRANSLATIONS = {
  KO: {
    header: { title: '은행 고시 환율', import: '수입', export: '수출' },
    table: {
      title: '환율 목록',
      searchPlaceholder: '통화 검색...',
      country: '국가/코드',
      currency: '통화명',
      rate: '매매기준율',
      cashBuy: '현찰 사실 때',
      cashSell: '현찰 파실 때',
      ttBuy: '송금 받으실 때',
      ttSell: '송금 보내실 때',
      date: '기준일',
      noData: '데이터가 없습니다.'
    },
    chart: {
      titleUsd: '환율 추이 (미국 달러)',
      titleEur: '환율 추이 (유로)',
      titleCny: '환율 추이 (중국 위안)',
      titleJpy: '환율 추이 (일본 엔)'
    },
    card: { vsLast: '전일 대비' },
    footer: '(주)아비트라코',
    footerLink: 'https://www.abitra.co',
    info: {
      text: '데이터는 네이버 금융 일일시세를 기반으로 표시됩니다.',
      periodPrefix: '조회 기준일: ',
      note: ''
    }
  },
  EN: {
    header: { title: 'Bank Exchange Rate', import: 'Import', export: 'Export' },
    table: {
      title: 'Exchange Rates List',
      searchPlaceholder: 'Search currency...',
      country: 'Country/Code',
      currency: 'Currency',
      rate: 'Base Rate',
      cashBuy: 'Cash Buy',
      cashSell: 'Cash Sell',
      ttBuy: 'TT Buy',
      ttSell: 'TT Sell',
      date: 'Date',
      noData: 'No data found.'
    },
    chart: {
      titleUsd: 'Trend (USD)',
      titleEur: 'Trend (EUR)',
      titleCny: 'Trend (CNY)',
      titleJpy: 'Trend (JPY)'
    },
    card: { vsLast: 'vs Previous' },
    footer: 'Bank Rate Dashboard. Data provided via Naver Finance.',
    info: {
      text: 'Data is scraped from Naver Finance daily quotes.',
      periodPrefix: 'Base Date: ',
      note: ''
    }
  }
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('KO');
  const [allData, setAllData] = useState<RateData[]>([]);
  const [latestData, setLatestData] = useState<RateData[]>([]);
  const [prevData, setPrevData] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  const t = TRANSLATIONS[language] as any;

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const flatData = await fetchBankRates();

        // Sort by date descending
        flatData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAllData(flatData);

        // Group by date to find latest and previous
        const dataByDate = new Map<string, RateData[]>();
        flatData.forEach(item => {
          if (!dataByDate.has(item.date)) {
            dataByDate.set(item.date, []);
          }
          dataByDate.get(item.date)?.push(item);
        });

        const sortedDates = Array.from(dataByDate.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        if (sortedDates.length > 0) {
          setLatestData(dataByDate.get(sortedDates[0]) || []);
        }
        if (sortedDates.length > 1) {
          setPrevData(dataByDate.get(sortedDates[1]) || []);
        }

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dataByDate = new Map<string, ChartDataPoint>();
    allData.forEach(item => {
      if (!dataByDate.has(item.date)) {
        dataByDate.set(item.date, { date: item.date });
      }
      const point = dataByDate.get(item.date)!;
      if (['USD', 'JPY', 'EUR', 'CNY'].includes(item.currencyCode)) {
        point[item.currencyCode] = item.rate; // Using Base Rate
      }
    });
    // 과거(좌) → 최신(우) 순서로 정렬
    return Array.from(dataByDate.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allData]);

  const getRate = (data: RateData[], code: string) => data.find(d => d.currencyCode === code)?.rate || 0;

  const currentPeriod = useMemo(() => {
    if (!latestData.length) return '';
    return latestData[0].date;
  }, [latestData]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Header
        activeType={undefined} // Removed activeType
        onTypeChange={() => { }} // No-op
        language={language}
        onLanguageChange={setLanguage}
        labels={t.header}
        hideTypeToggle={true} // New prop to hide toggle
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {t.info.text}
              </p>
              <p className="text-sm text-blue-700 font-medium mt-1">
                {t.info.periodPrefix} {currentPeriod}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard currency="미국 달러" code="USD" rate={getRate(latestData, 'USD')} prevRate={getRate(prevData, 'USD')} label={t.card.vsLast} />
          <StatCard currency="유로" code="EUR" rate={getRate(latestData, 'EUR')} prevRate={getRate(prevData, 'EUR')} label={t.card.vsLast} />
          <StatCard currency="중국 위안" code="CNY" rate={getRate(latestData, 'CNY')} prevRate={getRate(prevData, 'CNY')} label={t.card.vsLast} />
          <StatCard currency="일본 엔 (100)" code="JPY" rate={getRate(latestData, 'JPY')} prevRate={getRate(prevData, 'JPY')} label={t.card.vsLast} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleUsd} currencies={[{ key: 'USD', color: '#ef4444' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleEur} currencies={[{ key: 'EUR', color: '#3b82f6' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleCny} currencies={[{ key: 'CNY', color: '#d97706' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleJpy} currencies={[{ key: 'JPY', color: '#22c55e' }]} />
          </div>

          <div className="lg:col-span-1 lg:h-auto min-h-[600px]">
            <RateTable data={latestData} isLoading={loading} labels={t.table} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} (주)아비트라서울 Made with 💻 in Seoul.
            </p>
            <p>
              If you find this useful,{' '}
              <a
                href="https://paypal.me/chancekim79"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-medium"
              >
                buy me a coffee ☕
              </a>
              !
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
