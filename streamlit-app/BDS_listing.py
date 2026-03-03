import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
import io
from datetime import date

from db import (
    backup_db_copy,
    insert_sale, update_sale, delete_sale, fetch_sales, get_sale,
    insert_shop, update_shop, delete_shop, fetch_shops, get_shop,
    insert_oneroom, update_oneroom, delete_oneroom, fetch_onerooms, get_oneroom,
)

from services_geo import geocode_address_kakao


# =========================
# 공통 helpers (금액/변환)
# =========================
def _mk_money_formatter(key: str):
    # 숫자만 남기고 콤마 포맷
    def _cb():
        s = str(st.session_state.get(key, "") or "")
        digits = "".join(ch for ch in s if ch.isdigit())
        st.session_state[key] = f"{int(digits):,}" if digits else ""
    return _cb

def money_input(label: str, key: str, default: int = 0) -> int:
    if key not in st.session_state:
        st.session_state[key] = f"{int(default):,}" if default else ""
    st.text_input(label, key=key, on_change=_mk_money_formatter(key),
                  help="숫자만 입력하면 자동으로 콤마(,)가 찍혀요.")
    s = str(st.session_state.get(key, "") or "")
    return int(s.replace(",", "")) if s.strip() else 0

def to_py(m2: float) -> float:
    try:
        return round(float(m2) * 0.3025, 4)
    except Exception:
        return 0.0

def safe_div(a: float, b: float) -> float:
    try:
        a = float(a)
        b = float(b)
        return (a / b) if b != 0 else 0.0
    except Exception:
        return 0.0

def _set_money_key(key: str, value):
    try:
        if value is None or str(value).strip() == "":
            st.session_state[key] = ""
        else:
            v = int(str(value).replace(",", ""))
            st.session_state[key] = f"{v:,}"
    except Exception:
        st.session_state[key] = ""

def _to_int(v, default: int | None = 0) -> int | None:
    """엑셀/CSV 숫자 컬럼을 안전하게 int로 변환"""
    s = str(v if v is not None else "").strip()
    if s == "":
        return default
    try:
        return int(float(s.replace(",", "")))
    except Exception:
        return default

def _to_float(v, default: float | None = 0.0) -> float | None:
    """엑셀/CSV 숫자 컬럼을 안전하게 float로 변환"""
    s = str(v if v is not None else "").strip()
    if s == "":
        return default
    try:
        return float(s.replace(",", ""))
    except Exception:
        return default

def _to_date_iso(v) -> str | None:
    """
    '2024-01-01', '2024/1/1', '20240101' 등 엑셀 날짜 문자열을
    안전하게 ISO 포맷(YYYY-MM-DD)으로 변환. 실패 시 None 반환.
    """
    s = str(v if v is not None else "").strip()
    if not s:
        return None
    try:
        return pd.to_datetime(s).date().isoformat()
    except Exception:
        return None

# =========================
# HTML escape & 공통 스타일
# =========================
def _esc_attr(s: str) -> str:
    s = str(s or "")
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _inject_listing_styles():
    st.markdown(
        """
<style>
/* 본문 가독성 */
html, body, [class*="css"] {
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
}
/* 섹션 카드 */
.section-card{
  border:1px solid #edf0f2; background:#fff; border-radius:14px; padding:14px 16px; margin-bottom:12px;
}
/* 타일 그리드 */
.kvgrid{ display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:12px; }
.kv{ border:1px solid #f0f2f4; border-radius:12px; padding:12px; background:#fafbfc; }
.kv .label{ color:#6b7785; font-size:12px; margin-bottom:6px; }
.kv .value{ font-size:22px; font-weight:700; }
/* 배지 */
.badges{ display:flex; gap:8px; flex-wrap:wrap; margin:6px 0 10px 0; }
.badge{ background:#eef3ff; color:#2c5ce0; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }
/* 스티키 지도 */
.sticky-map{ position: sticky; top: 72px; }
/* 컴팩트 타일 밀집 모드 */
.kvgrid.k3{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; }
.kv.dense{ border:1px solid #e9edf1; border-radius:10px; padding:8px 10px; background:#f7f9fb; }
.kv.dense .label{ color:#6b7785; font-size:11px; margin-bottom:4px; }
.kv.dense .value{ font-size:18px; font-weight:700; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* 요약 Pill */
.pills{ display:flex; gap:8px; flex-wrap:wrap; }
.pill{ background:#f5f7fa; border:1px solid #e7eaee; border-radius:999px; padding:6px 10px; font-weight:700; font-size:13px; }

/* 좁은 화면에서 2열로 */
@media (max-width: 1200px){
  .kvgrid.k3{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}
            
/* 토글 라벨 간격 */
.stCheckbox > label { font-weight:700; }
            
/* 섹션 박스: 제목과 내용 칩을 한 박스 안에 */
.section-card{
  border:1px solid #edf0f2; background:#fff; border-radius:14px; padding:12px 14px; margin-bottom:12px;
}
/* 박스 안 제목줄 */
.section-head{
  display:flex; align-items:center; gap:8px;
  font-weight:800; font-size:14px; color:#334155;
  background:#f8fafc; border:1px solid #eef2f7; padding:6px 10px; border-radius:10px;
  margin-bottom:10px;
}
/* 고객/메모 expander 스타일 */
.tap-card [data-testid="stExpander"]{
  border:0; background:transparent;
}
.tap-card [data-testid="stExpander"] > div > summary{
  display:flex; align-items:center; gap:8px;
  font-weight:800; font-size:14px; color:#334155;
  background:#f8fafc; border:1px solid #eef2f7; border-radius:10px;
  padding:6px 10px; list-style:none;
}
.tap-card [data-testid="stExpander"] svg{ display:none; }
.tap-card [data-testid="stExpander"] > div > summary:hover{
  background:#eef6ff;
}
.tap-card .exp-body{ margin-top:10px; }

/* 칩 묶음 */
.chip-row{ display:flex; flex-wrap:wrap; gap:8px; }

/* 칩(기본/톤) */
.pill{ display:inline-block; border-radius:999px; border:1px solid #e6eaf0; background:#f6f8fb; padding:6px 10px;
       font-weight:700; font-size:13px; line-height:1; white-space:nowrap; }
.pill.gray{   background:#f5f7fa; border-color:#e7eaee; color:#475569; }
.pill.sky{    background:#eef6ff; border-color:#e0efff; color:#1d4ed8; }
.pill.mint{   background:#ebf7ee; border-color:#daf2e1; color:#1a7f37; }
.pill.amber{  background:#fff4e6; border-color:#ffe7cc; color:#d97706; }

/* 전월세 표 전용: 줄바꿈 방지 + 패딩/행간 축소 */
#or-table [data-testid="stDataFrame"] td div,
#or-table [data-testid="stDataFrame"] th div {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.15 !important;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}
#or-table [data-testid="stDataFrame"] td {
  padding-right: 8px !important;
  padding-left: 8px !important;
}
#or-table [data-testid="stDataFrame"] thead th div {
  line-height: 1.1 !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}
</style>
""",
        unsafe_allow_html=True,
    )


# =========================
# 금액/칩/히어로 유틸
# =========================
def _fmt_won(v):
    try:
        return f"{int(float(v or 0)):,}원"
    except Exception:
        return "0원"


def _fmt_int(v, d=0):
    try:
        return int(float(v or d))
    except Exception:
        return d


def _chip(text, tone="blue"):
    colors = {
        "blue": ("#eef3ff", "#2c5ce0"),
        "green": ("#ebf7ee", "#1a7f37"),
        "gray": ("#f1f3f5", "#495057"),
        "amber": ("#fff4e6", "#d9480f"),
        "sky": ("#eef6ff", "#1d4ed8"),
        "mint": ("#ebf7ee", "#1a7f37"),
    }
    bg, fg = colors.get(tone, colors["gray"])
    return (
        f"<span style='background:{bg};color:{fg};padding:2px 10px;"
        f"border-radius:999px;font-size:12px;font-weight:600;display:inline-block'>{text}</span>"
    )


def _hero_sale(rec):
    addr = (rec.get("road_addr") or rec.get("lot_addr") or "주소 미기입").strip()
    ppy = _fmt_int(rec.get("price_per_py"))
    yld = rec.get("yield_cur")
    yld_text = f"수익률 {float(yld):.2f}%" if str(yld).strip() not in ("", "None") else "수익률 -"
    elev = (rec.get("elevator") or "모름").strip()
    elev_chip = "엘리베이터 유" if elev == "유" else ("엘리베이터 무" if elev == "무" else "엘리베이터 모름")

    st.markdown(
        """
    <style>
      .hero{border:1px solid #eee;border-radius:16px;padding:16px 18px;background:#fff;}
      .hero h4{margin:0 0 6px 0;font-size:18px;}
      .hero .price{font-weight:800;font-size:28px;margin:2px 0 10px 0;}
      .chips{display:flex;gap:8px;flex-wrap:wrap;}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:12px}
      .kv{border:1px solid #edf0f2;border-radius:12px;padding:12px;background:#fafbfc}
      .kv .label{color:#5b6770;font-size:12px;margin-bottom:6px}
      .kv .value{font-size:24px;font-weight:700}
    </style>
    """,
        unsafe_allow_html=True,
    )

    st.markdown(
        f"""
    <div class='hero'>
      <h4>{addr}</h4>
      <div class='price'>{_fmt_won(rec.get("price"))}</div>
      <div class='chips'>
        {_chip(f"평당 {ppy:,}원","sky")}
        {_chip(yld_text,"mint")}
        {_chip(elev_chip,"amber")}
        {_chip(f"ID {rec.get('id','')}", "gray")}
        {_chip(rec.get("category") or "구분 미상", "blue")}
      </div>
    </div>
    """,
        unsafe_allow_html=True,
    )


