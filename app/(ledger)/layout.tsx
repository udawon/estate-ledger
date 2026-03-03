'use client';

// ─── 매물장 레이아웃 ─────────────────────────────────────
// 데스크탑: 고정 Sidebar + 우측 컨텐츠
// 모바일: 상단 헤더 바 + 오버레이 드로어 Sidebar
// 데모 계정: 상단 amber 배너 표시

import { useState, useEffect } from 'react';
import { Menu, TrendingUp, FlaskConical } from 'lucide-react';
import { Sidebar } from '@/components/ledger/Sidebar';
import type { SessionRole } from '@/lib/auth';

export default function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<SessionRole | null>(null);

  // 세션 역할 조회 (admin / demo 구분)
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { role: SessionRole | null }) => setRole(d.role))
      .catch(() => {});
  }, []);

  const isDemo = role === 'demo';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (데스크탑 고정 + 모바일 드로어) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isDemo={isDemo} />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-auto bg-slate-50 min-w-0">
        {/* 데모 계정 안내 배너 */}
        {isDemo && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
            <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              데모 모드입니다 — 비밀번호 변경 기능만 제한됩니다. 나머지 모든 기능은 실제와 동일하게 작동합니다.
            </p>
          </div>
        )}

        {/* 모바일 전용 헤더 바 */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-slate-900 border-b border-slate-700/50 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm text-white">estate-ledger</span>
          </div>
          {/* 모바일 데모 배지 */}
          {isDemo && (
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              DEMO
            </span>
          )}
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
