import type { GameResult, PatternSignal, StrategyType, BetRecord } from '../utils/types';

/**
 * AI 학습 엔진
 *
 * 핵심 원리:
 * 1. 모든 판의 결과를 누적 저장 (세션 간 지속)
 * 2. 패턴별 예측 정확도를 추적
 * 3. 정확도가 높은 패턴에 더 높은 가중치 부여
 * 4. 슈 흐름에 따라 최적 전략 자동 선택
 * 5. 시간이 지날수록 더 정확해지는 "경험 기반 학습"
 */

// ============================================================
// 타입 정의
// ============================================================

/** 패턴 예측 기록 */
interface PatternPrediction {
  patternType: string;       // 패턴 종류 (줄, 깍두기, 드래곤 등)
  predictedResult: GameResult;
  actualResult: GameResult;
  confidence: number;
  timestamp: number;
}

/** 패턴별 학습 데이터 */
interface PatternStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;           // 0-1
  weight: number;             // 학습된 가중치 (0-2, 기본 1)
  recentAccuracy: number;     // 최근 20건 정확도
  lastUpdated: number;
}

/** 시퀀스 패턴 (N-gram) */
interface SequencePattern {
  sequence: string;           // 예: "BBBP", "PBPB"
  nextResults: Record<string, number>; // 다음 결과 빈도: {B: 15, P: 10, T: 2}
  totalOccurrences: number;
}

/** 전략 성과 기록 */
interface StrategyPerformance {
  strategy: StrategyType;
  totalBets: number;
  wins: number;
  losses: number;
  profit: number;
  winRate: number;
  avgProfit: number;          // 평균 수익/베팅
  shoeType: string;           // 슈 유형 (줄형, 깍두기형, 혼합형)
}

/** 학습 데이터 전체 */
export interface LearningData {
  version: number;
  totalRoundsLearned: number;
  allResults: string[];                        // 모든 결과 기록 (B/P/T)
  patternStats: Record<string, PatternStats>;  // 패턴별 학습 데이터
  sequencePatterns: Record<string, SequencePattern>; // N-gram 시퀀스
  strategyPerformance: StrategyPerformance[];  // 전략별 성과
  predictionHistory: PatternPrediction[];      // 최근 예측 기록 (최대 500건)
  lastTrainedAt: number;
}

// ============================================================
// 스토리지
// ============================================================

const STORAGE_KEY = 'bakara_learning_data';

function getInitialLearningData(): LearningData {
  return {
    version: 1,
    totalRoundsLearned: 0,
    allResults: [],
    patternStats: {},
    sequencePatterns: {},
    strategyPerformance: [],
    predictionHistory: [],
    lastTrainedAt: Date.now(),
  };
}

export function loadLearningData(): LearningData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getInitialLearningData();
}

