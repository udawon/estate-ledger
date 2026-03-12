'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Loader2, MapPin, ChevronDown, RotateCcw, Search, Plus, List, User, ChevronRight, X } from 'lucide-react';
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
import type { SaleListing } from '@/types/listings';

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
const CATEGORY_OPTIONS = ['단독', '다가구', '다세대(빌라)', '아파트', '오피스텔', '구분상가', '상가주택', '건물'] as const;
const ELEVATOR_OPTIONS = ['유', '무', '모름'] as const;
const CARRIER_OPTIONS = ['', 'SKT', 'KT', 'LG', '알뜰폰 SKT', '알뜰폰 KT', '알뜰폰 LG'] as const;
const TODAY = new Date().toISOString().slice(0, 10);

// ─── 엑셀 가져오기 — 템플릿 헤더 / 컬럼 매핑 ──────────────
const SALES_TEMPLATE_HEADERS = [
  '접수일', '구분', '도로명주소', '주소지', '경로', '용도지역',
  '해당층', '층(지하)', '층(지상)', '준공일',
  '자주식주차', '기계식주차', '승강기',
  '토지면적(㎡)', '건물면적(㎡)',
  '매가(만원)', '순투자(만원)', '보증금(만원)', '월세(만원)', '관리비(만원)',
  '고객명', '연락처', '통신사', '메모',
];

const SALES_COL_MAP: Record<string, string> = {
  '접수일': 'recv_date',
  '구분': 'category',
  '도로명주소': 'road_addr',
  '주소지': 'lot_addr',
  '경로': 'source',
  '용도지역': 'zoning',
  '해당층': 'floor_this',
  '층(지하)': 'floor_b',
  '층(지상)': 'floor_g',
  '준공일': 'built_date',
  '자주식주차': 'park_self',
  '기계식주차': 'park_mech',
  '승강기': 'elevator',
  '토지면적(㎡)': 'land_m2',
  '건물면적(㎡)': 'bldg_area',
  '매가(만원)': 'price',
  '순투자(만원)': 'net_invest',
  '보증금(만원)': 'deposit',
  '월세(만원)': 'monthly',
  '관리비(만원)': 'mng_fee',
  '고객명': 'client_name',
  '연락처': 'client_phone',
  '통신사': 'carrier',
  '메모': 'memo',
};

// ─── 폼 스키마 ──────────────────────────────────────────
const schema = z.object({
  recv_date:   z.string().min(1, '접수일을 입력하세요'),
  category:    z.string(),
  road_addr:   z.string().min(1, '도로명 주소를 입력하세요'),
  lot_addr:    z.string(),
  source:      z.string(),
  zoning:      z.string(),
  floor_this:  z.string(),
  floor_b:     z.string(),
  floor_g:     z.string(),
  built_date:  z.string(),
  park_self:   z.string(),
  park_mech:   z.string(),
  elevator:    z.string(),
  land_m2:     z.string(),
  bldg_area:   z.string(),
  price:       z.string(),
  net_invest:  z.string(),
  deposit:     z.string(),
  monthly:     z.string(),
  mng_fee:     z.string(),
  client_name:  z.string(),
  client_phone: z.string(),
  carrier:      z.string(),
  memo:         z.string(),
});
type FormValues = z.infer<typeof schema>;

// ─── 빈 폼 기본값 ──────────────────────────────────────
const EMPTY: FormValues = {
  recv_date: TODAY, category: '단독', road_addr: '', lot_addr: '',
  source: '', zoning: '', floor_this: '', floor_b: '0', floor_g: '0',
  built_date: TODAY, park_self: '0', park_mech: '0', elevator: '무',
  land_m2: '', bldg_area: '', price: '', net_invest: '',
  deposit: '', monthly: '', mng_fee: '',
  client_name: '', client_phone: '', carrier: '', memo: '',
};

// ─── 유틸 ───────────────────────────────────────────────
function toNum(v: string | null | undefined): number { return parseFloat(v ?? '') || 0; }
function toInt(v: string | null | undefined): number { return parseInt(v ?? '') || 0; }
function fmt(v: number | null | undefined): string {
  if (!v) return '-';
  return v.toLocaleString('ko-KR');
}
function fmtPy(v: number | null | undefined): string {
  if (!v) return '-';
  return v.toFixed(2);
}
function fmtPct(v: number | null | undefined): string {
  if (!v) return '-';
  return v.toFixed(2) + '%';
}
function m2toPy(m2: number): number { return m2 * 0.3025; }

