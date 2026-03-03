// ─── 전월세 매물 CRUD (Turso async) ─────────────────────
import { ensureDb } from './index';
import type { RentalListing, RentalListingInput, ListingFilter } from '@/types/listings';

type Scope = 'admin' | 'demo';

// ─── 목록 조회 ─────────────────────────────────────────
export async function getRentals(
  filter: ListingFilter = {},
  scope: Scope = 'admin',
): Promise<RentalListing[]> {
  const db = await ensureDb();
  const args: (string | number)[] = [scope];
  let sql = 'SELECT * FROM oneroom_listings WHERE scope = ?';

  if (filter.search) {
    sql += ' AND (addr LIKE ? OR client_name LIKE ? OR client_phone LIKE ? OR building LIKE ?)';
    const like = `%${filter.search}%`;
    args.push(like, like, like, like);
  }
  if (filter.dateFrom) { sql += ' AND recv_date >= ?'; args.push(filter.dateFrom); }
  if (filter.dateTo)   { sql += ' AND recv_date <= ?'; args.push(filter.dateTo); }

  sql += ' ORDER BY id DESC';
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as RentalListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export async function getRentalById(id: number, scope: Scope = 'admin'): Promise<RentalListing | undefined> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'SELECT * FROM oneroom_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rows[0] as unknown as RentalListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export async function createRental(data: RentalListingInput, scope: Scope = 'admin'): Promise<RentalListing> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const rs = await db.execute({
    sql: `INSERT INTO oneroom_listings (
      scope, created_at, updated_at, recv_date, category, building, addr, unit_no, door_pw,
      contract_date, move_in_date, confirm_date, deposit, monthly, mng_fee,
      lessor, lessee, move_in, client_name, client_phone, carrier, memo
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )`,
    args: [
      scope, now, now,
      data.recv_date ?? null, data.category ?? null, data.building ?? null,
      data.addr ?? null, data.unit_no ?? null, data.door_pw ?? null,
      data.contract_date ?? null, data.move_in_date ?? null, data.confirm_date ?? null,
      data.deposit ?? null, data.monthly ?? null, data.mng_fee ?? null,
      data.lessor ?? null, data.lessee ?? null, data.move_in ?? null,
      data.client_name ?? null, data.client_phone ?? null, data.carrier ?? null, data.memo ?? null,
    ],
  });
  const newId = Number(rs.lastInsertRowid);
  return (await getRentalById(newId, scope))!;
}

// ─── 수정 ──────────────────────────────────────────────
export async function updateRental(
  id: number,
  data: Partial<RentalListingInput>,
  scope: Scope = 'admin',
): Promise<RentalListing | undefined> {
  const db = await ensureDb();
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return getRentalById(id, scope);

  const now = new Date().toISOString();
  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  await db.execute({
    sql: `UPDATE oneroom_listings SET updated_at = ?, ${setClause} WHERE id = ? AND scope = ?`,
    args: [now, ...entries.map(([, v]) => v as string | number), id, scope],
  });
  return getRentalById(id, scope);
}

// ─── 삭제 ──────────────────────────────────────────────
export async function deleteRental(id: number, scope: Scope = 'admin'): Promise<boolean> {
  const db = await ensureDb();
  const rs = await db.execute({
    sql: 'DELETE FROM oneroom_listings WHERE id = ? AND scope = ?',
    args: [id, scope],
  });
  return rs.rowsAffected > 0;
}
