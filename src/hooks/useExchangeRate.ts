import { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

/** 국가명(한국어+영어) → ISO 통화 코드 매핑 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // 한국어
  '일본': 'JPY', '태국': 'THB', '미국': 'USD', '영국': 'GBP',
  '이탈리아': 'EUR', '프랑스': 'EUR', '독일': 'EUR', '스페인': 'EUR',
  '네덜란드': 'EUR', '포르투갈': 'EUR', '그리스': 'EUR', '오스트리아': 'EUR',
  '벨기에': 'EUR', '아일랜드': 'EUR', '핀란드': 'EUR',
  '중국': 'CNY', '대만': 'TWD', '홍콩': 'HKD', '싱가포르': 'SGD',
  '말레이시아': 'MYR', '베트남': 'VND', '인도네시아': 'IDR',
  '필리핀': 'PHP', '인도': 'INR', '호주': 'AUD', '뉴질랜드': 'NZD',
  '캐나다': 'CAD', '멕시코': 'MXN', '브라질': 'BRL',
  '터키': 'TRY', '스위스': 'CHF', '스웨덴': 'SEK', '노르웨이': 'NOK',
  '덴마크': 'DKK', '체코': 'CZK', '폴란드': 'PLN', '헝가리': 'HUF',
  '러시아': 'RUB', '남아공': 'ZAR', '이집트': 'EGP', '제주': 'KRW',
  '한국': 'KRW',
  // 영어
  'Japan': 'JPY', 'Thailand': 'THB', 'United States': 'USD', 'USA': 'USD',
  'United Kingdom': 'GBP', 'UK': 'GBP', 'England': 'GBP',
  'Italy': 'EUR', 'France': 'EUR', 'Germany': 'EUR', 'Spain': 'EUR',
  'Netherlands': 'EUR', 'Portugal': 'EUR', 'Greece': 'EUR', 'Austria': 'EUR',
  'Belgium': 'EUR', 'Ireland': 'EUR', 'Finland': 'EUR',
  'China': 'CNY', 'Taiwan': 'TWD', 'Hong Kong': 'HKD', 'Singapore': 'SGD',
  'Malaysia': 'MYR', 'Vietnam': 'VND', 'Indonesia': 'IDR',
  'Philippines': 'PHP', 'India': 'INR', 'Australia': 'AUD', 'New Zealand': 'NZD',
  'Canada': 'CAD', 'Mexico': 'MXN', 'Brazil': 'BRL',
  'Turkey': 'TRY', 'Türkiye': 'TRY', 'Switzerland': 'CHF',
  'Sweden': 'SEK', 'Norway': 'NOK', 'Denmark': 'DKK',
  'Czech': 'CZK', 'Czechia': 'CZK', 'Poland': 'PLN', 'Hungary': 'HUF',
  'Russia': 'RUB', 'South Africa': 'ZAR', 'Egypt': 'EGP',
  'Korea': 'KRW', 'South Korea': 'KRW', 'Jeju': 'KRW',
};

/** 통화 코드 → 통화 기호 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CNY: '\u00A5',
  THB: '\u0E3F', TWD: 'NT$', HKD: 'HK$', SGD: 'S$', AUD: 'A$',
  CAD: 'C$', CHF: 'CHF', VND: '\u20AB', IDR: 'Rp', PHP: '\u20B1',
  MYR: 'RM', INR: '\u20B9', KRW: '\u20A9', NZD: 'NZ$',
};

/** 통화 코드 → 이름 */
const CURRENCY_NAMES: Record<string, string> = {
  USD: '\uBBF8\uAD6D \uB2EC\uB7EC', EUR: '\uC720\uB85C', GBP: '\uC601\uAD6D \uD30C\uC6B4\uB4DC',
  JPY: '\uC77C\uBCF8 \uC5D4', CNY: '\uC911\uAD6D \uC704\uC548', THB: '\uD0DC\uAD6D \uBC14\uD2B8',
  TWD: '\uB300\uB9CC \uB2EC\uB7EC', HKD: '\uD64D\uCF69 \uB2EC\uB7EC', SGD: '\uC2F1\uAC00\uD3F4 \uB2EC\uB7EC',
  AUD: '\uD638\uC8FC \uB2EC\uB7EC', CAD: '\uCE90\uB098\uB2E4 \uB2EC\uB7EC', CHF: '\uC2A4\uC704\uC2A4 \uD504\uB791',
  VND: '\uBCA0\uD2B8\uB0A8 \uB3D9', IDR: '\uC778\uB3C4\uB124\uC2DC\uC544 \uB8E8\uD53C\uC544',
  PHP: '\uD544\uB9AC\uD540 \uD398\uC18C', MYR: '\uB9D0\uB808\uC774\uC2DC\uC544 \uB9C1\uAE43',
  INR: '\uC778\uB3C4 \uB8E8\uD53C', NZD: '\uB274\uC9C8\uB79C\uB4DC \uB2EC\uB7EC',
};

export interface ExchangeRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  symbol: string;
  currencyName: string;
  updatedAt: string;
}

