'use client';

// ─── 매물장 사이드바 ─────────────────────────────────────
// 데스크탑: 고정 사이드바 / 모바일: 오버레이 드로어 + 로그아웃 버튼

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ShoppingBag, Home, MapPin, TrendingUp, LogOut, X, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/components/ledger/ChangePasswordDialog';

const NAV_ITEMS = [
  { href: '/listings/sales',   label: '매매',    icon: Building2,   group: '매물장' },
  { href: '/listings/shops',   label: '상가',    icon: ShoppingBag, group: '매물장' },
  { href: '/listings/rentals', label: '전월세',  icon: Home,        group: '매물장' },
  { href: '/analysis',         label: '입지분석', icon: MapPin,      group: '분석' },
] as const;

interface SidebarProps {
  /** 모바일에서 드로어 열림 여부 */
  open?: boolean;
  /** 드로어 닫기 콜백 (모바일) */
  onClose?: () => void;
  /** 데모 계정 여부 — 비밀번호 변경 버튼 숨김 */
  isDemo?: boolean;
}

export function Sidebar({ open = false, onClose, isDemo = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = ['매물장', '분석'] as const;

  // ─── 로그아웃 처리 ────────────────────────────────────
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  }

  const sidebarContent = (
    <aside className="w-60 h-full flex flex-col bg-slate-900 border-r border-slate-700/50">
      {/* 로고 + 모바일 닫기 버튼 */}
      <div className="h-16 flex items-center px-5 border-b border-slate-700/50 shrink-0">
        <Link href="/listings/sales" className="flex items-center gap-2.5 flex-1" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">claude-estate</span>
        </Link>
        {/* 모바일 전용 닫기 버튼 */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
                {group}
              </p>
              <div className="space-y-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-indigo-400' : '')} />
                      {label}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 하단: 데모 배지 / 비밀번호 변경 + 로그아웃 + 버전 */}
      <div className="p-4 border-t border-slate-700/50 space-y-1 shrink-0">
        {/* 데모 모드 배지 */}
        {isDemo ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-1">
            <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-400">데모 계정</span>
          </div>
        ) : (
          /* 비밀번호 변경 (관리자만) */
          <ChangePasswordDialog />
        )}

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          로그아웃
        </button>
        <p className="text-xs text-slate-600 text-center pt-1">claude-estate · 매물장 v1.0</p>
      </div>
    </aside>
  );

  return (
    <>
      {/* 데스크탑: 고정 사이드바 */}
      <div className="hidden lg:flex shrink-0 min-h-screen">
        {sidebarContent}
      </div>

      {/* 모바일: 오버레이 드로어 */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* 오버레이 배경 */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* 드로어 패널 */}
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
