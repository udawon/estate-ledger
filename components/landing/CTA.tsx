// ─── 행동 유도(CTA) 섹션 ─────────────────────────────────────
// 무료 분석 시작 유도 배너

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * CTA(Call To Action) 컴포넌트
 * - 무료 분석 시작 버튼으로 /analysis 페이지 이동
 * - 그라디언트 배경으로 시각적 강조
 */
export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      <div className="container mx-auto px-4 text-center">
        {/* 뱃지 */}
        <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-white text-sm font-medium">완전 무료 서비스</span>
        </div>

        {/* 타이틀 */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          지금 바로 무료로 분석해보세요
        </h2>
        <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
          원하는 주소를 입력하면 30초 안에 종합 입지 점수를 확인할 수 있습니다.
          회원가입 없이 바로 사용하세요.
        </p>

        {/* CTA 버튼 그룹 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="h-13 px-8 bg-white text-blue-700 hover:bg-blue-50 font-bold text-base shadow-lg"
          >
            <Link href="/analysis">
              무료 분석 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-13 px-8 border-white/50 text-white hover:bg-white/10 font-semibold text-base"
          >
            <Link href="#features">서비스 소개 보기</Link>
          </Button>
        </div>

        {/* 보조 정보 */}
        <p className="mt-8 text-blue-200 text-sm">
          교통 · 일자리 · 생활 · 교육 · 환경 · 미래 · 공급 — 7개 카테고리 종합 분석
        </p>
      </div>
    </section>
  );
}
