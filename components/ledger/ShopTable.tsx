'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Pencil, Trash2, Loader2, MapPin, ChevronDown,
  RotateCcw, Search, Plus, List, User, ChevronRight, X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ExcelButtons } from './ExcelButtons';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ShopListing } from '@/types/listings';

// ─── 상세보기 행 컴포넌트 ───────────────────────────────
function DR({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  const display = value != null && value !== '' ? String(value) : '-';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''} ${display !== '-' ? 'font-semibold' : 'text-slate-300 font-normal'}`}>{display}</span>
    </div>
  );
}

// ─── 섹션 구분 헤더 ─────────────────────────────────────
function SH({ label, color = 'text-slate-400' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${color}`}>{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── 상수 ──────────────────────────────────────────────
const TYPE_OPTIONS = ['일반상가', '근린생활시설', '판매시설', '음식점', '학원', '기타'] as const;
const CARRIER_OPTIONS = ['', 'SKT', 'KT', 'LG', '알뜰폰 SKT', '알뜰폰 KT', '알뜰폰 LG'] as const;
const TODAY = new Date().toISOString().slice(0, 10);

// ─── 엑셀 가져오기 — 템플릿 헤더 / 컬럼 매핑 ──────────────
const SHOP_TEMPLATE_HEADERS = [
  '접수일', '종류', '상호', '용도지역', '주소', '건축연도',
  '해당층', '건물층수', '임대면적(㎡)', '전용면적(㎡)', '난방',
  '보증금(만원)', '권리금(만원)', '월세(만원)', '부가세(만원)', '관리비(만원)',
  '고객명', '연락처', '통신사', '메모',
];

const SHOP_COL_MAP: Record<string, string> = {
  '접수일': 'recv_date',
  '종류': 'type',
  '상호': 'brand',
  '용도지역': 'zoning',
  '주소': 'addr',
  '건축연도': 'built_year',
  '해당층': 'floor_this',
  '건물층수': 'floors_total',
  '임대면적(㎡)': 'area_lease_m2',
  '전용면적(㎡)': 'area_net_m2',
  '난방': 'fuel',
  '보증금(만원)': 'deposit',
  '권리금(만원)': 'premium',
  '월세(만원)': 'monthly',
  '부가세(만원)': 'vat',
  '관리비(만원)': 'mng_fee',
  '고객명': 'client_name',
  '연락처': 'client_phone',
  '통신사': 'carrier',
  '메모': 'memo',
};

// ─── 폼 스키마 ──────────────────────────────────────────
const schema = z.object({
  recv_date:     z.string().min(1, '접수일을 입력하세요'),
  type:          z.string(),
  brand:         z.string(),
  zoning:        z.string(),
  addr:          z.string().min(1, '주소를 입력하세요'),
  built_year:    z.string(),
  floor_this:    z.string(),
  floors_total:  z.string(),
  area_lease_m2: z.string(),
  area_net_m2:   z.string(),
  fuel:          z.string(),
  deposit:       z.string(),
  premium:       z.string(),
  monthly:       z.string(),
  vat:           z.string(),
  mng_fee:       z.string(),
  client_name:   z.string(),
  client_phone:  z.string(),
  carrier:       z.string(),
  memo:          z.string(),
});
type FormValues = z.infer<typeof schema>;

// ─── 빈 폼 기본값 ──────────────────────────────────────
const EMPTY: FormValues = {
  recv_date: TODAY, type: '', brand: '', zoning: '', addr: '',
  built_year: '', floor_this: '', floors_total: '',
  area_lease_m2: '', area_net_m2: '', fuel: '',
  deposit: '', premium: '', monthly: '', vat: '', mng_fee: '',
  client_name: '', client_phone: '', carrier: '', memo: '',
};

// ─── 유틸 ───────────────────────────────────────────────
function toNum(v: string | null | undefined): number { return parseFloat(v ?? '') || 0; }
function toInt(v: string | null | undefined): number { return parseInt(v ?? '') || 0; }
function fmt(v: number | null | undefined): string {
  if (v == null || v === 0) return '-';
  return v.toLocaleString('ko-KR');
}
function fmtF(v: number | null | undefined, d = 2): string {
  if (v == null || v === 0) return '-';
  return v.toFixed(d);
}
function m2toPy(m2: number): number { return m2 * 0.3025; }

// ─── 업종별 뱃지 색상 ────────────────────────────────────
function typeColor(t: string): string {
  const map: Record<string, string> = {
    '일반상가':       'bg-amber-100 text-amber-700',
    '근린생활시설':   'bg-orange-100 text-orange-700',
    '판매시설':       'bg-rose-100 text-rose-700',
    '음식점':         'bg-red-100 text-red-700',
    '학원':           'bg-blue-100 text-blue-700',
    '기타':           'bg-slate-100 text-slate-600',
  };
  return map[t] ?? 'bg-slate-100 text-slate-600';
}

// ─── 자동계산 ────────────────────────────────────────────
function calcAuto(f: FormValues) {
  const lease_m2 = toNum(f.area_lease_m2);
  const net_m2   = toNum(f.area_net_m2);
  const dep      = toInt(f.deposit);
  const prem     = toInt(f.premium);
  const mon      = toInt(f.monthly);
  const vat      = toInt(f.vat);
  const mng      = toInt(f.mng_fee);

  const area_lease_py = m2toPy(lease_m2);
  const area_net_py   = m2toPy(net_m2);
  const subtotal      = dep + prem;
  const subtotal2     = mon + vat + mng;
  const rent_per_py   = area_lease_py > 0 ? mon / area_lease_py : 0;
  const mng_per_py    = area_lease_py > 0 ? mng / area_lease_py : 0;

  return { area_lease_py, area_net_py, subtotal, subtotal2, rent_per_py, mng_per_py };
}

// ─── listing → form 변환 ───────────────────────────────
function listingToForm(s: ShopListing): FormValues {
  return {
    recv_date:     s.recv_date ?? TODAY,
    type:          s.type ?? '',
    brand:         s.brand ?? '',
    zoning:        s.zoning ?? '',
    addr:          s.addr ?? '',
    built_year:    s.built_year != null ? String(s.built_year) : '',
    floor_this:    s.floor_this ?? '',
    floors_total:  s.floors_total ?? '',
    area_lease_m2: s.area_lease_m2 != null ? String(s.area_lease_m2) : '',
    area_net_m2:   s.area_net_m2 != null ? String(s.area_net_m2) : '',
    fuel:          s.fuel ?? '',
    deposit:       s.deposit != null ? String(s.deposit) : '',
    premium:       s.premium != null ? String(s.premium) : '',
    monthly:       s.monthly != null ? String(s.monthly) : '',
    vat:           s.vat != null ? String(s.vat) : '',
    mng_fee:       s.mng_fee != null ? String(s.mng_fee) : '',
    client_name:   s.client_name ?? '',
    client_phone:  s.client_phone ?? '',
    carrier:       s.carrier ?? '',
    memo:          s.memo ?? '',
  };
}

// ─── 읽기전용 자동계산 필드 ────────────────────────────
function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500 block mb-1.5">{label} (자동)</Label>
      <div className="h-8 px-3 flex items-center text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-500">
        {value || '-'}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────
interface Props { initialData: ShopListing[]; }

export function ShopTable({ initialData }: Props) {
  const [data, setData]       = useState<ShopListing[]>(initialData);
  const [editing, setEditing] = useState<ShopListing | null>(null);
  const [detailItem, setDetailItem] = useState<ShopListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen]     = useState(false);

  // ── 필터 상태 ──────────────────────────────────────────
  const [fSearch, setFSearch]     = useState('');
  const [fType, setFType]         = useState('');
  const [fDepMin, setFDepMin]     = useState('');
  const [fDepMax, setFDepMax]     = useState('');
  const [fMonMin, setFMonMin]     = useState('');
  const [fMonMax, setFMonMax]     = useState('');
  const [fLaMin, setFLaMin]       = useState('');
  const [fLaMax, setFLaMax]       = useState('');

  // ── 폼 ──────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const formValues = watch();
  const auto = calcAuto(formValues);

  // 수정 선택 시 폼 채우기 + 폼 자동 열기
  useEffect(() => {
    if (editing) { reset(listingToForm(editing)); setFormOpen(true); }
    else reset(EMPTY);
  }, [editing, reset]);

  // ── 데이터 로드 ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    const res = await fetch('/api/listings/shops');
    const json = await res.json();
    if (json.success) setData(json.data);
  }, []);

  // 마운트 시 세션 scope에 맞는 데이터 로드
  useEffect(() => { loadData(); }, [loadData]);

  // ── 엑셀/CSV 가져오기 ──────────────────────────────────
  const handleImport = useCallback(async (rows: Record<string, unknown>[]) => {
    let ok = 0, fail = 0;
    for (const row of rows) {
      const m: Record<string, unknown> = {};
      for (const [kor, eng] of Object.entries(SHOP_COL_MAP)) {
        if (row[kor] !== undefined) m[eng] = row[kor];
      }
      // 숫자 필드 파싱
      const lease_m2  = parseFloat(String(m.area_lease_m2 ?? '')) || 0;
      const net_m2    = parseFloat(String(m.area_net_m2 ?? '')) || 0;
      const deposit   = parseInt(String(m.deposit ?? '')) || 0;
      const premium   = parseInt(String(m.premium ?? '')) || 0;
      const monthly   = parseInt(String(m.monthly ?? '')) || 0;
      const vat       = parseInt(String(m.vat ?? '')) || 0;
      const mng_fee   = parseInt(String(m.mng_fee ?? '')) || 0;
      // 자동계산
      const area_lease_py = lease_m2 * 0.3025;
      const area_net_py   = net_m2 * 0.3025;
      const subtotal      = deposit + premium;
      const subtotal2     = monthly + vat + mng_fee;
      const rent_per_py   = area_lease_py > 0 ? Math.round(monthly / area_lease_py) : 0;
      const mng_per_py    = area_lease_py > 0 ? Math.round(mng_fee / area_lease_py) : 0;

      const payload = {
        recv_date:     String(m.recv_date ?? ''),
        type:          String(m.type ?? ''),
        brand:         String(m.brand ?? ''),
        zoning:        String(m.zoning ?? ''),
        addr:          String(m.addr ?? ''),
        built_year:    parseInt(String(m.built_year ?? '')) || null,
        floor_this:    String(m.floor_this ?? ''),
        floors_total:  String(m.floors_total ?? ''),
        area_lease_m2: lease_m2 || null,
        area_lease_py: area_lease_py || null,
        area_net_m2:   net_m2 || null,
        area_net_py:   area_net_py || null,
        fuel:          String(m.fuel ?? ''),
        deposit:       deposit || null,
        premium:       premium || null,
        subtotal:      subtotal || null,
        monthly:       monthly || null,
        vat:           vat || null,
        mng_fee:       mng_fee || null,
        subtotal2:     subtotal2 || null,
        rent_per_py:   rent_per_py || null,
        mng_per_py:    mng_per_py || null,
        client_name:   String(m.client_name ?? ''),
        client_phone:  String(m.client_phone ?? ''),
        carrier:       String(m.carrier ?? ''),
        memo:          String(m.memo ?? ''),
      };
      try {
        const res = await fetch('/api/listings/shops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    alert(`가져오기 완료: 성공 ${ok}건 / 실패 ${fail}건`);
    await loadData();
  }, [loadData]);

  // ── 등록/수정 ───────────────────────────────────────────
  const onSubmit = useCallback(async (values: FormValues) => {
    setLoading(true);
    try {
      const a = calcAuto(values);
      const payload = {
        recv_date:    values.recv_date,
        type:         values.type,
        brand:        values.brand,
        zoning:       values.zoning,
        addr:         values.addr,
        built_year:   toInt(values.built_year) || null,
        floor_this:   values.floor_this,
        floors_total: values.floors_total,
        area_lease_m2: toNum(values.area_lease_m2) || null,
        area_lease_py: a.area_lease_py || null,
        area_net_m2:  toNum(values.area_net_m2) || null,
        area_net_py:  a.area_net_py || null,
        fuel:         values.fuel,
        deposit:      toInt(values.deposit) || null,
        premium:      toInt(values.premium) || null,
        subtotal:     a.subtotal || null,
        monthly:      toInt(values.monthly) || null,
        vat:          toInt(values.vat) || null,
        mng_fee:      toInt(values.mng_fee) || null,
        subtotal2:    a.subtotal2 || null,
        rent_per_py:  a.rent_per_py ? Math.round(a.rent_per_py) : null,
        mng_per_py:   a.mng_per_py ? Math.round(a.mng_per_py) : null,
        client_name:  values.client_name,
        client_phone: values.client_phone,
        carrier:      values.carrier,
        memo:         values.memo,
      };

      if (editing) {
        await fetch(`/api/listings/shops/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setEditing(null);
      } else {
        await fetch('/api/listings/shops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await loadData();
      reset(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [editing, loadData, reset]);

  // ── 삭제 ────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(`ID ${id} 항목을 삭제하시겠습니까?`)) return;
    await fetch(`/api/listings/shops/${id}`, { method: 'DELETE' });
    if (editing?.id === id) setEditing(null);
    await loadData();
  }, [editing, loadData]);

  // ── 클라이언트 필터 ─────────────────────────────────────
  const filtered = data.filter((item) => {
    const q = fSearch.toLowerCase();
    if (q && !(
      item.addr?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.client_name?.toLowerCase().includes(q) ||
      item.client_phone?.includes(q)
    )) return false;
    if (fType && item.type !== fType) return false;
    if (fDepMin && (item.deposit ?? 0) < parseInt(fDepMin)) return false;
    if (fDepMax && (item.deposit ?? 0) > parseInt(fDepMax)) return false;
    if (fMonMin && (item.monthly ?? 0) < parseInt(fMonMin)) return false;
    if (fMonMax && (item.monthly ?? 0) > parseInt(fMonMax)) return false;
    const laPy = item.area_lease_py ?? (item.area_lease_m2 ? m2toPy(item.area_lease_m2) : 0);
    if (fLaMin && laPy < parseFloat(fLaMin)) return false;
    if (fLaMax && laPy > parseFloat(fLaMax)) return false;
    return true;
  });

  const resetFilters = () => {
    setFSearch(''); setFType('');
    setFDepMin(''); setFDepMax('');
    setFMonMin(''); setFMonMax('');
    setFLaMin(''); setFLaMax('');
  };

  // ─── 렌더 ─────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ─── 등록/수정 폼 ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 폼 헤더 */}
        <div
          className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer select-none hover:bg-indigo-50/60 transition-colors group"
          onClick={() => setFormOpen(!formOpen)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
              editing ? 'bg-amber-500' : 'bg-indigo-500'
            }`}>
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
              {editing
                ? <><span className="text-amber-600">ID {editing.id} 수정 중</span>{editing.brand ? ` · ${editing.brand}` : ''}</>
                : '신규 매물 등록'}
            </span>
            {!formOpen && (
              <span className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                클릭하여 열기
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {editing && (
              <Button variant="ghost" size="sm"
                onClick={(e) => { e.stopPropagation(); setEditing(null); }}
                className="text-slate-500 text-xs h-7">
                <RotateCcw className="w-3 h-3 mr-1" /> 신규 모드로
              </Button>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${formOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* 폼 필드 */}
        {formOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">

          {/* Row 1: 접수일 / 종류 / 상호 / 용도지역 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">접수일 *</Label>
              <Input type="date" {...register('recv_date')} className="h-8 text-base sm:text-sm" />
              {errors.recv_date && <p className="text-xs text-red-500">{errors.recv_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">종류</Label>
              <Controller
                name="type" control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                    value={field.value || '_none'}
                  >
                    <SelectTrigger className="h-8 text-base sm:text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">선택 없음</SelectItem>
                      {TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">상호</Label>
              <Input {...register('brand')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">용도지역</Label>
              <Input {...register('zoning')} className="h-8 text-base sm:text-sm" />
            </div>
          </div>

          {/* Row 2: 주소 (full) */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-600 block mb-1.5">주소 *</Label>
            <Input {...register('addr')} placeholder="서울시 강남구..." className="h-8 text-base sm:text-sm" />
            {errors.addr && <p className="text-xs text-red-500">{errors.addr.message}</p>}
          </div>

          {/* Row 3: 해당층 / 전체층 / 건축년도 / 연료 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">해당층</Label>
              <Input {...register('floor_this')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">전체층</Label>
              <Input {...register('floors_total')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">건축년도</Label>
              <Input type="number" {...register('built_year')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">연료</Label>
              <Input {...register('fuel')} placeholder="도시가스/전기..." className="h-8 text-base sm:text-sm" />
            </div>
          </div>

          {/* Row 4: 계약면적(㎡) / 계약면적(평·자동) / 실면적(㎡) / 실면적(평·자동) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">계약면적(㎡)</Label>
              <Input type="number" step="0.01" {...register('area_lease_m2')} className="h-8 text-base sm:text-sm" />
            </div>
            <AutoField label="계약면적(평)" value={auto.area_lease_py ? fmtF(auto.area_lease_py) : ''} />
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">실면적(㎡)</Label>
              <Input type="number" step="0.01" {...register('area_net_m2')} className="h-8 text-base sm:text-sm" />
            </div>
            <AutoField label="실면적(평)" value={auto.area_net_py ? fmtF(auto.area_net_py) : ''} />
          </div>

          {/* Row 5: 보증금 / 권리금 / 소계1(자동) / | 월세 / VAT / 관리비 / 소계2(자동) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">보증금(만원)</Label>
              <Input type="number" {...register('deposit')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">권리금(만원)</Label>
              <Input type="number" {...register('premium')} className="h-8 text-base sm:text-sm" />
            </div>
            <AutoField label="소계1(보증+권리)" value={auto.subtotal ? fmt(auto.subtotal) : ''} />
            <div /> {/* spacer */}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">월세(만원)</Label>
              <Input type="number" {...register('monthly')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">VAT(만원)</Label>
              <Input type="number" {...register('vat')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">관리비(만원)</Label>
              <Input type="number" {...register('mng_fee')} className="h-8 text-base sm:text-sm" />
            </div>
            <AutoField label="소계2(월+VAT+관)" value={auto.subtotal2 ? fmt(auto.subtotal2) : ''} />
          </div>

          {/* Row 6: 평당임대료(자동) / 평당관리비(자동) */}
          <div className="grid grid-cols-4 gap-3">
            <AutoField label="평당임대료(만원)" value={auto.rent_per_py ? fmt(Math.round(auto.rent_per_py)) : ''} />
            <AutoField label="평당관리비(만원)" value={auto.mng_per_py ? fmt(Math.round(auto.mng_per_py)) : ''} />
            <div /><div />
          </div>

          {/* Row 7: 성명 / 연락처 / 통신사 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">성명</Label>
              <Input {...register('client_name')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">연락처</Label>
              <Input {...register('client_phone')} className="h-8 text-base sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">통신사</Label>
              <Controller
                name="carrier" control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                    value={field.value || '_none'}
                  >
                    <SelectTrigger className="h-8 text-base sm:text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {CARRIER_OPTIONS.map((o) => (
                        <SelectItem key={o || '_none'} value={o || '_none'}>{o || '선택 없음'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div />
          </div>

          {/* Row 8: 비고 */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-600 block mb-1.5">비고</Label>
            <Textarea {...register('memo')} rows={2} className="text-base sm:text-sm resize-none" />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-1">
            {editing && (
              <Button type="button" variant="outline" size="sm"
                onClick={() => setEditing(null)} className="h-8 text-sm">
                취소
              </Button>
            )}
            <Button type="submit" size="sm" disabled={loading}
              className="h-8 px-5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {editing ? '수정 저장' : '등록'}
            </Button>
          </div>
        </form>
        )}
      </div>

      {/* ─── 필터 패널 ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 hover:bg-violet-50/60 transition-colors group"
          onClick={() => setFilterOpen((p) => !p)}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-500 flex items-center justify-center shadow-sm">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">검색 필터</span>
            {(fSearch || fType || fDepMin || fDepMax || fMonMin || fMonMax || fLaMin || fLaMax) && (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                필터 적용 중
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterOpen && (
          <div className="p-4 space-y-3">
            {/* 검색어 / 종류 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">검색어</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input value={fSearch} onChange={(e) => setFSearch(e.target.value)}
                    placeholder="주소, 상호, 성명, 연락처..." className="pl-8 h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">종류</Label>
                <Select value={fType || '_all'} onValueChange={(v) => setFType(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-base sm:text-sm"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">전체</SelectItem>
                    {TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={resetFilters}
                  className="h-8 text-xs gap-1 w-full">
                  <RotateCcw className="w-3 h-3" /> 초기화
                </Button>
              </div>
            </div>

            {/* 보증금 / 월세 / 계약면적 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">보증금(만원)</Label>
                <div className="flex items-center gap-1">
                  <Input value={fDepMin} onChange={(e) => setFDepMin(e.target.value)}
                    placeholder="최소" type="number" className="h-8 text-sm" />
                  <span className="text-slate-400 text-xs">~</span>
                  <Input value={fDepMax} onChange={(e) => setFDepMax(e.target.value)}
                    placeholder="최대" type="number" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">월세(만원)</Label>
                <div className="flex items-center gap-1">
                  <Input value={fMonMin} onChange={(e) => setFMonMin(e.target.value)}
                    placeholder="최소" type="number" className="h-8 text-sm" />
                  <span className="text-slate-400 text-xs">~</span>
                  <Input value={fMonMax} onChange={(e) => setFMonMax(e.target.value)}
                    placeholder="최대" type="number" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">계약면적(평)</Label>
                <div className="flex items-center gap-1">
                  <Input value={fLaMin} onChange={(e) => setFLaMin(e.target.value)}
                    placeholder="최소" type="number" step="0.1" className="h-8 text-sm" />
                  <span className="text-slate-400 text-xs">~</span>
                  <Input value={fLaMax} onChange={(e) => setFLaMax(e.target.value)}
                    placeholder="최대" type="number" step="0.1" className="h-8 text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 검색 결과 테이블 ─────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shadow-sm">
              <List className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">상가 매물장</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              총 {filtered.length}건
            </span>
          </div>
          <ExcelButtons
            filename="상가매물장"
            data={filtered as unknown as Record<string, unknown>[]}
            templateHeaders={SHOP_TEMPLATE_HEADERS}
            onImport={handleImport}
          />
        </div>

        {/* ─── 모바일 카드 뷰 (md 미만) ────────────────────── */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">등록된 매물이 없습니다.</p>
          ) : (
            filtered.map((item) => {
              const isEditing = editing?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors cursor-pointer active:bg-slate-100 ${isEditing ? 'bg-amber-50 border-l-4 border-amber-400' : 'hover:bg-slate-50/60'}`}
                  onClick={() => setDetailItem(item)}
                >
                  {/* 상단: 뱃지 + ID + 접수일 + 상세보기 힌트 */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeColor(item.type)}`}>
                        {item.type ?? '-'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">#{item.id}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{item.recv_date ?? '-'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                    </div>
                  </div>

                  {/* 상호 + 주소 */}
                  <div className="mb-2.5">
                    {item.brand && (
                      <p className="text-[11px] font-semibold text-indigo-600 mb-0.5">{item.brand}</p>
                    )}
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{item.addr ?? '-'}</p>
                  </div>

                  {/* 핵심 수치 3컬럼 */}
                  <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 rounded-lg overflow-hidden mb-2.5 border border-slate-100">
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">보증금(만)</p>
                      <p className="text-[12px] font-bold text-indigo-700">
                        {item.deposit ? item.deposit.toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">월세(만)</p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        {item.monthly ? item.monthly.toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">임대면적</p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        {item.area_lease_m2 ? `${item.area_lease_m2}㎡` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* 고객 정보 */}
                  {(item.client_name || item.client_phone) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
                      <User className="w-3 h-3 text-slate-300 shrink-0" />
                      <span>{item.client_name || '-'}</span>
                      {item.client_phone && (
                        <><span className="text-slate-300">·</span><span>{item.client_phone}</span></>
                      )}
                    </div>
                  )}

                  {/* 액션 버튼 (버블링 차단) */}
                  <div className="grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/analysis?address=${encodeURIComponent(item.addr ?? '')}`}
                      className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg py-1.5 hover:bg-emerald-100 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />입지분석
                    </Link>
                    <button
                      onClick={() => setEditing(isEditing ? null : item)}
                      className={`flex items-center justify-center gap-1 text-[11px] font-medium rounded-lg py-1.5 border transition-colors ${
                        isEditing
                          ? 'text-amber-700 bg-amber-100 border-amber-200'
                          : 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                      }`}
                    >
                      <Pencil className="w-3 h-3" />{isEditing ? '수정중' : '수정'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center justify-center gap-1 text-[11px] font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg py-1.5 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── 상가 상세보기 바텀시트 ────────────────────── */}
        <Sheet open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
          <SheetContent side="bottom" className="h-[82vh] flex flex-col rounded-t-2xl px-0 pb-safe" showCloseButton={false}>
            {/* 드래그 핸들 */}
            <div className="shrink-0 flex justify-center pt-3 pb-0.5">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            {detailItem && (
              <>
                {/* 헤더 */}
                <SheetHeader className="shrink-0 px-5 pb-4 pt-2 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeColor(detailItem.type)}`}>
                          {detailItem.type}
                        </span>
                        <span className="text-[11px] text-slate-400">#{detailItem.id} · {detailItem.recv_date}</span>
                      </div>
                      {detailItem.brand && (
                        <p className="text-[11px] font-semibold text-indigo-600 mb-0.5">{detailItem.brand}</p>
                      )}
                      <SheetTitle className="text-[15px] font-bold text-slate-800 leading-snug text-left">
                        {detailItem.addr}
                      </SheetTitle>
                    </div>
                    <button onClick={() => setDetailItem(null)} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </SheetHeader>

                {/* 스크롤 본문 */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                  {/* 기본정보 */}
                  <section>
                    <SH label="기본정보" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DR label="용도지역" value={detailItem.zoning} />
                      <DR label="준공연도" value={detailItem.built_year} />
                      <DR label="해당층" value={detailItem.floor_this} />
                      <DR label="전체층수" value={detailItem.floors_total} />
                      <DR label="연료" value={detailItem.fuel} />
                    </div>
                  </section>

                  {/* 면적 */}
                  <section>
                    <SH label="면적" color="text-sky-400" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DR label="임대면적" value={detailItem.area_lease_m2 != null ? `${detailItem.area_lease_m2} ㎡` : undefined} />
                      <DR label="임대면적(평)" value={detailItem.area_lease_py != null ? `${detailItem.area_lease_py} 평` : undefined} />
                      <DR label="전용면적" value={detailItem.area_net_m2 != null ? `${detailItem.area_net_m2} ㎡` : undefined} />
                      <DR label="전용면적(평)" value={detailItem.area_net_py != null ? `${detailItem.area_net_py} 평` : undefined} />
                    </div>
                  </section>

                  {/* 금액 */}
                  <section>
                    <SH label="금액 (단위: 만원)" color="text-indigo-400" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DR label="보증금" value={detailItem.deposit != null ? detailItem.deposit.toLocaleString() : undefined} />
                      <DR label="권리금" value={detailItem.premium != null ? detailItem.premium.toLocaleString() : undefined} />
                      <DR label="소계1(보증+권리)" value={detailItem.subtotal != null ? detailItem.subtotal.toLocaleString() : undefined} />
                      <DR label="월세" value={detailItem.monthly != null ? detailItem.monthly.toLocaleString() : undefined} />
                      <DR label="VAT" value={detailItem.vat != null ? detailItem.vat.toLocaleString() : undefined} />
                      <DR label="관리비" value={detailItem.mng_fee != null ? detailItem.mng_fee.toLocaleString() : undefined} />
                      <DR label="소계2(월세+VAT+관리)" value={detailItem.subtotal2 != null ? detailItem.subtotal2.toLocaleString() : undefined} />
                      <DR label="임대료/평" value={detailItem.rent_per_py != null ? `${fmtF(detailItem.rent_per_py)} 만/평` : undefined} />
                    </div>
                  </section>

                  {/* 고객정보 */}
                  <section>
                    <SH label="고객정보" color="text-emerald-500" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DR label="고객명" value={detailItem.client_name} />
                      <DR label="연락처" value={detailItem.client_phone} mono />
                      <DR label="통신사" value={detailItem.carrier} />
                    </div>
                    {detailItem.memo && (
                      <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">메모</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{detailItem.memo}</p>
                      </div>
                    )}
                  </section>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="shrink-0 px-5 py-3 pb-safe border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Link
                    href={`/analysis?address=${encodeURIComponent(detailItem.addr ?? '')}`}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl py-3 active:bg-emerald-100 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />입지분석
                  </Link>
                  <button
                    onClick={() => { setEditing(detailItem); setDetailItem(null); }}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl py-3 active:bg-indigo-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />수정하기
                  </button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ─── 데스크탑 테이블 뷰 (md 이상) ──────────────── */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="text-xs whitespace-nowrap">
            <TableHeader>
              {/* ── 그룹 헤더 행 ────────────────────────────── */}
              <TableRow>
                <TableHead colSpan={9} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500">
                  기본정보
                </TableHead>
                <TableHead colSpan={4} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-sky-100 text-sky-600 border-l-2 border-sky-200">
                  면적
                </TableHead>
                <TableHead colSpan={9} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-indigo-100 text-indigo-600 border-l-2 border-indigo-200">
                  금액
                </TableHead>
                <TableHead colSpan={4} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-600 border-l-2 border-emerald-200">
                  고객정보
                </TableHead>
                <TableHead className="sticky right-0 z-20 bg-slate-100 border-l border-slate-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]" />
              </TableRow>
              {/* ── 컬럼 헤더 행 ────────────────────────────── */}
              <TableRow>
                {/* 기본정보 */}
                <TableHead className="px-3 bg-slate-50 text-slate-600">ID</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">접수일</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">종류</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">상호</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600 min-w-[160px]">주소</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">건축년도</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">해당층</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">전체층</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">연료</TableHead>
                {/* 면적 */}
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right border-l-2 border-sky-200">계약면적(㎡)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">계약면적(평)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">실면적(㎡)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">실면적(평)</TableHead>
                {/* 금액 */}
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right border-l-2 border-indigo-200">보증금</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">권리금</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">소계1</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">월세</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">VAT</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">관리비</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">소계2</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">평당임대료</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">평당관리비</TableHead>
                {/* 고객정보 */}
                <TableHead className="px-3 bg-emerald-50 text-emerald-700 border-l-2 border-emerald-200">성명</TableHead>
                <TableHead className="px-3 bg-emerald-50 text-emerald-700">연락처</TableHead>
                <TableHead className="px-3 bg-emerald-50 text-emerald-700">통신사</TableHead>
                <TableHead className="px-3 bg-emerald-50 text-emerald-700">비고</TableHead>
                {/* 관리 - sticky */}
                <TableHead className="px-3 text-center sticky right-0 z-20 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={27} className="text-center text-slate-400 py-10">
                    등록된 매물이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const laPy = item.area_lease_py ?? (item.area_lease_m2 ? m2toPy(item.area_lease_m2) : null);
                  const naPy = item.area_net_py ?? (item.area_net_m2 ? m2toPy(item.area_net_m2) : null);
                  const sub1 = (item.subtotal ?? ((item.deposit ?? 0) + (item.premium ?? 0))) || null;
                  const sub2 = (item.subtotal2 ?? ((item.monthly ?? 0) + (item.vat ?? 0) + (item.mng_fee ?? 0))) || null;
                  const rpp = item.rent_per_py ?? (laPy && item.monthly ? Math.round(item.monthly / laPy) : null);
                  const mpp = item.mng_per_py ?? (laPy && item.mng_fee ? Math.round(item.mng_fee / laPy) : null);
                  const isEditing = editing?.id === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      className={isEditing ? 'group bg-amber-50 border-l-2 border-amber-400' : 'group hover:bg-slate-50'}
                    >
                      <TableCell className="px-3 text-slate-400">{item.id}</TableCell>
                      <TableCell className="px-3">{item.recv_date ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.type ?? '-'}</TableCell>
                      <TableCell className="px-3 font-medium">{item.brand ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.addr ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.built_year ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.floor_this ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.floors_total ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.area_lease_m2 != null ? fmtF(item.area_lease_m2) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{laPy != null ? fmtF(laPy) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.area_net_m2 != null ? fmtF(item.area_net_m2) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{naPy != null ? fmtF(naPy) : '-'}</TableCell>
                      <TableCell className="px-3">{item.fuel ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.deposit)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.premium)}</TableCell>
                      <TableCell className="px-3 text-right font-medium text-indigo-600">{fmt(sub1)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.monthly)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.vat)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.mng_fee)}</TableCell>
                      <TableCell className="px-3 text-right font-medium text-indigo-600">{fmt(sub2)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(rpp)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(mpp)}</TableCell>
                      <TableCell className="px-3">{item.client_name ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.client_phone ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.carrier ?? '-'}</TableCell>
                      <TableCell className="px-3 max-w-[120px] truncate text-slate-400">{item.memo ?? '-'}</TableCell>
                      <TableCell className={`px-3 sticky right-0 z-10 border-l border-slate-100 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] ${isEditing ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-center gap-1">
                          {/* 입지분석 바로가기 */}
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            asChild title="입지분석">
                            <Link href={`/analysis?address=${encodeURIComponent(item.addr ?? '')}`}>
                              <MapPin className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon"
                            className={`h-7 w-7 ${isEditing ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            onClick={() => setEditing(isEditing ? null : item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
