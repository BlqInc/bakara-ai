import type {
  GameResult, BetType, BetRecommendation, GameSession,
  PatternSignal, ProbabilityState,
} from '../utils/types';
import { BASE_PROBABILITY, PAYOUT } from '../utils/constants';
import { ProbabilityEngine } from './probability';
import { PatternAnalyzer } from './patternAnalyzer';
import { calculateBetSize } from './bettingStrategy';
import { ShoeTracker } from './shoeTracker';
import { LearningEngine } from './learningEngine';

/**
 * 종합 추천 엔진 - 모든 시그널을 종합하여 최적의 베팅 추천
 *
 * 고려 요소:
 * 1. 수학적 확률 (카드 카운팅 포함)
 * 2. 패턴 분석 시그널 (본매 + 중국점)
 * 3. 베팅 전략 사이즈
 * 4. 리스크 상태
 * 5. 게임이론 (미니맥스, 나쉬 균형)
 * 6. AI 학습 데이터 (시퀀스 예측 + 패턴 가중치)
 */
export class RecommendationEngine {
  /**
   * 메인 추천 생성
   */
  static generate(
    session: GameSession,
    shoeTracker?: ShoeTracker,
    learningEngine?: LearningEngine
  ): BetRecommendation {
    const { rounds, settings, currentBankroll, bets } = session;
    const results = rounds.map(r => r.result);

    // 1. 확률 계산
    const probability = ProbabilityEngine.calculate(shoeTracker);
    const ev = ProbabilityEngine.calculateEV(probability);

    // 2. 패턴 시그널 수집
    let patternSignals = PatternAnalyzer.analyze(results);

    // 2.5 학습된 가중치 적용
    if (learningEngine) {
      patternSignals = learningEngine.applyLearnedWeights(patternSignals);
    }

    // 2.6 시퀀스 기반 AI 예측
    let sequencePrediction: { prediction: GameResult; confidence: number } | null = null;
    if (learningEngine && results.length >= 3) {
      const seqResult = learningEngine.predictFromSequence(results);
      if (seqResult && seqResult.sampleSize >= 5) {
        sequencePrediction = { prediction: seqResult.prediction, confidence: seqResult.confidence };
      }
    }

    // 3. 게임이론 기반 최적 결정
    const gameTheoryDecision = this.applyGameTheory(probability, patternSignals);

    // 4. 신뢰도 계산 (학습 데이터 반영)
    let confidence = this.calculateConfidence(patternSignals, results.length, probability);
    if (sequencePrediction) {
      // AI 예측이 있으면 신뢰도 부스트
      confidence = Math.min(95, confidence + sequencePrediction.confidence * 0.15);
    }

    // 5. Skip 판단
    if (this.shouldSkip(session, confidence, probability)) {
      return {
        betType: 'skip',
        amount: 0,
        confidence: confidence,
        reasoning: this.getSkipReasons(session, confidence),
        riskLevel: 'low',
        expectedValue: 0,
      };
    }

    // 6. 최종 베팅 방향 결정 (AI 예측 포함)
    const betDirection = this.decideBetDirection(
      gameTheoryDecision,
      patternSignals,
      probability,
      ev,
      sequencePrediction
    );

    // 7. 베팅 금액 결정
    const { betSize, reasoning: sizeReasoning } = calculateBetSize(
      settings.strategy,
      {
        currentBankroll,
        minBet: settings.minBet,
        maxBet: settings.maxBet,
        betHistory: bets,
        baseBet: settings.minBet,
        probability,
      }
    );

    // 8. 리스크 레벨 평가
    const riskLevel = this.evaluateRiskLevel(betSize, currentBankroll, confidence);

    // 9. 추천 근거 취합
    const reasoning = this.buildReasoning(
      betDirection,
      patternSignals,
      probability,
      ev,
      sizeReasoning,
      gameTheoryDecision,
      sequencePrediction
    );

    // 10. 기대값 계산
    const betEV = betDirection === 'banker' ? ev.bankerEV : ev.playerEV;

    return {
      betType: betDirection,
      amount: betSize,
      confidence: Math.round(confidence),
      reasoning,
      riskLevel,
      expectedValue: betEV * betSize,
    };
  }

