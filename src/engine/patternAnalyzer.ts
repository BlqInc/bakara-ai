import type { GameResult, PatternSignal, DerivedRoadEntry, BetType } from '../utils/types';
import { buildBigRoad, getBigRoadColumns, buildBigEyeBoy, buildSmallRoad, buildCockroachPig } from './scoreboard';

/**
 * 패턴 분석기 - 본매와 중국점에서 패턴을 감지하고 시그널을 생성
 */
export class PatternAnalyzer {
  /**
   * 모든 패턴 시그널 생성
   */
  static analyze(results: GameResult[]): PatternSignal[] {
    if (results.length < 3) return [];

    const signals: PatternSignal[] = [];

    // 줄(연승) 패턴
    const streakSignal = this.analyzeStreak(results);
    if (streakSignal) signals.push(streakSignal);

    // 깍두기(교대) 패턴
    const chopSignal = this.analyzeChop(results);
    if (chopSignal) signals.push(chopSignal);

    // 장줄(드래곤) 패턴
    const dragonSignal = this.analyzeDragon(results);
    if (dragonSignal) signals.push(dragonSignal);

    // 핑퐁 패턴
    const pingPongSignal = this.analyzePingPong(results);
    if (pingPongSignal) signals.push(pingPongSignal);

    // 중국점 트렌드 분석
    const chinaSignals = this.analyzeDerivedRoads(results);
    signals.push(...chinaSignals);

    // 최근 트렌드 가중치
    const recentSignal = this.analyzeRecentTrend(results);
    if (recentSignal) signals.push(recentSignal);

    return signals;
  }

