import { getDb } from './index';
import type { SaleListing, SaleListingInput, ListingFilter } from '@/types/listings';

// ─── 목록 조회 ─────────────────────────────────────────
export function getSales(filter: ListingFilter = {}): SaleListing[] {
  const db = getDb();
  let query = 'SELECT * FROM sales_listings WHERE 1=1';
  const params: (string | number)[] = [];

  if (filter.search) {
    query += ' AND (road_addr LIKE ? OR lot_addr LIKE ? OR client_name LIKE ? OR client_phone LIKE ?)';
    const like = `%${filter.search}%`;
    params.push(like, like, like, like);
  }
  if (filter.dateFrom) {
    query += ' AND recv_date >= ?';
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    query += ' AND recv_date <= ?';
    params.push(filter.dateTo);
  }

  query += ' ORDER BY id DESC';
  return db.prepare(query).all(...params) as SaleListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export function getSaleById(id: number): SaleListing | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM sales_listings WHERE id = ?').get(id) as SaleListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export function createSale(data: SaleListingInput): SaleListing {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO sales_listings (
      created_at, updated_at, recv_date, category, road_addr, lot_addr, source,
      zoning, floor_this, floor_b, floor_g, built_year, built_date, park_self,
      park_mech, elevator, land_m2, land_py, bldg_area, price, price_per_py,
      net_invest, deposit, subtotal, monthly, mng_fee, yield_cur,
      client_name, client_phone, carrier, memo
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);
  const result = stmt.run(
    now, now,
    data.recv_date, data.category, data.road_addr, data.lot_addr, data.source,
    data.zoning, data.floor_this, data.floor_b, data.floor_g, data.built_year, data.built_date,
    data.park_self, data.park_mech, data.elevator, data.land_m2, data.land_py, data.bldg_area,
    data.price, data.price_per_py, data.net_invest, data.deposit, data.subtotal,
    data.monthly, data.mng_fee, data.yield_cur,
    data.client_name, data.client_phone, data.carrier, data.memo
  );
  return getSaleById(result.lastInsertRowid as number)!;
}

// ─── 수정 ──────────────────────────────────────────────
export function updateSale(id: number, data: Partial<SaleListingInput>): SaleListing | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  if (!fields) return getSaleById(id);

  db.prepare(`UPDATE sales_listings SET updated_at = ?, ${fields} WHERE id = ?`)
    .run(now, ...Object.values(data), id);
  return getSaleById(id);
}

// ─── 삭제 ──────────────────────────────────────────────
export function deleteSale(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM sales_listings WHERE id = ?').run(id);
  return result.changes > 0;
}
