import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ─── DB 파일 경로 ─────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'data', 'estate.db');

// ─── 싱글톤 인스턴스 ──────────────────────────────────
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // data 디렉토리 생성
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initDb(db);
  return db;
}

// ─── 스키마 초기화 ────────────────────────────────────
function initDb(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sales_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT, updated_at TEXT,
      recv_date TEXT,
      category TEXT,
      road_addr TEXT,
      lot_addr TEXT,
      source TEXT,
      zoning TEXT,
      floor_this TEXT,
      floor_b TEXT,
      floor_g TEXT,
      built_year INTEGER,
      built_date TEXT,
      park_self INTEGER,
      park_mech INTEGER,
      elevator TEXT,
      land_m2 REAL,
      land_py REAL,
      bldg_area REAL,
      price INTEGER,
      price_per_py INTEGER,
      net_invest INTEGER,
      deposit INTEGER,
      subtotal INTEGER,
      monthly INTEGER,
      mng_fee INTEGER,
      yield_cur REAL,
      client_name TEXT,
      client_phone TEXT,
      carrier TEXT,
      memo TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales_listings(client_phone);
    CREATE INDEX IF NOT EXISTS idx_sales_addr  ON sales_listings(road_addr);

    CREATE TABLE IF NOT EXISTS shop_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT, updated_at TEXT,
      recv_date TEXT,
      type TEXT,
      brand TEXT,
      zoning TEXT,
      addr TEXT,
      built_year INTEGER,
      floor_this TEXT,
      floors_total TEXT,
      area_lease_m2 REAL,
      area_lease_py REAL,
      area_net_m2 REAL,
      area_net_py REAL,
      fuel TEXT,
      subtotal INTEGER,
      deposit INTEGER,
      premium INTEGER,
      subtotal2 INTEGER,
      monthly INTEGER,
      vat INTEGER,
      mng_fee INTEGER,
      rent_per_py INTEGER,
      mng_per_py INTEGER,
      client_name TEXT,
      client_phone TEXT,
      carrier TEXT,
      memo TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_shop_phone ON shop_listings(client_phone);

    CREATE TABLE IF NOT EXISTS oneroom_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT, updated_at TEXT,
      recv_date TEXT,
      category TEXT,
      building TEXT,
      addr TEXT,
      unit_no TEXT,
      door_pw TEXT,
      contract_date TEXT,
      move_in_date TEXT,
      confirm_date TEXT,
      deposit INTEGER,
      monthly INTEGER,
      mng_fee INTEGER,
      lessor TEXT,
      lessee TEXT,
      move_in TEXT,
      client_name TEXT,
      client_phone TEXT,
      carrier TEXT,
      memo TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_or_phone ON oneroom_listings(client_phone);

    -- 앱 전역 설정 (비밀번호 해시 등)
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
