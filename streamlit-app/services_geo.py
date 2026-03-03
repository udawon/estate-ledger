# services_geo.py

import streamlit as st
import requests

# =========================
# Kakao Map
# =========================
@st.cache_data(show_spinner=False, ttl=60*60)
def geocode_address_kakao(address: str):
    rest_key = st.secrets.get("KAKAO_REST_API_KEY")
    if not rest_key:
        return None, None, "KAKAO_REST_API_KEY가 secrets.toml에 없습니다."
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {rest_key}"}
    params = {"query": address}
    try:
        r = requests.get(url, headers=headers, params=params, timeout=5)
        r.raise_for_status()
        data = r.json()
        docs = data.get("documents", [])
        if not docs:
            return None, None, "주소를 찾을 수 없습니다."
        lng = float(docs[0]["x"])
        lat = float(docs[0]["y"])
        return lat, lng, None
    except Exception as e:
        return None, None, f"지오코딩 오류: {e}"
