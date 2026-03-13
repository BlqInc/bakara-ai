import type { Card, GameResult, HandDetail, RoundResult, Rank } from '../utils/types';
import { CARD_VALUES, BANKER_DRAW_RULES } from '../utils/constants';

/**
 * 카드 값 계산 (바카라 규칙: A=1, 2-9=액면가, 10/J/Q/K=0)
 */
export function getCardValue(card: Card): number {
  return CARD_VALUES[card.rank];
}

/**
 * 핸드의 합계 계산 (일의 자리만)
 */
export function calculateHandTotal(cards: Card[]): number {
  const sum = cards.reduce((acc, card) => acc + getCardValue(card), 0);
  return sum % 10;
}

/**
 * 내추럴 여부 (8 또는 9)
 */
export function isNatural(total: number): boolean {
  return total === 8 || total === 9;
}

/**
 * 핸드 상세 정보 생성
 */
export function createHandDetail(cards: Card[]): HandDetail {
  const total = calculateHandTotal(cards);
  return {
    cards,
    total,
    isNatural: isNatural(total),
  };
}

/**
 * 플레이어가 3번째 카드를 받는지 판정
 * - 양쪽 모두 2장씩 받은 후 판정
 * - 내추럴이면 양쪽 모두 스탠드
 * - 플레이어 합 0-5: 드로, 6-7: 스탠드
 */
export function shouldPlayerDraw(playerTotal: number, bankerTotal: number): boolean {
  // 어느 한쪽이라도 내추럴이면 드로 없음
  if (isNatural(playerTotal) || isNatural(bankerTotal)) {
    return false;
  }
  return playerTotal <= 5;
}

/**
 * 뱅커가 3번째 카드를 받는지 판정
 * - 플레이어가 스탠드(3번째 카드 없음)한 경우: 뱅커 0-5 드로, 6-7 스탠드
 * - 플레이어가 드로한 경우: 뱅커 합에 따라 플레이어 3번째 카드 값 기준 판정
 */
export function shouldBankerDraw(
  bankerTotal: number,
  playerTotal: number,
  playerDrew: boolean,
  playerThirdCard?: Card
): boolean {
  if (isNatural(playerTotal) || isNatural(bankerTotal)) {
    return false;
  }

  // 플레이어가 스탠드한 경우
  if (!playerDrew) {
    return bankerTotal <= 5;
  }

  // 플레이어가 드로한 경우 - 뱅커 드로 규칙 적용
  if (bankerTotal >= 7) return false;

  const p3Value = playerThirdCard ? getCardValue(playerThirdCard) : 0;
  const drawRule = BANKER_DRAW_RULES[bankerTotal];
  return drawRule ? drawRule(p3Value) : true;
}

/**
 * 승패 판정
 */
export function determineWinner(playerTotal: number, bankerTotal: number): GameResult {
  if (playerTotal > bankerTotal) return 'player';
  if (bankerTotal > playerTotal) return 'banker';
  return 'tie';
}

/**
 * 페어 판정 (첫 2장이 같은 랭크)
 */
export function isPair(cards: Card[]): boolean {
  if (cards.length < 2) return false;
  return cards[0].rank === cards[1].rank;
}

/**
 * 카드 입력으로 전체 라운드 시뮬레이션
 */
export function simulateRound(
  playerCards: [Card, Card],
  bankerCards: [Card, Card],
  playerThirdCard?: Card,
  bankerThirdCard?: Card
): {
  playerHand: HandDetail;
  bankerHand: HandDetail;
  result: GameResult;
  playerPair: boolean;
  bankerPair: boolean;
} {
  const pInitialTotal = calculateHandTotal(playerCards);
  const bInitialTotal = calculateHandTotal(bankerCards);

  const allPlayerCards: Card[] = [...playerCards];
  const allBankerCards: Card[] = [...bankerCards];

  // 내추럴 체크
  if (!isNatural(pInitialTotal) && !isNatural(bInitialTotal)) {
    // 플레이어 3번째 카드
    const playerDrew = shouldPlayerDraw(pInitialTotal, bInitialTotal);
    if (playerDrew && playerThirdCard) {
      allPlayerCards.push(playerThirdCard);
    }

    // 뱅커 3번째 카드
    const bankerShouldDraw = shouldBankerDraw(
      bInitialTotal,
      pInitialTotal,
      playerDrew,
      playerThirdCard
    );
    if (bankerShouldDraw && bankerThirdCard) {
      allBankerCards.push(bankerThirdCard);
    }
  }

  const playerHand = createHandDetail(allPlayerCards);
  const bankerHand = createHandDetail(allBankerCards);
  const result = determineWinner(playerHand.total, bankerHand.total);

  return {
    playerHand,
    bankerHand,
    result,
    playerPair: isPair(playerCards),
    bankerPair: isPair(bankerCards),
  };
}

/**
 * 간단 결과 입력 (P/B/T)으로 RoundResult 생성
 */
export function createSimpleRound(
  id: number,
  result: GameResult,
  playerPair: boolean = false,
  bankerPair: boolean = false
): RoundResult {
  return {
    id,
    result,
    playerPair,
    bankerPair,
    timestamp: Date.now(),
  };
}

/**
 * 랭크 문자열을 Rank 타입으로 변환
 */
export function parseRank(input: string): Rank | null {
  const upper = input.toUpperCase();
  const rankMap: Record<string, Rank> = {
    'A': 'A', '1': 'A',
    '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9',
    '10': '10', '0': '10', 'T': '10',
    'J': 'J', 'Q': 'Q', 'K': 'K',
  };
  return rankMap[upper] ?? null;
}
