// ─── 랜딩 페이지 레이아웃 ────────────────────────────────
// (landing) Route Group 전용 — 헤더/푸터는 page.tsx가 자체 포함

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '부동산 통합관리 시스템 — Estate-Ledger',
  description:
    '매물장(매매·상가·전월세) 통합 관리 + 공공 API 7종 입지분석 엔진. 한 플랫폼에서 부동산 업무를 완성하세요.',
  openGraph: {
    title: '부동산 통합관리 시스템 — Estate-Ledger',
    description: '매물장 + 입지분석 원스톱 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
};

/**
 * 랜딩 페이지 레이아웃
 * - 헤더·푸터는 page.tsx에 포함되어 있으므로 여기서는 래퍼만 제공
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
