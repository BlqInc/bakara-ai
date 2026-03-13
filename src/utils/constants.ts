import type { ProbabilityState, SessionSettings, Rank } from './types';

// === 바카라 기본 상수 ===

export const DECK_COUNT = 8;
export const CARDS_PER_DECK = 52;
export const TOTAL_CARDS = DECK_COUNT * CARDS_PER_DECK; // 416

// 카드 값 매핑
export const CARD_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 0, 'J': 0, 'Q': 0, 'K': 0,
};

// 8덱 기준 각 랭크별 초기 카드 수
export const INITIAL_CARD_COUNTS: Record<Rank, number> = {
  'A': 32, '2': 32, '3': 32, '4': 32, '5': 32,
  '6': 32, '7': 32, '8': 32, '9': 32,
  '10': 32, 'J': 32, 'Q': 32, 'K': 32,
};

// === 확률 상수 (8덱 기준) ===

// 기본 확률 (무한 덱 근사)
export const BASE_PROBABILITY: ProbabilityState = {
  playerWin: 0.4462,
  bankerWin: 0.4586,
  tie: 0.0952,
  playerPair: 0.0747,
  bankerPair: 0.0747,
};

// 하우스 엣지
export const HOUSE_EDGE = {
  player: 0.0124,     // 1.24%
  banker: 0.0106,     // 1.06% (5% 커미션 포함)
  tie: 0.1436,        // 14.36%
  playerPair: 0.1136, // 11.36%
  bankerPair: 0.1136, // 11.36%
};

// 배당률
export const PAYOUT = {
  player: 1,          // 1:1
  banker: 0.95,       // 1:1 - 5% 커미션
  tie: 8,             // 8:1
  playerPair: 11,     // 11:1
  bankerPair: 11,     // 11:1
};

// === 뱅커 3번째 카드 룰 ===
// 뱅커 합계별, 플레이어 3번째 카드 값에 따른 드로 여부
// true = 뱅커가 3번째 카드를 받음
export const BANKER_DRAW_RULES: Record<number, (playerThirdCard: number) => boolean> = {
  0: () => true,
  1: () => true,
  2: () => true,
  3: (p3) => p3 !== 8,
  4: (p3) => p3 >= 2 && p3 <= 7,
  5: (p3) => p3 >= 4 && p3 <= 7,
  6: (p3) => p3 === 6 || p3 === 7,
  7: () => false,
};

// === 기본 설정 ===

export const DEFAULT_SETTINGS: SessionSettings = {
  initialBankroll: 1000000,      // 100만원
  minBet: 10000,                 // 1만원
  maxBet: 500000,                // 50만원
  stopLoss: 300000,              // 30만원 손절
  takeProfit: 500000,            // 50만원 이익실현
  strategy: 'kelly',
  maxConsecutiveLoss: 5,
  sessionTimeLimit: 120,         // 2시간
};

// === 본매 스코어보드 상수 ===

export const SCOREBOARD_ROWS = 6;      // 본매 행 수
export const SCOREBOARD_COLS = 40;     // 본매 열 수 (최대)

// === UI 상수 ===

export const COLORS = {
  banker: '#dc2626',     // 빨강
  player: '#2563eb',     // 파랑
  tie: '#16a34a',        // 녹색
  skip: '#6b7280',       // 회색
};

// === 베팅 전략 라벨 ===

export const STRATEGY_LABELS: Record<string, string> = {
  flat: '플랫 베팅',
  martingale: '마틴게일',
  antiMartingale: '안티 마틴게일 (파롤리)',
  fibonacci: '피보나치',
  oneThreeTwoSix: '1-3-2-6 시스템',
  oscarGrind: '오스카 그라인드',
  kelly: '켈리 기준',
};