  /**
   * 게임이론 기반 최적 결정
   * - 미니맥스: 최악의 경우를 최소화
   * - 나쉬 균형: 혼합 전략
   */
  private static applyGameTheory(
    prob: ProbabilityState,
    signals: PatternSignal[]
  ): { direction: BetType; gameTheoryScore: number } {
    // 미니맥스 분석
    // 뱅커 베팅의 최소 기대값 vs 플레이어 베팅의 최소 기대값
    const bankerMinEV = prob.bankerWin * PAYOUT.banker - (1 - prob.bankerWin);
    const playerMinEV = prob.playerWin * PAYOUT.player - (1 - prob.playerWin);

    // 나쉬 균형 분석
    // 패턴 시그널의 방향별 가중 합산
    let bankerScore = 0;
    let playerScore = 0;

    for (const signal of signals) {
      if (signal.direction === 'banker') {
        bankerScore += signal.strength;
      } else if (signal.direction === 'player') {
        playerScore += signal.strength;
      }
    }

    // 기본 수학적 우위 (뱅커가 약간 유리)
    bankerScore += 0.1;

    // 기대값 반영
    bankerScore += bankerMinEV * 2;
    playerScore += playerMinEV * 2;

    const direction: BetType = bankerScore >= playerScore ? 'banker' : 'player';
    const gameTheoryScore = Math.abs(bankerScore - playerScore);

    return { direction, gameTheoryScore };
  }

  /**
   * 신뢰도 계산 (0-100)
   */
  private static calculateConfidence(
    signals: PatternSignal[],
    totalRounds: number,
    prob: ProbabilityState
  ): number {
    let confidence = 30; // 기본 신뢰도

    // 데이터 양에 따른 보너스 (최대 20)
    confidence += Math.min(totalRounds * 0.5, 20);

    // 패턴 시그널 강도에 따른 보너스
    if (signals.length > 0) {
      // 같은 방향의 시그널이 많으면 신뢰도 증가
      const directions = signals.map(s => s.direction);
      const bankerSignals = signals.filter(s => s.direction === 'banker');
      const playerSignals = signals.filter(s => s.direction === 'player');

      const dominantSignals = bankerSignals.length >= playerSignals.length
        ? bankerSignals : playerSignals;

      const avgStrength = dominantSignals.reduce((sum, s) => sum + s.strength, 0) / dominantSignals.length;
      const consensus = dominantSignals.length / signals.length;

      confidence += avgStrength * 20;
      confidence += consensus * 15;
    }

    // 확률 편차가 클수록 신뢰도 상승
    const probDiff = Math.abs(prob.bankerWin - prob.playerWin);
    confidence += probDiff * 30;

    return Math.max(10, Math.min(95, Math.round(confidence)));
  }

