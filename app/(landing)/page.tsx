// ─── 메인 랜딩 페이지 (/): 부동산 통합관리 시스템 ──────────────
// Dark Intelligence 컨셉 — 글래스모피즘 + 애니메이션 배경

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Store, Building2, TrendingUp, Search, Loader2,
  MapPin, FileSpreadsheet, CheckCircle2,
  BarChart3, ArrowRight, Zap,
} from 'lucide-react';
import type { AnalysisResult, ApiResponse } from '@/types';

// ─── 매물장 기능 목록 ──────────────────────────────────────────
const LISTING_FEATURES = [
  { icon: Home,            label: '매매 매물장',  desc: '매매 물건 등록·수정·삭제',  tag: 'SALES' },
  { icon: Store,           label: '상가 매물장',  desc: '상가 임대·매매 통합 관리',  tag: 'SHOP'  },
  { icon: Building2,       label: '전월세 매물장', desc: '전세·월세 물건 일괄 관리', tag: 'RENT'  },
  { icon: FileSpreadsheet, label: 'Excel 연동',  desc: '내보내기 / 가져오기 지원',   tag: 'XLS'   },
] as const;

// ─── 입지분석 항목 ─────────────────────────────────────────────
const ANALYSIS_ITEMS = [
  { icon: '🚇', label: '교통 접근성', weight: 20 },
  { icon: '💼', label: '일자리·수요', weight: 15 },
  { icon: '🏪', label: '생활인프라',  weight: 15 },
  { icon: '📚', label: '교육',        weight: 15 },
  { icon: '🛡️', label: '환경위험',   weight: 15 },
  { icon: '📈', label: '미래가치',    weight: 10 },
  { icon: '🏠', label: '상품·공급',   weight: 10 },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 입지분석 실행: API → sessionStorage → 결과 페이지 이동
  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as ApiResponse<AnalysisResult>;
      if (json.success && json.data) {
        sessionStorage.setItem('analysisResult', JSON.stringify(json.data));
        router.push('/analysis/results');
      } else {
        setError(json.error ?? '분석에 실패했습니다. 주소를 확인해주세요.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── 글로벌 스타일 + 애니메이션 키프레임 ─────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

        .land-root {
          background: #070e20;
          min-height: 100vh;
          color: #f1f5f9;
          overflow-x: hidden;
        }

        /* ── 배경 그라디언트 오브 ── */
        .orb {
          position: fixed; border-radius: 50%;
          filter: blur(120px); pointer-events: none; z-index: 0;
        }
        .orb-1 {
          width: 700px; height: 700px; top: -250px; left: -180px;
          background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
          animation: drift1 22s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 550px; height: 550px; top: 50px; right: -160px;
          background: radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%);
          animation: drift2 28s ease-in-out infinite alternate;
        }
        .orb-3 {
          width: 450px; height: 450px; bottom: 100px; left: 35%;
          background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
          animation: drift1 19s ease-in-out infinite alternate-reverse;
        }
        @keyframes drift1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(50px, 35px) scale(1.08); }
        }
        @keyframes drift2 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-35px, 55px) scale(0.94); }
        }

        /* ── 도트 그리드 패턴 ── */
        .dot-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 40%, black 20%, transparent 80%);
        }

        /* ── 헤더 ── */
        .land-header {
          position: relative; z-index: 20;
          background: rgba(7,14,32,0.85);
          border-bottom: 1px solid rgba(99,102,241,0.1);
          backdrop-filter: blur(24px);
        }

        /* ── 히어로 타이포그래피 ── */
        .hero-title {
          background: linear-gradient(135deg, #e2e8f0 0%, #c7d2fe 35%, #a5b4fc 65%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1.18;
        }
        .hero-accent {
          background: linear-gradient(120deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── 섹션 레이블 ── */
        .section-label {
          font-family: 'DM Mono', ui-monospace, monospace;
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #818cf8; display: flex; align-items: center; gap: 8px;
        }
        .section-label::before {
          content: ''; display: inline-block;
          width: 18px; height: 1px; background: #818cf8; flex-shrink: 0;
        }

        /* ── 유리 카드 (흰색 계열) ── */
        .glass-card {
          background: #f4f7ff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.12);
          transition: box-shadow 0.3s ease, transform 0.3s ease;
          overflow: hidden;
        }
        .glass-card:hover {
          box-shadow: 0 16px 56px rgba(0,0,0,0.3), 0 0 0 1px rgba(99,102,241,0.25);
          transform: translateY(-3px);
        }

        /* ── 카드 헤더 배경 (다크 유지 — 흰 카드와 대비) ── */
        .ch-ledger {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 70%, #1a2040 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ch-analysis {
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);
          border-bottom: 1px solid rgba(255,255,255,0.12);
        }

        /* ── 모노 배지 ── */
        .mono-badge {
          font-family: 'DM Mono', ui-monospace, monospace;
          font-size: 9px; letter-spacing: 0.1em;
          padding: 3px 7px; border-radius: 6px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.18);
          color: #818cf8; white-space: nowrap;
        }

        /* ── 기능 목록 항목 ── */
        .feat-item {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          background: rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }
        .feat-item:hover {
          background: rgba(99,102,241,0.06);
          border-color: rgba(99,102,241,0.2);
        }

        /* ── 아이콘 박스 ── */
        .icon-box {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── 구분선 ── */
        .hr-dim {
          height: 1px; margin: 28px 0;
          background: linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent);
        }

        /* ── 검색 입력창 ── */
        .search-box {
          width: 100%; height: 44px;
          background: rgba(0,0,0,0.03) !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
          border-radius: 12px !important;
          color: #1e293b !important; font-size: 14px;
          padding: 0 12px 0 36px;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .search-box::placeholder { color: #94a3b8; }
        .search-box:focus {
          border-color: rgba(99,102,241,0.4) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
        }
        .search-box:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── 분석 항목 칩 ── */
        .analysis-chip {
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 12px; padding: 14px 14px;
          display: flex; align-items: center; gap: 10px;
          transition: all 0.2s ease;
        }
        .analysis-chip:hover {
          background: rgba(99,102,241,0.09);
          border-color: rgba(99,102,241,0.25);
          transform: translateY(-1px);
        }

        /* ── 가중치 바 ── */
        .weight-bar {
          height: 2px; border-radius: 2px; margin-top: 4px;
          background: linear-gradient(to right, #6366f1, #a5b4fc);
          opacity: 0.65;
        }

        /* ── CTA 버튼 ── */
        .btn-cta {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.5);
        }

        .btn-ghost {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 44px; border-radius: 12px;
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.2);
          color: #4f46e5; font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.4);
          color: #4338ca;
        }

        .btn-analyze {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          height: 44px; padding: 0 18px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .btn-analyze:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.5);
        }
        .btn-analyze:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── 스탯 미니 카드 ── */
        .stat-item {
          background: #f4f7ff;
          border-radius: 16px;
          padding: 22px 20px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.13);
        }
        .stat-icon-wrap {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        /* 상단 포인트 컬러 라인 */
        .si-indigo  { border-top: 3px solid #6366f1; }
        .si-blue    { border-top: 3px solid #3b82f6; }
        .si-emerald { border-top: 3px solid #10b981; }
        .si-amber   { border-top: 3px solid #f59e0b; }
        /* 아이콘 박스 컬러 */
        .sw-indigo  { background: rgba(99,102,241,0.1);  border: 1px solid rgba(99,102,241,0.2);  color: #6366f1; }
        .sw-blue    { background: rgba(59,130,246,0.1);  border: 1px solid rgba(59,130,246,0.2);  color: #3b82f6; }
        .sw-emerald { background: rgba(16,185,129,0.1);  border: 1px solid rgba(16,185,129,0.2);  color: #10b981; }
        .sw-amber   { background: rgba(245,158,11,0.1);  border: 1px solid rgba(245,158,11,0.2);  color: #f59e0b; }

        /* ── 진입 애니메이션 ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .a1 { animation: fadeUp 0.65s 0s   ease both; }
        .a2 { animation: fadeUp 0.65s 0.12s ease both; }
        .a3 { animation: fadeUp 0.65s 0.24s ease both; }
        .a4 { animation: fadeUp 0.65s 0.36s ease both; }
        .a5 { animation: fadeUp 0.65s 0.48s ease both; }

        /* ── 라이브 배지 ── */
        .live-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px;
          background: rgba(16,185,129,0.09);
          border: 1px solid rgba(16,185,129,0.22);
        }
      `}</style>

      <div className="land-root">
        {/* 배경 레이어 */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="dot-grid" />

        {/* ── 헤더 ──────────────────────────────────────────────── */}
        <header className="land-header px-6 py-4 md:px-12">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <BarChart3 className="w-4 h-4" style={{ color: '#818cf8' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">부동산 통합관리 시스템</p>
                <p className="text-xs" style={{ color: '#475569' }}>매물장 + 입지분석 원스톱</p>
              </div>
            </div>
            {/* 라이브 상태 배지 */}
            <div className="live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold" style={{ color: '#34d399', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
                LIVE
              </span>
            </div>
          </div>
        </header>

        {/* ── 히어로 ────────────────────────────────────────────── */}
        <section className="relative z-10 px-6 md:px-12 pt-20 pb-16 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="section-label justify-center mb-7 a1">
              Real Estate Intelligence Platform
            </p>
            <h1 className="hero-title text-4xl md:text-5xl font-extrabold mb-5 a2" style={{ letterSpacing: '-0.02em' }}>
              매물 관리부터<br />입지분석까지,<br />
              <span className="hero-accent">한 플랫폼에서</span>
            </h1>
            <p className="a3 text-sm md:text-base max-w-lg mx-auto leading-relaxed"
              style={{ color: '#94a3b8' }}>
              매매·상가·전월세 매물장을 통합 관리하고,<br className="hidden sm:block" />
              공공 API 7종 실측 데이터로 입지를 정밀 분석합니다.
            </p>
          </div>
        </section>

        {/* ── 투 컬럼 카드 ──────────────────────────────────────── */}
        <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── 좌: 매물 통합관리 ─────────────────────────────── */}
            <div className="glass-card a4 flex flex-col">
              {/* 카드 헤더 */}
              <div className="ch-ledger px-7 py-6">
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <FileSpreadsheet className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-white">매물 통합관리</h2>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>매매 · 상가 · 전월세 일괄 관리</p>
                  </div>
                  <span className="mono-badge">LEDGER</span>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {/* 기능 목록 */}
                <ul className="space-y-2 mb-2">
                  {LISTING_FEATURES.map((item) => (
                    <li key={item.label} className="feat-item">
                      <div className="icon-box">
                        <item.icon className="w-4 h-4" style={{ color: '#818cf8' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{item.label}</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>{item.desc}</p>
                      </div>
                      <span className="mono-badge">{item.tag}</span>
                    </li>
                  ))}
                </ul>

                <div className="hr-dim" />

                {/* 부가 안내 */}
                <div className="space-y-3 mb-8">
                  {[
                    '매물장에서 주소 클릭 시 입지분석 자동 연동',
                    'Excel 내보내기 · 가져오기 지원',
                    '관리자 비밀번호 인증 방식 (간편 설정)',
                  ].map((text) => (
                    <p key={text} className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#818cf8' }} />
                      {text}
                    </p>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-auto">
                  <Link href="/login">
                    <button className="btn-cta">
                      매물장 관리 페이지로 이동
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── 우: 입지분석 엔진 ─────────────────────────────── */}
            <div className="glass-card a5 flex flex-col">
              {/* 카드 헤더 */}
              <div className="ch-analysis px-7 py-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <TrendingUp className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-white">입지분석 엔진</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(165,180,252,0.65)' }}>공공 API 7종 실측 · 로그인 불필요</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Zap className="w-3 h-3" style={{ color: '#34d399' }} />
                    <span className="mono-badge" style={{ background: 'transparent', border: 'none', color: '#34d399', padding: 0 }}>FREE</span>
                  </div>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {/* 분석 폼 */}
                <div className="mb-6">
                  <p className="text-sm font-medium mb-4" style={{ color: '#475569' }}>
                    주소를 입력하면 바로 분석합니다
                  </p>
                  <form onSubmit={handleAnalyze} className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: '#475569' }} />
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="예: 서울시 강남구 역삼동 735"
                        className="search-box"
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !address.trim()}
                      className="btn-analyze"
                    >
                      {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Search className="w-4 h-4" />}
                      {loading ? '분석 중' : '분석'}
                    </button>
                  </form>
                  {error && (
                    <p className="mt-2 text-xs" style={{ color: '#f87171' }} role="alert">{error}</p>
                  )}
                  {loading && (
                    <p className="mt-2 text-xs animate-pulse" style={{ color: '#818cf8' }}>
                      공공 API 7종 데이터 수집 중...
                    </p>
                  )}
                </div>

                <div className="hr-dim" />

                {/* 분석 항목 그리드 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div style={{ width: '18px', height: '1px', background: '#4338ca', flexShrink: 0 }} />
                    <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", color: '#4338ca', fontWeight: 600 }}>
                      분석 항목 (7종)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ANALYSIS_ITEMS.map((item) => (
                      <div key={item.label} className="analysis-chip">
                        <span className="text-base leading-none">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>{item.label}</p>
                          <div className="weight-bar" style={{ width: `${item.weight * 3.5}px`, maxWidth: '100%' }} />
                        </div>
                        <span className="text-xs shrink-0"
                          style={{ color: '#475569', fontFamily: "'DM Mono', monospace" }}>
                          {item.weight}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 자세히 보기 */}
                <div className="mt-8">
                  <Link href="/analysis">
                    <button className="btn-ghost">
                      <TrendingUp className="w-4 h-4" />
                      입지분석 전용 페이지로 이동
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── 하단 스탯 카드 ────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: Zap,             title: '실시간 분석', desc: '공공 API 7종 즉시 조회', ci: 'si-indigo',  sw: 'sw-indigo'  },
              { Icon: BarChart3,       title: '7종 지표',    desc: '교통·상권·교육·환경 등', ci: 'si-blue',    sw: 'sw-blue'    },
              { Icon: Building2,       title: '3종 매물장',  desc: '매매·상가·전월세 통합',  ci: 'si-emerald', sw: 'sw-emerald' },
              { Icon: FileSpreadsheet, title: 'Excel 연동',  desc: '내보내기·가져오기 지원', ci: 'si-amber',   sw: 'sw-amber'   },
            ].map((item) => (
              <div key={item.title} className={`stat-item ${item.ci} flex items-center gap-3`}>
                <div className={`stat-icon-wrap shrink-0 ${item.sw}`}>
                  <item.Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 푸터 ─────────────────────────────────────────────── */}
        <footer className="relative z-10 py-6 text-center"
          style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
          <p className="text-xs" style={{ color: '#334155', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>
            © 2026 부동산 통합관리 시스템 · Built with Public API
          </p>
        </footer>
      </div>
    </>
  );
}
