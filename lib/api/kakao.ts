// ─── 카카오 로컬 API 래퍼 ─────────────────────────────────────
// https://developers.kakao.com/docs/latest/ko/local/dev-guide
// 서버 사이드 전용 (REST API 키는 클라이언트에 노출 금지)

const API_KEY = process.env.KAKAO_REST_API_KEY ?? '';
const BASE = 'https://dapi.kakao.com/v2/local/search';

// ─── 카카오 로컬 API 카테고리 코드 ──────────────────────────
export const KAKAO_CATEGORY = {
  대형마트:   'MT1',
  편의점:     'CS2',
  어린이집:   'PS3',
  학교:       'SC4',
  학원:       'AC5',
  주유소:     'OL7',
  지하철역:   'SW8',
  은행:       'BK9',
  문화시설:   'CT1',
  중개업소:   'AG2',
  공공기관:   'PO3',
  관광명소:   'AT4',
  숙박:       'AD5',
  음식점:     'FD6',
  카페:       'CE7',
  병원:       'HP8',
  약국:       'PM9',
} as const;

// ─── 타입 정의 ────────────────────────────────────────────────
export interface KakaoPlace {
  place_name: string;      // 장소명
  category_name: string;   // 카테고리 전체 경로
  address_name: string;    // 지번 주소
  road_address_name: string; // 도로명 주소
  x: string;               // 경도 (lng)
  y: string;               // 위도 (lat)
  distance: string;        // 쿼리 기준 거리 (m)
}

export interface KakaoSearchResult {
  places: KakaoPlace[];
  totalCount: number; // 실제 검색 총 건수 (pageable_count 기준, 최대 45)
}

// ─── 내부: API 요청 공통 함수 ─────────────────────────────────
async function kakaoFetch(
  endpoint: 'category' | 'keyword',
  params: Record<string, string | number>,
): Promise<KakaoSearchResult> {
  if (!API_KEY || API_KEY === '여기에_카카오_REST_API_키_입력') {
    throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const url = new URL(`${BASE}/${endpoint}.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${API_KEY}` },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 0 }, // 캐시 비활성화
  });

  if (res.status === 401) throw new Error('카카오 API 키가 유효하지 않습니다.');
  if (!res.ok) throw new Error(`Kakao API 오류: ${res.status}`);

  const data = await res.json() as {
    documents: KakaoPlace[];
    meta: { total_count: number; pageable_count: number; is_end: boolean };
  };

  return {
    places: data.documents,
    totalCount: data.meta.pageable_count, // 실제 검색 가능 최대 건수 (45 cap)
  };
}

// ─── 공개 API: 카테고리 검색 ─────────────────────────────────
/**
 * 카테고리 코드로 반경 내 장소 검색
 * @param categoryCode - KAKAO_CATEGORY 값
 * @param lat - 위도
 * @param lng - 경도
 * @param radius - 검색 반경 (m, 최대 20000)
 * @param size - 반환 건수 (최대 15)
 */
export async function searchByCategory(
  categoryCode: string,
  lat: number,
  lng: number,
  radius: number,
  size = 15,
): Promise<KakaoSearchResult> {
  return kakaoFetch('category', {
    category_group_code: categoryCode,
    x: lng,
    y: lat,
    radius,
    size,
    sort: 'distance',
  });
}

// ─── 공개 API: 키워드 검색 ────────────────────────────────────
/**
 * 키워드로 반경 내 장소 검색
 * @param query - 검색어 (예: "파출소", "버스정류장")
 * @param lat - 위도
 * @param lng - 경도
 * @param radius - 검색 반경 (m, 최대 20000)
 * @param size - 반환 건수 (최대 15)
 */
export async function searchByKeyword(
  query: string,
  lat: number,
  lng: number,
  radius: number,
  size = 15,
): Promise<KakaoSearchResult> {
  return kakaoFetch('keyword', {
    query,
    x: lng,
    y: lat,
    radius,
    size,
    sort: 'distance',
  });
}

// ─── 유틸: API 키 설정 여부 확인 ─────────────────────────────
export function isKakaoConfigured(): boolean {
  return (
    Boolean(API_KEY) &&
    API_KEY !== '여기에_카카오_REST_API_키_입력'
  );
}

// ─── 공개 API: 좌표 → 법정동코드 변환 ───────────────────────
/**
 * Kakao 좌표 → 행정구역 정보 변환
 * 국토부 실거래가 API에 필요한 법정동코드(LAWD_CD) 추출용
 *
 * @returns lawdCd: 법정동코드 앞 5자리 (시군구), bjdongCd: 법정동코드 뒤 5자리, dong: 법정동명
 */
export async function getRegionCode(
  lat: number,
  lng: number,
): Promise<{ lawdCd: string; bjdongCd: string; dong: string; sigungu: string }> {
  if (!API_KEY || API_KEY === '여기에_카카오_REST_API_키_입력') {
    throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const url = new URL('https://dapi.kakao.com/v2/local/geo/coord2regioncode.json');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${API_KEY}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error(`Kakao coord2regioncode 오류: ${res.status}`);

  const data = await res.json() as {
    documents: Array<{
      region_type: string;   // 'B'=법정동, 'H'=행정동
      code: string;          // 10자리 법정동코드
      region_2depth_name: string; // 시군구명
      region_3depth_name: string; // 읍면동명
    }>;
  };

  // 법정동(B 타입) 기준으로 코드 추출
  const legal = data.documents.find(d => d.region_type === 'B');
  if (!legal) throw new Error('법정동 코드를 찾을 수 없습니다.');

  return {
    lawdCd:   legal.code.slice(0, 5),   // 앞 5자리: 시군구 코드
    bjdongCd: legal.code.slice(5, 10),  // 다음 5자리: 법정동 코드 (건축물대장 API용)
    dong:     legal.region_3depth_name, // 법정동명 (예: "역삼동")
    sigungu:  legal.region_2depth_name, // 시군구명 (예: "중구") — district 보완용
  };
}

// ─── 공개 API: 주소 → 좌표 변환 ─────────────────────────────
/**
 * Kakao 주소 검색 API로 도로명/지번 주소 → 좌표 변환
 * Nominatim보다 국내 주소 정확도가 훨씬 높음
 *
 * @returns { lat, lng } 또는 null (주소 인식 실패 시)
 */
export async function geocodeByKakao(
  address: string,
): Promise<{ lat: number; lng: number; resolvedAddress: string } | null> {
  if (!API_KEY || API_KEY === '여기에_카카오_REST_API_키_입력') {
    return null;
  }

  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address);
  url.searchParams.set('size', '1');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${API_KEY}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = await res.json() as {
    documents: Array<{ x: string; y: string; address_name: string }>;
  };

  if (!data.documents.length) return null;

  return {
    lat: parseFloat(data.documents[0].y),
    lng: parseFloat(data.documents[0].x),
    resolvedAddress: data.documents[0].address_name, // 실제 해석된 전체 주소 (예: "경기 광명시 시청로 50")
  };
}

// ─── 유틸: 거리 → 도보 시간 변환 (성인 평균 80m/분) ──────────
export function distToWalk(distanceM: number): string {
  const minutes = Math.round(distanceM / 80);
  if (minutes <= 1) return '도보 1분';
  if (minutes <= 15) return `도보 ${minutes}분`;
  return `${Math.round(distanceM / 1000 * 10) / 10}km`;
}