// ─── 구분별 뱃지 색상 ────────────────────────────────
function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    '아파트':       'bg-blue-100 text-blue-700',
    '오피스텔':     'bg-violet-100 text-violet-700',
    '단독':         'bg-emerald-100 text-emerald-700',
    '다가구':       'bg-teal-100 text-teal-700',
    '다세대(빌라)': 'bg-cyan-100 text-cyan-700',
    '구분상가':     'bg-amber-100 text-amber-700',
    '상가주택':     'bg-orange-100 text-orange-700',
    '건물':         'bg-rose-100 text-rose-700',
    '근린상가':     'bg-amber-100 text-amber-700',
  };
  return map[cat] ?? 'bg-slate-100 text-slate-600';
}

// ─── 자동계산 ────────────────────────────────────────────
function calcAuto(f: FormValues) {
  const land_m2  = toNum(f.land_m2);
  const bldg_m2  = toNum(f.bldg_area);
  const price    = toInt(f.price);
  const monthly  = toInt(f.monthly);
  const mng_fee  = toInt(f.mng_fee);
  const deposit  = toInt(f.deposit);

  const land_py     = m2toPy(land_m2);
  const bldg_py     = m2toPy(bldg_m2);
  const price_per_py = land_py > 0 ? Math.round(price / land_py) : 0;
  const subtotal    = monthly + mng_fee;
  const base        = price - deposit;
  const yield_cur   = base > 0 ? (subtotal * 12.0 / base) * 100 : 0;

  return { land_py, bldg_py, price_per_py, subtotal, yield_cur };
}

// ─── listing → form 변환 ───────────────────────────────
function listingToForm(s: SaleListing): FormValues {
  return {
    recv_date:   s.recv_date ?? TODAY,
    category:    s.category ?? '단독',
    road_addr:   s.road_addr ?? '',
    lot_addr:    s.lot_addr ?? '',
    source:      s.source ?? '',
    zoning:      s.zoning ?? '',
    floor_this:  s.floor_this ?? '',
    floor_b:     s.floor_b ?? '0',
    floor_g:     s.floor_g ?? '0',
    built_date:  s.built_date ?? TODAY,
    park_self:   String(s.park_self ?? 0),
    park_mech:   String(s.park_mech ?? 0),
    elevator:    s.elevator ?? '무',
    land_m2:     s.land_m2 != null ? String(s.land_m2) : '',
    bldg_area:   s.bldg_area != null ? String(s.bldg_area) : '',
    price:       s.price != null ? String(s.price) : '',
    net_invest:  s.net_invest != null ? String(s.net_invest) : '',
    deposit:     s.deposit != null ? String(s.deposit) : '',
    monthly:     s.monthly != null ? String(s.monthly) : '',
    mng_fee:     s.mng_fee != null ? String(s.mng_fee) : '',
    client_name:  s.client_name ?? '',
    client_phone: s.client_phone ?? '',
    carrier:      s.carrier ?? '',
    memo:         s.memo ?? '',
  };
}

// ─── Props ─────────────────────────────────────────────
interface Props { initialData: SaleListing[]; }