# =========================
# Kakao 지도 렌더러
# =========================
def render_kakao_map(
    lat: float,
    lng: float,
    label: str = "위치",
    height: int = 420,
    route_coords: list | None = None,
):
    js_key = st.secrets.get("KAKAO_JS_KEY")
    if not js_key:
        st.error("KAKAO_JS_KEY가 secrets.toml에 없습니다.")
        return

    route_js = ""
    if route_coords:
        pts = []
        for (r_lat, r_lng) in route_coords:
            try:
                r_lat = float(r_lat)
                r_lng = float(r_lng)
            except Exception:
                continue
            pts.append(f"new kakao.maps.LatLng({r_lat}, {r_lng})")
        if pts:
            route_js = """
            var linePath = [
              %s
            ];
            var polyline = new kakao.maps.Polyline({
              path: linePath,
              strokeWeight: 4,
              strokeColor: '#ff0000',
              strokeOpacity: 0.9,
              strokeStyle: 'solid'
            });
            polyline.setMap(map);
            """ % ",\n              ".join(
                pts
            )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>#map {{ width: 100%; height: {height}px; }}</style>
      <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey={js_key}&libraries=services&autoload=false"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        kakao.maps.load(function() {{
          var container = document.getElementById('map');
          var options = {{ center: new kakao.maps.LatLng({lat}, {lng}), level: 3 }};
          var map = new kakao.maps.Map(container, options);

          var markerPosition = new kakao.maps.LatLng({lat}, {lng});
          var marker = new kakao.maps.Marker({{ position: markerPosition }});
          marker.setMap(map);

          var iwContent = '<div style="padding:6px 10px; font-size:12px;">{_esc_attr(label)}</div>';
          var infowindow = new kakao.maps.InfoWindow({{ content: iwContent }});
          infowindow.open(map, marker);

          {route_js}
        }});
      </script>
    </body>
    </html>
    """
    components.html(html, height=height + 10, scrolling=False)


# =========================
# 폼 초기화 & 오토필(매매/전월세)
# =========================
def _reset_sale_form():
    st.session_state["sale_recv"] = date.today()
    st.session_state["sale_bdate"] = date.today()
    st.session_state["sale_elev_sel"] = "모름"

    for k in [
        "sale_edit",
        "sale_cat",
        "sale_raddr",
        "sale_laddr",
        "sale_source",
        "sale_zoning",
        "sale_fthis",
        "sale_fb",
        "sale_fg",
        "sale_cname",
        "sale_cphone",
        "sale_carrier",
        "sale_memo",
    ]:
        st.session_state[k] = ""

    for k in ["sale_pself", "sale_pmech"]:
        st.session_state[k] = 0
    for k in ["sale_lm2", "sale_bm2"]:
        st.session_state[k] = 0.0

    for k in ["sale_price", "sale_netinv", "sale_dep", "sale_mon", "sale_mng"]:
        _set_money_key(k, None)


def _on_sale_edit_change():
    raw = st.session_state.get("sale_edit", "").strip()

    if raw == "":
        _reset_sale_form()
        return

    if not raw.isdigit():
        return

    sid = int(raw)
    rec = get_sale(sid)
    if not rec:
        st.warning("해당 ID가 없습니다.")
        return

    try:
        st.session_state["sale_recv"] = (
            pd.to_datetime(rec.get("recv_date")).date()
            if rec.get("recv_date")
            else date.today()
        )
    except Exception:
        st.session_state["sale_recv"] = date.today()

    st.session_state["sale_cat"] = rec.get("category") or ""
    st.session_state["sale_raddr"] = rec.get("road_addr") or ""
    st.session_state["sale_laddr"] = rec.get("lot_addr") or ""
    st.session_state["sale_source"] = rec.get("source") or ""
    st.session_state["sale_zoning"] = rec.get("zoning") or ""
    st.session_state["sale_fthis"] = rec.get("floor_this") or ""
    st.session_state["sale_fb"] = rec.get("floor_b") or ""
    st.session_state["sale_fg"] = rec.get("floor_g") or ""

    def _to_int_or_zero(v):
        try:
            return int(str(v).strip())
        except Exception:
            return 0

    st.session_state["sale_fthis_num"] = _to_int_or_zero(
        st.session_state["sale_fthis"]
    )
    st.session_state["sale_fb_num"] = _to_int_or_zero(st.session_state["sale_fb"])
    st.session_state["sale_fg_num"] = _to_int_or_zero(st.session_state["sale_fg"])

    by = rec.get("built_year")
    try:
        st.session_state["sale_bdate"] = (
            date(int(by), 1, 1) if by else date.today()
        )
    except Exception:
        st.session_state["sale_bdate"] = date.today()

    st.session_state["sale_pself"] = int(rec.get("park_self") or 0)
    st.session_state["sale_pmech"] = int(rec.get("park_mech") or 0)
    elev_val = (rec.get("elevator") or "").strip()
    st.session_state["sale_elev_sel"] = (
        elev_val if elev_val in ("유", "무", "모름") else "모름"
    )

    try:
        st.session_state["sale_lm2"] = float(rec.get("land_m2") or 0.0)
    except Exception:
        st.session_state["sale_lm2"] = 0.0
    try:
        st.session_state["sale_bm2"] = float(rec.get("bldg_area") or 0.0)
    except Exception:
        st.session_state["sale_bm2"] = 0.0

    _set_money_key("sale_price", rec.get("price"))
    _set_money_key("sale_netinv", rec.get("net_invest"))
    _set_money_key("sale_dep", rec.get("deposit"))
    _set_money_key("sale_mon", rec.get("monthly"))
    _set_money_key("sale_mng", rec.get("mng_fee"))

    st.session_state["sale_cname"] = rec.get("client_name") or ""
    st.session_state["sale_cphone"] = rec.get("client_phone") or ""
    st.session_state["sale_carrier"] = rec.get("carrier") or ""
    st.session_state["sale_memo"] = rec.get("memo") or ""

    st.success(f"ID={sid} 불러왔습니다. (오토필)")


def _reset_or_form():
    st.session_state["or_recv"] = date.today()
    st.session_state["or_cat"] = "월세"
    st.session_state["or_bldg"] = "단독"

    for k in [
        "or_edit",
        "or_addr",
        "or_unit",
        "or_pw",
        "or_less",
        "or_lese",
        "or_move",
        "or_cname",
        "or_cphone",
        "or_memo",
    ]:
        st.session_state[k] = ""

    st.session_state["or_carrier"] = ""

    st.session_state["or_contract"] = None
    st.session_state["or_movein_date"] = None
    st.session_state["or_confirm_date"] = None

    for k in ["or_dep", "or_mon", "or_mng"]:
        st.session_state[k] = 0


def _on_or_edit_change():
    raw = st.session_state.get("or_edit", "").strip()

    if raw == "":
        _reset_or_form()
        return

    if not raw.isdigit():
        return

    oid = int(raw)
    rec = get_oneroom(oid)
    if not rec:
        st.warning("해당 ID가 없습니다.")
        return

    def _to_date(v):
        try:
            return pd.to_datetime(v).date() if v else None
        except Exception:
            return None

    st.session_state["or_recv"] = _to_date(rec.get("recv_date")) or date.today()
    st.session_state["or_cat"] = rec.get("category") or "월세"
    st.session_state["or_bldg"] = rec.get("building") or "단독"
    st.session_state["or_addr"] = rec.get("addr") or ""

    st.session_state["or_unit"] = rec.get("unit_no") or ""
    st.session_state["or_pw"] = rec.get("door_pw") or ""

    st.session_state["or_contract"] = _to_date(rec.get("contract_date"))
    st.session_state["or_movein_date"] = _to_date(rec.get("move_in_date"))
    st.session_state["or_confirm_date"] = _to_date(rec.get("confirm_date"))

    for kk, src in [("or_dep", "deposit"), ("or_mon", "monthly"), ("or_mng", "mng_fee")]:
        try:
            st.session_state[kk] = int(float(rec.get(src) or 0))
        except Exception:
            st.session_state[kk] = 0

    st.session_state["or_less"] = rec.get("lessor") or ""
    st.session_state["or_lese"] = rec.get("lessee") or ""
    st.session_state["or_move"] = rec.get("move_in") or ""
    st.session_state["or_cname"] = rec.get("client_name") or ""
    st.session_state["or_cphone"] = rec.get("client_phone") or ""
    st.session_state["or_carrier"] = rec.get("carrier") or ""
    st.session_state["or_memo"] = rec.get("memo") or ""

    st.success(f"ID={oid} 불러왔습니다. (전월세 오토필)")


# =========================
# 상세 보기 + 지도 (매매/상가/전월세)
# =========================
def render_detail_sale():
    def _to_won(v):
        try:
            return int(float(v or 0)) * 10_000
        except Exception:
            return 0

    def _as_date_text(v):
        s = str(v or "").strip()
        if not s:
            return "-"
        if "-" in s or "/" in s:
            return s.replace("/", "-")
        try:
            y = int(float(s))
            return f"{y:04d}-01-01"
        except Exception:
            return s

    with st.expander("🗺️ 상세 보기 · 지도 (매매)", expanded=False):
        sel_id = st.number_input(
            "상세로 볼 ID", min_value=0, step=1, key="sale_detail_id"
        )
        if not sel_id:
            return
        rec = get_sale(int(sel_id))
        if not rec:
            st.warning("해당 ID를 찾을 수 없습니다.")
            return

        def _fmt_won_local(x):
            try:
                return f"{int(float(x or 0)):,}원"
            except Exception:
                return "0원"

        def _to_f(x, d=0.0):
            try:
                return float(x)
            except Exception:
                return d

        left, right = st.columns([2, 2])

        with left:
            road = (rec.get("road_addr") or "").strip()
            lot = (rec.get("lot_addr") or "").strip()
            addr_line = (
                f"{road} ({lot})"
                if (road and lot and road != lot)
                else (road or lot or "주소 미기입")
            )
            price_txt = _fmt_won_local(_to_won(rec.get("price")))

            land_py = (
                _to_f(rec.get("land_py"))
                if rec.get("land_py") not in (None, "")
                else _to_f(rec.get("land_m2")) * 0.3025
            )
            bldg_py = _to_f(rec.get("bldg_area")) * 0.3025
            ppy = int(float(rec.get("price_per_py") or 0))
            ppy_txt = _fmt_won_local(_to_won(ppy))
            yld = rec.get("yield_cur")
            yld_txt = (
                f"{float(yld):.2f}%"
                if str(yld).strip() not in ("", "None")
                else "-"
            )

            floor_this = rec.get("floor_this") or "-"
            floor_b = rec.get("floor_b") or "0"
            floor_g = rec.get("floor_g") or "0"
            parking_txt = f"자주 {rec.get('park_self') or 0} / 기계 {rec.get('park_mech') or 0}"
            elev_txt = rec.get("elevator") or "모름"
            recv_date = rec.get("recv_date") or "-"

            st.markdown(
                f"""
            <div class="section-card">
              <div style="font-weight:800;font-size:22px;line-height:1.25;">
                {addr_line}
              </div>
              <div style="font-weight:900;font-size:30px;margin:8px 0 6px 0;">{price_txt}</div>
              <div class="badges">
                <span class="badge">평당 {ppy_txt}</span>
                <span class="badge">수익률 {yld_txt}</span>
                <span class="badge">엘리베이터 {elev_txt}</span>
                <span class="badge">ID {rec.get('id','')}</span>
                <span class="badge">접수일 {_as_date_text(recv_date)}</span>
              </div>
            </div>
            """,
                unsafe_allow_html=True,
            )

            subtotal = rec.get("subtotal")
            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>💰 금액 요약</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill sky'>보증금 : {_fmt_won_local(_to_won(rec.get('deposit')))}</span>"
                f"<span class='pill sky'>월세 : {_fmt_won_local(_to_won(rec.get('monthly')))}</span>"
                f"<span class='pill sky'>관리비 : {_fmt_won_local(_to_won(rec.get('mng_fee')))}</span>"
                f"<span class='pill gray'>소계 : {_fmt_won_local(_to_won(subtotal))}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<div class='chip-row' style='margin-top:8px;'>"
                f"<span class='pill mint'>순투자금 : {_fmt_won_local(_to_won(rec.get('net_invest')))}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>📋 상세</div>",
                unsafe_allow_html=True,
            )

            built_label = _as_date_text(
                rec.get("built_date") or rec.get("built_year")
            )

            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill gray'>구분 : {rec.get('category') or '-'}</span>"
                f"<span class='pill gray'>용도지역 : {rec.get('zoning') or '-'}</span>"
                f"<span class='pill gray'>건축년월일 : {built_label}</span>"
                "</div>",
                unsafe_allow_html=True,
            )

            st.markdown(
                "<div class='chip-row' style='margin-top:8px;'>"
                f"<span class='pill'>토지(평) : {f'{land_py:.4f}' if land_py else '-'}</span>"
                f"<span class='pill'>건물(평) : {f'{bldg_py:.4f}' if bldg_py else '-'}</span>"
                "</div>",
                unsafe_allow_html=True,
            )

            st.markdown(
                "<div class='chip-row' style='margin-top:8px;'>"
                f"<span class='pill amber'>해당층 : {floor_this}</span>"
                f"<span class='pill amber'>층(지하) : {floor_b}</span>"
                f"<span class='pill amber'>층(지상) : {floor_g}</span>"
                f"<span class='pill amber'>주차 : {parking_txt}</span>"
                f"<span class='pill amber'>엘리베이터 : {elev_txt}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>👤 고객 / 메모</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill gray'>성명 : {rec.get('client_name') or '-'}</span>"
                f"<span class='pill gray'>연락처 : {rec.get('client_phone') or '-'}</span>"
                f"<span class='pill gray'>통신사 : {rec.get('carrier') or '-'}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<hr style='margin:8px 0;border:0;border-top:1px dashed #e2e8f0;'>",
                unsafe_allow_html=True,
            )
            st.text_area(
                "",
                value=str(rec.get("memo") or ""),
                height=180,
                disabled=True,
                key=f"sale_cm_{rec.get('id','')}_memo_v",
                label_visibility="collapsed",
            )
            st.markdown("</div>", unsafe_allow_html=True)

        with right:
            addr = rec.get("road_addr") or rec.get("lot_addr")
            lat = lng = None
            ge_err = None
            if addr and str(addr).strip():
                lat, lng, ge_err = geocode_address_kakao(addr)

            st.markdown("<div class='sticky-map'>", unsafe_allow_html=True)
            if ge_err:
                st.info("지도 키가 없거나 지오코딩 실패로 지도는 생략됩니다.")
            elif lat and lng:
                render_kakao_map(lat, lng, label=str(addr), height=520)
            else:
                st.info("주소가 없거나 좌표를 찾지 못했습니다.")
            st.markdown("</div>", unsafe_allow_html=True)


def render_detail_shop():
    with st.expander("🗺️ 상세 보기 · 지도", expanded=False):
        st.selectbox(
            "조회할 테이블",
            ["상가 매물장"],
            index=0,
            key="detail_table_shop",
            label_visibility="collapsed",
        )
        sel_id = st.number_input(
            "상세로 볼 ID", min_value=0, step=1, key="shop_detail_id"
        )
        if not sel_id:
            return
        rec = get_shop(int(sel_id))
        if not rec:
            st.warning("해당 ID를 찾을 수 없습니다.")
            return

        addr = rec.get("addr") or ""
        lat, lng, ge_err = (None, None, None)
        if addr.strip():
            lat, lng, ge_err = geocode_address_kakao(addr)

        st.markdown(
            f"""
        <div class='hero'>
          <h4>{rec.get('brand') or '상호 미기입'}</h4>
          <div class='price'>{_fmt_won(rec.get("subtotal") or 0)}</div>
          <div class='chips'>
            {_chip(rec.get("type") or "종류 미상","blue")}
            {_chip(f"보증금 {_fmt_won(rec.get('deposit'))}","gray")}
            {_chip(f"월세 {_fmt_won(rec.get('monthly'))}","gray")}
            {_chip(f"권리 {_fmt_won(rec.get('premium'))}","amber")}
            {_chip(f"ID {rec.get('id','')}","gray")}
          </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

        left, right = st.columns([1, 1])
        with left:
            st.markdown("<div class='grid'>", unsafe_allow_html=True)
            for label, val in [
                ("실면적(㎡)", rec.get("area_net_m2")),
                ("실면적(평)", rec.get("area_net_py")),
                ("계약면적(㎡)", rec.get("area_lease_m2")),
                ("계약면적(평)", rec.get("area_lease_py")),
            ]:
                st.markdown(
                    f"<div class='kv'><div class='label'>{label}</div><div class='value'>{val if val not in (None,'') else '-'}</div></div>",
                    unsafe_allow_html=True,
                )
            st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("### 기본 정보")
            c1, c2, c3, c4 = st.columns(4)
            with c1:
                st.caption("해당층")
                st.write(rec.get("floor_this") or "-")
            with c2:
                st.caption("전체층")
                st.write(rec.get("floors_total") or "-")
            with c3:
                st.caption("건축년월일")
                st.write(rec.get("built_year") or "-")
            with c4:
                st.caption("연료")
                st.write(rec.get("fuel") or "-")

            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>👤 고객 / 메모</div>",
                unsafe_allow_html=True,
            )

            _name = rec.get("client_name") or "-"
            _phone = rec.get("client_phone") or "-"
            _carrier = rec.get("carrier") or "-"
            _memo = (rec.get("memo") or "").strip()
            _memo_s = (
                (_memo[:40] + "…") if len(_memo) > 40 else (_memo if _memo else "-")
            )

            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill gray'>성명 {_esc_attr(_name)}</span>"
                f"<span class='pill gray'>연락처 {_esc_attr(_phone)}</span>"
                f"<span class='pill gray'>통신사 {_esc_attr(_carrier)}</span>"
                f"<span class='pill amber' title='{_esc_attr(_memo)}'>메모 {_esc_attr(_memo_s)}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

        with right:
            if ge_err:
                st.error(ge_err)
            elif lat and lng:
                render_kakao_map(lat, lng, label=str(addr), height=470)
            else:
                st.info("주소가 없거나 좌표를 찾지 못했습니다.")