  /**
   * 줄(연승) 패턴 감지
   * - 같은 결과가 연속으로 나오는 패턴
   * - 연속이 길수록 강도 증가 (하지만 끊길 확률도 고려)
   */
  static analyzeStreak(results: GameResult[]): PatternSignal | null {
    const pbResults = results.filter(r => r !== 'tie');
    if (pbResults.length < 2) return null;

    let streakCount = 1;
    const lastResult = pbResults[pbResults.length - 1];

    for (let i = pbResults.length - 2; i >= 0; i--) {
      if (pbResults[i] === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }

    if (streakCount < 2) return null;

    // 줄이 계속될 확률 vs 끊길 확률
    // 긴 줄은 유지 경향이 있지만, 동시에 끊길 가능성도 높아짐
    // 3-5줄: 유지 추천, 6줄+: 반전 주의
    if (streakCount <= 5) {
      return {
        type: '줄 패턴',
        direction: lastResult as BetType,
        strength: Math.min(0.3 + streakCount * 0.1, 0.7),
        description: `${lastResult === 'banker' ? '뱅커' : '플레이어'} ${streakCount}연속 - 줄 유지 가능성`,
      };
    } else {
      return {
        type: '장줄 주의',
        direction: (lastResult === 'banker' ? 'player' : 'banker') as BetType,
        strength: 0.3,
        description: `${streakCount}연속 장줄 - 반전 가능성 주의 (하지만 줄은 줄을 부름)`,
      };
    }
  }

  /**
   * 깍두기(교대) 패턴 감지
   * - P-B-P-B 또는 B-P-B-P 교대 패턴
   */
  static analyzeChop(results: GameResult[]): PatternSignal | null {
    const pbResults = results.filter(r => r !== 'tie');
    if (pbResults.length < 4) return null;

    // 최근 N개의 교대 패턴 체크
    let chopCount = 0;
    for (let i = pbResults.length - 1; i > 0; i--) {
      if (pbResults[i] !== pbResults[i - 1]) {
        chopCount++;
      } else {
        break;
      }
    }

    if (chopCount < 3) return null;

    const lastResult = pbResults[pbResults.length - 1];
    const nextExpected = lastResult === 'banker' ? 'player' : 'banker';

    return {
      type: '깍두기 패턴',
      direction: nextExpected as BetType,
      strength: Math.min(0.3 + chopCount * 0.08, 0.65),
      description: `${chopCount}연속 교대 - ${nextExpected === 'banker' ? '뱅커' : '플레이어'} 예상`,
    };
  }

  /**
   * 장줄(드래곤) 패턴 감지
   * - 본매에서 한 열이 6행을 초과하여 계속 내려가는 패턴
   */
  static analyzeDragon(results: GameResult[]): PatternSignal | null {
    const bigRoad = buildBigRoad(results);
    const columns = getBigRoadColumns(bigRoad);

    if (columns.length === 0) return null;

    const lastColumn = columns[columns.length - 1];
    if (lastColumn.length < 6) return null;

    const result = lastColumn[0].entry.result;

    return {
      type: '드래곤 패턴',
      direction: result as BetType,
      strength: Math.min(0.5 + (lastColumn.length - 6) * 0.05, 0.8),
      description: `드래곤 ${lastColumn.length}줄 진행 중 - ${result === 'banker' ? '뱅커' : '플레이어'} 강세`,
    };
  }

  /**
   * 핑퐁 패턴 감지 (1-1-1-1 또는 2-2-2-2 패턴)
   */
  static analyzePingPong(results: GameResult[]): PatternSignal | null {
    const bigRoad = buildBigRoad(results);
    const columns = getBigRoadColumns(bigRoad);

    if (columns.length < 4) return null;

    // 최근 4개 열의 길이 패턴 확인
    const recentCols = columns.slice(-4);
    const lengths = recentCols.map(c => c.length);

    // 1-1-1-1 패턴 (완전 교대)
    if (lengths.every(l => l === 1)) {
      const lastResult = recentCols[recentCols.length - 1][0].entry.result;
      const nextExpected = lastResult === 'banker' ? 'player' : 'banker';
      return {
        type: '핑퐁 1-1',
        direction: nextExpected as BetType,
        strength: 0.5,
        description: `1-1 핑퐁 패턴 - ${nextExpected === 'banker' ? '뱅커' : '플레이어'} 예상`,
      };
    }

    // 2-2-2-2 패턴
    if (lengths.every(l => l === 2)) {
      const lastCol = recentCols[recentCols.length - 1];
      if (lastCol.length === 2) {
        // 현재 열이 2로 완성되었으면 다음 열은 반대
        const lastResult = lastCol[0].entry.result;
        const nextExpected = lastResult === 'banker' ? 'player' : 'banker';
        return {
          type: '핑퐁 2-2',
          direction: nextExpected as BetType,
          strength: 0.45,
          description: `2-2 핑퐁 패턴 - ${nextExpected === 'banker' ? '뱅커' : '플레이어'} 예상`,
        };
      }
    }

    return null;
  }

  /**
   * 중국점 트렌드 분석
   * - 빨강 비율이 높으면 패턴 유지 (줄 경향)
   * - 파랑 비율이 높으면 패턴 변화 (깍두기 경향)
   */
  static analyzeDerivedRoads(results: GameResult[]): PatternSignal[] {
    const signals: PatternSignal[] = [];

    const analyzeRoad = (entries: DerivedRoadEntry[], name: string) => {
      if (entries.length < 5) return;

      const recent = entries.slice(-10);
      const redCount = recent.filter(e => e.color === 'red').length;
      const blueCount = recent.filter(e => e.color === 'blue').length;
      const total = recent.length;
      const redRatio = redCount / total;

      if (redRatio > 0.65) {
        // 빨강 우세 = 패턴 유지 경향 (줄이 이어질 가능성)
        const pbResults = results.filter(r => r !== 'tie');
        const lastResult = pbResults[pbResults.length - 1];
        signals.push({
          type: `${name} 빨강 우세`,
          direction: lastResult as BetType,
          strength: (redRatio - 0.5) * 0.8,
          description: `${name} 빨강 ${Math.round(redRatio * 100)}% - 현재 패턴 유지 경향`,
        });
      } else if (redRatio < 0.35) {
        // 파랑 우세 = 패턴 변화 경향 (교대가 이어질 가능성)
        const pbResults = results.filter(r => r !== 'tie');
        const lastResult = pbResults[pbResults.length - 1];
        const nextExpected = lastResult === 'banker' ? 'player' : 'banker';
        signals.push({
          type: `${name} 파랑 우세`,
          direction: nextExpected as BetType,
          strength: (0.5 - redRatio) * 0.8,
          description: `${name} 파랑 ${Math.round((1 - redRatio) * 100)}% - 패턴 변화 경향`,
        });
      }
    };

    analyzeRoad(buildBigEyeBoy(results), '중국점1');
    analyzeRoad(buildSmallRoad(results), '중국점2');
    analyzeRoad(buildCockroachPig(results), '중국점3');

    return signals;
  }

  /**
   * 최근 N판 트렌드 분석
   */
  static analyzeRecentTrend(results: GameResult[], n: number = 20): PatternSignal | null {
    const pbResults = results.filter(r => r !== 'tie');
    if (pbResults.length < n) return null;

    const recent = pbResults.slice(-n);
    const bankerCount = recent.filter(r => r === 'banker').length;
    const playerCount = recent.filter(r => r === 'player').length;

    const bankerRatio = bankerCount / n;

    if (bankerRatio > 0.6) {
      return {
        type: '최근 트렌드',
        direction: 'banker',
        strength: (bankerRatio - 0.5) * 0.6,
        description: `최근 ${n}판 뱅커 ${bankerCount}승 (${Math.round(bankerRatio * 100)}%) - 뱅커 우세`,
      };
    } else if (bankerRatio < 0.4) {
      return {
        type: '최근 트렌드',
        direction: 'player',
        strength: (0.5 - bankerRatio) * 0.6,
        description: `최근 ${n}판 플레이어 ${playerCount}승 (${Math.round((1 - bankerRatio) * 100)}%) - 플레이어 우세`,
      };
    }

    return null;
  }

  /**
   * 패턴 전환 시점 감지
   * - 긴 줄 후 교대로 전환
   * - 교대 후 줄로 전환
   */
  static detectPatternShift(results: GameResult[]): string | null {
    const bigRoad = buildBigRoad(results);
    const columns = getBigRoadColumns(bigRoad);

    if (columns.length < 3) return null;

    const recentLengths = columns.slice(-3).map(c => c.length);

    // 긴 줄 후 짧은 열 = 패턴 전환 가능
    if (recentLengths[0] >= 4 && recentLengths[1] <= 2 && recentLengths[2] <= 2) {
      return '줄 → 깍두기 전환 감지';
    }

    // 짧은 열 연속 후 긴 줄 시작 = 패턴 전환
    if (recentLengths[0] <= 2 && recentLengths[1] <= 2 && recentLengths[2] >= 3) {
      return '깍두기 → 줄 전환 감지';
    }

    return null;
  }
}
