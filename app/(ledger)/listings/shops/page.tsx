import { cookies } from 'next/headers';
import { getShops } from '@/lib/db/shops';
import { ShopTable } from '@/components/ledger/ShopTable';
import { ShoppingBag } from 'lucide-react';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ShopsPage() {
  // SSR scope 격리: 데모 유저에게 admin 데이터 노출 방지
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  const scope = payload?.role === 'demo' ? 'demo' : 'admin';
  const listings = await getShops({}, scope);

  return (
    <div className="flex-1">
      {/* 그라디언트 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/25 border border-indigo-400/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">상가 매물장</h1>
            <p className="text-slate-400 text-sm mt-0.5">상가 매물을 등록·조회·수정·삭제합니다.</p>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-6">
        <ShopTable initialData={listings} />
      </div>
    </div>
  );
}
