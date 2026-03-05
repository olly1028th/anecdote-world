import { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

/** 국가명(한국어+영어) + 주요 도시명 → ISO 통화 코드 매핑 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // 한국어 — 국가
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
  // 한국어 — 주요 도시 (국가명 없이 도시명만 입력하는 경우 대비)
  '도쿄': 'JPY', '오사카': 'JPY', '교토': 'JPY', '후쿠오카': 'JPY', '삿포로': 'JPY',
  '나고야': 'JPY', '오키나와': 'JPY', '나라': 'JPY', '요코하마': 'JPY', '고베': 'JPY',
  '방콕': 'THB', '치앙마이': 'THB', '푸켓': 'THB', '파타야': 'THB',
  '뉴욕': 'USD', '로스앤젤레스': 'USD', '샌프란시스코': 'USD', '하와이': 'USD',
  '라스베가스': 'USD', '시카고': 'USD', '워싱턴': 'USD', '시애틀': 'USD', '보스턴': 'USD',
  '괌': 'USD', '사이판': 'USD',
  '런던': 'GBP', '에든버러': 'GBP', '맨체스터': 'GBP',
  '파리': 'EUR', '로마': 'EUR', '바르셀로나': 'EUR', '마드리드': 'EUR',
  '베를린': 'EUR', '뮌헨': 'EUR', '프라하': 'CZK', '부다페스트': 'HUF',
  '암스테르담': 'EUR', '브뤼셀': 'EUR', '리스본': 'EUR', '아테네': 'EUR',
  '비엔나': 'EUR', '헬싱키': 'EUR', '더블린': 'EUR', '밀라노': 'EUR',
  '베네치아': 'EUR', '피렌체': 'EUR', '나폴리': 'EUR',
  '상하이': 'CNY', '베이징': 'CNY', '광저우': 'CNY', '선전': 'CNY', '청두': 'CNY',
  '타이베이': 'TWD', '가오슝': 'TWD',
  '쿠알라룸푸르': 'MYR', '코타키나발루': 'MYR', '랑카위': 'MYR',
  '하노이': 'VND', '호치민': 'VND', '다낭': 'VND', '나트랑': 'VND', '달랏': 'VND', '푸꾸옥': 'VND',
  '발리': 'IDR', '자카르타': 'IDR',
  '세부': 'PHP', '보라카이': 'PHP', '마닐라': 'PHP',
  '시드니': 'AUD', '멜버른': 'AUD', '브리즈번': 'AUD', '골드코스트': 'AUD',
  '오클랜드': 'NZD', '퀸스타운': 'NZD',
  '밴쿠버': 'CAD', '토론토': 'CAD', '몬트리올': 'CAD',
  '칸쿤': 'MXN', '이스탄불': 'TRY', '취리히': 'CHF', '카이로': 'EGP',
  // 영어 — 국가
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
  // 영어 — 주요 도시
  'Tokyo': 'JPY', 'Osaka': 'JPY', 'Kyoto': 'JPY', 'Fukuoka': 'JPY', 'Sapporo': 'JPY',
  'Okinawa': 'JPY', 'Nagoya': 'JPY', 'Yokohama': 'JPY', 'Kobe': 'JPY', 'Nara': 'JPY',
  'Bangkok': 'THB', 'Chiang Mai': 'THB', 'Phuket': 'THB', 'Pattaya': 'THB',
  'New York': 'USD', 'Los Angeles': 'USD', 'San Francisco': 'USD', 'Hawaii': 'USD',
  'Las Vegas': 'USD', 'Chicago': 'USD', 'Seattle': 'USD', 'Boston': 'USD', 'Guam': 'USD',
  'London': 'GBP', 'Edinburgh': 'GBP', 'Manchester': 'GBP',
  'Paris': 'EUR', 'Rome': 'EUR', 'Barcelona': 'EUR', 'Madrid': 'EUR',
  'Berlin': 'EUR', 'Munich': 'EUR', 'Prague': 'CZK', 'Budapest': 'HUF',
  'Amsterdam': 'EUR', 'Brussels': 'EUR', 'Lisbon': 'EUR', 'Athens': 'EUR',
  'Vienna': 'EUR', 'Helsinki': 'EUR', 'Dublin': 'EUR', 'Milan': 'EUR',
  'Venice': 'EUR', 'Florence': 'EUR', 'Naples': 'EUR',
  'Shanghai': 'CNY', 'Beijing': 'CNY', 'Guangzhou': 'CNY', 'Shenzhen': 'CNY',
  'Taipei': 'TWD', 'Kaohsiung': 'TWD',
  'Kuala Lumpur': 'MYR', 'Kota Kinabalu': 'MYR', 'Langkawi': 'MYR',
  'Hanoi': 'VND', 'Ho Chi Minh': 'VND', 'Da Nang': 'VND', 'Nha Trang': 'VND',
  'Bali': 'IDR', 'Jakarta': 'IDR',
  'Cebu': 'PHP', 'Boracay': 'PHP', 'Manila': 'PHP',
  'Sydney': 'AUD', 'Melbourne': 'AUD', 'Brisbane': 'AUD', 'Gold Coast': 'AUD',
  'Auckland': 'NZD', 'Queenstown': 'NZD',
  'Vancouver': 'CAD', 'Toronto': 'CAD', 'Montreal': 'CAD',
  'Cancun': 'MXN', 'Istanbul': 'TRY', 'Zurich': 'CHF', 'Cairo': 'EGP',
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

/** 여행지 destination 문자열에서 국가/통화 추출. country가 있으면 우선 매칭. */
export function detectCurrency(destination: string, country?: string): string | null {
  // 1) country 필드가 있으면 우선 매칭 (Nominatim 역지오코딩으로 가져온 정확한 국가명)
  if (country) {
    const trimmedCountry = country.trim();
    for (const [name, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
      // 정확 일치 (대소문자 무시) 또는 포함 매칭
      if (
        trimmedCountry.toLowerCase() === name.toLowerCase() ||
        trimmedCountry.includes(name) ||
        name.toLowerCase().includes(trimmedCountry.toLowerCase())
      ) {
        if (currency === 'KRW') return null;
        console.debug('[환율] country 매칭:', trimmedCountry, '→', name, '→', currency);
        return currency;
      }
    }
    console.warn('[환율] country 매칭 실패:', trimmedCountry);
  }

  // 2) fallback: destination 문자열에서 매칭
  if (!destination) return null;
  const lower = destination.toLowerCase();
  for (const [name, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (lower.includes(name.toLowerCase())) {
      if (currency === 'KRW') return null;
      console.debug('[환율] destination 매칭:', destination, '→', name, '→', currency);
      return currency;
    }
  }
  console.warn('[환율] 통화 감지 실패 — destination:', destination, ', country:', country);
  return null;
}

/** ExchangeRateInfo 결과 생성 헬퍼 */
function buildResult(currency: string, rate: number, date: string): ExchangeRateInfo {
  return {
    fromCurrency: 'KRW',
    toCurrency: currency,
    rate,
    symbol: CURRENCY_SYMBOLS[currency] || currency,
    currencyName: CURRENCY_NAMES[currency] || currency,
    updatedAt: date,
  };
}

/** Provider 1: Frankfurter API (api.frankfurter.dev) */
function fetchFromFrankfurterDev(currency: string): Promise<ExchangeRateInfo> {
  return fetchWithTimeout(`https://api.frankfurter.dev/v1/latest?base=KRW&symbols=${currency}`, undefined, 6000)
    .then((res) => { if (!res.ok) throw new Error(`frankfurter.dev ${res.status}`); return res.json(); })
    .then((data) => {
      const rate = data.rates?.[currency];
      if (!rate) throw new Error('no rate in response');
      return buildResult(currency, rate, data.date || new Date().toISOString().split('T')[0]);
    });
}

/** Provider 2: Frankfurter API (api.frankfurter.app — 구 도메인) */
function fetchFromFrankfurterApp(currency: string): Promise<ExchangeRateInfo> {
  return fetchWithTimeout(`https://api.frankfurter.app/latest?from=KRW&to=${currency}`, undefined, 6000)
    .then((res) => { if (!res.ok) throw new Error(`frankfurter.app ${res.status}`); return res.json(); })
    .then((data) => {
      const rate = data.rates?.[currency];
      if (!rate) throw new Error('no rate in response');
      return buildResult(currency, rate, data.date || new Date().toISOString().split('T')[0]);
    });
}

/** Provider 3: open.er-api.com (무료, 키 불필요, VND/TWD 등 Frankfurter 미지원 통화도 가능) */
function fetchFromOpenErApi(currency: string): Promise<ExchangeRateInfo> {
  return fetchWithTimeout(`https://open.er-api.com/v6/latest/KRW`, undefined, 10000)
    .then((res) => { if (!res.ok) throw new Error(`open.er-api ${res.status}`); return res.json(); })
    .then((data) => {
      const rate = data.rates?.[currency];
      if (!rate) throw new Error('no rate in response');
      return buildResult(currency, rate, data.time_last_update_utc?.split(' ')?.slice(1, 4)?.join(' ') || new Date().toISOString().split('T')[0]);
    });
}

/** 메모리 캐시 — 같은 통화 반복 조회 방지 (10분 유효) */
const rateCache = new Map<string, { info: ExchangeRateInfo; cachedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

/** 환율 API 호출 — 3개 provider 병렬 경쟁 (가장 빠른 성공 사용) */
async function fetchRate(currency: string): Promise<ExchangeRateInfo> {
  // 캐시 확인
  const cached = rateCache.get(currency);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.info;
  }

  const providers = [
    () => fetchFromFrankfurterDev(currency).catch((err) => { console.warn('[환율] frankfurter.dev 실패:', err.message); throw err; }),
    () => fetchFromFrankfurterApp(currency).catch((err) => { console.warn('[환율] frankfurter.app 실패:', err.message); throw err; }),
    () => fetchFromOpenErApi(currency).catch((err) => { console.warn('[환율] open.er-api.com 실패:', err.message); throw err; }),
  ];

  try {
    // Promise.any: 3개 동시 호출, 가장 먼저 성공한 결과 반환
    const info = await Promise.any(providers.map((p) => p()));
    rateCache.set(currency, { info, cachedAt: Date.now() });
    return info;
  } catch (aggregateErr) {
    console.error('[환율] 모든 provider 실패:', aggregateErr);
    throw new Error('환율 조회 실패 — 네트워크 연결을 확인해주세요');
  }
}

/** 실시간 환율 조회 훅 (자동 조회) */
export function useExchangeRate(destination: string | undefined, country?: string) {
  // fetchedFor tracks which currency we've completed fetching for (null = pending/failed)
  const [result, setResult] = useState<{ rate: ExchangeRateInfo | null; fetchedFor: string | null }>({ rate: null, fetchedFor: null });
  const currency = destination ? detectCurrency(destination, country) : null;

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

/** 에러 유형: 'no_currency' = 통화 감지 실패, 'api_fail' = API 호출 실패 */
export type ExchangeRateError = false | 'no_currency' | 'api_fail';

/** 실시간 환율 조회 훅 (수동 — 버튼 클릭 시 조회) */
export function useLazyExchangeRate(destination: string | undefined, country?: string) {
  const [rate, setRate] = useState<ExchangeRateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ExchangeRateError>(false);

  const fetch = useCallback(() => {
    if (!destination) {
      console.warn('[환율] destination이 없음 — 조회 불가');
      setError('no_currency');
      return;
    }
    const currency = detectCurrency(destination, country);
    if (!currency) {
      console.warn('[환율] 통화 감지 실패 — destination:', JSON.stringify(destination), ', country:', JSON.stringify(country));
      setError('no_currency');
      return;
    }

    console.log('[환율] 조회 시작:', currency, '(destination:', destination, ', country:', country, ')');
    setLoading(true);
    setError(false);

    fetchRate(currency)
      .then((info) => {
        console.log('[환율] 조회 성공:', info);
        setRate(info);
      })
      .catch((err) => {
        console.error('[환율] API 조회 실패:', err);
        setRate(null);
        setError('api_fail');
      })
      .finally(() => setLoading(false));
  }, [destination, country]);

  return { rate, loading, error, fetch };
}