/** 통화 코드 → 기호 */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

/** 통화 코드 → 한국어 이름 */
export function getCurrencyName(code: string): string {
  return CURRENCY_NAMES[code] || code;
}

/** 여행지 destination 문자열에서 국가/통화 추출 */
export function detectCurrency(destination: string): string | null {
  if (!destination) return null;
  const lower = destination.toLowerCase();
  for (const [country, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (lower.includes(country.toLowerCase())) {
      return currency === 'KRW' ? null : currency;
    }
  }
  return null;
}

/** 환율 API 호출 (내부 헬퍼) */
function fetchRate(currency: string): Promise<ExchangeRateInfo> {
  return fetchWithTimeout(`https://api.frankfurter.app/latest?from=KRW&to=${currency}`)
    .then((res) => {
      if (!res.ok) throw new Error('환율 조회 실패');
      return res.json();
    })
    .then((data) => {
      const rateValue = data.rates?.[currency];
      if (!rateValue) throw new Error('환율 데이터 없음');
      return {
        fromCurrency: 'KRW',
        toCurrency: currency,
        rate: rateValue,
        symbol: CURRENCY_SYMBOLS[currency] || currency,
        currencyName: CURRENCY_NAMES[currency] || currency,
        updatedAt: data.date || new Date().toISOString().split('T')[0],
      };
    });
}

/** 실시간 환율 조회 훅 (자동 조회) */
export function useExchangeRate(destination: string | undefined) {
  // fetchedFor tracks which currency we've completed fetching for (null = pending/failed)
  const [result, setResult] = useState<{ rate: ExchangeRateInfo | null; fetchedFor: string | null }>({ rate: null, fetchedFor: null });
  const currency = destination ? detectCurrency(destination) : null;

  useEffect(() => {
    if (!currency) return;

    let cancelled = false;

    fetchRate(currency)
      .then((info) => { if (!cancelled) setResult({ rate: info, fetchedFor: currency }); })
      .catch(() => { if (!cancelled) setResult({ rate: null, fetchedFor: currency }); });

    return () => { cancelled = true; };
  }, [currency]);

  const loading = !!currency && result.fetchedFor !== currency;
  return { rate: result.rate, loading };
}

/** 실시간 환율 조회 훅 (수동 — 버튼 클릭 시 조회) */
export function useLazyExchangeRate(destination: string | undefined) {
  const [rate, setRate] = useState<ExchangeRateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetch = useCallback(() => {
    if (!destination) { setError(true); return; }
    const currency = detectCurrency(destination);
    if (!currency) { setError(true); return; }

    setLoading(true);
    setError(false);

    fetchRate(currency)
      .then((info) => setRate(info))
      .catch(() => { setRate(null); setError(true); })
      .finally(() => setLoading(false));
  }, [destination]);

  return { rate, loading, error, fetch };
}
