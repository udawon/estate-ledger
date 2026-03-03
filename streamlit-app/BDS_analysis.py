"""
입지 분석 페이지 — claude-estate API 연동 버전
Next.js(localhost:3003)의 /api/analyze 를 호출하여 분석 결과를 표시합니다.
"""

import streamlit as st
import requests

from db import fetch_sales, fetch_shops, fetch_onerooms

# ─── 설정 ────────────────────────────────────────────────────
CLAUDE_ESTATE_URL = "http://localhost:3003/api/analyze"
REQUEST_TIMEOUT = 60  # seconds

# 등급 색상 (claude-estate GRADE_CONFIG 와 동일)
GRADE_COLORS = {
    "A": "#22c55e",
    "B": "#84cc16",
    "C": "#eab308",
    "D": "#f97316",
    "F": "#ef4444",
}
GRADE_LABELS = {
    "A": "최우수",
    "B": "우수",
    "C": "보통",
    "D": "미흡",
    "F": "불량",
}

# ─── 유틸 ────────────────────────────────────────────────────
def _fmt_price(price_wan: int) -> str:
    """만원 단위 가격 → 'X억 Y천만원' 형식"""
    if not price_wan:
        return "정보 없음"
    eok = price_wan // 10000
    cheon = round((price_wan % 10000) / 1000)
    if eok == 0:
        return f"{price_wan:,}만원"
    if cheon == 0:
        return f"{eok}억"
    return f"{eok}억 {cheon}천만원"