export function SalesTable({ initialData }: Props) {
  const [data, setData] = useState<SaleListing[]>(initialData);
  const [editing, setEditing] = useState<SaleListing | null>(null);
  const [detailItem, setDetailItem] = useState<SaleListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen]     = useState(false);

  // ── 필터 상태 ──────────────────────────────────────────
  const [fSearch, setFSearch]     = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fPriceMin, setFPriceMin] = useState('');
  const [fPriceMax, setFPriceMax] = useState('');
  const [fDepMin, setFDepMin]     = useState('');
  const [fDepMax, setFDepMax]     = useState('');
  const [fMonMin, setFMonMin]     = useState('');
  const [fMonMax, setFMonMax]     = useState('');
  const [fLandMin, setFLandMin]   = useState('');
  const [fLandMax, setFLandMax]   = useState('');
  const [fBldgMin, setFBldgMin]   = useState('');
  const [fBldgMax, setFBldgMax]   = useState('');

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
    else { reset(EMPTY); }
  }, [editing, reset]);

  // ── 데이터 로드 ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    const res = await fetch('/api/listings/sales');
    const json = await res.json();
    if (json.success) setData(json.data);
  }, []);

  // 마운트 시 세션 scope에 맞는 데이터 로드 (SSR initialData는 scope가 다를 수 있음)
  useEffect(() => { loadData(); }, [loadData]);

  // ── 엑셀/CSV 가져오기 ──────────────────────────────────
  const handleImport = useCallback(async (rows: Record<string, unknown>[]) => {
    let ok = 0, fail = 0;
    for (const row of rows) {
      // 한글 헤더 → 영문 필드 변환
      const m: Record<string, unknown> = {};
      for (const [kor, eng] of Object.entries(SALES_COL_MAP)) {
        if (row[kor] !== undefined) m[eng] = row[kor];
      }
      // 숫자 필드 파싱
      const land_m2   = parseFloat(String(m.land_m2 ?? '')) || 0;
      const bldg_area = parseFloat(String(m.bldg_area ?? '')) || 0;
      const price     = parseInt(String(m.price ?? '')) || 0;
      const net_invest = parseInt(String(m.net_invest ?? '')) || 0;
      const deposit   = parseInt(String(m.deposit ?? '')) || 0;
      const monthly   = parseInt(String(m.monthly ?? '')) || 0;
      const mng_fee   = parseInt(String(m.mng_fee ?? '')) || 0;
      // 자동계산
      const land_py     = land_m2 * 0.3025;
      const price_per_py = land_py > 0 ? Math.round(price / land_py) : 0;
      const subtotal    = monthly + mng_fee;
      const base        = price - deposit;
      const yield_cur   = base > 0 ? (subtotal * 12.0 / base) * 100 : 0;

      const payload = {
        recv_date:    String(m.recv_date ?? ''),
        category:     String(m.category ?? ''),
        road_addr:    String(m.road_addr ?? ''),
        lot_addr:     String(m.lot_addr ?? ''),
        source:       String(m.source ?? ''),
        zoning:       String(m.zoning ?? ''),
        floor_this:   String(m.floor_this ?? ''),
        floor_b:      String(m.floor_b ?? '0'),
        floor_g:      String(m.floor_g ?? '0'),
        built_year:   null,
        built_date:   String(m.built_date ?? ''),
        park_self:    parseInt(String(m.park_self ?? '')) || 0,
        park_mech:    parseInt(String(m.park_mech ?? '')) || 0,
        elevator:     String(m.elevator ?? ''),
        land_m2:      land_m2 || null,
        land_py:      land_py || null,
        bldg_area:    bldg_area || null,
        price:        price || null,
        price_per_py: price_per_py || null,
        net_invest:   net_invest || null,
        deposit:      deposit || null,
        subtotal:     subtotal || null,
        monthly:      monthly || null,
        mng_fee:      mng_fee || null,
        yield_cur:    yield_cur || null,
        client_name:  String(m.client_name ?? ''),
        client_phone: String(m.client_phone ?? ''),
        carrier:      String(m.carrier ?? ''),
        memo:         String(m.memo ?? ''),
      };
      try {
        const res = await fetch('/api/listings/sales', {
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
      const payload = {
        recv_date:  values.recv_date,
        category:   values.category,
        road_addr:  values.road_addr,
        lot_addr:   values.lot_addr,
        source:     values.source,
        zoning:     values.zoning,
        floor_this: values.floor_this,
        floor_b:    values.floor_b,
        floor_g:    values.floor_g,
        built_year: null,
        built_date: values.built_date,
        park_self:  toInt(values.park_self),
        park_mech:  toInt(values.park_mech),
        elevator:   values.elevator,
        land_m2:    toNum(values.land_m2) || null,
        land_py:    auto.land_py || null,
        bldg_area:  toNum(values.bldg_area) || null,
        price:      toInt(values.price) || null,
        price_per_py: auto.price_per_py || null,
        net_invest: toInt(values.net_invest) || null,
        deposit:    toInt(values.deposit) || null,
        subtotal:   auto.subtotal || null,
        monthly:    toInt(values.monthly) || null,
        mng_fee:    toInt(values.mng_fee) || null,
        yield_cur:  auto.yield_cur || null,
        client_name:  values.client_name,
        client_phone: values.client_phone,
        carrier:      values.carrier,
        memo:         values.memo,
      };

      if (editing) {
        await fetch(`/api/listings/sales/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setEditing(null);
      } else {
        await fetch('/api/listings/sales', {
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
  }, [editing, auto, loadData, reset]);

  // ── 삭제 ────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(`ID ${id} 항목을 삭제하시겠습니까?`)) return;
    await fetch(`/api/listings/sales/${id}`, { method: 'DELETE' });
    if (editing?.id === id) setEditing(null);
    await loadData();
  }, [editing, loadData]);

  // ── 클라이언트 필터 ─────────────────────────────────────
  const filtered = data.filter((item) => {
    const q = fSearch.toLowerCase();
    if (q && !(
      item.road_addr?.toLowerCase().includes(q) ||
      item.lot_addr?.toLowerCase().includes(q) ||
      item.client_name?.toLowerCase().includes(q) ||
      item.client_phone?.includes(q)
    )) return false;
    if (fCategory && item.category !== fCategory) return false;
    if (fPriceMin && (item.price ?? 0) < toInt(fPriceMin)) return false;
    if (fPriceMax && (item.price ?? 0) > toInt(fPriceMax)) return false;
    if (fDepMin && (item.deposit ?? 0) < toInt(fDepMin)) return false;
    if (fDepMax && (item.deposit ?? 0) > toInt(fDepMax)) return false;
    if (fMonMin && (item.monthly ?? 0) < toInt(fMonMin)) return false;
    if (fMonMax && (item.monthly ?? 0) > toInt(fMonMax)) return false;
    const lpy = item.land_py ?? (item.land_m2 ? m2toPy(item.land_m2) : 0);
    if (fLandMin && lpy < toNum(fLandMin)) return false;
    if (fLandMax && lpy > toNum(fLandMax)) return false;
    const bpy = item.bldg_area ? m2toPy(item.bldg_area) : 0;
    if (fBldgMin && bpy < toNum(fBldgMin)) return false;
    if (fBldgMax && bpy > toNum(fBldgMax)) return false;
    return true;
  });

  const resetFilters = () => {
    setFSearch(''); setFCategory('');
    setFPriceMin(''); setFPriceMax('');
    setFDepMin(''); setFDepMax('');
    setFMonMin(''); setFMonMax('');
    setFLandMin(''); setFLandMax('');
    setFBldgMin(''); setFBldgMax('');
  };

  // ── 읽기 전용 자동계산 입력 ────────────────────────────
  const AutoField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <Label className="text-xs text-slate-500 block mb-1.5">{label}</Label>
      <Input value={value} readOnly className="bg-slate-50 text-slate-400 cursor-not-allowed text-base sm:text-sm" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ─── 등록/수정 폼 ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div
          className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer select-none hover:bg-indigo-50/60 transition-colors group"
          onClick={() => setFormOpen(!formOpen)}
        >
          <div className="flex items-center gap-3">
            {/* 신규/수정 상태에 따라 아이콘 색상 분기 */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
              editing ? 'bg-amber-500' : 'bg-indigo-500'
            }`}>
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
              {editing
                ? <><span className="text-amber-600">ID {editing.id} 수정 중</span></>
                : '신규 매물 등록'}
            </span>
            {/* 닫혀 있을 때 힌트 텍스트 */}
            {!formOpen && (
              <span className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                클릭하여 열기
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {editing && (
              <Button
                variant="ghost" size="sm"
                onClick={(e) => { e.stopPropagation(); setEditing(null); }}
                className="text-slate-500 text-xs h-7"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> 신규 모드로
              </Button>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${formOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {formOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-5">
          {/* 4컬럼 폼 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">

            {/* ── 컬럼 1: 기본 정보 ────────────────────────── */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">수정할 ID (비우면 신규)</Label>
                <Input
                  value={editing ? String(editing.id) : ''}
                  readOnly
                  placeholder="편집 시 자동 입력"
                  className="bg-slate-50 text-slate-400 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">접수일 <span className="text-red-400">*</span></Label>
                <Input type="date" {...register('recv_date')} className="text-base sm:text-sm" />
                {errors.recv_date && <p className="text-xs text-red-500 mt-0.5">{errors.recv_date.message}</p>}
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">구분</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-base sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">도로명 주소 <span className="text-red-400">*</span></Label>
                <Input {...register('road_addr')} placeholder="서울시 강남구..." className="text-base sm:text-sm" />
                {errors.road_addr && <p className="text-xs text-red-500 mt-0.5">{errors.road_addr.message}</p>}
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">주소지</Label>
                <Input {...register('lot_addr')} className="text-base sm:text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">방문경로</Label>
                <Input {...register('source')} className="text-base sm:text-sm" />
              </div>
            </div>

            {/* ── 컬럼 2: 건물 정보 ────────────────────────── */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">용도지역</Label>
                <Input {...register('zoning')} placeholder="2종일반, 준주거..." className="text-base sm:text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">해당층</Label>
                <Input {...register('floor_this')} placeholder="예: 3층" className="text-base sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">층(지하)</Label>
                  <Input type="number" {...register('floor_b')} className="text-base sm:text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">층(지상)</Label>
                  <Input type="number" {...register('floor_g')} className="text-base sm:text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">건축년월일</Label>
                <Input type="date" {...register('built_date')} className="text-base sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">주차(자주)</Label>
                  <Input type="number" {...register('park_self')} className="text-base sm:text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">주차(기계)</Label>
                  <Input type="number" {...register('park_mech')} className="text-base sm:text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">엘레베이터</Label>
                <Controller
                  name="elevator"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-base sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELEVATOR_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* ── 컬럼 3: 면적 정보 ────────────────────────── */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">토지(㎡)</Label>
                <Input type="number" step="0.01" {...register('land_m2')} className="text-base sm:text-sm" />
              </div>
              <AutoField label="토지(평) (자동)" value={auto.land_py > 0 ? auto.land_py.toFixed(4) : '0.00'} />
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">건물(㎡)</Label>
                <Input type="number" step="0.01" {...register('bldg_area')} className="text-base sm:text-sm" />
              </div>
              <AutoField label="건물(평) (자동)" value={auto.bldg_py > 0 ? auto.bldg_py.toFixed(4) : '0.00'} />
            </div>

            {/* ── 컬럼 4: 금액 정보 ────────────────────────── */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">매가 (만원)</Label>
                <Input type="number" {...register('price')} className="text-base sm:text-sm" />
              </div>
              <AutoField label="평당매매가 (자동: 매가/토지평)" value={auto.price_per_py > 0 ? fmt(auto.price_per_py) : '0'} />
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">순투자금 (만원)</Label>
                <Input type="number" {...register('net_invest')} className="text-base sm:text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">보증금 (만원)</Label>
                <Input type="number" {...register('deposit')} className="text-base sm:text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">월세 (만원)</Label>
                <Input type="number" {...register('monthly')} className="text-base sm:text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">관리비 (만원)</Label>
                <Input type="number" {...register('mng_fee')} className="text-base sm:text-sm" />
              </div>
              <AutoField label="소계 (자동: 월세+관리비)" value={auto.subtotal > 0 ? fmt(auto.subtotal) : '0'} />
              <AutoField label="현 수익율 (자동, %)" value={auto.yield_cur > 0 ? auto.yield_cur.toFixed(2) + '%' : '0.00%'} />
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-3">고객 정보</p>
            <div className="grid grid-cols-2 gap-3">
              {/* 왼쪽 절반: 성명 / 연락처 / 통신사 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">성명</Label>
                  <Input {...register('client_name')} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">연락처</Label>
                  <Input {...register('client_phone')} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">통신사</Label>
                  <Controller
                    name="carrier"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || '_none'}
                        onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                      >
                        <SelectTrigger className="text-base sm:text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>
                          {CARRIER_OPTIONS.map((o) => (
                            <SelectItem key={o || '_none'} value={o || '_none'}>{o || '선택 없음'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              {/* 오른쪽 절반: 비고 */}
              <div>
                <Label className="text-xs text-slate-500 block mb-1.5">비고(매매)</Label>
                <Textarea {...register('memo')} rows={2} className="text-base sm:text-sm resize-none" />
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-400 text-white gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? '매매 수정 적용' : '매매 신규 등록'}
            </Button>
            {editing && (
              <>
                <Button type="button" variant="outline" onClick={() => { setEditing(null); reset(EMPTY); }}>
                  취소
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDelete(editing.id)}
                >
                  매매 삭제
                </Button>
              </>
            )}
          </div>
        </form>
        )}
      </div>

      {/* ─── 필터 ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setFilterOpen((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 hover:bg-violet-50/60 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-500 flex items-center justify-center shadow-sm">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">검색 필터</span>
            {(fSearch || fCategory || fPriceMin || fPriceMax || fDepMin || fDepMax || fMonMin || fMonMax || fLandMin || fLandMax || fBldgMin || fBldgMax) && (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                필터 적용 중
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterOpen && (
          <div className="px-5 pb-4 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 mt-4">
              {/* 컬럼 1 */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">이름/전화/주소 포함</Label>
                  <Input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="검색어..." className="text-base sm:text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 block mb-1.5">구분</Label>
                  <Select value={fCategory || '_all'} onValueChange={(v) => setFCategory(v === '_all' ? '' : v)}>
                    <SelectTrigger className="text-base sm:text-sm"><SelectValue placeholder="전체" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">전체</SelectItem>
                      {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 컬럼 2 */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">매가 이상</Label>
                    <Input type="number" value={fPriceMin} onChange={(e) => setFPriceMin(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">매가 이하</Label>
                    <Input type="number" value={fPriceMax} onChange={(e) => setFPriceMax(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">보증금 이상</Label>
                    <Input type="number" value={fDepMin} onChange={(e) => setFDepMin(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">보증금 이하</Label>
                    <Input type="number" value={fDepMax} onChange={(e) => setFDepMax(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">월세 이상</Label>
                    <Input type="number" value={fMonMin} onChange={(e) => setFMonMin(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">월세 이하</Label>
                    <Input type="number" value={fMonMax} onChange={(e) => setFMonMax(e.target.value)} placeholder="0" className="text-base sm:text-sm" />
                  </div>
                </div>
              </div>
              {/* 컬럼 3 */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">토지(평) 이상</Label>
                    <Input type="number" step="0.01" value={fLandMin} onChange={(e) => setFLandMin(e.target.value)} placeholder="0.00" className="text-base sm:text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">토지(평) 이하</Label>
                    <Input type="number" step="0.01" value={fLandMax} onChange={(e) => setFLandMax(e.target.value)} placeholder="0.00" className="text-base sm:text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">건물(평) 이상</Label>
                    <Input type="number" step="0.01" value={fBldgMin} onChange={(e) => setFBldgMin(e.target.value)} placeholder="0.00" className="text-base sm:text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1.5">건물(평) 이하</Label>
                    <Input type="number" step="0.01" value={fBldgMax} onChange={(e) => setFBldgMax(e.target.value)} placeholder="0.00" className="text-base sm:text-sm" />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="gap-1 text-xs">
                    <RotateCcw className="w-3 h-3" /> 필터 초기화
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 검색 결과 ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shadow-sm">
              <List className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">매매 매물장</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              총 {filtered.length}건
            </span>
          </div>
          <ExcelButtons
            filename="매매매물장"
            data={filtered as unknown as Record<string, unknown>[]}
            templateHeaders={SALES_TEMPLATE_HEADERS}
            onImport={handleImport}
          />
        </div>

        {/* ─── 모바일 카드 뷰 (md 미만) ────────────────────── */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">등록된 매물이 없습니다.</p>
          ) : (
            filtered.map((item) => {
              const lpy = item.land_py ?? (item.land_m2 ? m2toPy(item.land_m2) : null);
              const ppp = item.price_per_py ?? (item.price && lpy ? Math.round(item.price / lpy) : null);
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
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
                        {item.category ?? '-'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">#{item.id}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{item.recv_date ?? '-'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                    </div>
                  </div>

                  {/* 주소 */}
                  <div className="mb-2.5">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{item.road_addr ?? '-'}</p>
                    {item.lot_addr && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.lot_addr}</p>
                    )}
                  </div>

                  {/* 핵심 수치 3컬럼 */}
                  <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 rounded-lg overflow-hidden mb-2.5 border border-slate-100">
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">매가(만)</p>
                      <p className="text-[12px] font-bold text-indigo-700">
                        {item.price ? item.price.toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">평당(만)</p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        {ppp ? ppp.toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="px-2.5 py-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">건물</p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        {item.bldg_area ? `${item.bldg_area}㎡` : '-'}
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
                      href={`/analysis?address=${encodeURIComponent(item.road_addr ?? item.lot_addr ?? '')}`}
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

        {/* ─── 매매 상세보기 바텀시트 ────────────────────── */}
        <Sheet open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
          <SheetContent side="bottom" className="h-[82vh] flex flex-col rounded-t-2xl px-0 pb-safe" showCloseButton={false}>
            {/* 드래그 핸들 */}
            <div className="shrink-0 flex justify-center pt-3 pb-0.5">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            {detailItem && (() => {
              const lpy = detailItem.land_py ?? (detailItem.land_m2 ? m2toPy(detailItem.land_m2) : null);
              const ppp = detailItem.price_per_py ?? (detailItem.price && lpy ? Math.round(detailItem.price / lpy) : null);
              return (
                <>
                  {/* 헤더 */}
                  <SheetHeader className="shrink-0 px-5 pb-4 pt-2 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${categoryColor(detailItem.category)}`}>
                            {detailItem.category}
                          </span>
                          <span className="text-[11px] text-slate-400">#{detailItem.id} · {detailItem.recv_date}</span>
                        </div>
                        <SheetTitle className="text-[15px] font-bold text-slate-800 leading-snug text-left">
                          {detailItem.road_addr}
                        </SheetTitle>
                        {detailItem.lot_addr && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{detailItem.lot_addr}</p>
                        )}
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
                        <DR label="경로" value={detailItem.source} />
                        <DR label="용도지역" value={detailItem.zoning} />
                        <DR label="해당층" value={detailItem.floor_this} />
                        <DR label="지하/지상" value={`B${detailItem.floor_b ?? 0} / ${detailItem.floor_g ?? 0}F`} />
                        <DR label="준공일" value={detailItem.built_date} />
                        <DR label="승강기" value={detailItem.elevator} />
                        <DR label="자주식주차" value={detailItem.park_self != null ? `${detailItem.park_self}대` : undefined} />
                        <DR label="기계식주차" value={detailItem.park_mech != null ? `${detailItem.park_mech}대` : undefined} />
                      </div>
                    </section>

                    {/* 면적 */}
                    <section>
                      <SH label="면적" color="text-sky-400" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <DR label="토지면적" value={detailItem.land_m2 != null ? `${detailItem.land_m2} ㎡` : undefined} />
                        <DR label="토지(평)" value={lpy != null ? `${fmtPy(lpy)} 평` : undefined} />
                        <DR label="건물면적" value={detailItem.bldg_area != null ? `${detailItem.bldg_area} ㎡` : undefined} />
                      </div>
                    </section>

                    {/* 금액 */}
                    <section>
                      <SH label="금액 (단위: 만원)" color="text-indigo-400" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <DR label="매가" value={detailItem.price != null ? detailItem.price.toLocaleString() : undefined} />
                        <DR label="평당매매가" value={ppp != null ? ppp.toLocaleString() : undefined} />
                        <DR label="순투자" value={detailItem.net_invest != null ? detailItem.net_invest.toLocaleString() : undefined} />
                        <DR label="보증금" value={detailItem.deposit != null ? detailItem.deposit.toLocaleString() : undefined} />
                        <DR label="월세" value={detailItem.monthly != null ? detailItem.monthly.toLocaleString() : undefined} />
                        <DR label="관리비" value={detailItem.mng_fee != null ? detailItem.mng_fee.toLocaleString() : undefined} />
                        <DR label="소계" value={detailItem.subtotal != null ? detailItem.subtotal.toLocaleString() : undefined} />
                        <DR label="현재수익률" value={detailItem.yield_cur != null ? fmtPct(detailItem.yield_cur) : undefined} />
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
                      href={`/analysis?address=${encodeURIComponent(detailItem.road_addr ?? '')}`}
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
              );
            })()}
          </SheetContent>
        </Sheet>

        {/* ─── 데스크탑 테이블 뷰 (md 이상) ──────────────── */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="text-xs whitespace-nowrap">
            <TableHeader>
              {/* ── 그룹 헤더 행 ────────────────────────────── */}
              <TableRow>
                <TableHead colSpan={14} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500">
                  기본정보
                </TableHead>
                <TableHead colSpan={4} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-sky-100 text-sky-600 border-l-2 border-sky-200">
                  면적
                </TableHead>
                <TableHead colSpan={8} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-indigo-100 text-indigo-600 border-l-2 border-indigo-200">
                  금액
                </TableHead>
                <TableHead colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-600 border-l-2 border-emerald-200">
                  고객정보
                </TableHead>
                <TableHead className="sticky right-0 z-20 bg-slate-100 border-l border-slate-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]" />
              </TableRow>
              {/* ── 컬럼 헤더 행 ────────────────────────────── */}
              <TableRow>
                {/* 기본정보 */}
                <TableHead className="px-3 bg-slate-50 text-slate-600">ID</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">접수일</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">구분</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600 min-w-[160px]">도로명 주소</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600 min-w-[120px]">주소지</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">방문경로</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">용도지역</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">해당층</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">층(지하)</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">층(지상)</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">건축년월일</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">주차(자주)</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">주차(기계)</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">엘레베이터</TableHead>
                {/* 면적 */}
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right border-l-2 border-sky-200">토지(㎡)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">토지(평)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">건물(㎡)</TableHead>
                <TableHead className="px-3 bg-sky-50 text-sky-700 text-right">건물(평)</TableHead>
                {/* 금액 */}
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right border-l-2 border-indigo-200">매가</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">평당매매가</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">순투자금</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">보증금</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">소계</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">월세</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">관리비</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">현수익율</TableHead>
                {/* 고객정보 */}
                <TableHead className="px-3 bg-emerald-50 text-emerald-700 border-l-2 border-emerald-200">성명</TableHead>
                <TableHead className="px-3 bg-emerald-50 text-emerald-700">연락처</TableHead>
                <TableHead className="px-3 bg-emerald-50 text-emerald-700">비고</TableHead>
                {/* 관리 - sticky */}
                <TableHead className="px-3 text-center sticky right-0 z-20 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={30} className="text-center text-slate-400 py-10">
                    등록된 매물이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const lpy = item.land_py ?? (item.land_m2 ? m2toPy(item.land_m2) : null);
                  const bpy = item.bldg_area ? m2toPy(item.bldg_area) : null;
                  const ppp = item.price_per_py ?? (item.price && lpy ? Math.round(item.price / lpy) : null);
                  const sub = (item.subtotal ?? ((item.monthly ?? 0) + (item.mng_fee ?? 0))) || null;
                  const yld = item.yield_cur;
                  const isEditing = editing?.id === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      className={isEditing ? 'group bg-amber-50 border-l-2 border-amber-400' : 'group hover:bg-slate-50'}
                    >
                      <TableCell className="px-3 text-slate-400">{item.id}</TableCell>
                      <TableCell className="px-3">{item.recv_date ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.category ?? '-'}</TableCell>
                      <TableCell className="px-3 font-medium">{item.road_addr ?? '-'}</TableCell>
                      <TableCell className="px-3 text-slate-500">{item.lot_addr ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.source ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.zoning ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.floor_this ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.floor_b ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.floor_g ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.built_date ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.park_self ?? 0}</TableCell>
                      <TableCell className="px-3 text-right">{item.park_mech ?? 0}</TableCell>
                      <TableCell className="px-3">{item.elevator ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.land_m2 != null ? item.land_m2.toFixed(2) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{lpy ? fmtPy(lpy) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{item.bldg_area != null ? item.bldg_area.toFixed(2) : '-'}</TableCell>
                      <TableCell className="px-3 text-right">{bpy ? fmtPy(bpy) : '-'}</TableCell>
                      <TableCell className="px-3 text-right font-semibold text-indigo-700">{fmt(item.price)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(ppp)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.net_invest)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.deposit)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(sub)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.monthly)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.mng_fee)}</TableCell>
                      <TableCell className="px-3 text-right">{fmtPct(yld)}</TableCell>
                      <TableCell className="px-3">{item.client_name ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.client_phone ?? '-'}</TableCell>
                      <TableCell className="px-3 max-w-[100px] truncate text-slate-400">{item.memo ?? '-'}</TableCell>
                      <TableCell className={`px-3 sticky right-0 z-10 border-l border-slate-100 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] ${isEditing ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            asChild title="입지분석"
                          >
                            <Link href={`/analysis?address=${encodeURIComponent(item.road_addr ?? item.lot_addr ?? '')}`}>
                              <MapPin className="w-3 h-3" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={`h-6 w-6 ${isEditing ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            onClick={() => setEditing(isEditing ? null : item)}
                            title="수정"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(item.id)}
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
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

