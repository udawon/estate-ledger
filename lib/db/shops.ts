import { getDb } from './index';
import type { ShopListing, ShopListingInput, ListingFilter } from '@/types/listings';

// ─── 목록 조회 ─────────────────────────────────────────
export function getShops(filter: ListingFilter = {}): ShopListing[] {
  const db = getDb();
  let query = 'SELECT * FROM shop_listings WHERE 1=1';
  const params: (string | number)[] = [];

  if (filter.search) {
    query += ' AND (addr LIKE ? OR brand LIKE ? OR client_name LIKE ? OR client_phone LIKE ?)';
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
  return db.prepare(query).all(...params) as ShopListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export function getShopById(id: number): ShopListing | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM shop_listings WHERE id = ?').get(id) as ShopListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export function createShop(data: ShopListingInput): ShopListing {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO shop_listings (
      created_at, updated_at, recv_date, type, brand, zoning, addr, built_year,
      floor_this, floors_total, area_lease_m2, area_lease_py, area_net_m2, area_net_py,
      fuel, subtotal, deposit, premium, subtotal2, monthly, vat, mng_fee,
      rent_per_py, mng_per_py, client_name, client_phone, carrier, memo
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const result = stmt.run(
    now, now,
    data.recv_date, data.type, data.brand, data.zoning, data.addr, data.built_year,
    data.floor_this, data.floors_total, data.area_lease_m2, data.area_lease_py,
    data.area_net_m2, data.area_net_py, data.fuel, data.subtotal, data.deposit,
    data.premium, data.subtotal2, data.monthly, data.vat, data.mng_fee,
    data.rent_per_py, data.mng_per_py, data.client_name, data.client_phone, data.carrier, data.memo
  );
  return getShopById(result.lastInsertRowid as number)!;
}

// ─── 수정 ──────────────────────────────────────────────
export function updateShop(id: number, data: Partial<ShopListingInput>): ShopListing | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  if (!fields) return getShopById(id);

  db.prepare(`UPDATE shop_listings SET updated_at = ?, ${fields} WHERE id = ?`)
    .run(now, ...Object.values(data), id);
  return getShopById(id);
}

// ─── 삭제 ──────────────────────────────────────────────
export function deleteShop(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM shop_listings WHERE id = ?').run(id);
  return result.changes > 0;
}
