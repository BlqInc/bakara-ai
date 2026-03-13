import type { StrategyType, BetRecord, ProbabilityState } from '../utils/types';
import { PAYOUT } from '../utils/constants';

/**
 * 베팅 전략 엔진 - 다양한 베팅 사이징 전략
 */

interface StrategyContext {
  currentBankroll: number;
  minBet: number;
  maxBet: number;
  betHistory: BetRecord[];
  baseBet: number;          // 기본 베팅 단위
  probability: ProbabilityState;
  bankerCommission: number; // 뱅커 커미션 (%)
}

interface StrategyResult {
  betSize: number;
  reasoning: string;
}

/**
 * 베팅 금액을 min/max 범위 내로 제한
 */
function clampBet(amount: number, min: number, max: number, bankroll: number): number {
  return Math.max(min, Math.min(max, bankroll, Math.round(amount)));
}

/**
 * 최근 연속 패배 횟수
 */
function getConsecutiveLosses(history: BetRecord[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].result === 'lose') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * 최근 연속 승리 횟수
 */
function getConsecutiveWins(history: BetRecord[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].result === 'win') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ============================================================
// 개별 전략 구현
// ============================================================

/**
 * 플랫 베팅 - 항상 동일한 금액
 */
function flatBetting(ctx: StrategyContext): StrategyResult {
  return {
    betSize: clampBet(ctx.baseBet, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: '고정 금액 베팅',
  };
}

/**
 * 마틴게일 - 패배 시 2배, 승리 시 기본으로 복귀
 * 장점: 한 번 이기면 손실 복구
 * 단점: 연패 시 급격한 손실, 테이블 한도 제한
 */
function martingale(ctx: StrategyContext): StrategyResult {
  const losses = getConsecutiveLosses(ctx.betHistory);
  const betSize = ctx.baseBet * Math.pow(2, losses);

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: losses > 0
      ? `마틴게일 ${losses}연패 → ${Math.pow(2, losses)}배 베팅`
      : '마틴게일 기본 베팅',
  };
}

/**
 * 안티 마틴게일 (파롤리) - 승리 시 2배, 패배 시 기본으로
 * 장점: 연승 시 큰 이익, 패배 리스크 작음
 * 단점: 연승이 끊기면 이전 이익 반납
 */
function antiMartingale(ctx: StrategyContext): StrategyResult {
  const wins = getConsecutiveWins(ctx.betHistory);
  const maxDoubles = 3; // 최대 3연승까지만 더블
  const betSize = ctx.baseBet * Math.pow(2, Math.min(wins, maxDoubles));

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: wins > 0
      ? `파롤리 ${wins}연승 → ${Math.pow(2, Math.min(wins, maxDoubles))}배 베팅`
      : '파롤리 기본 베팅',
  };
}

/**
 * 피보나치 - 패배 시 피보나치 수열 진행, 승리 시 2단계 후퇴
 * 마틴게일보다 완만한 상승
 */
function fibonacci(ctx: StrategyContext): StrategyResult {
  const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  const losses = getConsecutiveLosses(ctx.betHistory);
  const level = Math.min(losses, fibs.length - 1);
  const betSize = ctx.baseBet * fibs[level];

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: `피보나치 레벨 ${level} (×${fibs[level]})`,
  };
}

/**
 * 1-3-2-6 시스템 - 4단계 순환
 * 1단위 → 3단위 → 2단위 → 6단위, 패배하면 처음으로
 * 장점: 2번 이기면 이미 이익 확보
 */
function oneThreeTwoSix(ctx: StrategyContext): StrategyResult {
  const sequence = [1, 3, 2, 6];
  const wins = getConsecutiveWins(ctx.betHistory);
  const step = wins % 4;
  const multiplier = sequence[step];
  const betSize = ctx.baseBet * multiplier;

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: `1-3-2-6 ${step + 1}단계 (×${multiplier})`,
  };
}

/**
 * 오스카 그라인드 - 승리 시 1단위 증가, 패배 시 유지
 * 목표: 세션에서 1단위 이익
 * 보수적이고 안정적
 */
function oscarGrind(ctx: StrategyContext): StrategyResult {
  let currentUnit = 1;
  let sessionProfit = 0;

  // 현재 세션의 베팅 히스토리에서 오스카 그라인드 단위 계산
  for (const bet of ctx.betHistory) {
    if (bet.result === 'win') {
      sessionProfit += currentUnit;
      if (sessionProfit < 1) {
        currentUnit = Math.min(currentUnit + 1, 10); // 최대 10단위
      }
    } else if (bet.result === 'lose') {
      sessionProfit -= currentUnit;
    }
  }

  // 목표 도달 시 리셋
  if (sessionProfit >= 1) {
    currentUnit = 1;
  }

  const betSize = ctx.baseBet * currentUnit;

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: `오스카 그라인드 ${currentUnit}단위 (세션 수익: ${sessionProfit > 0 ? '+' : ''}${sessionProfit})`,
  };
}

/**
 * 켈리 기준 (Kelly Criterion) - 수학적 최적 베팅 사이즈
 * f* = (bp - q) / b
 * b = 배당률, p = 승률, q = 패율
 */
