'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Pencil, Trash2, Loader2, MapPin, ChevronDown,
  RotateCcw, Search, Plus, List,
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
import type { RentalListing } from '@/types/listings';

// ─── 상수 ──────────────────────────────────────────────
const CATEGORY_OPTIONS = ['월세', '전세'] as const;
const BUILDING_OPTIONS = ['단독', '다가구', '다세대(빌라)', '아파트', '오피스텔'] as const;
const MOVE_IN_OPTIONS  = ['입주가능', '거주중', '공실'] as const;
const CARRIER_OPTIONS  = ['', 'SKT', 'KT', 'LG', '알뜰폰 SKT', '알뜰폰 KT', '알뜰폰 LG'] as const;
const TODAY = new Date().toISOString().slice(0, 10);

// ─── 엑셀 가져오기 — 템플릿 헤더 / 컬럼 매핑 ──────────────
const RENTAL_TEMPLATE_HEADERS = [
  '접수일', '구분', '건물구분', '주소', '호수', '비밀번호',
  '계약일', '입주일', '확인일',
  '보증금(만원)', '월세(만원)', '관리비(만원)',
  '임대인', '임차인', '입주상태',
  '고객명', '연락처', '통신사', '메모',
];

const RENTAL_COL_MAP: Record<string, string> = {
  '접수일': 'recv_date',
  '구분': 'category',
  '건물구분': 'building',
  '주소': 'addr',
  '호수': 'unit_no',
  '비밀번호': 'door_pw',
  '계약일': 'contract_date',
  '입주일': 'move_in_date',
  '확인일': 'confirm_date',
  '보증금(만원)': 'deposit',
  '월세(만원)': 'monthly',
  '관리비(만원)': 'mng_fee',
  '임대인': 'lessor',
  '임차인': 'lessee',
  '입주상태': 'move_in',
  '고객명': 'client_name',
  '연락처': 'client_phone',
  '통신사': 'carrier',
  '메모': 'memo',
};

// ─── 폼 스키마 ──────────────────────────────────────────
const schema = z.object({
  recv_date:     z.string().min(1, '접수일을 입력하세요'),
  category:      z.string(),
  building:      z.string(),
  addr:          z.string().min(1, '주소를 입력하세요'),
  unit_no:       z.string(),
  door_pw:       z.string(),
  contract_date: z.string(),
  move_in_date:  z.string(),
  confirm_date:  z.string(),
  deposit:       z.string(),
  monthly:       z.string(),
  mng_fee:       z.string(),
  lessor:        z.string(),
  lessee:        z.string(),
  move_in:       z.string(),
  client_name:   z.string(),
  client_phone:  z.string(),
  carrier:       z.string(),
  memo:          z.string(),
});
type FormValues = z.infer<typeof schema>;

// ─── 빈 폼 기본값 ──────────────────────────────────────
const EMPTY: FormValues = {
  recv_date: TODAY, category: '월세', building: '', addr: '',
  unit_no: '', door_pw: '',
  contract_date: '', move_in_date: '', confirm_date: '',
  deposit: '', monthly: '', mng_fee: '',
  lessor: '', lessee: '', move_in: '',
  client_name: '', client_phone: '', carrier: '', memo: '',
};

// ─── 유틸 ───────────────────────────────────────────────
function toInt(v: string | null | undefined): number { return parseInt(v ?? '') || 0; }
function fmt(v: number | null | undefined): string {
  if (v == null || v === 0) return '-';
  return v.toLocaleString('ko-KR');
}

