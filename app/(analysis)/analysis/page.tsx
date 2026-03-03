// ─── 입지분석 입력 페이지 (/analysis) ────────────────────────
// 주소 입력 → API 호출 → sessionStorage 저장 → /analysis/results 이동
// ?address=xxx 쿼리 파라미터 시 자동 분석 실행

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, Loader2, MapPin, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnalysisForm from '@/components/analysis/AnalysisForm';
import type { AnalysisResult, ApiResponse } from '@/types';

/** 7종 분석 항목 목록 */
const ANALYSIS_ITEMS = [
  { label: '교통 접근성',  desc: '지하철·버스 도보 접근성',    icon: '🚇', pct: '20%' },
  { label: '일자리·수요', desc: '업무지구·대학·병원 접근',    icon: '💼', pct: '15%' },
  { label: '생활인프라',  desc: '편의점·마트·공원·의료',      icon: '🏪', pct: '15%' },
  { label: '교육',        desc: '초등학교·학원·어린이집',     icon: '📚', pct: '15%' },
  { label: '환경위험',    desc: '경찰·소방·침수·소음',        icon: '🛡️', pct: '15%' },
  { label: '미래가치',    desc: '재개발·교통계획·공급',       icon: '📈', pct: '10%' },
  { label: '상품·공급',   desc: '아파트 단지·실거래가',       icon: '🏠', pct: '10%' },
] as const;

// ─── 실제 콘텐츠 (useSearchParams 사용) ─────────────────────
function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addrParam = searchParams.get('address') ?? '';

  // 주소 파라미터가 있으면 즉시 로딩 상태로 시작 (화면 깜빡임 방지)
  const [isLoading, setIsLoading] = useState(!!addrParam);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (address: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as ApiResponse<AnalysisResult>;

      if (json.success && json.data) {
        // 결과를 sessionStorage에 저장 후 결과 페이지로 이동
        sessionStorage.setItem('analysisResult', JSON.stringify(json.data));
        router.push('/analysis/results');
      } else {
        setError(json.error ?? '분석에 실패했습니다. 주소를 확인해주세요.');
      }
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // URL 파라미터가 있으면 자동 분석 실행
  useEffect(() => {
    if (addrParam) {
      handleSubmit(addrParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회만 실행

  // 자동 분석 중 전용 로딩 화면
  if (addrParam && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
          <p className="text-slate-700 font-semibold text-base">입지 데이터 분석 중...</p>
          <div className="flex items-center gap-1.5 justify-center mt-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <p className="text-indigo-600 text-sm font-medium truncate max-w-xs">{addrParam}</p>
          </div>
          <p className="text-slate-400 text-xs mt-2">공공 API 7종 실측 데이터를 수집합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 다크 그라디언트 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-10 md:px-16">
        <div className="max-w-2xl mx-auto">
          {/* 타이틀 + 매물장 이동 버튼 */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/25 border border-indigo-400/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">입지분석</h1>
                <p className="text-slate-400 text-sm mt-1">
                  공공 API 실측 데이터로 교통·상권·환경·안전 등 7종 지표를 종합 분석합니다.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/listings/sales')}
              variant="outline"
              className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              매물장
            </Button>
          </div>

          {/* 주소 입력 폼 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
            <AnalysisForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              defaultAddress={addrParam}
            />
            {/* 오류 메시지 */}
            {error && (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 7종 분석 항목 안내 — 검색박스와 동일한 max-w-2xl 폭 */}
      <div className="px-6 py-8 md:px-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">7종 입지분석 항목</h2>
                  <p className="text-xs text-slate-400 mt-0.5">공공 API 실측 데이터 기반 종합 평가</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">가중치 합계 100%</span>
            </div>

            {/* 4+3 그리드 — gap-px + bg-slate-100 으로 구분선 처리 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
              {ANALYSIS_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="bg-white flex flex-col items-center text-center px-4 py-6 gap-3 hover:bg-indigo-50/40 transition-colors"
                >
                  <span className="text-3xl">{item.icon}</span>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-slate-700 leading-tight">{item.label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="mt-auto text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {item.pct}
                  </span>
                </div>
              ))}
              {/* 4+3 레이아웃 빈 칸 → 합산 가중치 요약 카드 */}
              <div className="hidden sm:flex flex-col items-center justify-center text-center px-4 py-6 gap-2 bg-indigo-50">
                <span className="text-3xl font-black text-indigo-200">Σ</span>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-indigo-400">합산 가중치</p>
                  <p className="text-sm font-black text-indigo-500">= 100%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 입지분석 페이지 진입점
 * - Suspense 래핑: useSearchParams 사용을 위한 필수 처리
 */
export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