function kellyCriterion(ctx: StrategyContext): StrategyResult {
  const prob = ctx.probability;

  // 뱅커 베팅 기준 (가장 유리한 베팅)
  const b = 1 - (ctx.bankerCommission ?? 5) / 100; // 커미션 반영 배당률
  const p = prob.bankerWin / (prob.bankerWin + prob.playerWin); // 타이 제외 승률
  const q = 1 - p;

  let kellyFraction = (b * p - q) / b;

  // 하프 켈리 (리스크 감소): 켈리의 절반만 베팅
  kellyFraction = Math.max(0, kellyFraction) / 2;

  // 바카라는 기대값이 음수이므로 켈리가 0 이하일 수 있음
  // 이 경우 최소 베팅
  if (kellyFraction <= 0) {
    return {
      betSize: ctx.minBet,
      reasoning: '켈리 기준: 기대값 부족 - 최소 베팅 권장',
    };
  }

  const betSize = ctx.currentBankroll * kellyFraction;

  return {
    betSize: clampBet(betSize, ctx.minBet, ctx.maxBet, ctx.currentBankroll),
    reasoning: `켈리 기준: 자본금의 ${(kellyFraction * 100).toFixed(2)}% (₩${Math.round(betSize).toLocaleString()})`,
  };
}

// ============================================================
// 공개 API
// ============================================================

const STRATEGY_MAP: Record<StrategyType, (ctx: StrategyContext) => StrategyResult> = {
  flat: flatBetting,
  martingale: martingale,
  antiMartingale: antiMartingale,
  fibonacci: fibonacci,
  oneThreeTwoSix: oneThreeTwoSix,
  oscarGrind: oscarGrind,
  kelly: kellyCriterion,
};

/**
 * 현재 전략에 따른 베팅 금액 계산
 */
export function calculateBetSize(
  strategy: StrategyType,
  ctx: StrategyContext
): StrategyResult {
  const strategyFn = STRATEGY_MAP[strategy];
  return strategyFn(ctx);
}

/**
 * 각 전략의 리스크 평가
 */
export function getStrategyRiskProfile(strategy: StrategyType): {
  riskLevel: 'low' | 'medium' | 'high';
  maxDrawdown: string;
  description: string;
} {
  const profiles: Record<StrategyType, { riskLevel: 'low' | 'medium' | 'high'; maxDrawdown: string; description: string }> = {
    flat: {
      riskLevel: 'low',
      maxDrawdown: '느린 손실',
      description: '안정적이지만 손실 복구가 느림',
    },
    martingale: {
      riskLevel: 'high',
      maxDrawdown: '6연패 시 63배 손실',
      description: '공격적 - 연패 시 자본금 급감 위험',
    },
    antiMartingale: {
      riskLevel: 'low',
      maxDrawdown: '기본 베팅만 손실',
      description: '보수적 - 연승 활용, 패배 시 손실 최소',
    },
    fibonacci: {
      riskLevel: 'medium',
      maxDrawdown: '마틴게일보다 완만한 증가',
      description: '중간 리스크 - 점진적 증가',
    },
    oneThreeTwoSix: {
      riskLevel: 'low',
      maxDrawdown: '최대 2단위 손실',
      description: '4단계 순환 - 2승에 이익 확보',
    },
    oscarGrind: {
      riskLevel: 'low',
      maxDrawdown: '느린 드로다운',
      description: '매우 보수적 - 1단위 이익 목표',
    },
    kelly: {
      riskLevel: 'medium',
      maxDrawdown: '자본 비례 변동',
      description: '수학적 최적 - 자본금 비례 베팅',
    },
  };

  return profiles[strategy];
}

/**
 * 전략 시뮬레이션 (N 라운드)
 */
export function simulateStrategy(
  strategy: StrategyType,
  bankroll: number,
  baseBet: number,
  minBet: number,
  maxBet: number,
  winRate: number,
  rounds: number
): { finalBankroll: number; maxDrawdown: number; bustRounds: number | null } {
  let current = bankroll;
  let peak = bankroll;
  let maxDrawdown = 0;
  const history: BetRecord[] = [];

  const prob: ProbabilityState = {
    playerWin: 1 - winRate,
    bankerWin: winRate,
    tie: 0,
    playerPair: 0,
    bankerPair: 0,
  };

  for (let i = 0; i < rounds; i++) {
    if (current < minBet) {
      return { finalBankroll: current, maxDrawdown, bustRounds: i };
    }

    const ctx: StrategyContext = {
      currentBankroll: current,
      minBet,
      maxBet,
      betHistory: history,
      baseBet,
      probability: prob,
      bankerCommission: 5,
    };

    const { betSize } = calculateBetSize(strategy, ctx);
    const win = Math.random() < winRate;

    const record: BetRecord = {
      roundId: i,
      betType: 'banker',
      amount: betSize,
      result: win ? 'win' : 'lose',
      payout: win ? betSize * PAYOUT.banker : -betSize,
      balanceAfter: current + (win ? betSize * PAYOUT.banker : -betSize),
      timestamp: Date.now(),
    };

    history.push(record);
    current = record.balanceAfter;

    if (current > peak) peak = current;
    const drawdown = (peak - current) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return { finalBankroll: current, maxDrawdown, bustRounds: null };
}
