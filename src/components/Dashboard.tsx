import { useState } from 'react';
import type { GameSession, GameResult, BetType, BetRecommendation, RiskAlert as RiskAlertType } from '../utils/types';
import { Recommendation } from './Recommendation';
import { QuickInput } from './QuickInput';
import { RiskAlertPanel } from './RiskAlert';
import { BetInputModal } from './BetInputModal';
import { predictDerivedRoad } from '../engine/scoreboard';

interface Props {
  session: GameSession;
  recommendation: BetRecommendation | null;
  riskAlerts: RiskAlertType[];
  shoeType?: 'streak' | 'chop' | 'mixed';
  learningRounds?: number;
  onResult: (result: 'player' | 'banker' | 'tie', playerPair?: boolean, bankerPair?: boolean) => void;
  onUndo: () => void;
  onRecordBet: (betType: BetType, amount: number, result: GameResult) => void;
}

export function Dashboard({
  session,
  recommendation,
  riskAlerts,
  shoeType,
  learningRounds,
  onResult,
  onUndo,
  onRecordBet,
}: Props) {
  const { currentBankroll, settings, rounds, bets } = session;
  const profit = currentBankroll - settings.initialBankroll;
  const profitRate = (profit / settings.initialBankroll) * 100;

  // 베팅 입력 모달 상태
  const [pendingGameResult, setPendingGameResult] = useState<{
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
  } | null>(null);

  // 예측 중국점
  const results = rounds.map(r => r.result);
  const playerPrediction = results.length > 3 ? predictDerivedRoad(results, 'player') : null;
  const bankerPrediction = results.length > 3 ? predictDerivedRoad(results, 'banker') : null;

  // P/B/T 버튼 → 모달 열기
  const handleResult = (result: GameResult, playerPair = false, bankerPair = false) => {
    setPendingGameResult({ result, playerPair, bankerPair });
  };

  // 모달에서 베팅 확인
  const handleBetConfirm = (betType: BetType, amount: number) => {
    if (!pendingGameResult) return;
    const { result, playerPair, bankerPair } = pendingGameResult;
    onRecordBet(betType, amount, result);
    onResult(result, playerPair, bankerPair);
    setPendingGameResult(null);
  };

  // 모달에서 베팅 안 함
  const handleBetSkip = () => {
    if (!pendingGameResult) return;
    const { result, playerPair, bankerPair } = pendingGameResult;
    onResult(result, playerPair, bankerPair);
    setPendingGameResult(null);
  };

  return (
    <div className="space-y-4">
      {/* 베팅 입력 모달 */}
      {pendingGameResult && (
        <BetInputModal
          gameResult={pendingGameResult.result}
          recommendation={recommendation}
          minBet={settings.minBet}
          maxBet={settings.maxBet}
          onConfirm={handleBetConfirm}
          onSkip={handleBetSkip}
        />
      )}

      {/* 자본금 상태 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-slate-400 text-xs">현재 자본금</div>
            <div className="text-white text-2xl font-black">₩{currentBankroll.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs">수익</div>
            <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}₩{profit.toLocaleString()}
              <span className="text-xs ml-1">({profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
        {/* 자본금 바 */}
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${Math.min(100, Math.max(5, (currentBankroll / (settings.initialBankroll * 2)) * 100))}%`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{rounds.length}판 | {bets.length}베팅</span>
          <span>슈 진행률</span>
        </div>
      </div>

      {/* AI 학습 상태 미니 */}
      {shoeType && (
        <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-400 text-xs">AI 학습</span>
            <span className="text-white text-xs font-bold">{learningRounds ?? 0}판 누적</span>
          </div>
          <div className={`text-xs font-bold ${
            shoeType === 'streak' ? 'text-red-400' :
            shoeType === 'chop' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {shoeType === 'streak' ? '줄형 슈' : shoeType === 'chop' ? '깍두기형 슈' : '혼합형 슈'}
          </div>
        </div>
      )}

      {/* 리스크 경고 */}
      <RiskAlertPanel alerts={riskAlerts} />

      {/* AI 추천 */}
      <Recommendation recommendation={recommendation} />

      {/* 예측 중국점 (다음 결과별) */}
      {(playerPrediction || bankerPrediction) && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="text-white/50 text-xs mb-2">다음 결과별 중국점 예측</div>
          <div className="grid grid-cols-2 gap-3">
            <PredictionCard
              label="P 나오면"
              prediction={playerPrediction}
            />
            <PredictionCard
              label="B 나오면"
              prediction={bankerPrediction}
            />
          </div>
        </div>
      )}

      {/* 빠른 입력 */}
      <QuickInput
        onResult={handleResult}
        onUndo={onUndo}
        canUndo={rounds.length > 0}
      />
    </div>
  );
}

function PredictionCard({ label, prediction }: {
  label: string;
  prediction: { bigEyeBoy: string | null; smallRoad: string | null; cockroachPig: string | null } | null;
}) {
  if (!prediction) return null;

  const Dot = ({ color }: { color: string | null }) => {
    if (!color) return <span className="w-4 h-4 rounded-full bg-slate-600 inline-block" />;
    return (
      <span
        className={`w-4 h-4 rounded-full inline-block border-2 ${
          color === 'red' ? 'border-red-500' : 'border-blue-500'
        }`}
      />
    );
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-2">
      <div className="text-white/70 text-xs mb-1.5 font-bold">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-[10px]">중1</span>
          <Dot color={prediction.bigEyeBoy} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-[10px]">중2</span>
          <Dot color={prediction.smallRoad} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-[10px]">중3</span>
          <Dot color={prediction.cockroachPig} />
        </div>
      </div>
    </div>
  );
}
