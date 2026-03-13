import type { Card, Rank, ShoeState } from '../utils/types';
import { CARD_VALUES, DECK_COUNT, TOTAL_CARDS, INITIAL_CARD_COUNTS } from '../utils/constants';

/**
 * 슈 트래커 - 8덱 슈의 카드 소진 상태를 추적하여 확률 변동을 계산
 */
export class ShoeTracker {
  private cardCounts: Record<Rank, number>;
  private cardsDealt: number;

  constructor() {
    this.cardCounts = { ...INITIAL_CARD_COUNTS };
    this.cardsDealt = 0;
  }

  /**
   * 슈 리셋 (새 슈 시작)
   */
  reset(): void {
    this.cardCounts = { ...INITIAL_CARD_COUNTS };
    this.cardsDealt = 0;
  }

  /**
   * 카드 사용 기록
   */
  dealCard(card: Card): void {
    if (this.cardCounts[card.rank] > 0) {
      this.cardCounts[card.rank]--;
      this.cardsDealt++;
    }
  }

  /**
   * 여러 카드 한 번에 기록
   */
  dealCards(cards: Card[]): void {
    cards.forEach(card => this.dealCard(card));
  }

  /**
   * 특정 랭크의 남은 카드 수
   */
  getRemainingCount(rank: Rank): number {
    return this.cardCounts[rank];
  }

  /**
   * 전체 남은 카드 수
   */
  getRemainingTotal(): number {
    return TOTAL_CARDS - this.cardsDealt;
  }

  /**
   * 슈 진행률 (0-1)
   */
  getProgress(): number {
    return this.cardsDealt / TOTAL_CARDS;
  }

  /**
   * 현재 슈 상태
   */
  getState(): ShoeState {
    return {
      totalDecks: DECK_COUNT,
      cardsDealt: this.cardsDealt,
      remainingCards: this.getRemainingTotal(),
      cardCounts: { ...this.cardCounts },
      shoeProgress: this.getProgress(),
    };
  }

  /**
   * 특정 값(0-9)을 가진 카드가 나올 확률
   * 바카라에서는 0값 카드가 10, J, Q, K 네 종류이므로 합산
   */
  getProbabilityOfValue(value: number): number {
    const remaining = this.getRemainingTotal();
    if (remaining === 0) return 0;

    let count = 0;
    if (value === 0) {
      count = this.cardCounts['10'] + this.cardCounts['J'] + this.cardCounts['Q'] + this.cardCounts['K'];
    } else {
      // value 1=A, 2=2, ..., 9=9
      const rankMap: Record<number, Rank> = {
        1: 'A', 2: '2', 3: '3', 4: '4', 5: '5',
        6: '6', 7: '7', 8: '8', 9: '9',
      };
      const rank = rankMap[value];
      if (rank) count = this.cardCounts[rank];
    }

    return count / remaining;
  }

  /**
   * 카드 카운팅 인디케이터 계산
   * 높은 카드(0값) 비율이 높으면 뱅커 유리, 낮은 카드 비율이 높으면 플레이어 유리
   * 리턴값: 양수 = 뱅커 유리, 음수 = 플레이어 유리
   */
  getCountingIndicator(): number {
    const remaining = this.getRemainingTotal();
    if (remaining === 0) return 0;

    // 0값 카드(10, J, Q, K) 비율
    const zeroCards = this.cardCounts['10'] + this.cardCounts['J'] + this.cardCounts['Q'] + this.cardCounts['K'];
    const zeroRatio = zeroCards / remaining;

    // 기본 비율: 128/416 = 0.3077 (8덱 기준)
    const baseZeroRatio = (DECK_COUNT * 16) / TOTAL_CARDS;

    // 0값 비율이 높으면 뱅커 유리 (3번째 카드 룰 특성)
    // 낮은 값 카드가 많으면 플레이어 유리
    const lowCards = this.cardCounts['A'] + this.cardCounts['2'] + this.cardCounts['3'] + this.cardCounts['4'];
    const lowRatio = lowCards / remaining;
    const baseLowRatio = (DECK_COUNT * 16) / TOTAL_CARDS;

    return (zeroRatio - baseZeroRatio) * 100 - (lowRatio - baseLowRatio) * 50;
  }

  /**
   * 뱅커/플레이어 확률 보정값 계산
   * 카드 카운팅에 기반한 미세한 확률 조정
   */
  getProbabilityAdjustment(): { bankerAdj: number; playerAdj: number } {
    const indicator = this.getCountingIndicator();

    // 효과는 매우 작음 (바카라 카드 카운팅의 현실적 한계)
    // 슈가 진행될수록 약간 더 영향
    const progressMultiplier = Math.min(this.getProgress() * 2, 1);

    return {
      bankerAdj: indicator * 0.0001 * progressMultiplier,
      playerAdj: -indicator * 0.0001 * progressMultiplier,
    };
  }
}
