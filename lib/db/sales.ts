// ─── 매매 매물 CRUD (Turso async) ───────────────────────
import { ensureDb } from './index';
import type { SaleListing, SaleListingInput, ListingFilter } from '@/types/listings';

type Scope = 'admin' | 'demo';

// ─── 목록 조회 ─────────────────────────────────────────
export async function getSales(
  filter: ListingFilter = {},
  scope: Scope = 'admin',
): Promise<SaleListing[]> {
  const db = await ensureDb();
  const args: (string | number)[] = [scope];
  let sql = 'SELECT * FROM sales_listings WHERE scope = ?';

  if (filter.search) {
    sql += ' AND (road_addr LIKE ? OR lot_addr LIKE ? OR client_name LIKE ? OR client_phone LIKE ?)';
    const like = `%${filter.search}%`;
    args.push(like, like, like, like);
  }
  if (filter.dateFrom) { sql += ' AND recv_date >= ?'; args.push(filter.dateFrom); }
  if (filter.dateTo)   { sql += ' AND recv_date <= ?'; args.push(filter.dateTo); }

  sql += ' ORDER BY id DESC';
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as SaleListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export async function getSaleById(id: number, scope: Scope = 'admin'): Promise<SaleListing | undefined> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'SELECT * FROM sales_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rows[0] as unknown as SaleListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export async function createSale(data: SaleListingInput, scope: Scope = 'admin'): Promise<SaleListing> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const rs = await db.execute({
    sql: `INSERT INTO sales_listings (
      scope, created_at, updated_at, recv_date, category, road_addr, lot_addr, source,
      zoning, floor_this, floor_b, floor_g, built_year, built_date, park_self,
      park_mech, elevator, land_m2, land_py, bldg_area, price, price_per_py,
      net_invest, deposit, subtotal, monthly, mng_fee, yield_cur,
      client_name, client_phone, carrier, memo
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )`,
    args: [
      scope, now, now,
      data.recv_date ?? null, data.category ?? null, data.road_addr ?? null, data.lot_addr ?? null, data.source ?? null,
      data.zoning ?? null, data.floor_this ?? null, data.floor_b ?? null, data.floor_g ?? null,
      data.built_year ?? null, data.built_date ?? null, data.park_self ?? null, data.park_mech ?? null,
      data.elevator ?? null, data.land_m2 ?? null, data.land_py ?? null, data.bldg_area ?? null,
      data.price ?? null, data.price_per_py ?? null, data.net_invest ?? null, data.deposit ?? null,
      data.subtotal ?? null, data.monthly ?? null, data.mng_fee ?? null, data.yield_cur ?? null,
      data.client_name ?? null, data.client_phone ?? null, data.carrier ?? null, data.memo ?? null,
    ],
  });
  const newId = Number(rs.lastInsertRowid);
  return (await getSaleById(newId, scope))!;
}

// ─── 수정 ──────────────────────────────────────────────
export async function updateSale(
  id: number,
  data: Partial<SaleListingInput>,
  scope: Scope = 'admin',
): Promise<SaleListing | undefined> {
  const db = await ensureDb();
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return getSaleById(id, scope);

  const now = new Date().toISOString();
  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  await db.execute({
    sql: `UPDATE sales_listings SET updated_at = ?, ${setClause} WHERE id = ? AND scope = ?`,
    args: [now, ...entries.map(([, v]) => v as string | number), id, scope],
  });
  return getSaleById(id, scope);
}

// ─── 삭제 ──────────────────────────────────────────────
export async function deleteSale(id: number, scope: Scope = 'admin'): Promise<boolean> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'DELETE FROM sales_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rowsAffected > 0;
}