  /**
   * Skip 판단
   */
  private static shouldSkip(
    session: GameSession,
    confidence: number,
    prob: ProbabilityState
  ): boolean {
    const { settings, currentBankroll, bets } = session;
    const profit = currentBankroll - settings.initialBankroll;

    // 손절선 도달
    if (-profit >= settings.stopLoss) return true;

    // 신뢰도 너무 낮음
    if (confidence < 25) return true;

    // 자본금 위험
    if (currentBankroll < settings.minBet * 3) return true;

    // 5연패 이상
    let consecutiveLosses = 0;
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].result === 'lose') consecutiveLosses++;
      else break;
    }
    if (consecutiveLosses >= 5) return true;

    return false;
  }

  /**
   * Skip 이유
   */
  private static getSkipReasons(session: GameSession, confidence: number): string[] {
    const reasons: string[] = [];
    const { settings, currentBankroll, bets } = session;
    const profit = currentBankroll - settings.initialBankroll;

    if (-profit >= settings.stopLoss) reasons.push('손절선 도달');
    if (confidence < 25) reasons.push('신뢰도 부족 - 패턴 불명확');
    if (currentBankroll < settings.minBet * 3) reasons.push('자본금 위험 수준');

    let consecutiveLosses = 0;
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].result === 'lose') consecutiveLosses++;
      else break;
    }
    if (consecutiveLosses >= 5) reasons.push(`${consecutiveLosses}연패 - 쉬어가기 권장`);

    if (reasons.length === 0) reasons.push('현재 베팅 추천 없음');

    return reasons;
  }

  /**
   * 베팅 방향 최종 결정 (AI 학습 포함)
   */
  private static decideBetDirection(
    gameTheory: { direction: BetType; gameTheoryScore: number },
    signals: PatternSignal[],
    prob: ProbabilityState,
    ev: ReturnType<typeof ProbabilityEngine.calculateEV>,
    sequencePrediction?: { prediction: GameResult; confidence: number } | null
  ): BetType {
    let bankerWeight = 0;
    let playerWeight = 0;

    // 1. 확률 기반 가중치 (30%)
    bankerWeight += prob.bankerWin * 0.3;
    playerWeight += prob.playerWin * 0.3;

    // 2. 패턴 시그널 가중치 (25%) - 학습된 가중치 이미 적용됨
    for (const signal of signals) {
      if (signal.direction === 'banker') {
        bankerWeight += signal.strength * 0.25;
      } else if (signal.direction === 'player') {
        playerWeight += signal.strength * 0.25;
      }
    }

    // 3. 게임이론 가중치 (15%)
    if (gameTheory.direction === 'banker') {
      bankerWeight += gameTheory.gameTheoryScore * 0.15;
    } else {
      playerWeight += gameTheory.gameTheoryScore * 0.15;
    }

    // 4. 기대값 가중치 (5%)
    bankerWeight += Math.max(0, ev.bankerEV) * 0.05;
    playerWeight += Math.max(0, ev.playerEV) * 0.05;

    // 5. AI 시퀀스 예측 가중치 (25%) - 학습 데이터 기반
    if (sequencePrediction) {
      const seqWeight = (sequencePrediction.confidence / 100) * 0.25;
      if (sequencePrediction.prediction === 'banker') {
        bankerWeight += seqWeight;
      } else if (sequencePrediction.prediction === 'player') {
        playerWeight += seqWeight;
      }
    }

    return bankerWeight >= playerWeight ? 'banker' : 'player';
  }

  /**
   * 리스크 레벨 평가
   */
  private static evaluateRiskLevel(
    betSize: number,
    bankroll: number,
    confidence: number
  ): 'low' | 'medium' | 'high' | 'extreme' {
    const betRatio = betSize / bankroll;

    if (betRatio > 0.2 || confidence < 20) return 'extreme';
    if (betRatio > 0.1 || confidence < 35) return 'high';
    if (betRatio > 0.05 || confidence < 50) return 'medium';
    return 'low';
  }

  /**
   * 추천 근거 문자열 생성
   */
  private static buildReasoning(
    direction: BetType,
    signals: PatternSignal[],
    prob: ProbabilityState,
    ev: ReturnType<typeof ProbabilityEngine.calculateEV>,
    sizeReasoning: string,
    gameTheory: { direction: BetType; gameTheoryScore: number },
    sequencePrediction?: { prediction: GameResult; confidence: number } | null
  ): string[] {
    const reasons: string[] = [];
    const dirLabel = direction === 'banker' ? '뱅커' : '플레이어';

    // AI 시퀀스 예측 (맨 위에 표시)
    if (sequencePrediction) {
      const predLabel = sequencePrediction.prediction === 'banker' ? '뱅커' : '플레이어';
      reasons.push(`AI 학습 예측: ${predLabel} (신뢰도 ${sequencePrediction.confidence.toFixed(0)}%)`);
    }

    // 확률
    reasons.push(
      `확률: 뱅커 ${(prob.bankerWin * 100).toFixed(1)}% / 플레이어 ${(prob.playerWin * 100).toFixed(1)}%`
    );

    // 기대값
    const dirEV = direction === 'banker' ? ev.bankerEV : ev.playerEV;
    reasons.push(`${dirLabel} 기대값: ${(dirEV * 100).toFixed(2)}%`);

    // 패턴 시그널
    const dirSignals = signals.filter(s => s.direction === direction);
    for (const signal of dirSignals.slice(0, 2)) {
      reasons.push(signal.description);
    }

    // 게임이론
    if (gameTheory.direction === direction) {
      reasons.push(`게임이론 지지 (강도: ${(gameTheory.gameTheoryScore * 100).toFixed(0)}%)`);
    }

    // 베팅 사이즈
    reasons.push(sizeReasoning);

    return reasons;
  }
}
