import sqlite3
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import os

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "broker.db")

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.commit()
        conn.close()

def init_db():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    with get_conn() as conn:
        conn.executescript(schema_sql)

def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")

def insert_listing(data: Dict[str, Any]) -> int:
    data = data.copy()
    data["created_at"] = now_iso()
    data["updated_at"] = data["created_at"]
    cols = ",".join(data.keys())
    qmarks = ",".join(["?"] * len(data))
    values = list(data.values())
    with get_conn() as conn:
        cur = conn.execute(f"INSERT INTO listings ({cols}) VALUES ({qmarks})", values)
        return cur.lastrowid

def update_listing(listing_id: int, data: Dict[str, Any]) -> None:
    data = data.copy()
    data["updated_at"] = now_iso()
    sets = ",".join([f"{k}=?" for k in data.keys()])
    values = list(data.values()) + [listing_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE listings SET {sets} WHERE id=?", values)

def delete_listing(listing_id: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM listings WHERE id=?", (listing_id,))

def fetch_listings(filters: Dict[str, Any]) -> pd.DataFrame:
    # 동적 where 절 구성
    where = []
    params: List[Any] = []

    def add_eq_or_in(col: str, value):
        if value is None:
            return
        if isinstance(value, (list, tuple, set)) and len(value) > 0:
            where.append(f"{col} IN ({','.join(['?']*len(value))})")
            params.extend(list(value))
        else:
            where.append(f"{col}=?")
            params.append(value)

    add_eq_or_in("status",            filters.get("status"))
    add_eq_or_in("property_type",     filters.get("property_type"))
    add_eq_or_in("trade_type",        filters.get("trade_type"))

    if filters.get("client_name"):
        where.append("client_name LIKE ?")
        params.append(f"%{filters['client_name']}%")
    if filters.get("phone"):
        where.append("client_phone LIKE ?")
        params.append(f"%{filters['phone']}%")
    if filters.get("address"):
        where.append("address LIKE ?")
        params.append(f"%{filters['address']}%")

    # ▼ 면적 범위
    if filters.get("area_min") is not None:
        where.append("area_m2 >= ?")
        params.append(float(filters["area_min"]))
    if filters.get("area_max") is not None:
        where.append("area_m2 <= ?")
        params.append(float(filters["area_max"]))

    if filters.get("exclusive_only"):
        where.append("exclusive=1")

    sql = "SELECT * FROM listings"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY updated_at DESC, id DESC"
    with get_conn() as conn:
        df = pd.read_sql_query(sql, conn, params=params)
    return df

def get_listing(listing_id: int) -> Optional[dict]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM listings WHERE id=?", (listing_id,))
        row = cur.fetchone()
    return dict(row) if row else None

# --- 스키마 마이그레이션(컬럼 추가 등) ---
def _get_existing_columns() -> set:
    with get_conn() as conn:
        cur = conn.execute("PRAGMA table_info(listings)")
        return {row["name"] for row in cur.fetchall()}

def migrate_db() -> list:
    """
    기존 broker.db에 새 스키마가 없으면 안전하게 추가한다.
    실제로 새로 만든 항목만 로그에 남긴다.
    """
    applied = []
    with get_conn() as conn:
        # --- (A) 레거시/보강: oneroom_listings에 client_name/phone 없으면 추가 ---
        try:
            cur = conn.execute("PRAGMA table_info(oneroom_listings)")
            cols = {row["name"] for row in cur.fetchall()}
        except Exception:
            cols = set()
        # --- (A-2) sales_listings에 built_date 없으면 추가 ---
        try:
            cur = conn.execute("PRAGMA table_info(sales_listings)")
            s_cols = {row["name"] for row in cur.fetchall()}
        except Exception:
            s_cols = set()

        if s_cols and "built_date" not in s_cols:
            conn.execute("ALTER TABLE sales_listings ADD COLUMN built_date TEXT")
            applied.append("ALTER sales_listings ADD built_date")

        if cols:
            if "client_name" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN client_name TEXT")
                applied.append("ALTER oneroom_listings ADD client_name")
            if "client_phone" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN client_phone TEXT")
                applied.append("ALTER oneroom_listings ADD client_phone")
            if "carrier" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN carrier TEXT")
                applied.append("ALTER oneroom_listings ADD carrier")    
            if "contract_date" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN contract_date TEXT")
                applied.append("ALTER oneroom_listings ADD contract_date")
            if "move_in_date" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN move_in_date TEXT")
                applied.append("ALTER oneroom_listings ADD move_in_date")
            if "confirm_date" not in cols:
                conn.execute("ALTER TABLE oneroom_listings ADD COLUMN confirm_date TEXT")
                applied.append("ALTER oneroom_listings ADD confirm_date")


        # --- (B) 신규 3테이블/인덱스: 존재 여부 체크 후 생성 ---
        def _table_exists(c, name: str) -> bool:
            r = c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone()
            return r is not None

        def _index_exists(c, name: str) -> bool:
            r = c.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,)).fetchone()
            return r is not None

        tables = ["sales_listings", "shop_listings", "oneroom_listings"]
        pre_tbl = {t: _table_exists(conn, t) for t in tables}
        pre_idx = {
            "idx_sales_phone": _index_exists(conn, "idx_sales_phone"),
            "idx_shop_phone":  _index_exists(conn, "idx_shop_phone"),
            "idx_or_phone":    _index_exists(conn, "idx_or_phone"),
        }

        # 스키마 생성(없으면 생성, 있으면 아무 일도 하지 않음)
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS sales_listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT, updated_at TEXT,
          recv_date TEXT, category TEXT, road_addr TEXT, lot_addr TEXT,
          source TEXT, zoning TEXT, floor_this TEXT, floor_b TEXT, floor_g TEXT,
          built_year INTEGER, built_date TEXT,           -- ✅ 추가
          park_self INTEGER, park_mech INTEGER, elevator TEXT,
          land_m2 REAL, land_py REAL, bldg_area REAL,
          price INTEGER, price_per_py INTEGER, net_invest INTEGER,
          deposit INTEGER, subtotal INTEGER, monthly INTEGER, mng_fee INTEGER,
          yield_cur REAL, client_name TEXT, client_phone TEXT, carrier TEXT, memo TEXT
        );
        CREATE TABLE IF NOT EXISTS shop_listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT, updated_at TEXT,
          recv_date TEXT, type TEXT, brand TEXT, zoning TEXT, addr TEXT,
          built_year INTEGER, floor_this TEXT, floors_total TEXT,
          area_lease_m2 REAL, area_lease_py REAL, area_net_m2 REAL, area_net_py REAL,
          fuel TEXT, subtotal INTEGER, deposit INTEGER, premium INTEGER, subtotal2 INTEGER,
          monthly INTEGER, vat INTEGER, mng_fee INTEGER, rent_per_py INTEGER, mng_per_py INTEGER,
          client_name TEXT, client_phone TEXT, carrier TEXT, memo TEXT
        );
        CREATE TABLE IF NOT EXISTS oneroom_listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT, updated_at TEXT,
          recv_date TEXT, category TEXT, building TEXT, addr TEXT, unit_no TEXT, door_pw TEXT,
          contract_date TEXT,                  -- 계약일자
          move_in_date TEXT,                   -- 전입일자
          confirm_date TEXT,                   -- 확정일자
          deposit INTEGER, monthly INTEGER, mng_fee INTEGER,
          lessor TEXT, lessee TEXT, move_in TEXT,
          client_name TEXT, client_phone TEXT, carrier TEXT,
          memo TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales_listings(client_phone);
        CREATE INDEX IF NOT EXISTS idx_shop_phone  ON shop_listings(client_phone);
        CREATE INDEX IF NOT EXISTS idx_or_phone    ON oneroom_listings(client_phone);
        """)

        # 생성 이후 상태 확인 → 실제로 새로 생긴 항목만 로그에 추가
        for t in tables:
            if not pre_tbl[t] and _table_exists(conn, t):
                applied.append(f"CREATE TABLE {t}")

        for idx_name in ["idx_sales_phone", "idx_shop_phone", "idx_or_phone"]:
            if not pre_idx[idx_name] and _index_exists(conn, idx_name):
                applied.append(f"CREATE INDEX {idx_name}")

    if not applied:
        applied.append("변경사항 없음 (이미 최신)")
    return applied

# --- 자동 백업: broker.db를 backups/에 날짜 스냅샷 저장 ---
def backup_db_copy() -> str:
    """
    data/broker.db 를 data/backups/broker_YYYYMMDD_HHMMSS.db 로 복사
    반환: 백업된 경로 (에러 시 빈 문자열)
    """
    try:
        os.makedirs(os.path.join(DB_DIR, "backups"), exist_ok=True)
        src = DB_PATH
        if not os.path.exists(src):
            return ""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dst = os.path.join(DB_DIR, "backups", f"broker_{ts}.db")
        import shutil
        shutil.copy2(src, dst)
        return dst
    except Exception:
        return ""

def find_duplicates(client_phone: str = "", address: str = "", exclude_id: Optional[int] = None) -> pd.DataFrame:
    """
    연락처 또는 주소가 기존과 겹치는 레코드 조회 (둘 다 주면 OR)
    exclude_id: 해당 ID는 중복 판단에서 제외 (업데이트 시 자기 자신 제외)
    """
    where = []
    params: List[Any] = []
    if client_phone:
        where.append("client_phone = ?")
        params.append(client_phone.strip())
    if address:
        where.append("address = ?")
        params.append(address.strip())

    if not where:
        return pd.DataFrame()

    base_where = " OR ".join(where)
    if exclude_id is not None:
        base_where = f"({base_where}) AND id <> ?"
        params.append(exclude_id)

    sql = (
        "SELECT id, status, client_name, client_phone, address, building_name, updated_at "
        "FROM listings WHERE " + base_where + " ORDER BY updated_at DESC"
    )
    with get_conn() as conn:
        return pd.read_sql_query(sql, conn, params=params)

# ===== Common helpers =====
def _stamp(data: Dict[str, Any]) -> Dict[str, Any]:
    d = data.copy()
    now = now_iso()
    d.setdefault("created_at", now)
    d["updated_at"] = now
    return d

def _insert_generic(table: str, data: Dict[str, Any]) -> int:
    data = _stamp(data)
    cols = ",".join(data.keys())
    q = ",".join(["?"]*len(data))
    with get_conn() as conn:
        cur = conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({q})", list(data.values()))
        return cur.lastrowid

def _update_generic(table: str, row_id: int, data: Dict[str, Any]) -> None:
    data = data.copy()
    data["updated_at"] = now_iso()
    sets = ",".join([f"{k}=?" for k in data.keys()])
    with get_conn() as conn:
        conn.execute(f"UPDATE {table} SET {sets} WHERE id=?", list(data.values())+[row_id])

def _delete_generic(table: str, row_id: int) -> None:
    with get_conn() as conn:
        conn.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))

def _get_generic(table: str, row_id: int) -> Optional[dict]:
    with get_conn() as conn:
        cur = conn.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,))
        r = cur.fetchone()
    return dict(r) if r else None

def _fetch_generic(table: str, where: str = "", params: List[Any] = None, order: str = "updated_at DESC, id DESC") -> pd.DataFrame:
    params = params or []
    sql = f"SELECT * FROM {table}"
    if where:
        sql += " WHERE " + where
    sql += f" ORDER BY {order}"
    with get_conn() as conn:
        df = pd.read_sql_query(sql, conn, params=params)

    return df

# ===== Sales Ledger =====
def insert_sale(data: Dict[str, Any]) -> int: return _insert_generic("sales_listings", data)
def update_sale(row_id: int, data: Dict[str, Any]) -> None: _update_generic("sales_listings", row_id, data)
def delete_sale(row_id: int) -> None: _delete_generic("sales_listings", row_id)
def get_sale(row_id: int) -> Optional[dict]: return _get_generic("sales_listings", row_id)
def fetch_sales(filters: Dict[str, Any]) -> pd.DataFrame:
    w, p = [], []
    if filters.get("q"):
        q = f"%{filters['q']}%"
        w.append("(client_name LIKE ? OR client_phone LIKE ? OR road_addr LIKE ? OR lot_addr LIKE ?)")
        p += [q, q, q, q]
    return _fetch_generic("sales_listings", " AND ".join(w), p)

# ===== Shop Ledger =====
def insert_shop(data: Dict[str, Any]) -> int: return _insert_generic("shop_listings", data)
def update_shop(row_id: int, data: Dict[str, Any]) -> None: _update_generic("shop_listings", row_id, data)
def delete_shop(row_id: int) -> None: _delete_generic("shop_listings", row_id)
def get_shop(row_id: int) -> Optional[dict]: return _get_generic("shop_listings", row_id)
def fetch_shops(filters: Dict[str, Any]) -> pd.DataFrame:
    w, p = [], []
    if filters.get("q"):
        q = f"%{filters['q']}%"
        w.append("(client_name LIKE ? OR client_phone LIKE ? OR addr LIKE ? OR brand LIKE ?)")
        p += [q, q, q, q]
    return _fetch_generic("shop_listings", " AND ".join(w), p)

# ===== One-room Ledger =====
def insert_oneroom(data: Dict[str, Any]) -> int: return _insert_generic("oneroom_listings", data)
def update_oneroom(row_id: int, data: Dict[str, Any]) -> None: _update_generic("oneroom_listings", row_id, data)
def delete_oneroom(row_id: int) -> None: _delete_generic("oneroom_listings", row_id)
def get_oneroom(row_id: int) -> Optional[dict]: return _get_generic("oneroom_listings", row_id)
def fetch_onerooms(filters: Dict[str, Any]) -> pd.DataFrame:
    w, p = [], []
    if filters.get("q"):
        q = f"%{filters['q']}%"
        w.append("(building LIKE ? OR addr LIKE ? OR client_phone LIKE ? OR lessor LIKE ? OR lessee LIKE ?)")
        p += [q, q, q, q, q]
    return _fetch_generic("oneroom_listings", " AND ".join(w), p)