def render_detail_rent():
    def _as_date_text(v):
        s = str(v or "").strip()
        if not s:
            return "-"
        if "-" in s or "/" in s:
            return s.replace("/", "-")
        try:
            y = int(float(s))
            return f"{y:04d}-01-01"
        except Exception:
            return s

    with st.expander("🗺️ 상세 보기 · 지도 (전월세)", expanded=False):
        st.selectbox(
            "조회할 테이블",
            ["전월세 매물장"],
            index=0,
            key="detail_table_or",
            label_visibility="collapsed",
        )
        sel_id = st.number_input(
            "상세로 볼 ID", min_value=0, step=1, key="rent_detail_id"
        )
        if not sel_id:
            return

        rec = get_oneroom(int(sel_id))
        if not rec:
            st.warning("해당 ID를 찾을 수 없습니다.")
            return

        def _to_won(v):
            try:
                return int(float(v or 0)) * 10_000
            except Exception:
                return 0

        addr = (rec.get("addr") or "").strip()
        unit_no = (rec.get("unit_no") or "").strip()
        cat_txt = rec.get("category") or ""
        bldg_txt = rec.get("building") or ""
        move_txt = rec.get("move_in") or ""
        recv_txt = _as_date_text(rec.get("recv_date") or "")
        id_txt = str(rec.get("id") or "")

        lat = lng = None
        ge_err = None
        if addr:
            lat, lng, ge_err = geocode_address_kakao(addr)

        left, right = st.columns([2, 2])

        with left:
            def _raw_num(v):
                s = str(v if v is not None else "").strip()
                if s == "":
                    return "0"
                try:
                    return str(int(float(s.replace(",", ""))))
                except Exception:
                    return s

            dep_txt = _raw_num(rec.get("deposit"))
            mon_txt = _raw_num(rec.get("monthly"))

            st.markdown(
                f"""
                <div class="section-card">
                <div style="font-weight:800;font-size:22px;line-height:1.25;">
                    {_esc_attr(addr) if addr else "주소 미기입"}
                    <span style="font-size:16px;font-weight:700;color:#475569;margin-left:6px;">
                    {_esc_attr(unit_no)}
                    </span>
                </div>

                <div style="font-weight:900;font-size:28px;margin:8px 0 6px 0;">
                    {dep_txt} / {mon_txt}
                </div>

                <div class="badges" style="margin-top:4px;">
                    {_chip(cat_txt or "전월세","blue")}
                    {_chip(bldg_txt or "건물구분 미상","gray")}
                    {_chip(move_txt or "입주상태 미상","green")}
                    {_chip(f"ID {id_txt}","gray")}
                    {_chip(f"접수일 {recv_txt}","gray")}
                </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>💰 금액 요약</div>",
                unsafe_allow_html=True,
            )

            dep_w = _fmt_won(_to_won(rec.get("deposit")))
            mon_w = _fmt_won(_to_won(rec.get("monthly")))
            mng_w = _fmt_won(_to_won(rec.get("mng_fee")))

            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill sky'>보증금 : {dep_w}</span>"
                f"<span class='pill sky'>월세 : {mon_w}</span>"
                f"<span class='pill sky'>관리비 : {mng_w}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("<div class='section-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>📋 상세</div>",
                unsafe_allow_html=True,
            )

            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill gray'>계약일자 : {_esc_attr(_as_date_text(rec.get('contract_date')))}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<div class='chip-row' style='margin-top:8px;'>"
                f"<span class='pill'>임대인 : {_esc_attr(rec.get('lessor') or '-')}</span>"
                f"<span class='pill'>임차인 : {_esc_attr(rec.get('lessee') or '-')}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<div class='chip-row' style='margin-top:8px;'>"
                f"<span class='pill amber'>호수 : {_esc_attr(unit_no or '-')}</span>"
                f"<span class='pill amber'>비밀번호 : {_esc_attr(rec.get('door_pw') or '-')}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("<div class='section-card tap-card'>", unsafe_allow_html=True)
            st.markdown(
                "<div class='section-head'>👤 고객 / 메모</div>",
                unsafe_allow_html=True,
            )

            _name = rec.get("client_name") or "-"
            _phone = rec.get("client_phone") or "-"
            _carrier = rec.get("carrier") or "-"

            st.markdown(
                "<div class='chip-row'>"
                f"<span class='pill gray'>성명 : {_esc_attr(_name)}</span>"
                f"<span class='pill gray'>연락처 : {_esc_attr(_phone)}</span>"
                f"<span class='pill gray'>통신사 : {_esc_attr(_carrier)}</span>"
                "</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                "<hr style='margin:8px 0;border:0;border-top:1px dashed #e2e8f0;'>",
                unsafe_allow_html=True,
            )
            st.text_area(
                "",
                value=str(rec.get("memo") or ""),
                height=160,
                disabled=True,
                key=f"rent_cm_{rec.get('id','')}_memo_v",
                label_visibility="collapsed",
            )
            st.markdown("</div>", unsafe_allow_html=True)

        with right:
            st.markdown("<div class='sticky-map'>", unsafe_allow_html=True)
            if ge_err:
                st.info("지도 키가 없거나 지오코딩 실패로 지도는 생략됩니다.")
            elif lat and lng:
                render_kakao_map(lat, lng, label=str(addr or "위치"), height=520)
            else:
                st.info("주소가 없거나 좌표를 찾지 못했습니다.")
            st.markdown("</div>", unsafe_allow_html=True)


# =========================
# 메인 진입: 매물장 페이지
# =========================
def render_listing_page(is_admin: bool = False):
    _inject_listing_styles()

    st.title("🏠 중개 매물 장부 (Streamlit)")
    backup_db_copy()  # (old)와 동일하게 백업 트리거

    # 업로더 버전 키 (위젯 리셋용)
    st.session_state.setdefault("sale_up_ver", 0)
    st.session_state.setdefault("shop_up_ver", 0)
    st.session_state.setdefault("or_up_ver", 0)

    # 상위 카테고리(매물장) 내부 탭 상태
    st.session_state.setdefault("active_tab", "매매 매물장")

    st.header("데이터 입력 · 목록 (매물장)")

    listing_tabs = ["매매 매물장", "상가 매물장", "전월세 매물장"]
    if st.session_state["active_tab"] not in listing_tabs:
        current_index = 0
    else:
        current_index = listing_tabs.index(st.session_state["active_tab"])

    sub_tab = st.radio(
        "매물장 메뉴",
        listing_tabs,
        index=current_index,
        key="listing_subtab",
        horizontal=True,
    )
    st.session_state["active_tab"] = sub_tab

    # 삭제 직후 폼 초기화를 위한 플래그 처리
    if st.session_state.get("_sale_form_clear", False):
        st.session_state.pop("_sale_form_clear", None)
        st.session_state["sale_edit"] = ""
        _reset_sale_form()

    if st.session_state.get("_or_form_clear", False):
        st.session_state.pop("_or_form_clear", None)
        st.session_state["or_edit"] = ""
        _reset_or_form()

    # =========================================
    # 3.1 매매 매물장
    # =========================================
    if st.session_state["active_tab"] == "매매 매물장":
        st.subheader("매매 매물장 · 신규/수정")
        cols = st.columns(4)

        with cols[0]:
            sale_edit = st.text_input(
                "수정할 ID(비우면 신규) — 삭제는 쉼표(,) 사용",
                key="sale_edit",
                on_change=_on_sale_edit_change,
                help="예) 수정/조회: 5  |  삭제: 3,4,7"
            )
            recv_date = st.date_input("접수일", key="sale_recv")
            _category_options = ["단독", "다가구", "다세대(빌라)", "아파트", "오피스텔"]
            if st.session_state.get("sale_cat") not in _category_options:
                st.session_state["sale_cat"] = _category_options[0]
            category = st.selectbox("구분", _category_options, key="sale_cat", help="매물 유형을 선택하세요.")
            road_addr = st.text_input("도로명 주소", key="sale_raddr")
            lot_addr  = st.text_input("주소지", key="sale_laddr")
            source    = st.text_input("방문경로", key="sale_source")

        with cols[1]:
            zoning     = st.text_input("용도지역", key="sale_zoning")
            # ✅ 숫자 입력으로 변경(스텝퍼 표시). DB는 TEXT라 저장 전에 문자열로 변환할 거예요.
            def _to_int_or_default(v, default=0):
                try:
                    return int(str(v).strip())
                except Exception:
                    return default

            floor_this = st.number_input("해당층", min_value=-50, max_value=200, step=1,
                                        value=_to_int_or_default(st.session_state.get("sale_fthis"), 0), key="sale_fthis_num")
            floor_b    = st.number_input("층(지하)", min_value=0, max_value=50, step=1,
                                        value=_to_int_or_default(st.session_state.get("sale_fb"), 0), key="sale_fb_num")
            floor_g    = st.number_input("층(지상)", min_value=0, max_value=200, step=1,
                                        value=_to_int_or_default(st.session_state.get("sale_fg"), 0), key="sale_fg_num")
            built_date = st.date_input("건축년월일(달력)", key="sale_bdate")
            built_year = built_date.year if built_date else None
            park_self  = st.number_input("주차(자주)", min_value=0, step=1, key="sale_pself")
            park_mech  = st.number_input("주차(기계)", min_value=0, step=1, key="sale_pmech")
            elevator_sel = st.selectbox("엘레베이터", ["유", "무", "모름"], index=1, key="sale_elev_sel")

        with cols[2]:
            land_m2 = st.number_input("토지(㎡)", min_value=0.0, step=0.01, key="sale_lm2")
            land_py = to_py(land_m2)
            st.number_input("토지(평) (자동)", value=land_py, step=0.0001, disabled=True, key="sale_lpy_view")

            bldg_m2 = st.number_input("건물(㎡)", min_value=0.0, step=0.01, key="sale_bm2")
            bldg_py = to_py(bldg_m2)
            st.number_input("건물(평) (자동)", value=bldg_py, step=0.0001, disabled=True, key="sale_bpy_view")

        with cols[3]:
            price    = money_input("매가", key="sale_price")
            price_per_py_auto = int(round(safe_div(price, land_py))) if land_py else 0
            st.text_input("평당매매가 (자동: 매가/토지평)", value=f"{price_per_py_auto:,}" if price_per_py_auto else "", disabled=True, key="sale_ppy_auto")

            net_inv  = money_input("순투자금", key="sale_netinv")
            deposit  = money_input("보증금", key="sale_dep")
            monthly  = money_input("월세", key="sale_mon")
            mng_fee  = money_input("관리비", key="sale_mng")

            subtotal_auto = (monthly or 0) + (mng_fee or 0)
            st.text_input("소계 (자동: 월세+관리비)", value=f"{subtotal_auto:,}" if subtotal_auto else "", disabled=True, key="sale_sub_auto")

            # 저장값은 '퍼센트 수치(예: 3.64)'로 저장, 화면 표시만 %기호
            yield_auto_val = safe_div(subtotal_auto * 12.0, max(price - deposit, 0)) * 100.0
            st.text_input("현 수익율(자동, %)", value=f"{yield_auto_val:.2f}%", disabled=True, key="sale_yield_auto")

        # 고객 정보 라인
        st.markdown("##### 고객 정보")
        info_cols = st.columns([1,1,1,3])
        with info_cols[0]:
            client_name  = st.text_input("성명", key="sale_cname")
        with info_cols[1]:
            client_phone = st.text_input("연락처", key="sale_cphone")
        with info_cols[2]:
            carrier      = st.selectbox("통신사", ["","SKT","KT","LG","알뜰폰 SKT","알뜰폰 KT","알뜰폰 LG"], key="sale_carrier")
        with info_cols[3]:
            memo         = st.text_area("비고(매매)", key="sale_memo")

        # DB write용 값
        elevator     = elevator_sel
        price_per_py = price_per_py_auto
        subtotal     = subtotal_auto
        yield_cur    = yield_auto_val     # 저장은 숫자(예: 3.64)
        bldg_area    = bldg_m2

        colA, colB, colC = st.columns([1,1,2])
        with colA:
            if st.button("매매 신규 등록"):
                if st.session_state.get("sale_edit", "").strip():
                    st.error("신규 등록 시에는 '수정할 ID' 칸을 비워주세요.")
                else:
                    sale_id = insert_sale({
                        "recv_date": recv_date.isoformat(),
                        "category": category,
                        "road_addr": road_addr,
                        "lot_addr": lot_addr,
                        "source": source,
                        "zoning": zoning,
                        "floor_this": str(floor_this),
                        "floor_b": str(floor_b),
                        "floor_g": str(floor_g),
                        "built_year": int(built_year) if built_year else None,
                        "built_date": built_date.isoformat() if built_date else None,
                        "park_self": int(park_self), "park_mech": int(park_mech),
                        "elevator": elevator,
                        "land_m2": float(land_m2),
                        "land_py": float(land_py),
                        "bldg_area": float(bldg_area),
                        "price": int(price),
                        "price_per_py": int(price_per_py) if price_per_py else 0,
                        "net_invest": int(net_inv),
                        "deposit": int(deposit),
                        "subtotal": int(subtotal),
                        "monthly": int(monthly),
                        "mng_fee": int(mng_fee),
                        "yield_cur": float(yield_cur) if yield_cur else None,  # 예: 3.64
                        "client_name": client_name,
                        "client_phone": client_phone,
                        "carrier": carrier,
                        "memo": memo
                    })
                    st.success(f"등록 완료 (매매) ID={sale_id}")

        with colB:
            if st.button("매매 수정 적용"):
                raw = st.session_state.get("sale_edit","").strip()
                if not raw.isdigit():
                    st.error("수정은 단일 숫자 ID만 가능합니다. (예: 5)")
                else:
                    sid = int(raw)
                    update_sale(sid, {
                        "recv_date": recv_date.isoformat(),
                        "category": category,
                        "road_addr": road_addr,
                        "lot_addr": lot_addr,
                        "source": source,
                        "zoning": zoning,
                        "floor_this": str(floor_this),
                        "floor_b": str(floor_b),
                        "floor_g": str(floor_g),
                        "built_year": int(built_year) if built_year else None,
                        "built_date": built_date.isoformat() if built_date else None,
                        "park_self": int(park_self), "park_mech": int(park_mech),
                        "elevator": elevator,
                        "land_m2": float(land_m2),
                        "land_py": float(land_py),
                        "bldg_area": float(bldg_area),
                        "price": int(price),
                        "price_per_py": int(price_per_py) if price_per_py else 0,
                        "net_invest": int(net_inv),
                        "deposit": int(deposit),
                        "subtotal": int(subtotal),
                        "monthly": int(monthly),
                        "mng_fee": int(mng_fee),
                        "yield_cur": float(yield_cur) if yield_cur else None,
                        "client_name": client_name,
                        "client_phone": client_phone,
                        "carrier": carrier,
                        "memo": memo
                    })
                    st.success(f"수정 완료 (매매) ID={sid}")

        with colC:
            if st.button("매매 삭제"):
                ids_raw = st.session_state.get("sale_edit", "").strip()
                if not ids_raw:
                    st.error("삭제할 ID를 입력하세요. 예) 3 또는 3,4,7")
                else:
                    try:
                        ids = [int(x.strip()) for x in ids_raw.split(",") if x.strip().isdigit()]
                        if not ids:
                            st.error("유효한 숫자 ID가 없습니다.")
                        else:
                            for sid in ids:
                                delete_sale(sid)
                            st.warning(f"삭제 완료 (매매) ID: {', '.join(map(str, ids))}")
                            # ✅ 같은 런에서 위젯 값을 직접 건드리지 말고, 플래그만 세우고 rerun
                            st.session_state["_sale_form_clear"] = True
                            st.session_state["active_tab"] = "매매 매물장"
                            st.rerun()

                    except Exception as e:
                        st.error(f"삭제 중 오류: {e}")

        # ------------------------------
        # 매매: 필터
        # ------------------------------
        st.markdown("—")
        with st.expander("🔎 매매 필터 열기/닫기", expanded=True):
            c1, c2, c3 = st.columns(3)
            with c1:
                sale_q = st.text_input("이름/전화/주소 포함", key="sale_q")
                # ✅ 구분: 신규/수정과 동일한 옵션(단일 선택). 첫 항목("")은 전체.
                _category_options = ["", "단독", "다가구", "다세대(빌라)", "아파트", "오피스텔"]
                sale_cat_filter = st.selectbox("구분", _category_options, index=0, key="sale_cat_filter", help="비워두면 전체")
            with c2:
                sale_price_min = st.number_input("매가 이상", min_value=0, step=1000, value=0, key="sale_price_min")
                sale_price_max = st.number_input("매가 이하", min_value=0, step=1000, value=0, key="sale_price_max")
                sale_dep_min   = st.number_input("보증금 이상", min_value=0, step=1000, value=0, key="sale_dep_min")
                sale_dep_max   = st.number_input("보증금 이하", min_value=0, step=1000, value=0, key="sale_dep_max")
                sale_mon_min      = st.number_input("월세 이상", min_value=0, step=1000, value=0, key="sale_mon_min")
                sale_mon_max      = st.number_input("월세 이하", min_value=0, step=1000, value=0, key="sale_mon_max")
            with c3:
                sale_landpy_min   = st.number_input("토지(평) 이상", min_value=0.0, step=0.01, value=0.0, key="sale_landpy_min")
                sale_landpy_max   = st.number_input("토지(평) 이하", min_value=0.0, step=0.01, value=0.0, key="sale_landpy_max")
                sale_bldgpy_min   = st.number_input("건물(평) 이상", min_value=0.0, step=0.01, value=0.0, key="sale_bldgpy_min")
                sale_bldgpy_max   = st.number_input("건물(평) 이하", min_value=0.0, step=0.01, value=0.0, key="sale_bldgpy_max")

        df_sale = fetch_sales({"q": sale_q}) if sale_q else fetch_sales({})
        if df_sale is None:
            df_sale = pd.DataFrame()

        if not df_sale.empty:
            df_sale = df_sale.copy()

            # ✅ 건축년월일 표기 보정: 숫자면 YYYY-01-01 로, 문자열 날짜는 슬래시→대시 통일
            if "built_year" in df_sale.columns:
                def _as_yyyy0101(x):
                    if pd.isna(x) or str(x).strip() == "":
                        return ""
                    s = str(x).strip()
                    if "-" in s or "/" in s:  # 이미 날짜 형태
                        return s.replace("/", "-")
                    try:
                        y = int(float(s))
                        return f"{y:04d}-01-01"
                    except Exception:
                        return s
                df_sale["built_year"] = df_sale["built_year"].apply(_as_yyyy0101)

            # ✅ (중요) 건물(평) 필터를 쓰기 전에, bldg_py 컬럼을 보장
            if "bldg_py" not in df_sale.columns and "bldg_area" in df_sale.columns:
                df_sale["bldg_py"] = (pd.to_numeric(df_sale["bldg_area"], errors="coerce").fillna(0.0) * 0.3025).round(4)

            # ✅ 구분: 단일 선택(비어있으면 전체)
            if "category" in df_sale.columns and st.session_state.get("sale_cat_filter"):
                df_sale = df_sale[df_sale["category"].astype(str) == st.session_state["sale_cat_filter"]]

            # 가격/보증금/월세 범위
            if sale_price_min > 0 and "price" in df_sale.columns:
                df_sale = df_sale[df_sale["price"].fillna(0).astype(int) >= sale_price_min]
            if sale_price_max > 0 and "price" in df_sale.columns:
                df_sale = df_sale[df_sale["price"].fillna(0).astype(int) <= sale_price_max]
            if sale_dep_min > 0 and "deposit" in df_sale.columns:
                df_sale = df_sale[df_sale["deposit"].fillna(0).astype(int) >= sale_dep_min]
            if sale_dep_max > 0 and "deposit" in df_sale.columns:
                df_sale = df_sale[df_sale["deposit"].fillna(0).astype(int) <= sale_dep_max]
            if sale_mon_min > 0 and "monthly" in df_sale.columns:
                df_sale = df_sale[df_sale["monthly"].fillna(0).astype(int) >= sale_mon_min]
            if sale_mon_max > 0 and "monthly" in df_sale.columns:
                df_sale = df_sale[df_sale["monthly"].fillna(0).astype(int) <= sale_mon_max]

            # ✅ 토지(평) / 건물(평) 범위
            if "land_py" in df_sale.columns:
                if sale_landpy_min > 0:
                    df_sale = df_sale[pd.to_numeric(df_sale["land_py"], errors="coerce").fillna(0.0) >= float(sale_landpy_min)]
                if sale_landpy_max > 0:
                    df_sale = df_sale[pd.to_numeric(df_sale["land_py"], errors="coerce").fillna(0.0) <= float(sale_landpy_max)]
            if "bldg_py" in df_sale.columns:
                if sale_bldgpy_min > 0:
                    df_sale = df_sale[pd.to_numeric(df_sale["bldg_py"], errors="coerce").fillna(0.0) >= float(sale_bldgpy_min)]
                if sale_bldgpy_max > 0:
                    df_sale = df_sale[pd.to_numeric(df_sale["bldg_py"], errors="coerce").fillna(0.0) <= float(sale_bldgpy_max)]

        # ===== 검색 결과: 순서/헤더(한글) 확정 =====
        order_sale = [
            "id",  # ✅ ID 보이기
            "recv_date","category","road_addr","lot_addr","source","zoning",
            "floor_this","floor_b","floor_g","built_year",
            "park_self","park_mech","elevator",
            "land_m2","land_py","bldg_area","bldg_py",
            "price","price_per_py","net_invest","deposit","subtotal","monthly","mng_fee","yield_cur",
            "client_name","client_phone","memo",
            "updated_at"  # 선택: 최근 수정시각
        ]

        SALE_COLMAP = {
            "id":"ID",  # ✅ 추가
            "recv_date":"접수일","category":"구분","road_addr":"도로명 주소","lot_addr":"주소지","source":"방문경로",
            "zoning":"용도지역","floor_this":"해당층","floor_b":"층(지하)","floor_g":"층(지상)",
            "built_year":"건축년월일","park_self":"주차(자주)","park_mech":"주차(기계)","elevator":"엘레베이터",
            "land_m2":"토지(㎡)","land_py":"토지(평)","bldg_area":"건물(㎡)","bldg_py":"건물(평)",
            "price":"매가","price_per_py":"평당매매가","net_invest":"순투자금","deposit":"보증금",
            "subtotal":"소계","monthly":"월세","mng_fee":"관리비","yield_cur":"현 수익율",
            "client_name":"성명","client_phone":"연락처","memo":"비고",
            "updated_at":"수정시각"  # 선택: 함께 표시
        }

        st.subheader(f"매매 매물장 검색 결과 · 총 {len(df_sale)}건")
        df_sale_view = df_sale
        if not df_sale.empty:
            df_sale = df_sale.copy()
            # 건물(평) 계산(없으면 부여)
            if "bldg_py" not in df_sale.columns and "bldg_area" in df_sale.columns:
                df_sale["bldg_py"] = (pd.to_numeric(df_sale["bldg_area"], errors="coerce").fillna(0.0) * 0.3025).round(4)
            # 현 수익율 표시 포맷: 저장값 3.64 → "3.64%"
            if "yield_cur" in df_sale.columns:
                df_sale["yield_cur"] = pd.to_numeric(df_sale["yield_cur"], errors="coerce").apply(
                    lambda v: f"{v:.2f}%" if pd.notna(v) else ""
                )
            # 정렬
            df_sale = df_sale[[c for c in order_sale if c in df_sale.columns]]
            # 한글 헤더로 표시용 뷰
            df_sale_view = df_sale.rename(columns=SALE_COLMAP)
            st.dataframe(df_sale_view, width="stretch", hide_index=True)
        else:
            st.dataframe(df_sale, width="stretch", hide_index=True)

            # 내보내기(한글 헤더/순서 유지)
        col_sa, col_sb = st.columns(2)
        with col_sa:
            if not df_sale.empty:
                bio = io.BytesIO()
                with pd.ExcelWriter(bio, engine="openpyxl") as w:
                    df_sale_view.to_excel(w, index=False, sheet_name="매매")
                st.download_button("⬇️ 매매 매물장 엑셀(xlsx) 내보내기",
                                bio.getvalue(),
                                "sales_export.xlsx",
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with col_sb:
            if not df_sale.empty:
                st.download_button("⬇️ 매매 매물장 CSV 내보내기",
                                df_sale_view.to_csv(index=False).encode("utf-8-sig"),
                                "sales_export.csv", mime="text/csv")
        
        # ✅ 공용 함수 제거 → 전용 렌더러 호출
        render_detail_sale()

        # ------------------------------
        # 매매 매물장: 업로드 템플릿 내려받기
        # ------------------------------
        
        with st.expander("📥 매매 매물장 업로드 템플릿 내려받기", expanded=False):
            st.caption("아래 템플릿의 한글 헤더를 그대로 사용해 업로드하세요. (자동계산 항목은 비워도 됩니다)")
            tmpl_cols = [
                "접수일","구분","도로명 주소","주소지","방문경로","용도지역","해당층","층(지하)","층(지상)",
                "건축년월일","주차(자주)","주차(기계)","엘레베이터",
                "토지(㎡)","토지(평)","건물(㎡)","건물(평)",
                "매가","평당매매가","순투자금","보증금","소계","월세","관리비","현 수익율",
                "성명","연락처","비고"
            ]
            tmpl_df = pd.DataFrame([{
                "접수일":"", "구분":"", "도로명 주소":"", "주소지":"", "방문경로":"", "용도지역":"",
                "해당층":"", "층(지하)":"", "층(지상)":"", "건축년월일":"",
                "주차(자주)":"", "주차(기계)":"", "엘레베이터":"모름",
                "토지(㎡)":"", "토지(평)":"", "건물(㎡)":"", "건물(평)":"",
                "매가":"", "평당매매가":"", "순투자금":"", "보증금":"", "소계":"", "월세":"", "관리비":"", "현 수익율":"",
                "성명":"", "연락처":"", "비고":""
            }], columns=tmpl_cols)
            bio_tmpl = io.BytesIO()
            with pd.ExcelWriter(bio_tmpl, engine="openpyxl") as w:
                tmpl_df.to_excel(w, index=False, sheet_name="매매_업로드_템플릿")
            st.download_button("⬇️ 매매_업로드_템플릿.xlsx 내려받기",
                            bio_tmpl.getvalue(),
                            "매매_업로드_템플릿.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        # 가져오기(일괄 등록) — 한글 헤더 업로드 + 미리보기 후 등록/취소
        with st.expander("📥 매매 매물장 엑셀/CSV 가져오기 (일괄 등록)", expanded=False):
            st.caption("템플릿의 한글 헤더를 그대로 사용해 주세요. 자동계산 항목은 비워도 됩니다.")
            up_s = st.file_uploader(
                "파일 업로드(.xlsx/.csv)",
                type=["xlsx","csv"],
                key=f"sale_up_{st.session_state['sale_up_ver']}"
            )

            # 세션 상태 키
            PREVIEW_KEY = "sale_upload_preview_df"   # 매핑된 컬럼으로 정리된 DataFrame(미리보기용)
            RAW_KEY     = "sale_upload_raw_df"       # 업로드 원본(필요시 표시용)

            # 1) 파일을 새로 업로드하면: 읽고, 한글 -> 내부키 매핑까지 수행하여 세션에 저장
            if up_s is not None:
                try:
                    df_raw = pd.read_csv(up_s) if up_s.name.lower().endswith(".csv") else pd.read_excel(up_s)
                    st.success(f"업로드 읽기 완료: {df_raw.shape[0]}행")
                    st.dataframe(df_raw.head(10), width="stretch")

                    # 한글→내부키 매핑
                    K2E = {
                        "접수일":"recv_date","구분":"category","도로명 주소":"road_addr","주소지":"lot_addr","방문경로":"source",
                        "용도지역":"zoning","해당층":"floor_this","층(지하)":"floor_b","층(지상)":"floor_g",
                        "건축년월일":"built_date",  # full date → year 추출
                        "주차(자주)":"park_self","주차(기계)":"park_mech","엘레베이터":"elevator",
                        "토지(㎡)":"land_m2","토지(평)":"land_py","건물(㎡)":"bldg_area","건물(평)":"bldg_py",
                        "매가":"price","평당매매가":"price_per_py","순투자금":"net_invest","보증금":"deposit",
                        "소계":"subtotal","월세":"monthly","관리비":"mng_fee","현 수익율":"yield_cur",
                        "성명":"client_name","연락처":"client_phone","비고":"memo"
                    }

                    df_k = df_raw.rename(columns=lambda c: K2E.get(str(c).strip(), str(c).strip()))
                    # 세션에 저장 (확정 버튼을 누를 때 사용할 미리보기 데이터)
                    st.session_state[RAW_KEY] = df_raw
                    st.session_state[PREVIEW_KEY] = df_k

                except Exception as e:
                    st.error(f"가져오기 읽기 오류: {e}")

            # 2) 미리보기 화면 + 등록/취소 버튼
            if st.session_state.get(PREVIEW_KEY) is not None:
                # ⬇️ 아래 표는 숨기고, 위에서 보여준 업로드 표만 확인하게 안내
                st.info("위의 표를 확인한 뒤, '이대로 등록' 또는 '취소'를 눌러주세요.")
                prev_df = st.session_state[PREVIEW_KEY].copy()

                col_imp_a, col_imp_b = st.columns([1,1])
                with col_imp_a:
                    do_import = st.button("✅ 이대로 등록", type="primary")
                with col_imp_b:
                    cancel_import = st.button("❌ 취소")

                # 취소: 세션 정리
                if cancel_import:
                    # 미리보기/원본 삭제
                    st.session_state.pop(PREVIEW_KEY, None)
                    st.session_state.pop(RAW_KEY, None)
                    # 업로더 키 버전 증가 → 완전한 리셋
                    st.session_state["sale_up_ver"] += 1
                    st.warning("가져오기를 취소했습니다. 파일을 다시 업로드해 주세요.")
                    st.session_state["active_tab"] = "매매 매물장"
                    st.rerun()

                # 등록: 미리보기 DF를 실제 insert로 변환
                if do_import:
                    try:
                        ok, fail = 0, 0
                        for _, row in prev_df.iterrows():
                            # 기본 값 추출/정규화
                            _recv = _to_date_iso(row.get("recv_date"))
                            _built_date = _to_date_iso(row.get("built_date"))
                            _built_year = int(_built_date[:4]) if _built_date else None

                            _land_m2 = _to_float(row.get("land_m2")) or 0.0
                            _land_py = to_py(_land_m2)  # 토지 평 자동 계산
                            _bldg_m2 = _to_float(row.get("bldg_area")) or 0.0

                            _price   = _to_int(row.get("price")) or 0
                            _deposit = _to_int(row.get("deposit")) or 0
                            _monthly = _to_int(row.get("monthly")) or 0
                            _mng     = _to_int(row.get("mng_fee")) or 0
                            _subtotal= _monthly + _mng
                            _ppy     = int(round(safe_div(_price, _land_py))) if _land_py else 0
                            _yield   = safe_div(_subtotal*12.0, max(_price-_deposit, 0)) * 100.0  # 저장은 3.64 형태

                            _elev = str(row.get("elevator") or "").strip()
                            if _elev not in ("유","무","모름"):
                                _elev = "모름"

                            payload = {
                                "recv_date": _recv,
                                "category": row.get("category"),
                                "road_addr": row.get("road_addr"),
                                "lot_addr": row.get("lot_addr"),
                                "source": row.get("source"),
                                "zoning": row.get("zoning"),
                                "floor_this": row.get("floor_this"),
                                "floor_b": row.get("floor_b"),
                                "floor_g": row.get("floor_g"),
                                "built_year": _built_year,
                                "park_self": _to_int(row.get("park_self")) or 0,
                                "park_mech": _to_int(row.get("park_mech")) or 0,
                                "elevator": _elev,
                                "land_m2": _land_m2,
                                "land_py": _land_py,
                                "bldg_area": _bldg_m2,
                                "price": _price,
                                "price_per_py": _ppy,
                                "net_invest": _to_int(row.get("net_invest")) or 0,
                                "deposit": _deposit,
                                "subtotal": _subtotal,
                                "monthly": _monthly,
                                "mng_fee": _mng,
                                "yield_cur": _yield,
                                "client_name": row.get("client_name"),
                                "client_phone": row.get("client_phone"),
                                "carrier": row.get("carrier"),
                                "memo": row.get("memo"),
                            }
                            try:
                                sale_id = insert_sale(payload)
                                ok += 1 if sale_id else 0
                            except Exception:
                                fail += 1

                        st.success(f"등록 완료: 성공 {ok}건 / 실패 {fail}건")
                    except Exception as e:
                        st.error(f"가져오기 등록 오류: {e}")
                    finally:
                        # 성공/실패와 관계없이 세션 정리
                        st.session_state.pop(PREVIEW_KEY, None)
                        st.session_state.pop(RAW_KEY, None)

    # =========================================
    # 3.2 상가 매물장 (원코드 유지)
    # =========================================
    elif st.session_state["active_tab"] == "상가 매물장":
        st.subheader("상가 매물장 · 신규/수정")
        c = st.columns(4)
        with c[0]:
            shop_edit = st.text_input("수정할 ID(비우면 신규)", key="shop_edit")
            s_recv = st.date_input("접수일", key="shop_recv")
            s_type = st.text_input("종류", key="shop_type")
            s_brand= st.text_input("상호", key="shop_brand")
            s_zoning=st.text_input("용도지역", key="shop_zoning")
            s_addr = st.text_input("주소지", key="shop_addr")
        with c[1]:
            s_byear = st.number_input("건축년월일", min_value=0, step=1, key="shop_byear")
            s_fthis = st.text_input("해당층", key="shop_fthis")
            s_ftot  = st.text_input("전체층", key="shop_ftot")
            s_aLm2  = st.number_input("계약면적(㎡)", min_value=0.0, step=0.01, key="shop_aLm2")
            s_aLpy  = st.number_input("계약면적(평)", min_value=0.0, step=0.01, key="shop_aLpy")
        with c[2]:
            s_aNm2  = st.number_input("실면적(㎡)", min_value=0.0, step=0.01, key="shop_aNm2")
            s_aNpy  = st.number_input("실면적(평)", min_value=0.0, step=0.01, key="shop_aNpy")
            s_fuel  = st.text_input("연료", key="shop_fuel")
            s_sub   = st.number_input("소계", min_value=0, step=1000, key="shop_sub")
            s_dep   = st.number_input("보증금", min_value=0, step=1000, key="shop_dep")
            s_prem  = st.number_input("권리", min_value=0, step=1000, key="shop_prem")
            s_sub2  = st.number_input("소계2", min_value=0, step=1000, key="shop_sub2")
        with c[3]:
            s_mon   = st.number_input("월세", min_value=0, step=1000, key="shop_mon")
            s_vat   = st.number_input("VAT", min_value=0, step=1000, key="shop_vat")
            s_mng   = st.number_input("관리", min_value=0, step=1000, key="shop_mng")
            s_rppy  = st.number_input("평당 임대료", min_value=0, step=1000, key="shop_rppy")
            s_mppy  = st.number_input("평당 관리비", min_value=0, step=1000, key="shop_mppy")
            s_cname = st.text_input("성명", key="shop_cname")
            s_cphone= st.text_input("연락처", key="shop_cphone")
            s_carrier=st.selectbox("통신사", ["","SKT","KT","LG","알뜰폰 SKT","알뜰폰 KT","알뜰폰 LG"], key="shop_carrier")
        s_memo = st.text_area("비고(상가)", key="shop_memo")

        cA,cB,cC = st.columns([1,1,2])
        with cA:
            if st.button("상가 신규 등록"):
                rid = insert_shop({
                    "recv_date": s_recv.isoformat(), "type": s_type, "brand": s_brand, "zoning": s_zoning, "addr": s_addr,
                    "built_year": int(s_byear) if s_byear else None, "floor_this": s_fthis, "floors_total": s_ftot,
                    "area_lease_m2": float(s_aLm2), "area_lease_py": float(s_aLpy),
                    "area_net_m2": float(s_aNm2), "area_net_py": float(s_aNpy), "fuel": s_fuel,
                    "subtotal": int(s_sub), "deposit": int(s_dep), "premium": int(s_prem), "subtotal2": int(s_sub2),
                    "monthly": int(s_mon), "vat": int(s_vat), "mng_fee": int(s_mng),
                    "rent_per_py": int(s_rppy), "mng_per_py": int(s_mppy),
                    "client_name": s_cname, "client_phone": s_cphone, "carrier": s_carrier, "memo": s_memo
                })
                st.success(f"등록 완료 (상가) ID={rid}")
        with cB:
            if st.button("상가 수정 적용"):
                if not shop_edit.strip().isdigit():
                    st.error("ID는 숫자")
                else:
                    rid = int(shop_edit)
                    update_shop(rid, {
                        "recv_date": s_recv.isoformat(), "type": s_type, "brand": s_brand, "zoning": s_zoning, "addr": s_addr,
                        "built_year": int(s_byear) if s_byear else None, "floor_this": s_fthis, "floors_total": s_ftot,
                        "area_lease_m2": float(s_aLm2), "area_lease_py": float(s_aLpy),
                        "area_net_m2": float(s_aNm2), "area_net_py": float(s_aNpy), "fuel": s_fuel,
                        "subtotal": int(s_sub), "deposit": int(s_dep), "premium": int(s_prem), "subtotal2": int(s_sub2),
                        "monthly": int(s_mon), "vat": int(s_vat), "mng_fee": int(s_mng),
                        "rent_per_py": int(s_rppy), "mng_per_py": int(s_mppy),
                        "client_name": s_cname, "client_phone": s_cphone, "carrier": s_carrier, "memo": s_memo
                    })
                    st.success(f"수정 완료 (상가) ID={rid}")
        with cC:
            if st.button("상가 삭제"):
                if shop_edit.strip().isdigit():
                    delete_shop(int(shop_edit)); st.warning(f"삭제 완료 (상가) ID={shop_edit}")
                else:
                    st.error("삭제할 ID 숫자 입력")

        st.markdown("—")
        with st.expander("🔎 상가 필터 열기/닫기", expanded=True):
            c1, c2, c3 = st.columns(3)
            with c1:
                shop_q = st.text_input("상호/전화/주소 포함", key="shop_q")
                shop_brand = st.text_input("상호(브랜드) 포함", key="shop_brand_like")
                shop_type  = st.text_input("종류 포함(예: 음식점)", key="shop_type_like")
            with c2:
                shop_area_min = st.number_input("실면적(㎡) 이상", min_value=0.0, step=0.01, value=0.0, key="shop_area_min")
                shop_area_max = st.number_input("실면적(㎡) 이하", min_value=0.0, step=0.01, value=0.0, key="shop_area_max")
                shop_mon_min  = st.number_input("월세 이상", min_value=0, step=1000, value=0, key="shop_mon_min")
                shop_mon_max  = st.number_input("월세 이하", min_value=0, step=1000, value=0, key="shop_mon_max")
            with c3:
                shop_dep_min  = st.number_input("보증금 이상", min_value=0, step=1000, value=0, key="shop_dep_min")
                shop_dep_max  = st.number_input("보증금 이하", min_value=0, step=1000, value=0, key="shop_dep_max")
                shop_prem_min = st.number_input("권리금 이상", min_value=0, step=1000, value=0, key="shop_prem_min")
                shop_prem_max = st.number_input("권리금 이하", min_value=0, step=1000, value=0, key="shop_prem_max")

        df_shop = fetch_shops({"q": shop_q}) if shop_q else fetch_shops({})
        if df_shop is None:
            df_shop = pd.DataFrame()

        if not df_shop.empty:
            if shop_brand and "brand" in df_shop.columns:
                df_shop = df_shop[df_shop["brand"].fillna("").str.contains(shop_brand, case=False, na=False)]
            if shop_type and "type" in df_shop.columns:
                df_shop = df_shop[df_shop["type"].fillna("").str.contains(shop_type, case=False, na=False)]
            if shop_area_min > 0 and "area_net_m2" in df_shop.columns:
                df_shop = df_shop[df_shop["area_net_m2"].fillna(0.0).astype(float) >= shop_area_min]
            if shop_area_max > 0 and "area_net_m2" in df_shop.columns:
                df_shop = df_shop[df_shop["area_net_m2"].fillna(0.0).astype(float) <= shop_area_max]
            if shop_mon_min > 0 and "monthly" in df_shop.columns:
                df_shop = df_shop[df_shop["monthly"].fillna(0).astype(int) >= shop_mon_min]
            if shop_mon_max > 0 and "monthly" in df_shop.columns:
                df_shop = df_shop[df_shop["monthly"].fillna(0).astype(int) <= shop_mon_max]
            if shop_dep_min > 0 and "deposit" in df_shop.columns:
                df_shop = df_shop[df_shop["deposit"].fillna(0).astype(int) >= shop_dep_min]
            if shop_dep_max > 0 and "deposit" in df_shop.columns:
                df_shop = df_shop[df_shop["deposit"].fillna(0).astype(int) <= shop_dep_max]
            if shop_prem_min > 0 and "premium" in df_shop.columns:
                df_shop = df_shop[df_shop["premium"].fillna(0).astype(int) >= shop_prem_min]
            if shop_prem_max > 0 and "premium" in df_shop.columns:
                df_shop = df_shop[df_shop["premium"].fillna(0).astype(int) <= shop_prem_max]

        order_shop = [
            "id","recv_date","brand","addr",
            "area_lease_m2","area_lease_py","area_net_m2","area_net_py",
            "floor_this","floors_total","built_year","fuel",
            "subtotal","subtotal2","deposit","premium",
            "monthly","vat","mng_fee","rent_per_py","mng_per_py",
            "client_name","client_phone","carrier","memo","updated_at"
        ]
        if not df_shop.empty:
            df_shop = df_shop[[c for c in order_shop if c in df_shop.columns]]

        st.subheader(f"상가 검색 결과 · 총 {len(df_shop)}건")
        st.dataframe(df_shop, width="stretch", hide_index=True)

        col_sha, col_shb = st.columns(2)
        with col_sha:
            if not df_shop.empty:
                bio = io.BytesIO()
                with pd.ExcelWriter(bio, engine="openpyxl") as w:
                    df_shop.to_excel(w, index=False, sheet_name="상가")
                st.download_button("⬇️ 상가 엑셀(xlsx) 내보내기", bio.getvalue(), "shops_export.xlsx",
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with col_shb:
            if not df_shop.empty:
                st.download_button("⬇️ 상가 CSV 내보내기",
                                df_shop.to_csv(index=False).encode("utf-8-sig"),
                                "shops_export.csv", mime="text/csv")
                
        # ✅ 공용 함수 제거 → 전용 렌더러 호출
        render_detail_shop()        

        with st.expander("📥 상가 엑셀/CSV 가져오기 (일괄 등록)", expanded=False):
            st.caption("컬럼 예시: recv_date, type, brand, zoning, addr, built_year, floor_this, floors_total, area_lease_m2, area_lease_py, area_net_m2, area_net_py, fuel, subtotal, deposit, premium, subtotal2, monthly, vat, mng_fee, rent_per_py, mng_per_py, client_name, client_phone, carrier, memo")
            up_h = st.file_uploader(
                "파일 업로드(.xlsx/.csv)",
                type=["xlsx","csv"],
                key=f"shop_up_{st.session_state['shop_up_ver']}"
            )
            if up_h is not None:
                try:
                    df_raw = pd.read_csv(up_h) if up_h.name.lower().endswith(".csv") else pd.read_excel(up_h)
                    st.success(f"업로드 읽기 완료: {df_raw.shape[0]}행")
                    st.dataframe(df_raw.head(10), width="stretch")

                    def _shop_row(row):
                        return {
                            "recv_date": _to_date_iso(row.get("recv_date")),
                            "type": row.get("type"),
                            "brand": row.get("brand"),
                            "zoning": row.get("zoning"),
                            "addr": row.get("addr"),
                            "built_year": _to_int(row.get("built_year")) or None,
                            "floor_this": row.get("floor_this"),
                            "floors_total": row.get("floors_total"),
                            "area_lease_m2": _to_float(row.get("area_lease_m2")) or 0.0,
                            "area_lease_py": _to_float(row.get("area_lease_py")) or 0.0,
                            "area_net_m2": _to_float(row.get("area_net_m2")) or 0.0,
                            "area_net_py": _to_float(row.get("area_net_py")) or 0.0,
                            "fuel": row.get("fuel"),
                            "subtotal": _to_int(row.get("subtotal")) or 0,
                            "deposit": _to_int(row.get("deposit")) or 0,
                            "premium": _to_int(row.get("premium")) or 0,
                            "subtotal2": _to_int(row.get("subtotal2")) or 0,
                            "monthly": _to_int(row.get("monthly")) or 0,
                            "vat": _to_int(row.get("vat")) or 0,
                            "mng_fee": _to_int(row.get("mng_fee")) or 0,
                            "rent_per_py": _to_int(row.get("rent_per_py")) or 0,
                            "mng_per_py": _to_int(row.get("mng_per_py")) or 0,
                            "client_name": row.get("client_name"),
                            "client_phone": row.get("client_phone"),
                            "carrier": row.get("carrier"),
                            "memo": row.get("memo"),
                        }

                    ok, fail = 0, 0
                    for _, r in df_raw.iterrows():
                        try:
                            rid = insert_shop(_shop_row(r))
                            ok += 1 if rid else 0
                        except Exception:
                            fail += 1
                    st.success(f"등록 완료: 성공 {ok}건 / 실패 {fail}건")
                except Exception as e:
                    st.error(f"가져오기 오류: {e}")

    # =========================================
    # 3.3 전월세 매물장 (원코드 유지)
    # =========================================
    elif st.session_state["active_tab"] == "전월세 매물장":
        st.subheader("전월세 매물장 · 신규/수정")
        c = st.columns(3)
        with c[0]:
            or_edit = st.text_input(
                "수정할 ID(비우면 신규) — 삭제는 쉼표(,)",
                key="or_edit",
                on_change=_on_or_edit_change,
                help="예) 수정/조회: 12  |  삭제: 3,4,7"
            )
            or_recv = st.date_input("접수일", key="or_recv")

            # ✅ 전월세구분: 선택형(월세/전세) — DB의 category 컬럼에 저장
            _rent_type_opts = ["월세", "전세"]
            if st.session_state.get("or_cat") not in _rent_type_opts:
                st.session_state["or_cat"] = _rent_type_opts[0]
            or_cat  = st.selectbox("전월세구분", _rent_type_opts, key="or_cat")

            # ✅ 건물구분: 매매 구분과 동일 옵션 — DB의 building 컬럼에 저장
            _bldg_type_opts = ["단독", "다가구", "다세대(빌라)", "아파트", "오피스텔"]
            if st.session_state.get("or_bldg") not in _bldg_type_opts:
                st.session_state["or_bldg"] = _bldg_type_opts[0]
            or_bldg = st.selectbox("건물구분", _bldg_type_opts, key="or_bldg")

            or_addr = st.text_input("주소", key="or_addr")
        with c[1]:
            or_unit = st.text_input("호수", key="or_unit")
            or_pw   = st.text_input("비밀번호", key="or_pw")
            # 계약/전입/확정 일자 (모두 ISO 저장)
            or_contract = st.date_input("계약일자", key="or_contract")
            or_movein_date = st.date_input("전입일자", key="or_movein_date")
            or_confirm_date = st.date_input("확정일자", key="or_confirm_date")

        with c[2]:
            # 3열 순서: 보증금, 월세, 관리비, 임대인, 임차인, 입주상태
            or_dep  = st.number_input("보증금", min_value=0, step=1000, key="or_dep")
            or_mon  = st.number_input("월세", min_value=0, step=1000, key="or_mon")
            or_mng  = st.number_input("관리비", min_value=0, step=1000, key="or_mng")
            or_less = st.text_input("임대인", key="or_less")
            or_lese = st.text_input("임차인", key="or_lese")
            or_move = st.text_input("입주상태", key="or_move")   # (DB 컬럼은 move_in)

        # ▼ 고객 정보(매매와 동일 레이아웃)
        st.markdown("##### 고객 정보")
        info_cols = st.columns([1,1,1,3])
        with info_cols[0]:
            or_cname  = st.text_input("성명", key="or_cname")
        with info_cols[1]:
            or_cphone = st.text_input("연락처", key="or_cphone")
        with info_cols[2]:
            or_carrier = st.selectbox(
                "통신사",
                ["","SKT","KT","LG","알뜰폰 SKT","알뜰폰 KT","알뜰폰 LG"],
                key="or_carrier"
            )
        with info_cols[3]:
            or_memo = st.text_area("비고(전월세)", key="or_memo")

        cA,cB,cC = st.columns([1,1,2])
        with cA:
            if st.button("전월세 신규 등록"):
                rid = insert_oneroom({
                    "recv_date": or_recv.isoformat(),
                    "category": or_cat,                # 전월세구분
                    "building": or_bldg,               # 건물구분
                    "addr": or_addr,
                    "unit_no": or_unit, "door_pw": or_pw,
                    "contract_date": or_contract.isoformat() if or_contract else None,     # 계약일자
                    "move_in_date": or_movein_date.isoformat() if or_movein_date else None, # 전입일자
                    "confirm_date": or_confirm_date.isoformat() if or_confirm_date else None, # 확정일자
                    "deposit": int(or_dep), "monthly": int(or_mon), "mng_fee": int(or_mng),
                    "lessor": or_less, "lessee": or_lese, "move_in": or_move,             # 입주상태
                    "client_name": or_cname, "client_phone": or_cphone, "carrier": or_carrier,
                    "memo": or_memo
                })
                st.success(f"등록 완료 (전월세) ID={rid}")
        with cB:
            if st.button("전월세 수정 적용"):
                if not or_edit.strip().isdigit():
                    st.error("ID는 숫자")
                else:
                    rid = int(or_edit)
                    update_oneroom(rid, {
                        "recv_date": or_recv.isoformat(),
                        "category": or_cat, "building": or_bldg, "addr": or_addr,
                        "unit_no": or_unit, "door_pw": or_pw,
                        "contract_date": or_contract.isoformat() if or_contract else None,        # 계약일자
                        "move_in_date": or_movein_date.isoformat() if or_movein_date else None,   # 전입일자
                        "confirm_date": or_confirm_date.isoformat() if or_confirm_date else None, # 확정일자
                        "deposit": int(or_dep), "monthly": int(or_mon), "mng_fee": int(or_mng),
                        "lessor": or_less, "lessee": or_lese, "move_in": or_move,
                        "client_name": or_cname, "client_phone": or_cphone, "carrier": or_carrier,
                        "memo": or_memo
                    })
                    st.success(f"수정 완료 (전월세) ID={rid}")
        with cC:
            if st.button("전월세 삭제"):
                ids_raw = st.session_state.get("or_edit","").strip()
                if not ids_raw:
                    st.error("삭제할 ID를 입력하세요. 예) 3 또는 3,4,7")
                else:
                    try:
                        ids = [int(x.strip()) for x in ids_raw.split(",") if x.strip().isdigit()]
                        if not ids:
                            st.error("유효한 숫자 ID가 없습니다.")
                        else:
                            for oid in ids:
                                delete_oneroom(oid)
                            st.warning(f"삭제 완료 (전월세) ID: {', '.join(map(str, ids))}")
                            st.session_state["_or_form_clear"] = True
                            st.rerun()
                    except Exception as e:
                        st.error(f"삭제 중 오류: {e}")

        st.markdown("—")
        with st.expander("🔎 전월세 필터 열기/닫기", expanded=True):
            c1, c2, c3 = st.columns(3)
            # ✅ 순서: 이름/전화/주소 포함 → 전월세 → 건물구분 (모두 c1에 세로 배치)
            with c1:
                or_q = st.text_input("이름/전화/주소 포함", key="or_q")
                or_cat_filter = st.selectbox("전월세구분", ["", "월세", "전세"], index=0, key="or_cat_filter")
                _bldg_type_opts = ["", "단독", "다가구", "다세대(빌라)", "아파트", "오피스텔"]
                or_bldg_filter = st.selectbox("건물구분", _bldg_type_opts, index=0, key="or_bldg_filter")
            with c2:
                or_dep_min = st.number_input("보증금 이상", min_value=0, step=1000, value=0, key="or_dep_min")
                or_dep_max = st.number_input("보증금 이하", min_value=0, step=1000, value=0, key="or_dep_max")
                or_mng_max = st.number_input("관리비 이하", min_value=0, step=1000, value=0, key="or_mng_max")
                
            with c3:
                or_mon_min = st.number_input("월세 이상", min_value=0, step=1000, value=0, key="or_mon_min")
                or_mon_max = st.number_input("월세 이하", min_value=0, step=1000, value=0, key="or_mon_max")   
                or_move_like = st.text_input("입주상태(문자열) 포함", key="or_move_like")

        df_or = fetch_onerooms({"q": or_q}) if or_q else fetch_onerooms({})
        if df_or is None:
            df_or = pd.DataFrame()

        if not df_or.empty:
            # ✅ (1) 이름/전화/주소 포함: 임대인/임차인/고객명 + 연락처 + 주소 중 하나라도 포함
            if or_q:
                def _contains(col):
                    return df_or[col].fillna("").astype(str).str.contains(or_q, case=False, na=False) if col in df_or.columns else False
                mask = (
                    _contains("lessor") |
                    _contains("lessee") |
                    _contains("client_name") |
                    _contains("client_phone") |
                    _contains("addr")
                )
                df_or = df_or[mask]

            # ✅ (2) 전월세 선택형 필터
            if or_cat_filter and "category" in df_or.columns:
                df_or = df_or[df_or["category"].astype(str) == or_cat_filter]

            # ✅ (3) 건물구분 선택형 필터
            if or_bldg_filter and "building" in df_or.columns:
                df_or = df_or[df_or["building"].astype(str) == or_bldg_filter]

            # ✅ (4) 숫자 범위 필터 (기존 유지)
            if or_dep_min > 0 and "deposit" in df_or.columns:
                df_or = df_or[df_or["deposit"].fillna(0).astype(int) >= or_dep_min]
            if or_dep_max > 0 and "deposit" in df_or.columns:
                df_or = df_or[df_or["deposit"].fillna(0).astype(int) <= or_dep_max]
            if or_mon_min > 0 and "monthly" in df_or.columns:
                df_or = df_or[df_or["monthly"].fillna(0).astype(int) >= or_mon_min]
            if or_mon_max > 0 and "monthly" in df_or.columns:
                df_or = df_or[df_or["monthly"].fillna(0).astype(int) <= or_mon_max]
            if or_mng_max > 0 and "mng_fee" in df_or.columns:
                df_or = df_or[df_or["mng_fee"].fillna(0).astype(int) <= or_mng_max]
            if or_move_like and "move_in" in df_or.columns:
                df_or = df_or[df_or["move_in"].fillna("").str.contains(or_move_like, case=False, na=False)]

        order_or = [
            "id","recv_date","category","building","addr","unit_no","door_pw",
            "contract_date","move_in_date","confirm_date",
            "deposit","monthly","mng_fee",
            "lessor","lessee","move_in",
            "client_name","client_phone","carrier","memo","updated_at"
        ]
        if not df_or.empty:
            df_or = df_or[[c for c in order_or if c in df_or.columns]]

        st.subheader(f"전월세 검색 결과 · 총 {len(df_or)}건")

        df_or_view = df_or.copy()
        if not df_or_view.empty:
            # 금액 3종 콤마 포맷
            for c in ("deposit","monthly","mng_fee"):
                if c in df_or_view.columns:
                    df_or_view[c] = pd.to_numeric(df_or_view[c], errors="coerce").astype("Int64").map(lambda v: f"{int(v):,}" if pd.notna(v) else "")
            # 보기용 한글 헤더
            OR_COLMAP = {
                "id":"ID","recv_date":"접수일","category":"전월세구분","building":"건물구분","addr":"주소",
                "unit_no":"호수","door_pw":"비밀번호",
                "contract_date":"계약일자","move_in_date":"전입일자","confirm_date":"확정일자",
                "deposit":"보증금","monthly":"월세","mng_fee":"관리비",
                "lessor":"임대인","lessee":"임차인","move_in":"입주상태",
                "client_name":"성명","client_phone":"연락처","carrier":"통신사","memo":"비고","updated_at":"수정시각"
            }
            df_or_view = df_or_view.rename(columns=OR_COLMAP)
        # [추가] 전월세 표 전용 래퍼로 감싸서 위 CSS가 이 표에만 적용되게 함
        st.markdown('<div id="or-table">', unsafe_allow_html=True)
        st.dataframe(
            df_or_view,
            width="stretch",
            hide_index=True,
        )
        st.markdown('</div>', unsafe_allow_html=True)

        col_oa, col_ob = st.columns(2)

        with col_oa:
            if not df_or_view.empty:
                bio = io.BytesIO()
                with pd.ExcelWriter(bio, engine="openpyxl") as w:
                    df_or_view.to_excel(w, index=False, sheet_name="전월세")  # ✅ 한글 헤더 뷰 사용
                st.download_button("⬇️ 전월세 엑셀(xlsx) 내보내기", bio.getvalue(), "onerooms_export.xlsx",
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with col_ob:
            if not df_or_view.empty:
                st.download_button("⬇️ 전월세 CSV 내보내기",
                                df_or_view.to_csv(index=False).encode("utf-8-sig"),  # ✅ 한글 헤더 뷰 사용
                                "onerooms_export.csv", mime="text/csv")
                
        # ✅ 공용 함수 제거 → 전용 렌더러 호출
        render_detail_rent()

        # ▼ 전월세 업로드 템플릿 내려받기
        with st.expander("📥 전월세 매물장 업로드 템플릿 내려받기", expanded=False):
            st.caption("아래 템플릿의 한글 헤더를 그대로 사용해 업로드하세요.")
            tmpl_cols_or = [
                "접수일","전월세구분","건물구분","주소","호수","비밀번호",
                "계약일자","전입일자","확정일자",
                "보증금","월세","관리비",
                "임대인","임차인","입주상태",
                "성명","연락처","통신사","비고"
            ]
            tmpl_df_or = pd.DataFrame([{
                "접수일":"", "전월세구분":"월세", "건물구분":"아파트", "주소":"", "호수":"", "비밀번호":"",
                "계약일자":"", "전입일자":"", "확정일자":"",
                "보증금":"", "월세":"", "관리비":"",
                "임대인":"", "임차인":"", "입주상태":"",
                "성명":"", "연락처":"", "통신사":"", "비고":""
            }], columns=tmpl_cols_or)
            bio_tmpl_or = io.BytesIO()
            with pd.ExcelWriter(bio_tmpl_or, engine="openpyxl") as w:
                tmpl_df_or.to_excel(w, index=False, sheet_name="전월세_업로드_템플릿")
            st.download_button("⬇️ 전월세_업로드_템플릿.xlsx 내려받기",
                            bio_tmpl_or.getvalue(),
                            "전월세_업로드_템플릿.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        # ▼ 전월세 엑셀/CSV 가져오기 (일괄 등록)
        with st.expander("📥 전월세 엑셀/CSV 가져오기 (일괄 등록)", expanded=False):
            st.caption("템플릿의 한글 헤더를 그대로 사용해 주세요. (자동계산 항목은 비워도 됩니다)")
            up_o = st.file_uploader(
                "파일 업로드(.xlsx/.csv)",
                type=["xlsx","csv"],
                key=f"or_up_{st.session_state['or_up_ver']}"
            )

            PREVIEW_KEY_OR = "or_upload_preview_df"
            RAW_KEY_OR     = "or_upload_raw_df"

            if up_o is not None:
                try:
                    df_raw = pd.read_csv(up_o) if up_o.name.lower().endswith(".csv") else pd.read_excel(up_o)
                    st.success(f"업로드 읽기 완료: {df_raw.shape[0]}행")
                    st.dataframe(df_raw.head(10), width="stretch")

                    # 한글 → 내부키 매핑
                    K2E_OR = {
                        "접수일":"recv_date",
                        "전월세구분":"category",
                        "건물구분":"building",
                        "주소":"addr",
                        "호수":"unit_no",
                        "비밀번호":"door_pw",
                        "계약일자":"contract_date",
                        "전입일자":"move_in_date",
                        "확정일자":"confirm_date",
                        "보증금":"deposit",
                        "월세":"monthly",
                        "관리비":"mng_fee",
                        "임대인":"lessor",
                        "임차인":"lessee",
                        "입주상태":"move_in",
                        "성명":"client_name",
                        "연락처":"client_phone",
                        "통신사":"carrier",
                        "비고":"memo"
                    }
                    df_k = df_raw.rename(columns=lambda c: K2E_OR.get(str(c).strip(), str(c).strip()))

                    st.session_state[RAW_KEY_OR] = df_raw
                    st.session_state[PREVIEW_KEY_OR] = df_k

                except Exception as e:
                    st.error(f"가져오기 읽기 오류: {e}")

            if st.session_state.get(PREVIEW_KEY_OR) is not None:
                st.info("위의 표를 확인한 뒤, '이대로 등록' 또는 '취소'를 눌러주세요.")
                prev_df = st.session_state[PREVIEW_KEY_OR].copy()

                col_imp_a_or, col_imp_b_or = st.columns([1,1])
                with col_imp_a_or:
                    do_import_or = st.button("✅ 이대로 등록", type="primary")
                with col_imp_b_or:
                    cancel_import_or = st.button("❌ 취소")

                if cancel_import_or:
                    st.session_state.pop(PREVIEW_KEY_OR, None)
                    st.session_state.pop(RAW_KEY_OR, None)
                    # 업로더 위젯 자체를 교체(리셋)
                    st.session_state["or_up_ver"] += 1
                    st.warning("가져오기를 취소했습니다. 파일을 다시 업로드해 주세요.")
                    st.session_state["active_tab"] = "전월세 매물장"
                    st.rerun()

                if do_import_or:
                    try:
                        ok, fail = 0, 0
                        for _, row in prev_df.iterrows():
                            payload = {
                                "recv_date": _to_date_iso(row.get("recv_date")),
                                "category": row.get("category"),
                                "building": row.get("building"),
                                "addr": row.get("addr"),
                                "unit_no": row.get("unit_no"),
                                "door_pw": row.get("door_pw"),
                                "contract_date": _to_date_iso(row.get("contract_date")),
                                "move_in_date": _to_date_iso(row.get("move_in_date")),
                                "confirm_date": _to_date_iso(row.get("confirm_date")),
                                "deposit": _to_int(row.get("deposit")) or 0,
                                "monthly": _to_int(row.get("monthly")) or 0,
                                "mng_fee": _to_int(row.get("mng_fee")) or 0,
                                "lessor": row.get("lessor"),
                                "lessee": row.get("lessee"),
                                "move_in": row.get("move_in"),
                                "client_name": row.get("client_name"),
                                "client_phone": row.get("client_phone"),
                                "carrier": row.get("carrier"),
                                "memo": row.get("memo"),
                            }
                            try:
                                rid = insert_oneroom(payload)
                                ok += 1 if rid else 0
                            except Exception:
                                fail += 1
                        st.success(f"등록 완료: 성공 {ok}건 / 실패 {fail}건")
                    except Exception as e:
                        st.error(f"가져오기 등록 오류: {e}")
                    finally:
                        st.session_state.pop(PREVIEW_KEY_OR, None)
                        st.session_state.pop(RAW_KEY_OR, None)
