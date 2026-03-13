// === 카드 & 게임 기본 타입 ===

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GameResult = 'player' | 'banker' | 'tie';

export interface HandDetail {
  cards: Card[];
  total: number;        // 합 (0-9)
  isNatural: boolean;   // 8 or 9
}

export interface RoundResult {
  id: number;
  result: GameResult;
  playerHand?: HandDetail;
  bankerHand?: HandDetail;
  playerPair: boolean;
  bankerPair: boolean;
  timestamp: number;
}

// === 스코어보드 타입 ===

export interface BigRoadEntry {
  result: GameResult;         // player or banker (tie는 이전 결과에 마킹)
  tieCount: number;           // 이 위치에서의 타이 수
  playerPair: boolean;
  bankerPair: boolean;
}

// 본매 그리드에서의 위치
export interface BigRoadCell {
  col: number;
  row: number;
  entry: BigRoadEntry;
}

// 중국점 엔트리 (빨강 또는 파랑)
export type DerivedRoadColor = 'red' | 'blue';

export interface DerivedRoadEntry {
  color: DerivedRoadColor;
  col: number;
  row: number;
}

// === 베팅 관련 타입 ===

export type BetType = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair' | 'skip';

export type StrategyType =
  | 'flat'
  | 'martingale'
  | 'antiMartingale'
  | 'fibonacci'
  | 'oneThreeTwoSix'
  | 'oscarGrind'
  | 'kelly';

export interface BetRecommendation {
  betType: BetType;
  amount: number;
  confidence: number;         // 0-100
  reasoning: string[];        // 추천 근거
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  expectedValue: number;      // 기대값
}

export interface BetRecord {
  roundId: number;
  betType: BetType;
  amount: number;
  result: 'win' | 'lose' | 'push';
  payout: number;
  balanceAfter: number;
  timestamp: number;
}

// === 세션 & 설정 타입 ===

export interface SessionSettings {
  initialBankroll: number;    // 초기 자본금
  minBet: number;             // 최소 베팅
  maxBet: number;             // 최대 베팅
  stopLoss: number;           // 손절선 (금액)
  takeProfit: number;         // 이익실현선 (금액)
  strategy: StrategyType;     // 베팅 전략
  maxConsecutiveLoss: number; // 최대 연패 허용
  sessionTimeLimit: number;   // 세션 시간 제한 (분)
}

export interface GameSession {
  id: string;
  startTime: number;
  settings: SessionSettings;
  rounds: RoundResult[];
  bets: BetRecord[];
  currentBankroll: number;
  peakBankroll: number;       // 최고 자본금 (드로다운 계산용)
}

// === 확률 & 분석 타입 ===

export interface ProbabilityState {
  playerWin: number;
  bankerWin: number;
  tie: number;
  playerPair: number;
  bankerPair: number;
}

export interface PatternSignal {
  type: string;
  direction: BetType;         // 추천 방향
  strength: number;           // 0-1
  description: string;
}

export interface RiskAlert {
  level: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  action?: string;
}

// === 슈 트래커 타입 ===

export interface ShoeState {
  totalDecks: number;
  cardsDealt: number;
  remainingCards: number;
  cardCounts: Record<Rank, number>;   // 남은 카드 수
  shoeProgress: number;               // 0-1 진행률
}

// === UI 상태 타입 ===

export type ViewTab = 'dashboard' | 'scoreboard' | 'statistics' | 'history' | 'settings';

export interface AppState {
  session: GameSession | null;
  isSessionActive: boolean;
  currentView: ViewTab;
  recommendation: BetRecommendation | null;
  probability: ProbabilityState;
  riskAlerts: RiskAlert[];
  shoeState: ShoeState;
}
