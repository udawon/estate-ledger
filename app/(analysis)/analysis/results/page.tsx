// ─── 입지분석 결과 페이지 (/analysis/results) ─────────────────
// sessionStorage에서 분석 결과를 읽어 표시

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreCard from '@/components/analysis/ScoreCard';
import ResultChart from '@/components/analysis/ResultChart';
import MapView from '@/components/analysis/MapView';
import TradePriceCard from '@/components/analysis/TradePriceCard';
import ApiUsageBanner from '@/components/analysis/ApiUsageBanner';
import CategoryAccordion from '@/components/analysis/CategoryAccordion';
import type { AnalysisResult } from '@/types';

/**
 * 입지분석 결과 페이지
 * - sessionStorage에서 analysisResult를 읽어 표시
 * - 데이터 없으면 /analysis로 리다이렉트
 */
export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = sessionStorage.getItem('analysisResult');
      if (stored) {
        setResult(JSON.parse(stored) as AnalysisResult);
      } else {
        // 데이터 없으면 입력 페이지로 이동
        router.push('/analysis');
      }
    } catch {
      router.push('/analysis');
    }
  }, [router]);

  // 하이드레이션 전 로딩 표시
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-6 md:px-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">입지분석 결과</h1>
            <p className="text-slate-400 text-sm mt-0.5 truncate">{result.address}</p>
          </div>
          {/* 뒤로가기: router.back() 대신 push로 안전하게 이동 */}
          <Button
            onClick={() => router.push('/analysis')}
            variant="outline"
            className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            뒤로
          </Button>
        </div>
      </div>

      {/* 결과 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8 md:px-16 space-y-6">
        {/* 위치 지도 — 가장 먼저 표시 */}
        <MapView
          lat={result.lat}
          lng={result.lng}
          address={result.address}
          district={result.district}
        />

        {/* 종합 점수 카드 */}
        <ScoreCard result={result} />

        {/* 레이더 차트 */}
        <ResultChart result={result} />

        {/* 실거래가 (데이터 있을 때만) */}
        {result.tradeSummary && (
          <TradePriceCard tradeSummary={result.tradeSummary} />
        )}

        {/* 카테고리별 상세 분석 아코디언 (7카테고리 + 종합평가) */}
        <CategoryAccordion result={result} />

        {/* 다시 분석 버튼 */}
        <div className="flex justify-center pb-4">
          <Button
            onClick={() => router.push('/analysis')}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 border-0"
          >
            다른 주소 분석하기
          </Button>
        </div>

        {/* 데이터 소스 및 API 사용량 — 최하단 */}
        <ApiUsageBanner result={result} />
      </div>
    </div>
  );
}
