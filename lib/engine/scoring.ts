// ─── 종합 점수 집계 엔진 (v4 7카테고리) ─────────────────────
// 7카테고리 가중 평균 계산 + 등급·요약 문구 생성

import type { CategoryScore, Grade, AnalysisResult } from '@/types';
import { GRADE_CONFIG } from '@/types';

/** 7카테고리 점수 집합 타입 */
export interface CategoryScores {
  transport:   CategoryScore;  // A. 교통        20%
  jobDemand:   CategoryScore;  // B. 일자리·수요 15%
  living:      CategoryScore;  // C. 생활인프라  15%
  education:   CategoryScore;  // D. 교육        15%
  envRisk:     CategoryScore;  // E. 환경위험    15%
  futureValue: CategoryScore;  // F. 미래가치    10%
  supply:      CategoryScore;  // G. 상품·공급   10%
}

/** 집계 결과 타입 */
export interface AggregateResult {
  totalScore: number;
  grade: Grade;
}

/**
 * 점수에 따른 등급 산출
 * GRADE_CONFIG의 min 기준 내림차순 비교
 */
function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) {
      return grade;
    }
  }
  return 'F';
}

/**
 * 7카테고리 점수를 가중 평균으로 집계
 * totalScore = Σ(categoryScore × weight)
 *
 * @param scores - 7개 카테고리 점수 객체
 * @returns { totalScore, grade }
 */
export function aggregateScore(scores: CategoryScores): AggregateResult {
  const totalScore = Math.round(
    scores.transport.score   * scores.transport.weight   +
    scores.jobDemand.score   * scores.jobDemand.weight   +
    scores.living.score      * scores.living.weight      +
    scores.education.score   * scores.education.weight   +
    scores.envRisk.score     * scores.envRisk.weight     +
    scores.futureValue.score * scores.futureValue.weight +
    scores.supply.score      * scores.supply.weight,
  );

  return { totalScore, grade: getGrade(totalScore) };
}

/**
 * 종합 점수 기반 요약 문구 생성 (v4 7카테고리)
 * - 강점 TOP2 + 취약점 명시
 * - 패널티 경고 포함
 *
 * @param result - finalScore, grade, penaltyReasons 포함
 * @param categories - 7카테고리 점수 집합
 * @returns 한 줄 요약 문구
 */
export function generateSummary(
  result: {
    totalScore: number;
    finalScore: number;
    grade: Grade;
    penaltyReasons: string[];
  },
  categories: CategoryScores,
): string {
  const { finalScore, grade, penaltyReasons } = result;

  // 7개 카테고리 점수 정렬 (내림차순)
  const entries = [
    { key: '교통',       score: categories.transport.score   },
    { key: '일자리·수요', score: categories.jobDemand.score   },
    { key: '생활인프라',  score: categories.living.score      },
    { key: '교육',       score: categories.education.score   },
    { key: '환경위험',   score: categories.envRisk.score     },
    { key: '미래가치',   score: categories.futureValue.score },
    { key: '상품·공급',  score: categories.supply.score      },
  ].sort((a, b) => b.score - a.score);

  const top1 = entries[0];
  const top2 = entries[1];

  // 취약 카테고리 (60점 미만)
  const weak = entries.filter(e => e.score < 60);

  // 패널티 경고 문구 (첫 번째만 표시)
  const penaltyWarn = penaltyReasons.length > 0
    ? ` | 주의: ${penaltyReasons[0]}`
    : '';

  // 기본 요약 문구
  let base: string;
  if (grade === 'A') {
    base = `${top1.key}·${top2.key} 우수한 프리미엄 입지 (종합 ${finalScore}점)`;
  } else if (grade === 'B') {
    if (weak.length > 0) {
      base = `${top1.key} 강점 / ${weak[0].key} 보완 필요 (종합 ${finalScore}점)`;
    } else {
      base = `${top1.key}·${top2.key} 균형 잡힌 우수 입지 (종합 ${finalScore}점)`;
    }
  } else if (grade === 'C') {
    base = `${top1.key} 양호 / 전반적 개선 여지 있는 입지 (종합 ${finalScore}점)`;
  } else {
    base = `전반적 입지 조건 미흡 — ${top1.key} 부분만 양호 (종합 ${finalScore}점)`;
  }

  return `${base}${penaltyWarn}`;
}

/**
 * AnalysisResult의 grade 필드 타입 재노출 (편의용)
 */
export type { Grade, AnalysisResult };
