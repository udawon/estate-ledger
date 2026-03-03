// ─── 캐시 인터페이스 및 싱글톤 팩토리 ───────────────────────────
// 공공 API 호출 제한(일 500~10,000건) 대응용 TTL 기반 캐시

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

// ─── 캐시 TTL 상수 (초 단위) ─────────────────────────────────
export const CACHE_TTL = {
  AIR_QUALITY:   6 * 60 * 60,        // 에어코리아: 6시간
  FLOOD_RISK:    7 * 24 * 60 * 60,   // 침수이력: 7일
  BUILDING:      30 * 24 * 60 * 60,  // 건축물대장: 30일
  INCOME_STAT:   90 * 24 * 60 * 60,  // 소득통계: 90일
  TMAP_ROUTE:    24 * 60 * 60,       // TMAP 경로: 24시간
} as const;

// ─── 싱글톤 인스턴스 ─────────────────────────────────────────
let _cache: Cache | null = null;

export function getCache(): Cache {
  if (!_cache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FileCache } = require('./file-cache') as { FileCache: new () => Cache };
    _cache = new FileCache();
  }
  return _cache;
}
