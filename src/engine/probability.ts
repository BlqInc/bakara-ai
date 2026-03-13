import type { ProbabilityState, RoundResult } from '../utils/types';
import { BASE_PROBABILITY, PAYOUT } from '../utils/constants';
import { ShoeTracker } from './shoeTracker';

/**
 * 확률 엔진 - 바카라의 모든 확률을 계산
 */
export class ProbabilityEngine {
  /**
   * 현재 확률 계산 (슈 트래커 기반 동적 확률)
   */
  static calculate(shoeTracker?: ShoeTracker): ProbabilityState {
    if (!shoeTracker) {
      return { ...BASE_PROBABILITY };
    }

    const adj = shoeTracker.getProbabilityAdjustment();
    const state = shoeTracker.getState();

    // 남은 카드 기반 확률 보정
    let bankerWin = BASE_PROBABILITY.bankerWin + adj.bankerAdj;
    let playerWin = BASE_PROBABILITY.playerWin + adj.playerAdj;
    let tie = BASE_PROBABILITY.tie;

    // 정규화 (합이 1이 되도록)
    const total = bankerWin + playerWin + tie;
    bankerWin /= total;
    playerWin /= total;
    tie /= total;

    // 페어 확률 계산 (남은 카드 기반)
    const remaining = state.remainingCards;
    let playerPair = 0;
    let bankerPair = 0;

    if (remaining >= 2) {
      // 페어 확률: 각 랭크별로 C(n,2) / C(remaining, 2)
      const totalCombinations = (remaining * (remaining - 1)) / 2;
      let pairCombinations = 0;

      for (const rank of Object.keys(state.cardCounts) as Array<keyof typeof state.cardCounts>) {
        const n = state.cardCounts[rank];
        if (n >= 2) {
          pairCombinations += (n * (n - 1)) / 2;
        }
      }

      playerPair = pairCombinations / totalCombinations;
      bankerPair = playerPair; // 독립적이므로 동일
    }

    return {
      playerWin: Math.max(0, Math.min(1, playerWin)),
      bankerWin: Math.max(0, Math.min(1, bankerWin)),
      tie: Math.max(0, Math.min(1, tie)),
      playerPair: Math.max(0, Math.min(1, playerPair)),
      bankerPair: Math.max(0, Math.min(1, bankerPair)),
    };
  }

  /**
   * 기대값 계산 (Expected Value)
   * 양수면 플레이어에게 유리, 음수면 불리
   */
  static calculateEV(prob: ProbabilityState): {
    playerEV: number;
    bankerEV: number;
    tieEV: number;
    playerPairEV: number;
    bankerPairEV: number;
  } {
    return {
      // 플레이어 베팅 EV = P(win) * 1 - P(lose) * 1 + P(tie) * 0
      playerEV: prob.playerWin * PAYOUT.player - prob.bankerWin * 1,
      // 뱅커 베팅 EV = P(win) * 0.95 - P(lose) * 1 + P(tie) * 0
      bankerEV: prob.bankerWin * PAYOUT.banker - prob.playerWin * 1,
      // 타이 EV = P(tie) * 8 - P(not tie) * 1
      tieEV: prob.tie * PAYOUT.tie - (1 - prob.tie) * 1,
      // 페어 EV
      playerPairEV: prob.playerPair * PAYOUT.playerPair - (1 - prob.playerPair) * 1,
      bankerPairEV: prob.bankerPair * PAYOUT.bankerPair - (1 - prob.bankerPair) * 1,
    };
  }

  /**
   * 실제 관측된 확률 계산 (과거 결과 기반)
   */
  static calculateObserved(rounds: RoundResult[]): ProbabilityState & {
    totalRounds: number;
    playerCount: number;
    bankerCount: number;
    tieCount: number;
  } {
    const total = rounds.length;
    if (total === 0) {
      return {
        ...BASE_PROBABILITY,
        totalRounds: 0,
        playerCount: 0,
        bankerCount: 0,
        tieCount: 0,
      };
    }

    const playerCount = rounds.filter(r => r.result === 'player').length;
    const bankerCount = rounds.filter(r => r.result === 'banker').length;
    const tieCount = rounds.filter(r => r.result === 'tie').length;
    const pairCount = rounds.filter(r => r.playerPair).length;
    const bPairCount = rounds.filter(r => r.bankerPair).length;

    return {
      playerWin: playerCount / total,
      bankerWin: bankerCount / total,
      tie: tieCount / total,
      playerPair: total > 0 ? pairCount / total : BASE_PROBABILITY.playerPair,
      bankerPair: total > 0 ? bPairCount / total : BASE_PROBABILITY.bankerPair,
      totalRounds: total,
      playerCount,
      bankerCount,
      tieCount,
    };
  }

  /**
   * 분산 계산 - 베팅의 변동성 측정
   */
  static calculateVariance(prob: ProbabilityState): {
    playerVariance: number;
    bankerVariance: number;
  } {
    // 플레이어 베팅 분산
    // E[X^2] - (E[X])^2
    const pEV = prob.playerWin * PAYOUT.player - prob.bankerWin;
    const pEX2 = prob.playerWin * (PAYOUT.player ** 2) + prob.bankerWin * 1;
    const playerVariance = pEX2 - pEV ** 2;

    // 뱅커 베팅 분산
    const bEV = prob.bankerWin * PAYOUT.banker - prob.playerWin;
    const bEX2 = prob.bankerWin * (PAYOUT.banker ** 2) + prob.playerWin * 1;
    const bankerVariance = bEX2 - bEV ** 2;

    return { playerVariance, bankerVariance };
  }

  /**
   * 파산 확률 계산 (Gambler's Ruin 기반)
   * bankroll: 현재 자본금, betSize: 베팅 단위, rounds: 남은 라운드 수
   */
  static calculateRuinProbability(
    bankroll: number,
    betSize: number,
    prob: ProbabilityState,
    targetRounds: number = 100
  ): number {
    if (betSize <= 0 || bankroll <= 0) return 1;

    // 뱅커 베팅 기준 (가장 유리)
    const p = prob.bankerWin; // 승률
    const q = prob.playerWin; // 패율 (타이는 무시)
    const pNorm = p / (p + q);
    const qNorm = q / (p + q);

    const units = Math.floor(bankroll / betSize);

    if (Math.abs(pNorm - qNorm) < 0.001) {
      // p ≈ q일 때: ruin = 1 - (units / targetRounds)
      return Math.max(0, Math.min(1, 1 - units / (units + targetRounds)));
    }

    // (q/p)^n 기반 파산 확률
    const ratio = qNorm / pNorm;
    const ruinProb = (Math.pow(ratio, units) - Math.pow(ratio, units + targetRounds)) /
                     (1 - Math.pow(ratio, units + targetRounds));

    return Math.max(0, Math.min(1, isNaN(ruinProb) ? 0.5 : ruinProb));
  }
}
