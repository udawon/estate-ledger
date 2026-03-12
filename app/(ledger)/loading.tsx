// ─── 매물장 로딩 스켈레톤 ─────────────────────────────────
// SSR 페이지 전환 시 즉시 표시 — 데드타임 제거

export default function LedgerLoading() {
  return (
    <div className="flex-1 animate-pulse">
      {/* 그라디언트 헤더 스켈레톤 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-700" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-slate-700 rounded" />
            <div className="h-3.5 w-56 bg-slate-700/60 rounded" />
          </div>
        </div>
      </div>

      {/* 테이블 스켈레톤 */}
      <div className="p-6 space-y-4">
        {/* 검색/필터 바 */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 max-w-sm bg-slate-200 rounded-lg" />
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
        </div>

        {/* 테이블 헤더 */}
        <div className="h-10 bg-slate-200 rounded-t-lg" />

        {/* 테이블 행 */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-slate-100">
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 flex-1 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
