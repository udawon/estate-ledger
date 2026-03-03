// ─── Turso(libSQL) 클라이언트 싱글톤 + 스키마 초기화 ────────
import { createClient, type Client } from '@libsql/client';
import { seedDemoData } from './seed';

// ─── 클라이언트 싱글톤 ────────────────────────────────────
let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DB_URL;
  if (!url) throw new Error('TURSO_DB_URL 환경변수가 설정되어 있지 않습니다.');
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

// ─── 초기화 Promise (서버리스 중복 실행 방지) ─────────────
let initPromise: Promise<void> | null = null;

/** DB 초기화 + 클라이언트 반환 (모든 DB 함수에서 호출) */
export async function ensureDb(): Promise<Client> {
  if (!initPromise) {
    initPromise = initSchema();
  }
  await initPromise;
  return getDb();
}

// ─── 스키마 초기화 ────────────────────────────────────────
async function initSchema(): Promise<void> {
  const db = getDb();

  // sales_listings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales_listings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scope       TEXT NOT NULL DEFAULT 'admin',
      created_at  TEXT,
      updated_at  TEXT,
      recv_date   TEXT,
      category    TEXT,
      road_addr   TEXT,
      lot_addr    TEXT,
      source      TEXT,
      zoning      TEXT,
      floor_this  TEXT,
      floor_b     TEXT,
      floor_g     TEXT,
      built_year  INTEGER,
      built_date  TEXT,
      park_self   INTEGER,
      park_mech   INTEGER,
      elevator    TEXT,
      land_m2     REAL,
      land_py     REAL,
      bldg_area   REAL,
      price       INTEGER,
      price_per_py INTEGER,
      net_invest  INTEGER,
      deposit     INTEGER,
      subtotal    INTEGER,
      monthly     INTEGER,
      mng_fee     INTEGER,
      yield_cur   REAL,
      client_name TEXT,
      client_phone TEXT,
      carrier     TEXT,
      memo        TEXT
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sales_scope  ON sales_listings(scope)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sales_phone  ON sales_listings(client_phone)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sales_addr   ON sales_listings(road_addr)`);

  // shop_listings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shop_listings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      scope         TEXT NOT NULL DEFAULT 'admin',
      created_at    TEXT,
      updated_at    TEXT,
      recv_date     TEXT,
      type          TEXT,
      brand         TEXT,
      zoning        TEXT,
      addr          TEXT,
      built_year    INTEGER,
      floor_this    TEXT,
      floors_total  TEXT,
      area_lease_m2 REAL,
      area_lease_py REAL,
      area_net_m2   REAL,
      area_net_py   REAL,
      fuel          TEXT,
      subtotal      INTEGER,
      deposit       INTEGER,
      premium       INTEGER,
      subtotal2     INTEGER,
      monthly       INTEGER,
      vat           INTEGER,
      mng_fee       INTEGER,
      rent_per_py   INTEGER,
      mng_per_py    INTEGER,
      client_name   TEXT,
      client_phone  TEXT,
      carrier       TEXT,
      memo          TEXT
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_shop_scope  ON shop_listings(scope)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_shop_phone  ON shop_listings(client_phone)`);

  // oneroom_listings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS oneroom_listings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      scope         TEXT NOT NULL DEFAULT 'admin',
      created_at    TEXT,
      updated_at    TEXT,
      recv_date     TEXT,
      category      TEXT,
      building      TEXT,
      addr          TEXT,
      unit_no       TEXT,
      door_pw       TEXT,
      contract_date TEXT,
      move_in_date  TEXT,
      confirm_date  TEXT,
      deposit       INTEGER,
      monthly       INTEGER,
      mng_fee       INTEGER,
      lessor        TEXT,
      lessee        TEXT,
      move_in       TEXT,
      client_name   TEXT,
      client_phone  TEXT,
      carrier       TEXT,
      memo          TEXT
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_or_scope  ON oneroom_listings(scope)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_or_phone  ON oneroom_listings(client_phone)`);

  // 앱 전역 설정 (비밀번호 해시 등)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 데모 샘플 데이터 시딩
  await seedDemoData(db);
}
