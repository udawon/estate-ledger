import streamlit as st
from db import init_db  # 이 파일에서는 init_db만 사용

import os
import shutil
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

st.set_page_config(
    page_title="부동산 매물 장부 (v2)",
    layout="wide",
)

# ───────────────────────
# 세션 / 로그인
# ───────────────────────
def is_admin():
    return st.session_state.get("is_admin", False)

def is_site_open() -> bool:
    """
    secrets.toml 의 SITE_OPEN 값을 읽어서 사이트 공개 여부를 결정.
    예: true / True / 1 / yes / open / on / 열림 → True 로 인식
    나머지는 False 로 인식
    """
    raw = str(st.secrets.get("SITE_OPEN", "true")).strip().lower()
    return raw in ("1", "true", "yes", "open", "y", "on", "열림")

def login_box():
    # 이미 관리자라면: 로그인 UI 대신 상태 + 로그아웃 버튼
    if is_admin():
        st.sidebar.subheader("관리자 로그인")
        st.sidebar.info("관리자 로그인 중")

        # 로그아웃
        if st.sidebar.button("로그아웃", width="stretch"):
            st.session_state["is_admin"] = False
            # 비밀번호 입력값도 같이 정리(있을 경우)
            for k in ["admin_pwd"]:
                if k in st.session_state:
                    del st.session_state[k]
            st.rerun()
        return

    # 비관리자라면: 기존 로그인 UI
    st.sidebar.subheader("관리자 로그인")
    pwd = st.sidebar.text_input("비밀번호", type="password", key="admin_pwd")
    if st.sidebar.button("로그인", width="stretch"):
        if pwd == st.secrets.get("APP_ADMIN_PASSWORD", ""):
            st.session_state["is_admin"] = True
            st.sidebar.success("로그인 성공")
            st.rerun()
        else:
            st.sidebar.error("비밀번호 오류")


# ─────────────────────
# 관리자 도구: DB 백업 / 마이그레이션
# ─────────────────────
def _get_db_path() -> str:
    """
    DB 파일 경로를 반환합니다.
    기본값: 프로젝트 루트의 broker_ledger.db
    필요하면 secrets.toml 에 DB_PATH를 추가해서 덮어쓸 수 있습니다.
    """
    db_path = str(st.secrets.get("DB_PATH", r"data\broker.db")).strip()
    # 상대경로면 프로젝트 폴더 기준으로 합침
    if not os.path.isabs(db_path):
        db_path = os.path.join(PROJECT_ROOT, db_path)
    return db_path


def backup_db() -> tuple[bool, str]:
    """
    DB 파일을 backups 폴더에 날짜시간으로 백업합니다.
    return: (성공여부, 메시지/경로)
    """
    db_path = _get_db_path()
    if not os.path.exists(db_path):
        return False, f"DB 파일을 찾지 못했습니다: {db_path}"

    backups_dir = os.path.join(PROJECT_ROOT, "data", "backups")
    os.makedirs(backups_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = os.path.basename(db_path)
    dst = os.path.join(backups_dir, f"{os.path.splitext(base)[0]}_{ts}.db")

    try:
        shutil.copy2(db_path, dst)
        return True, f"백업 완료: {dst}"
    except Exception as e:
        return False, f"백업 실패: {e}"

def run_migration_safe() -> tuple[bool, str]:
    """
    '마이그레이션' 버튼용 훅.
    현재 프로젝트 구조에서 안전하게 할 수 있는 최소 동작은 init_db() 재호출입니다.
    (테이블이 없으면 생성, 있으면 유지)
    """
    try:
        init_db()
        return True, "마이그레이션(초기화/스키마 점검) 완료: init_db() 재실행"
    except Exception as e:
        return False, f"마이그레이션 실패: {e}"

# ─────────────────────
# 사이드바
# ─────────────────────
def render_sidebar():
    login_box()

    if is_admin():
        st.sidebar.success("관리자 모드")

        # 관리자에게 현재 SITE_OPEN 상태를 함께 보여줌
        site_open = is_site_open()
        if site_open:
            st.sidebar.info("사이트 상태: 운영 중 (SITE_OPEN=true)")
        else:
            st.sidebar.warning("사이트 상태: 점검 중 (SITE_OPEN=false)")

        st.sidebar.divider()
        st.sidebar.subheader("관리자 도구")

        # 1) DB 백업
        if st.sidebar.button("DB 백업 생성", width="stretch"):
            ok, msg = backup_db()
            if ok:
                st.sidebar.success(msg)
            else:
                st.sidebar.error(msg)

        # 2) 마이그레이션(안전훅)
        if st.sidebar.button("마이그레이션 실행", width="stretch"):
            ok, msg = run_migration_safe()
            if ok:
                st.sidebar.success(msg)
            else:
                st.sidebar.error(msg)

        st.sidebar.caption("권장: 마이그레이션 전 DB 백업을 먼저 생성하세요.")

    else:
        # 비관리자에게는, 사이트가 닫혀 있을 경우 점검 안내만 간단히 노출
        if not is_site_open():
            st.sidebar.warning("현재 사이트는 점검 중입니다.")
        else:
            st.sidebar.info("· 관리자 전용 기능은 표시되지 않습니다.")

# ─────────────────────
# 메인
# ─────────────────────
def main():

    init_db()

    render_sidebar()

    # 🔒 SITE_OPEN = false 이고, 관리자 로그인이 아닌 경우 → 접속 차단
    if (not is_site_open()) and (not is_admin()):
        st.title("⛔ 사이트 점검 중입니다.")
        st.info("현재는 관리자만 접속 가능한 점검 모드입니다. 나중에 다시 접속해 주세요.")
        return

    # 메뉴 선택
    menu = st.radio(
        "카테고리",
        ["매물장", "입지 분석"],
        horizontal=True
    )

    if menu == "매물장":
        import BDS_listing
        BDS_listing.render_listing_page()

    elif menu == "입지 분석":
        import BDS_analysis
        BDS_analysis.render_analysis_page(is_admin=is_admin())
        
if __name__ == "__main__":
    main()
