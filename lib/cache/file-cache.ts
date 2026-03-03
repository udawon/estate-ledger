// ─── 파일 기반 JSON 캐시 구현 ───────────────────────────────────
// 개발/소규모 운영용: .cache/ 폴더에 JSON 파일로 저장
// Vercel 운영 환경에서는 /tmp 디렉터리 사용 (자동 감지)

import * as fs from 'fs';
import * as path from 'path';
import type { Cache } from './index';

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp (ms)
}

// 환경별 캐시 디렉터리 결정
const CACHE_DIR =
  process.env.NODE_ENV === 'production'
    ? '/tmp/.public-api-cache'
    : path.join(process.cwd(), '.cache');

export class FileCache implements Cache {
  // ─── 디렉터리 생성 보장 ────────────────────────────────────
  private ensureDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  // ─── 키 → 파일 경로 변환 (특수문자 치환) ─────────────────
  private keyToPath(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    return path.join(CACHE_DIR, `${safe}.json`);
  }

  // ─── 캐시 읽기 ────────────────────────────────────────────
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.keyToPath(key);
      if (!fs.existsSync(filePath)) return null;

      const raw = fs.readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(raw) as CacheEntry<T>;

      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath); // 만료 캐시 삭제
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  // ─── 캐시 쓰기 ────────────────────────────────────────────
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      this.ensureDir();
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      };
      fs.writeFileSync(this.keyToPath(key), JSON.stringify(entry), 'utf-8');
    } catch (err) {
      console.warn('[FileCache] 캐시 저장 실패:', (err as Error).message);
    }
  }
}
