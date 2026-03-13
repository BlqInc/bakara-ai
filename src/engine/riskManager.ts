import type { GameSession, RiskAlert, BetRecord } from '../utils/types';

/**
 * 리스크 매니저 - 자본금 관리, 손절/이익실현, 감정 제어
 */
export class RiskManager {
  /**
   * 모든 리스크 경고 생성
   */
  static evaluate(session: GameSession): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    const { settings, currentBankroll, peakBankroll, bets } = session;
    const profit = currentBankroll - settings.initialBankroll;

    // 1. 손절선 체크
    if (-profit >= settings.stopLoss) {
      alerts.push({
        level: 'critical',
        message: `손절선 도달! 손실 ₩${Math.abs(profit).toLocaleString()} / 한도 ₩${settings.stopLoss.toLocaleString()}`,
        action: '즉시 게임 중단을 강력 권고합니다',
      });
    } else if (-profit >= settings.stopLoss * 0.8) {
      alerts.push({
        level: 'danger',
        message: `손절선 80% 접근! 손실 ₩${Math.abs(profit).toLocaleString()}`,
        action: '베팅 금액을 줄이세요',
      });
    } else if (-profit >= settings.stopLoss * 0.5) {
      alerts.push({
        level: 'warning',
        message: `손절선 50% 접근. 손실 ₩${Math.abs(profit).toLocaleString()}`,
      });
    }

    // 2. 이익실현선 체크
    if (profit >= settings.takeProfit) {
      alerts.push({
        level: 'info',
        message: `이익실현 목표 달성! 수익 ₩${profit.toLocaleString()}`,
        action: '목표 달성 - 게임 종료를 권장합니다',
      });
    } else if (profit >= settings.takeProfit * 0.8) {
      alerts.push({
        level: 'info',
        message: `이익실현 80% 접근. 수익 ₩${profit.toLocaleString()}`,
      });
    }

    // 3. 드로다운 체크
    const drawdown = peakBankroll > 0 ? (peakBankroll - currentBankroll) / peakBankroll : 0;
    if (drawdown >= 0.3) {
      alerts.push({
        level: 'danger',
        message: `최고점 대비 ${(drawdown * 100).toFixed(1)}% 하락 (₩${(peakBankroll - currentBankroll).toLocaleString()})`,
        action: '큰 드로다운 - 휴식을 권장합니다',
      });
    } else if (drawdown >= 0.15) {
      alerts.push({
        level: 'warning',
        message: `최고점 대비 ${(drawdown * 100).toFixed(1)}% 하락`,
      });
    }

    // 4. 연패 체크
    const consecutiveLosses = this.getConsecutiveLosses(bets);
    if (consecutiveLosses >= settings.maxConsecutiveLoss) {
      alerts.push({
        level: 'critical',
        message: `${consecutiveLosses}연패! 최대 허용 연패(${settings.maxConsecutiveLoss})회 초과`,
        action: '잠시 쉬고 전략을 재검토하세요',
      });
    } else if (consecutiveLosses >= settings.maxConsecutiveLoss - 1) {
      alerts.push({
        level: 'danger',
        message: `${consecutiveLosses}연패 - 연패 한도 임박`,
      });
    } else if (consecutiveLosses >= 3) {
      alerts.push({
        level: 'warning',
        message: `${consecutiveLosses}연패 진행 중`,
      });
    }

    // 5. 세션 시간 체크
    const sessionMinutes = (Date.now() - session.startTime) / 60000;
    if (sessionMinutes >= settings.sessionTimeLimit) {
      alerts.push({
        level: 'danger',
        message: `세션 시간 ${Math.floor(sessionMinutes)}분 - 시간 제한 초과`,
        action: '장시간 게임은 판단력을 흐리게 합니다',
      });
    } else if (sessionMinutes >= settings.sessionTimeLimit * 0.8) {
      alerts.push({
        level: 'warning',
        message: `세션 시간 ${Math.floor(sessionMinutes)}분 - 시간 제한 접근`,
      });
    }

    // 6. 감정 제어 알림
    const emotionAlert = this.checkEmotionalState(bets);
    if (emotionAlert) alerts.push(emotionAlert);

