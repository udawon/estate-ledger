// ─── 비밀번호 해시 / 검증 헬퍼 ───────────────────────────
// Node.js 내장 crypto.scrypt 사용 — bcrypt 미설치 환경 대응

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { ensureDb } from '@/lib/db';

const SALT_LEN = 16;
const KEY_LEN  = 32;

/** salt:hash 형식으로 비밀번호 해시 생성 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

/** 입력된 비밀번호가 저장된 해시와 일치하는지 검증 */
export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, storedHex] = stored.split(':');
  if (!salt || !storedHex) return false;
  try {
    const hash = scryptSync(password, salt, KEY_LEN);
    const storedBuf = Buffer.from(storedHex, 'hex');
    return timingSafeEqual(hash, storedBuf);
  } catch {
    return false;
  }
}

// ─── DB 기반 비밀번호 관리 ─────────────────────────────
const CONFIG_KEY = 'admin_password_hash';

/** DB에서 저장된 해시 조회 */
export async function getStoredHash(): Promise<string | null> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: [CONFIG_KEY],
  });
  const row = rs.rows[0] as unknown as { value: string } | undefined;
  return row?.value ?? null;
}

/** DB에 해시 저장 (없으면 insert, 있으면 update) */
export async function setStoredHash(hash: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: `INSERT INTO config (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [CONFIG_KEY, hash],
  });
}

/**
 * 관리자 비밀번호 검증
 * - DB에 해시가 있으면 해시 비교
 * - 없으면 .env.local ADMIN_PASSWORD 평문 비교 (초기 폴백)
 */
export async function checkAdminPassword(password: string): Promise<boolean> {
  const storedHash = await getStoredHash();
  if (storedHash) {
    return verifyPasswordHash(password, storedHash);
  }
  // 초기 상태: 환경변수 평문 비교
  return password === process.env.ADMIN_PASSWORD;
}
