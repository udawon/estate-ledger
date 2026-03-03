import { getDb } from './index';
import type { RentalListing, RentalListingInput, ListingFilter } from '@/types/listings';

// ─── 목록 조회 ─────────────────────────────────────────
export function getRentals(filter: ListingFilter = {}): RentalListing[] {
  const db = getDb();
  let query = 'SELECT * FROM oneroom_listings WHERE 1=1';
  const params: (string | number)[] = [];

  if (filter.search) {
    query += ' AND (addr LIKE ? OR client_name LIKE ? OR client_phone LIKE ? OR building LIKE ?)';
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
  return db.prepare(query).all(...params) as RentalListing[];
}

// ─── 단건 조회 ─────────────────────────────────────────
export function getRentalById(id: number): RentalListing | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM oneroom_listings WHERE id = ?').get(id) as RentalListing | undefined;
}

// ─── 등록 ──────────────────────────────────────────────
export function createRental(data: RentalListingInput): RentalListing {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO oneroom_listings (
      created_at, updated_at, recv_date, category, building, addr, unit_no, door_pw,
      contract_date, move_in_date, confirm_date, deposit, monthly, mng_fee,
      lessor, lessee, move_in, client_name, client_phone, carrier, memo
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const result = stmt.run(
    now, now,
    data.recv_date, data.category, data.building, data.addr, data.unit_no, data.door_pw,
    data.contract_date, data.move_in_date, data.confirm_date, data.deposit, data.monthly,
    data.mng_fee, data.lessor, data.lessee, data.move_in,
    data.client_name, data.client_phone, data.carrier, data.memo
  );
  return getRentalById(result.lastInsertRowid as number)!;
}

// ─── 수정 ──────────────────────────────────────────────
export function updateRental(id: number, data: Partial<RentalListingInput>): RentalListing | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  if (!fields) return getRentalById(id);

  db.prepare(`UPDATE oneroom_listings SET updated_at = ?, ${fields} WHERE id = ?`)
    .run(now, ...Object.values(data), id);
  return getRentalById(id);
}

// ─── 삭제 ──────────────────────────────────────────────
export function deleteRental(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM oneroom_listings WHERE id = ?').run(id);
  return result.changes > 0;
}