    // 7. 자본금 대비 베팅 비율 체크
    if (bets.length > 0) {
      const lastBet = bets[bets.length - 1];
      const betRatio = lastBet.amount / currentBankroll;
      if (betRatio > 0.2) {
        alerts.push({
          level: 'warning',
          message: `베팅 비율 ${(betRatio * 100).toFixed(1)}% - 자본금 대비 과도한 베팅`,
          action: '자본금의 5% 이하로 베팅을 권장합니다',
        });
      }
    }

    return alerts;
  }

  /**
   * 연속 패배 횟수
   */
  private static getConsecutiveLosses(bets: BetRecord[]): number {
    let count = 0;
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].result === 'lose') count++;
      else break;
    }
    return count;
  }

  /**
   * 감정 상태 체크 (틸트 감지)
   */
  private static checkEmotionalState(bets: BetRecord[]): RiskAlert | null {
    if (bets.length < 5) return null;

    const recent = bets.slice(-5);

    // 빠른 연속 베팅 감지 (1분 이내 5번)
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    if (timeSpan < 60000 && timeSpan > 0) {
      return {
        level: 'warning',
        message: '베팅 속도가 너무 빠릅니다 - 신중하게 판단하세요',
        action: '30초 이상 생각하고 베팅하세요',
      };
    }

    // 큰 손실 후 즉시 큰 베팅 (틸트)
    if (bets.length >= 2) {
      const prevBet = bets[bets.length - 2];
      const lastBet = bets[bets.length - 1];
      if (
        prevBet.result === 'lose' &&
        lastBet.amount > prevBet.amount * 2.5 &&
        lastBet.timestamp - prevBet.timestamp < 30000
      ) {
        return {
          level: 'danger',
          message: '틸트 감지! 손실 후 급격한 베팅 증가',
          action: '감정적 베팅은 더 큰 손실을 초래합니다. 잠시 쉬세요.',
        };
      }
    }

    return null;
  }

  /**
   * 파산 확률 계산 (현재 상태 기반)
   */
  static calculateBustProbability(
    currentBankroll: number,
    betSize: number,
    winProb: number,
    remainingRounds: number = 50
  ): number {
    if (betSize <= 0 || currentBankroll <= 0) return 1;

    const units = Math.floor(currentBankroll / betSize);
    const p = winProb;
    const q = 1 - p;

    // 간단한 시뮬레이션 기반 추정
    const simulations = 1000;
    let bustCount = 0;

    for (let sim = 0; sim < simulations; sim++) {
      let bank = units;
      for (let round = 0; round < remainingRounds; round++) {
        bank += Math.random() < p ? 1 : -1;
        if (bank <= 0) {
          bustCount++;
          break;
        }
      }
    }

    return bustCount / simulations;
  }

  /**
   * 세션 통계 요약
   */
  static getSessionStats(session: GameSession) {
    const { settings, bets, currentBankroll, peakBankroll } = session;
    const profit = currentBankroll - settings.initialBankroll;
    const totalBets = bets.length;
    const wins = bets.filter(b => b.result === 'win').length;
    const losses = bets.filter(b => b.result === 'lose').length;
    const pushes = bets.filter(b => b.result === 'push').length;
    const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
    const drawdown = peakBankroll > 0 ? (peakBankroll - currentBankroll) / peakBankroll : 0;
    const sessionMinutes = (Date.now() - session.startTime) / 60000;

    // 최대 연패/연승
    let maxConsecWin = 0, maxConsecLoss = 0;
    let currentWin = 0, currentLoss = 0;
    for (const bet of bets) {
      if (bet.result === 'win') {
        currentWin++;
        currentLoss = 0;
        maxConsecWin = Math.max(maxConsecWin, currentWin);
      } else if (bet.result === 'lose') {
        currentLoss++;
        currentWin = 0;
        maxConsecLoss = Math.max(maxConsecLoss, currentLoss);
      }
    }

    return {
      profit,
      profitRate: settings.initialBankroll > 0 ? profit / settings.initialBankroll : 0,
      totalBets,
      wins,
      losses,
      pushes,
      winRate: totalBets > 0 ? wins / (wins + losses) : 0,
      totalWagered,
      averageBet: totalBets > 0 ? totalWagered / totalBets : 0,
      maxDrawdown: drawdown,
      peakBankroll,
      maxConsecWin,
      maxConsecLoss,
      sessionMinutes,
    };
  }
}
