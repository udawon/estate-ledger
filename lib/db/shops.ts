// ─── 상가 매물 CRUD (Turso async) ───────────────────────
import { ensureDb } from './index';
import type { ShopListing, ShopListingInput, ListingFilter } from '@/types/listings';

type Scope = 'admin' | 'demo';

// ─── 목록 조회 ─────────────────────────────────────────
export async function getShops(
  filter: ListingFilter = {},
  scope: Scope = 'admin',
): Promise<ShopListing[]> {
  const db = await ensureDb();
  const args: (string | number)[] = [scope];
  let sql = 'SELECT * FROM shop_listings WHERE scope = ?';

  if (filter.search) {
    sql += ' AND (addr LIKE ? OR brand LIKE ? OR client_name LIKE ? OR client_phone LIKE ?)';
    const like = `%${filter.search}%`;
    args.push(like, like, like, like);
  }
  if (filter.dateFrom) { sql += ' AND recv_date >= ?'; args.push(filter.dateFrom); }
  if (filter.dateTo)   { sql += ' AND recv_date <= ?'; args.push(filter.dateTo); }

  sql += ' ORDER BY id DESC';
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as ShopListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export async function getShopById(id: number, scope: Scope = 'admin'): Promise<ShopListing | undefined> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'SELECT * FROM shop_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rows[0] as unknown as ShopListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export async function createShop(data: ShopListingInput, scope: Scope = 'admin'): Promise<ShopListing> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const rs = await db.execute({
    sql: `INSERT INTO shop_listings (
      scope, created_at, updated_at, recv_date, type, brand, zoning, addr, built_year,
      floor_this, floors_total, area_lease_m2, area_lease_py, area_net_m2, area_net_py,
      fuel, subtotal, deposit, premium, subtotal2, monthly, vat, mng_fee,
      rent_per_py, mng_per_py, client_name, client_phone, carrier, memo
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )`,
    args: [
      scope, now, now,
      data.recv_date ?? null, data.type ?? null, data.brand ?? null, data.zoning ?? null,
      data.addr ?? null, data.built_year ?? null, data.floor_this ?? null, data.floors_total ?? null,
      data.area_lease_m2 ?? null, data.area_lease_py ?? null, data.area_net_m2 ?? null, data.area_net_py ?? null,
      data.fuel ?? null, data.subtotal ?? null, data.deposit ?? null, data.premium ?? null,
      data.subtotal2 ?? null, data.monthly ?? null, data.vat ?? null, data.mng_fee ?? null,
      data.rent_per_py ?? null, data.mng_per_py ?? null,
      data.client_name ?? null, data.client_phone ?? null, data.carrier ?? null, data.memo ?? null,
    ],
  });
  const newId = Number(rs.lastInsertRowid);
  return (await getShopById(newId, scope))!;
}

// ─── 수정 ──────────────────────────────────────────────
export async function updateShop(
  id: number,
  data: Partial<ShopListingInput>,
  scope: Scope = 'admin',
): Promise<ShopListing | undefined> {
  const db = await ensureDb();
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return getShopById(id, scope);

  const now = new Date().toISOString();
  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  await db.execute({
    sql: `UPDATE shop_listings SET updated_at = ?, ${setClause} WHERE id = ? AND scope = ?`,
    args: [now, ...entries.map(([, v]) => v as string | number), id, scope],
  });
  return getShopById(id, scope);
}

// ─── 삭제 ──────────────────────────────────────────────
export async function deleteShop(id: number, scope: Scope = 'admin'): Promise<boolean> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'DELETE FROM shop_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rowsAffected > 0;
}