function saveLearningData(data: LearningData): void {
  try {
    // 예측 히스토리 최대 500건 유지
    if (data.predictionHistory.length > 500) {
      data.predictionHistory = data.predictionHistory.slice(-500);
    }
    // 전체 결과 최대 10000건 유지
    if (data.allResults.length > 10000) {
      data.allResults = data.allResults.slice(-10000);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* 스토리지 초과 시 오래된 데이터 정리 */
    try {
      data.predictionHistory = data.predictionHistory.slice(-100);
      data.allResults = data.allResults.slice(-3000);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* give up */ }
  }
}

// ============================================================
// 학습 엔진 코어
// ============================================================

export class LearningEngine {
  private data: LearningData;

  constructor() {
    this.data = loadLearningData();
  }

  getData(): LearningData {
    return this.data;
  }

  /**
   * 새 결과 학습
   * - 결과를 기록하고 시퀀스 패턴 업데이트
   */
  learnResult(result: GameResult): void {
    const r = result === 'banker' ? 'B' : result === 'player' ? 'P' : 'T';
    this.data.allResults.push(r);
    this.data.totalRoundsLearned++;

    // N-gram 시퀀스 업데이트 (2~6 길이)
    this.updateSequencePatterns(r);

    saveLearningData(this.data);
  }

  /**
   * N-gram 시퀀스 패턴 업데이트
   * 최근 N개의 결과 시퀀스가 나온 후 실제로 무엇이 나왔는지 기록
   */
  private updateSequencePatterns(newResult: string): void {
    const results = this.data.allResults;
    const len = results.length;

    // 2-gram ~ 6-gram 업데이트
    for (let n = 2; n <= 6; n++) {
      if (len < n + 1) continue;

      // 이전 n개의 시퀀스
      const seq = results.slice(len - n - 1, len - 1).join('');
      if (!this.data.sequencePatterns[seq]) {
        this.data.sequencePatterns[seq] = {
          sequence: seq,
          nextResults: {},
          totalOccurrences: 0,
        };
      }

      const pattern = this.data.sequencePatterns[seq];
      pattern.nextResults[newResult] = (pattern.nextResults[newResult] || 0) + 1;
      pattern.totalOccurrences++;
    }
  }

  /**
   * 패턴 예측 결과 기록 & 가중치 업데이트
   */
  recordPrediction(
    patternType: string,
    predicted: GameResult,
    actual: GameResult,
    confidence: number
  ): void {
    // 예측 기록 저장
    this.data.predictionHistory.push({
      patternType,
      predictedResult: predicted,
      actualResult: actual,
      confidence,
      timestamp: Date.now(),
    });

    // 패턴 통계 업데이트
    if (!this.data.patternStats[patternType]) {
      this.data.patternStats[patternType] = {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0.5,
        weight: 1.0,
        recentAccuracy: 0.5,
        lastUpdated: Date.now(),
      };
    }

    const stats = this.data.patternStats[patternType];
    stats.totalPredictions++;
    if (predicted === actual) {
      stats.correctPredictions++;
    }
    stats.accuracy = stats.correctPredictions / stats.totalPredictions;

    // 최근 20건 정확도 계산
    const recentPreds = this.data.predictionHistory
      .filter(p => p.patternType === patternType)
      .slice(-20);
    const recentCorrect = recentPreds.filter(p => p.predictedResult === p.actualResult).length;
    stats.recentAccuracy = recentPreds.length > 0 ? recentCorrect / recentPreds.length : 0.5;

    // 가중치 자동 조정 (정확도 기반)
    // 정확도 > 55%: 가중치 증가, < 45%: 가중치 감소
    stats.weight = this.calculateWeight(stats);
    stats.lastUpdated = Date.now();

    saveLearningData(this.data);
  }

  /**
   * 패턴 가중치 계산
   * - 기본: 1.0
   * - 정확도 높으면 최대 2.0
   * - 정확도 낮으면 최소 0.1
   * - 데이터가 적으면 기본(1.0)에 가깝게
   */
  private calculateWeight(stats: PatternStats): number {
    const { accuracy, recentAccuracy, totalPredictions } = stats;

    // 데이터 신뢰도 (20건 이하면 아직 불확실)
    const dataConfidence = Math.min(totalPredictions / 30, 1);

    // 가중 정확도 (최근 70% + 전체 30%)
    const weightedAccuracy = recentAccuracy * 0.7 + accuracy * 0.3;

    // 기본값(1.0)에서 정확도에 따라 조정
    // 50% 정확도 = 1.0, 60% = 1.5, 70%+ = 2.0, 40% = 0.5, 30%- = 0.1
    const rawWeight = 1 + (weightedAccuracy - 0.5) * 4;
    const adjustedWeight = 1 + (rawWeight - 1) * dataConfidence;

    return Math.max(0.1, Math.min(2.0, adjustedWeight));
  }

  /**
   * 시퀀스 기반 예측
   * 현재 결과 시퀀스가 주어지면, 과거 데이터에서 다음에 뭐가 나올지 예측
   */
  predictFromSequence(recentResults: GameResult[]): {
    prediction: GameResult | null;
    confidence: number;
    sampleSize: number;
    probabilities: { B: number; P: number; T: number };
  } | null {
    const recent = recentResults
      .map(r => r === 'banker' ? 'B' : r === 'player' ? 'P' : 'T');

    let bestPrediction: { prediction: GameResult; confidence: number; sampleSize: number; probabilities: { B: number; P: number; T: number } } | null = null;
    let bestScore = 0;

    // 긴 시퀀스부터 매칭 시도 (더 구체적인 패턴 우선)
    for (let n = Math.min(6, recent.length); n >= 2; n--) {
      const seq = recent.slice(-n).join('');
      const pattern = this.data.sequencePatterns[seq];

      if (!pattern || pattern.totalOccurrences < 3) continue;

      const total = pattern.totalOccurrences;
      const bCount = pattern.nextResults['B'] || 0;
      const pCount = pattern.nextResults['P'] || 0;
      const tCount = pattern.nextResults['T'] || 0;

      const bProb = bCount / total;
      const pProb = pCount / total;
      const tProb = tCount / total;

      // 가장 높은 확률의 결과
      let maxProb = bProb;
      let predicted: GameResult = 'banker';
      if (pProb > maxProb) { maxProb = pProb; predicted = 'player'; }
      if (tProb > maxProb) { maxProb = tProb; predicted = 'tie'; }

      // 점수 = 확률 우위 × 데이터량 보너스 × 시퀀스 길이 보너스
      const margin = maxProb - (predicted === 'banker' ? pProb : bProb);
      const dataBonus = Math.min(total / 20, 1);
      const lengthBonus = 1 + (n - 2) * 0.15;
      const score = margin * dataBonus * lengthBonus;

      if (score > bestScore) {
        bestScore = score;
        bestPrediction = {
          prediction: predicted,
          confidence: Math.min(maxProb * 100, 95),
          sampleSize: total,
          probabilities: { B: bProb, P: pProb, T: tProb },
        };
      }
    }

    return bestPrediction;
  }

  /**
   * 패턴 시그널에 학습된 가중치 적용
   */
  applyLearnedWeights(signals: PatternSignal[]): PatternSignal[] {
    return signals.map(signal => {
      const stats = this.data.patternStats[signal.type];
      const weight = stats ? stats.weight : 1.0;

      return {
        ...signal,
        strength: Math.min(signal.strength * weight, 1.0),
      };
    });
  }

  /**
   * 현재 슈 유형 판별
   * - 줄형: 긴 연속이 많음
   * - 깍두기형: 교대가 많음
   * - 혼합형: 둘 다 아님
   */
  classifyShoeType(results: GameResult[]): 'streak' | 'chop' | 'mixed' {
    if (results.length < 10) return 'mixed';

    const pbResults = results.filter(r => r !== 'tie');
    let switches = 0;
    let streakLengths: number[] = [];
    let currentStreak = 1;

    for (let i = 1; i < pbResults.length; i++) {
      if (pbResults[i] !== pbResults[i - 1]) {
        switches++;
        streakLengths.push(currentStreak);
        currentStreak = 1;
      } else {
        currentStreak++;
      }
    }
    streakLengths.push(currentStreak);

    const switchRate = switches / (pbResults.length - 1);
    const avgStreak = streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length;

    if (switchRate > 0.6 && avgStreak < 1.8) return 'chop';
    if (switchRate < 0.4 && avgStreak > 2.5) return 'streak';
    return 'mixed';
  }

  /**
   * 슈 유형에 따른 최적 전략 추천
   * 과거 전략 성과 데이터 기반
   */
  recommendStrategy(results: GameResult[]): {
    strategy: StrategyType;
    reason: string;
  } {
    const shoeType = this.classifyShoeType(results);

    // 과거 성과 데이터가 있으면 그걸 기반으로 추천
    const performances = this.data.strategyPerformance
      .filter(p => p.shoeType === shoeType && p.totalBets >= 10);

    if (performances.length > 0) {
      // 가장 수익이 높은 전략
      const best = performances.reduce((a, b) =>
        a.avgProfit > b.avgProfit ? a : b
      );

      if (best.avgProfit > 0) {
        return {
          strategy: best.strategy,
          reason: `학습 데이터 기반: ${shoeType === 'streak' ? '줄형' : shoeType === 'chop' ? '깍두기형' : '혼합형'} 슈에서 승률 ${(best.winRate * 100).toFixed(1)}%`,
        };
      }
    }

    // 기본 추천 (학습 데이터 부족 시)
    switch (shoeType) {
      case 'streak':
        return { strategy: 'antiMartingale', reason: '줄형 슈 감지 → 연승 활용 전략 (파롤리)' };
      case 'chop':
        return { strategy: 'flat', reason: '깍두기형 슈 감지 → 안정적 플랫 베팅' };
      default:
        return { strategy: 'kelly', reason: '혼합형 슈 → 수학적 최적 베팅 (켈리)' };
    }
  }

  /**
   * 전략 성과 기록
   */
  recordStrategyPerformance(
    strategy: StrategyType,
    bets: BetRecord[],
    results: GameResult[]
  ): void {
    const shoeType = this.classifyShoeType(results);
    const wins = bets.filter(b => b.result === 'win').length;
    const losses = bets.filter(b => b.result === 'lose').length;
    const totalProfit = bets.reduce((sum, b) => sum + b.payout, 0);

    this.data.strategyPerformance.push({
      strategy,
      totalBets: bets.length,
      wins,
      losses,
      profit: totalProfit,
      winRate: bets.length > 0 ? wins / (wins + losses) : 0,
      avgProfit: bets.length > 0 ? totalProfit / bets.length : 0,
      shoeType,
    });

    // 최대 100개 성과 기록
    if (this.data.strategyPerformance.length > 100) {
      this.data.strategyPerformance = this.data.strategyPerformance.slice(-100);
    }

    saveLearningData(this.data);
  }

  /**
   * 전체 학습 통계
   */
  getStats() {
    const { totalRoundsLearned, patternStats, sequencePatterns, predictionHistory } = this.data;

    // 전체 예측 정확도
    const totalPreds = predictionHistory.length;
    const correctPreds = predictionHistory.filter(p => p.predictedResult === p.actualResult).length;
    const overallAccuracy = totalPreds > 0 ? correctPreds / totalPreds : 0;

    // 최근 50건 정확도
    const recent = predictionHistory.slice(-50);
    const recentCorrect = recent.filter(p => p.predictedResult === p.actualResult).length;
    const recentAccuracy = recent.length > 0 ? recentCorrect / recent.length : 0;

    // 최고 성과 패턴
    const patterns = Object.entries(patternStats)
      .filter(([_, s]) => s.totalPredictions >= 5)
      .sort((a, b) => b[1].accuracy - a[1].accuracy);

    const bestPattern = patterns[0] || null;
    const worstPattern = patterns[patterns.length - 1] || null;

    // 시퀀스 패턴 수
    const learnedSequences = Object.keys(sequencePatterns).length;

    return {
      totalRoundsLearned,
      totalPredictions: totalPreds,
      overallAccuracy,
      recentAccuracy,
      bestPattern: bestPattern ? {
        name: bestPattern[0],
        accuracy: bestPattern[1].accuracy,
        weight: bestPattern[1].weight,
      } : null,
      worstPattern: worstPattern ? {
        name: worstPattern[0],
        accuracy: worstPattern[1].accuracy,
        weight: worstPattern[1].weight,
      } : null,
      learnedSequences,
      dataSize: this.data.allResults.length,
    };
  }

  /**
   * 학습 데이터 리셋
   */
  reset(): void {
    this.data = getInitialLearningData();
    saveLearningData(this.data);
  }
}