def _call_api(address: str) -> dict | None:
    """claude-estate /api/analyze 호출 → 결과 dict 또는 None(오류 시)"""
    try:
        resp = requests.post(
            CLAUDE_ESTATE_URL,
            json={"address": address},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("success"):
            return data.get("data")
        st.error(f"API 오류: {data.get('error', '알 수 없는 오류')}")
        return None
    except requests.exceptions.ConnectionError:
        st.error(
            "claude-estate 서버에 연결할 수 없습니다.\n\n"
            f"`{CLAUDE_ESTATE_URL}`\n\n"
            "**Next.js 서버가 실행 중인지 확인해주세요.**\n"
            "```\ncd claude-estate && npm run dev\n```"
        )
        return None
    except requests.exceptions.Timeout:
        st.error("분석 시간이 초과되었습니다. 다시 시도해주세요.")
        return None
    except Exception as e:
        st.error(f"분석 중 오류가 발생했습니다: {e}")
        return None


# ─── 결과 렌더러 ─────────────────────────────────────────────
def _render_result(result: dict, key_suffix: str = "manual"):
    """claude-estate AnalysisResult dict를 Streamlit UI로 표시"""
    grade = result.get("grade", "F")
    total_score = result.get("totalScore", 0)
    summary = result.get("summary", "")
    district = result.get("district", "")
    address = result.get("address", "")
    color = GRADE_COLORS.get(grade, "#94a3b8")
    grade_label = GRADE_LABELS.get(grade, "")

    # ── 종합 점수 ──
    st.markdown(
        f"""
        <div style="
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 16px;
        ">
            <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                <div style="
                    width:72px; height:72px;
                    border-radius:50%;
                    background:{color};
                    display:flex; align-items:center; justify-content:center;
                    font-size:2rem; font-weight:700; color:white;
                ">{grade}</div>
                <div>
                    <div style="font-size:1.6rem; font-weight:700; color:#0f172a;">
                        {total_score:.0f}점
                        <span style="font-size:1rem; color:#64748b; font-weight:400; margin-left:8px;">
                            {grade_label}
                        </span>
                    </div>
                    <div style="color:#475569; margin-top:4px;">{address}</div>
                    <div style="color:#64748b; font-size:0.85rem;">{district}</div>
                </div>
            </div>
            <p style="color:#475569; margin-top:14px; margin-bottom:0; border-top:1px solid #f1f5f9; padding-top:12px;">
                {summary}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── 카테고리별 점수 ──
    categories = result.get("categories", {})
    cat_order = ["transport", "commercial", "environment", "safety"]
    cols = st.columns(4)
    for i, key in enumerate(cat_order):
        cat = categories.get(key, {})
        score = cat.get("score", 0)
        label = cat.get("label", key)
        cat_grade = cat.get("grade", "F")
        cat_color = GRADE_COLORS.get(cat_grade, "#94a3b8")
        with cols[i]:
            st.markdown(
                f"""
                <div style="
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 14px;
                    text-align: center;
                ">
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">{label}</div>
                    <div style="font-size:1.4rem; font-weight:700; color:{cat_color};">{score:.0f}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">/ 100점</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # ── 카테고리 세부 내용 ──
    st.markdown("#### 카테고리별 세부 분석")
    cat_labels = {
        "transport": "🚇 교통 접근성",
        "commercial": "🏪 상업시설",
        "environment": "🌳 생활환경",
        "safety": "🛡️ 안전",
    }
    for key in cat_order:
        cat = categories.get(key, {})
        details = cat.get("details", [])
        score = cat.get("score", 0)
        label = cat_labels.get(key, key)
        with st.expander(f"{label} — {score:.0f}점", expanded=False):
            for d in details:
                st.markdown(f"- {d}")

    # ── 실거래가 ──
    trade = result.get("tradeSummary")
    if trade and trade.get("totalCount", 0) == 0 and trade.get("aptName"):
        # 아파트를 찾았지만 해당 기간 거래 내역 없는 경우
        st.markdown("---")
        apt_nm = trade["aptName"].replace("&", "앤")
        st.info(f"🏢 **{apt_nm}** — 최근 6개월 거래 내역 없음 ({trade.get('monthRange', '')})")
    elif trade and trade.get("totalCount", 0) > 0:
        st.markdown("---")
        st.markdown("#### 🏢 아파트 실거래가")

        apt_name = (trade.get("aptName") or "").replace("&", "앤")
        dong = trade.get("dong", "")
        month_range = trade.get("monthRange", "")
        total_count = trade.get("totalCount", 0)
        avg_per_pyeong = trade.get("avgPricePerPyeong", 0)
        avg84 = trade.get("avg84Price", 0)
        trend = trade.get("trend", "flat")
        trend_label = {"up": "📈 상승", "down": "📉 하락", "flat": "➡️ 보합"}.get(trend, "")

        if apt_name:
            scope = f"**{apt_name}** · {dong}"
        else:
            scope = f"{trade.get('district', '')} {dong}"
        st.caption(f"{scope} · {month_range} · {total_count}건 · {trend_label}")

        col1, col2 = st.columns(2)
        with col1:
            st.metric("평당 평균가", f"{avg_per_pyeong:,}만원/평")
        with col2:
            st.metric("84㎡ 환산가", _fmt_price(avg84))

        recent = trade.get("recentTrades", [])
        if recent:
            st.markdown("**최근 거래 사례**")
            import pandas as pd

            # 면적 고유값 목록 (오름차순 정렬)
            area_options = sorted({t.get("area", 0) for t in recent})
            selected_areas = st.multiselect(
                "면적(㎡) 필터",
                options=area_options,
                default=area_options,
                format_func=lambda x: f"{x}㎡",
                key=f"area_filter_{key_suffix}",
            )

            rows = [
                {
                    "아파트명": t.get("aptName", ""),
                    "면적(㎡)": t.get("area", ""),
                    "층": t.get("floor", ""),
                    "거래연월": t.get("yearMonth", ""),
                    "거래가": _fmt_price(t.get("price", 0)),
                }
                for t in recent
                if t.get("area", 0) in selected_areas
            ]
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


# ─── 주소 직접 입력 탭 ───────────────────────────────────────
def _tab_manual():
    st.markdown("##### 주소를 입력하면 claude-estate 서버가 입지를 분석합니다.")

    col_input, col_btn = st.columns([5, 1])
    with col_input:
        addr = st.text_input(
            "주소 입력",
            placeholder="예: 서울 강남구 역삼동 123",
            label_visibility="collapsed",
            key="manual_address",
        )
    with col_btn:
        run = st.button("분석", use_container_width=True, key="manual_run")

    if run:
        if not addr.strip():
            st.warning("주소를 입력해주세요.")
            return
        with st.spinner("분석 중... (최대 60초 소요)"):
            result = _call_api(addr.strip())
        if result:
            st.session_state["manual_result"] = result

    # 필터 변경 시에도 결과 유지 (session_state에서 재렌더링)
    if "manual_result" in st.session_state:
        _render_result(st.session_state["manual_result"], key_suffix="manual")


# ─── 매물 선택 분석 탭 ──────────────────────────────────────
def _tab_from_listing():
    st.markdown("##### 매물 DB에서 주소를 선택하여 입지를 분석합니다.")

    # 매물 테이블 선택
    table_choice = st.radio(
        "매물 종류",
        ["매매 매물", "상가 매물", "원룸 매물"],
        horizontal=True,
        key="listing_table",
    )

    # DB 조회 (fetch_* 함수는 filters dict와 DataFrame 반환)
    try:
        if table_choice == "매매 매물":
            df = fetch_sales({})
            if df.empty:
                st.info("등록된 매매 매물이 없습니다.")
                return
            addr_col = "road_addr" if "road_addr" in df.columns else "lot_addr"
            alt_col = "lot_addr" if addr_col == "road_addr" and "lot_addr" in df.columns else None
            def _get_addr(row):
                a = str(row.get(addr_col) or "").strip()
                if not a and alt_col:
                    a = str(row.get(alt_col) or "").strip()
                return a

        elif table_choice == "상가 매물":
            df = fetch_shops({})
            if df.empty:
                st.info("등록된 상가 매물이 없습니다.")
                return
            def _get_addr(row):
                return str(row.get("addr") or "").strip()

        else:  # 원룸
            df = fetch_onerooms({})
            if df.empty:
                st.info("등록된 원룸 매물이 없습니다.")
                return
            def _get_addr(row):
                return str(row.get("addr") or "").strip()

    except Exception as e:
        st.error(f"DB 조회 오류: {e}")
        return

    # selectbox 옵션 구성
    records = df.to_dict("records")
    options: dict[str, str] = {}
    for row in records:
        row_id = row.get("id", "?")
        addr = _get_addr(row)
        label = f"[{row_id}] {addr or '주소없음'}"
        options[label] = addr

    selected_label = st.selectbox("매물 선택", list(options.keys()), key="listing_select")
    selected_addr = options.get(selected_label, "")

    if not selected_addr:
        st.warning("선택한 매물에 주소가 등록되어 있지 않습니다.")
        return

    # 선택 주소가 바뀌면 이전 결과 초기화
    if st.session_state.get("listing_last_addr") != selected_addr:
        st.session_state.pop("listing_result", None)
        st.session_state["listing_last_addr"] = selected_addr

    st.info(f"분석할 주소: **{selected_addr}**")

    if st.button("이 주소 분석하기", key="listing_run"):
        with st.spinner("분석 중... (최대 60초 소요)"):
            result = _call_api(selected_addr)
        if result:
            st.session_state["listing_result"] = result

    # 필터 변경 시에도 결과 유지 (session_state에서 재렌더링)
    if "listing_result" in st.session_state:
        _render_result(st.session_state["listing_result"], key_suffix="listing")


# ─── 진입점 ──────────────────────────────────────────────────
def render_analysis_page(is_admin: bool = False):
    st.title("📍 입지 분석")
    st.caption(f"Powered by claude-estate · {CLAUDE_ESTATE_URL}")

    tab1, tab2 = st.tabs(["✏️ 주소 직접 입력", "🏠 매물에서 선택"])

    with tab1:
        _tab_manual()

    with tab2:
        _tab_from_listing()
