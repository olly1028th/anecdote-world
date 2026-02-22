/**
 * 여행지 문자열에서 국가를 추출해 국기 이미지 URL을 반환합니다.
 * flagcdn.com 무료 CDN을 활용합니다.
 */

const COUNTRY_TO_CODE: Record<string, string> = {
  // 한국어
  '한국': 'kr', '대한민국': 'kr',
  '일본': 'jp',
  '중국': 'cn',
  '미국': 'us',
  '영국': 'gb',
  '프랑스': 'fr',
  '독일': 'de',
  '이탈리아': 'it',
  '스페인': 'es',
  '태국': 'th',
  '베트남': 'vn',
  '호주': 'au',
  '캐나다': 'ca',
  '인도': 'in',
  '인도네시아': 'id',
  '싱가포르': 'sg',
  '말레이시아': 'my',
  '필리핀': 'ph',
  '터키': 'tr', '튀르키예': 'tr',
  '이집트': 'eg',
  '브라질': 'br',
  '멕시코': 'mx',
  '러시아': 'ru',
  '스위스': 'ch',
  '오스트리아': 'at',
  '네덜란드': 'nl',
  '벨기에': 'be',
  '포르투갈': 'pt',
  '그리스': 'gr',
  '체코': 'cz',
  '폴란드': 'pl',
  '헝가리': 'hu',
  '크로아티아': 'hr',
  '노르웨이': 'no',
  '스웨덴': 'se',
  '핀란드': 'fi',
  '덴마크': 'dk',
  '아이슬란드': 'is',
  '뉴질랜드': 'nz',
  '대만': 'tw', '타이완': 'tw',
  '홍콩': 'hk',
  '몽골': 'mn',
  '네팔': 'np',
  '캄보디아': 'kh',
  '라오스': 'la',
  '미얀마': 'mm',
  '모로코': 'ma',
  '아르헨티나': 'ar',
  '페루': 'pe',
  '콜롬비아': 'co',
  '쿠바': 'cu',
  '괌': 'gu',
  '사이판': 'mp',
  '하와이': 'us',
  // English
  'south korea': 'kr', 'korea': 'kr',
  'japan': 'jp',
  'china': 'cn',
  'united states': 'us', 'usa': 'us', 'america': 'us',
  'united kingdom': 'gb', 'uk': 'gb', 'england': 'gb',
  'france': 'fr',
  'germany': 'de',
  'italy': 'it',
  'spain': 'es',
  'thailand': 'th',
  'vietnam': 'vn',
  'australia': 'au',
  'canada': 'ca',
  'india': 'in',
  'indonesia': 'id',
  'singapore': 'sg',
  'malaysia': 'my',
  'philippines': 'ph',
  'turkey': 'tr',
  'egypt': 'eg',
  'brazil': 'br',
  'mexico': 'mx',
  'russia': 'ru',
  'switzerland': 'ch',
  'austria': 'at',
  'netherlands': 'nl',
  'portugal': 'pt',
  'greece': 'gr',
  'czech': 'cz', 'czechia': 'cz',
  'poland': 'pl',
  'hungary': 'hu',
  'croatia': 'hr',
  'norway': 'no',
  'sweden': 'se',
  'finland': 'fi',
  'denmark': 'dk',
  'iceland': 'is',
  'new zealand': 'nz',
  'taiwan': 'tw',
  'hong kong': 'hk',
  'mongolia': 'mn',
  'nepal': 'np',
  'cambodia': 'kh',
  'morocco': 'ma',
  'argentina': 'ar',
  'peru': 'pe',
  'colombia': 'co',
  'cuba': 'cu',
  'guam': 'gu',
};

function findCountryCode(destination: string): string | null {
  const parts = destination.split(/[,\s/·]+/).map((s) => s.trim()).filter(Boolean);

  // 개별 토큰으로 정확 매칭
  for (const part of parts) {
    const code = COUNTRY_TO_CODE[part] ?? COUNTRY_TO_CODE[part.toLowerCase()];
    if (code) return code;
  }

  // 부분 문자열 매칭 (긴 이름 우선)
  const lower = destination.toLowerCase();
  const sorted = Object.entries(COUNTRY_TO_CODE).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [name, code] of sorted) {
    if (lower.includes(name)) return code;
  }

  return null;
}

/**
 * 여행지 문자열로부터 국기 이미지 URL을 생성합니다.
 * 매칭 실패 시 빈 문자열을 반환합니다.
 */
export function getCountryFlagUrl(destination: string, width: number = 160): string {
  if (!destination) return '';
  const code = findCountryCode(destination);
  if (!code) return '';
  return `https://flagcdn.com/w${width}/${code}.png`;
}
