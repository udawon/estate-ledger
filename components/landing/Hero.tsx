// ─── 랜딩 히어로 섹션 ────────────────────────────────────────
// 주소 입력 폼 + 그라디언트 배경 디자인

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Hero 컴포넌트
 * - 주소 입력 폼으로 /analysis 페이지로 이동
 * - 그라디언트 배경으로 시각적 임팩트 제공
 */
export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  // 분석 시작: 주소를 쿼리 파라미터로 전달
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    router.push(`/analysis?address=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* 그라디언트 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900" />
      {/* 장식용 원형 요소 */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      {/* 컨텐츠 */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* 배지 */}
        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-blue-300 text-sm font-medium">AI 기반 부동산 입지분석</span>
        </div>

        {/* 메인 타이틀 */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
          부동산 입지분석 엔진
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          공공 API 5개 실시간 연동으로 7개 카테고리를 종합 분석합니다
        </p>

        {/* 주소 입력 폼 */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
        >
          <Input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소를 입력하세요 (예: 서울특별시 강남구 테헤란로 123)"
            className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15"
          />
          <Button
            type="submit"
            size="lg"
            disabled={!address.trim()}
            className="h-12 px-6 bg-blue-500 hover:bg-blue-400 text-white font-semibold shrink-0 disabled:opacity-50"
          >
            분석 시작
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>

        {/* 카테고리 뱃지 — 실제 엔진 7개 카테고리 */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          {['교통', '일자리·수요', '생활인프라', '교육', '환경위험', '미래가치', '상품·공급'].map((label) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-slate-300 text-sm"
            >
              <span className="text-green-400">✓</span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