// ─── listing → form 변환 ───────────────────────────────
function listingToForm(s: RentalListing): FormValues {
  return {
    recv_date:     s.recv_date ?? TODAY,
    category:      s.category ?? '월세',
    building:      s.building ?? '',
    addr:          s.addr ?? '',
    unit_no:       s.unit_no ?? '',
    door_pw:       s.door_pw ?? '',
    contract_date: s.contract_date ?? '',
    move_in_date:  s.move_in_date ?? '',
    confirm_date:  s.confirm_date ?? '',
    deposit:       s.deposit != null ? String(s.deposit) : '',
    monthly:       s.monthly != null ? String(s.monthly) : '',
    mng_fee:       s.mng_fee != null ? String(s.mng_fee) : '',
    lessor:        s.lessor ?? '',
    lessee:        s.lessee ?? '',
    move_in:       s.move_in ?? '',
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
interface Props { initialData: RentalListing[]; }

export function RentalTable({ initialData }: Props) {
  const [data, setData]       = useState<RentalListing[]>(initialData);
  const [editing, setEditing] = useState<RentalListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen]     = useState(false);

  // ── 필터 상태 ──────────────────────────────────────────
  const [fSearch, setFSearch]     = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fBuilding, setFBuilding] = useState('');
  const [fDepMin, setFDepMin]     = useState('');
  const [fDepMax, setFDepMax]     = useState('');
  const [fMonMin, setFMonMin]     = useState('');
  const [fMonMax, setFMonMax]     = useState('');

  // ── 폼 ──────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const fv = watch();
  const subtotal = (toInt(fv.monthly) + toInt(fv.mng_fee)) || 0;

  // 수정 선택 시 폼 채우기 + 폼 자동 열기
  useEffect(() => {
    if (editing) { reset(listingToForm(editing)); setFormOpen(true); }
    else reset(EMPTY);
  }, [editing, reset]);

  // ── 데이터 로드 ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    const res = await fetch('/api/listings/rentals');
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
      for (const [kor, eng] of Object.entries(RENTAL_COL_MAP)) {
        if (row[kor] !== undefined) m[eng] = row[kor];
      }
      const payload = {
        recv_date:     String(m.recv_date ?? ''),
        category:      String(m.category ?? ''),
        building:      String(m.building ?? ''),
        addr:          String(m.addr ?? ''),
        unit_no:       String(m.unit_no ?? ''),
        door_pw:       String(m.door_pw ?? ''),
        contract_date: String(m.contract_date ?? ''),
        move_in_date:  String(m.move_in_date ?? ''),
        confirm_date:  String(m.confirm_date ?? ''),
        deposit:       parseInt(String(m.deposit ?? '')) || null,
        monthly:       parseInt(String(m.monthly ?? '')) || null,
        mng_fee:       parseInt(String(m.mng_fee ?? '')) || null,
        lessor:        String(m.lessor ?? ''),
        lessee:        String(m.lessee ?? ''),
        move_in:       String(m.move_in ?? ''),
        client_name:   String(m.client_name ?? ''),
        client_phone:  String(m.client_phone ?? ''),
        carrier:       String(m.carrier ?? ''),
        memo:          String(m.memo ?? ''),
      };
      try {
        const res = await fetch('/api/listings/rentals', {
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
      const mon = toInt(values.monthly);
      const mng = toInt(values.mng_fee);
      const payload = {
        recv_date:     values.recv_date,
        category:      values.category,
        building:      values.building,
        addr:          values.addr,
        unit_no:       values.unit_no,
        door_pw:       values.door_pw,
        contract_date: values.contract_date,
        move_in_date:  values.move_in_date,
        confirm_date:  values.confirm_date,
        deposit:       toInt(values.deposit) || null,
        monthly:       mon || null,
        mng_fee:       mng || null,
        lessor:        values.lessor,
        lessee:        values.lessee,
        move_in:       values.move_in,
        client_name:   values.client_name,
        client_phone:  values.client_phone,
        carrier:       values.carrier,
        memo:          values.memo,
      };

      if (editing) {
        await fetch(`/api/listings/rentals/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setEditing(null);
      } else {
        await fetch('/api/listings/rentals', {
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
    await fetch(`/api/listings/rentals/${id}`, { method: 'DELETE' });
    if (editing?.id === id) setEditing(null);
    await loadData();
  }, [editing, loadData]);

  // ── 클라이언트 필터 ─────────────────────────────────────
  const filtered = data.filter((item) => {
    const q = fSearch.toLowerCase();
    if (q && !(
      item.addr?.toLowerCase().includes(q) ||
      item.building?.toLowerCase().includes(q) ||
      item.client_name?.toLowerCase().includes(q) ||
      item.client_phone?.includes(q) ||
      item.lessor?.toLowerCase().includes(q) ||
      item.lessee?.toLowerCase().includes(q)
    )) return false;
    if (fCategory && item.category !== fCategory) return false;
    if (fBuilding && item.building !== fBuilding) return false;
    if (fDepMin && (item.deposit ?? 0) < parseInt(fDepMin)) return false;
    if (fDepMax && (item.deposit ?? 0) > parseInt(fDepMax)) return false;
    if (fMonMin && (item.monthly ?? 0) < parseInt(fMonMin)) return false;
    if (fMonMax && (item.monthly ?? 0) > parseInt(fMonMax)) return false;
    return true;
  });

  const resetFilters = () => {
    setFSearch(''); setFCategory(''); setFBuilding('');
    setFDepMin(''); setFDepMax('');
    setFMonMin(''); setFMonMax('');
  };

  // ─── Select 래퍼 — 빈 문자열 옵션은 '_none' 센티넬 사용 ─────
  const CtrlSelect = ({
    name, options, placeholder,
  }: {
    name: keyof FormValues;
    options: readonly string[];
    placeholder?: string;
  }) => (
    <Controller
      name={name} control={control}
      render={({ field }) => (
        <Select
          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
          value={!field.value ? '_none' : (field.value as string)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={placeholder ?? '선택'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o || '_none'} value={o || '_none'}>
                {o || '선택 없음'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

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
                ? <><span className="text-amber-600">ID {editing.id} 수정 중</span></>
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

          {/* Row 1: 접수일 / 구분 / 건물구분 / 호수 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">접수일 *</Label>
              <Input type="date" {...register('recv_date')} className="h-8 text-sm" />
              {errors.recv_date && <p className="text-xs text-red-500">{errors.recv_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">구분(전월세)</Label>
              <CtrlSelect name="category" options={CATEGORY_OPTIONS} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">건물구분</Label>
              <CtrlSelect name="building" options={['', ...BUILDING_OPTIONS]} placeholder="선택" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">호수</Label>
              <Input {...register('unit_no')} className="h-8 text-sm" />
            </div>
          </div>

          {/* Row 2: 주소 (full) */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-600 block mb-1.5">주소 *</Label>
            <Input {...register('addr')} placeholder="서울시 강남구..." className="h-8 text-sm" />
            {errors.addr && <p className="text-xs text-red-500">{errors.addr.message}</p>}
          </div>

          {/* Row 3: 비밀번호 / 입주상태 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">비밀번호</Label>
              <Input {...register('door_pw')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">입주상태</Label>
              <CtrlSelect name="move_in" options={['', ...MOVE_IN_OPTIONS]} placeholder="선택" />
            </div>
            <div /><div />
          </div>

          {/* Row 4: 계약일자 / 전입일자 / 확정일자 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">계약일자</Label>
              <Input type="date" {...register('contract_date')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">전입일자</Label>
              <Input type="date" {...register('move_in_date')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">확정일자</Label>
              <Input type="date" {...register('confirm_date')} className="h-8 text-sm" />
            </div>
            <div />
          </div>

          {/* Row 5: 보증금 / 월세 / 관리비 / 소계(자동) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">보증금(만원)</Label>
              <Input type="number" {...register('deposit')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">월세(만원)</Label>
              <Input type="number" {...register('monthly')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">관리비(만원)</Label>
              <Input type="number" {...register('mng_fee')} className="h-8 text-sm" />
            </div>
            <AutoField label="소계(월세+관리비)" value={subtotal ? subtotal.toLocaleString('ko-KR') : ''} />
          </div>

          {/* Row 6: 임대인 / 임차인 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">임대인</Label>
              <Input {...register('lessor')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">임차인</Label>
              <Input {...register('lessee')} className="h-8 text-sm" />
            </div>
            <div /><div />
          </div>

          {/* Row 7: 성명 / 연락처 / 통신사 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">성명</Label>
              <Input {...register('client_name')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">연락처</Label>
              <Input {...register('client_phone')} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600 block mb-1.5">통신사</Label>
              <CtrlSelect name="carrier" options={CARRIER_OPTIONS} placeholder="선택" />
            </div>
            <div />
          </div>

          {/* Row 8: 비고 */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-600 block mb-1.5">비고</Label>
            <Textarea {...register('memo')} rows={2} className="text-sm resize-none" />
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
            {(fSearch || fCategory || fBuilding || fDepMin || fDepMax || fMonMin || fMonMax) && (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                필터 적용 중
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterOpen && (
          <div className="p-4 space-y-3">
            {/* 검색어 / 구분 / 건물구분 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">검색어</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input value={fSearch} onChange={(e) => setFSearch(e.target.value)}
                    placeholder="주소, 임대인, 임차인, 성명, 연락처..." className="pl-8 h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">구분</Label>
                <Select value={fCategory || '_all'} onValueChange={(v) => setFCategory(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">전체</SelectItem>
                    {CATEGORY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 block mb-1.5">건물구분</Label>
                <Select value={fBuilding || '_all'} onValueChange={(v) => setFBuilding(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">전체</SelectItem>
                    {BUILDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 보증금 / 월세 범위 + 초기화 */}
            <div className="grid grid-cols-4 gap-3">
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
              <div /><div className="flex items-end">
                <Button variant="outline" size="sm" onClick={resetFilters}
                  className="h-8 text-xs gap-1 w-full">
                  <RotateCcw className="w-3 h-3" /> 초기화
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 검색 결과 테이블 ─────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shadow-sm">
              <List className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">전월세 매물장</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              총 {filtered.length}건
            </span>
          </div>
          <ExcelButtons
            filename="전월세매물장"
            data={filtered as unknown as Record<string, unknown>[]}
            templateHeaders={RENTAL_TEMPLATE_HEADERS}
            onImport={handleImport}
          />
        </div>

        {/* 수평 스크롤 테이블 */}
        <div className="overflow-x-auto">
          <Table className="text-xs whitespace-nowrap">
            <TableHeader>
              {/* ── 그룹 헤더 행 ────────────────────────────── */}
              <TableRow>
                <TableHead colSpan={10} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500">
                  기본정보
                </TableHead>
                <TableHead colSpan={4} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-indigo-100 text-indigo-600 border-l-2 border-indigo-200">
                  금액
                </TableHead>
                <TableHead colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-600 border-l-2 border-amber-200">
                  계약정보
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
                <TableHead className="px-3 bg-slate-50 text-slate-600">구분</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">건물구분</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600 min-w-[160px]">주소</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">호수</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">비밀번호</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">계약일자</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">전입일자</TableHead>
                <TableHead className="px-3 bg-slate-50 text-slate-600">확정일자</TableHead>
                {/* 금액 */}
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right border-l-2 border-indigo-200">보증금</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">월세</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">관리비</TableHead>
                <TableHead className="px-3 bg-indigo-50 text-indigo-700 text-right">소계</TableHead>
                {/* 계약정보 */}
                <TableHead className="px-3 bg-amber-50 text-amber-700 border-l-2 border-amber-200">임대인</TableHead>
                <TableHead className="px-3 bg-amber-50 text-amber-700">임차인</TableHead>
                <TableHead className="px-3 bg-amber-50 text-amber-700">입주상태</TableHead>
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
                  <TableCell colSpan={22} className="text-center text-slate-400 py-10">
                    등록된 매물이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const sub = (item.monthly ?? 0) + (item.mng_fee ?? 0);
                  const isEditing = editing?.id === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      className={isEditing ? 'group bg-amber-50 border-l-2 border-amber-400' : 'group hover:bg-slate-50'}
                    >
                      <TableCell className="px-3 text-slate-400">{item.id}</TableCell>
                      <TableCell className="px-3">{item.recv_date ?? '-'}</TableCell>
                      <TableCell className="px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          item.category === '전세' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {item.category ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="px-3">{item.building ?? '-'}</TableCell>
                      <TableCell className="px-3 font-medium">{item.addr ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.unit_no ?? '-'}</TableCell>
                      <TableCell className="px-3 text-slate-400">{item.door_pw ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.contract_date ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.move_in_date ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.confirm_date ?? '-'}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.deposit)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.monthly)}</TableCell>
                      <TableCell className="px-3 text-right">{fmt(item.mng_fee)}</TableCell>
                      <TableCell className="px-3 text-right font-medium text-indigo-600">{sub > 0 ? fmt(sub) : '-'}</TableCell>
                      <TableCell className="px-3">{item.lessor ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.lessee ?? '-'}</TableCell>
                      <TableCell className="px-3">{item.move_in ?? '-'}</TableCell>
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
