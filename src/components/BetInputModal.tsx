import { useState } from 'react';
import type { BetType, BetRecommendation, GameResult } from '../utils/types';

interface Props {
  gameResult: GameResult;
  recommendation: BetRecommendation | null;
  minBet: number;
  maxBet: number;
  onConfirm: (betType: BetType, amount: number) => void;
  onSkip: () => void;
}

export function BetInputModal({ gameResult, recommendation, minBet, maxBet, onConfirm, onSkip }: Props) {
  const recAmount = recommendation?.amount ?? minBet;
  const recBetType = recommendation?.betType ?? 'skip';

  const [amount, setAmount] = useState(recAmount);
  const [betType, setBetType] = useState<BetType>(
    recBetType === 'skip' ? 'player' : recBetType
  );
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const resultLabel = gameResult === 'player' ? '플레이어 승' : gameResult === 'banker' ? '뱅커 승' : '타이';
  const resultColor = gameResult === 'player' ? 'text-blue-400' : gameResult === 'banker' ? 'text-red-400' : 'text-green-400';

  const quickAmounts = [
    minBet,
    minBet * 2,
    minBet * 5,
    minBet * 10,
  ].filter(a => a <= maxBet);

  const startEditing = () => {
    setInputValue(String(amount));
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    const parsed = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed)) return;
    const clamped = Math.min(maxBet, Math.max(minBet, parsed));
    setAmount(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') finishEditing();
    if (e.key === 'Escape') setEditing(false);
  };

  const betOptions: { type: BetType; label: string; color: string; activeColor: string }[] = [
    { type: 'player', label: 'P', color: 'text-blue-400', activeColor: 'bg-blue-600 text-white' },
    { type: 'banker', label: 'B', color: 'text-red-400', activeColor: 'bg-red-600 text-white' },
    { type: 'tie', label: 'T', color: 'text-green-400', activeColor: 'bg-green-600 text-white' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-slate-800 w-full max-w-md rounded-t-3xl p-5 pb-8 animate-slide-up">
        {/* 결과 표시 */}
        <div className="text-center mb-4">
          <div className="text-slate-400 text-xs mb-1">이번 판 결과</div>
          <div className={`text-2xl font-black ${resultColor}`}>{resultLabel}</div>
        </div>

        {/* 추천 정보 */}
        {recommendation && recBetType !== 'skip' && (
          <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
            <div className="text-slate-400 text-xs mb-1">AI 추천</div>
            <div className="flex justify-between items-center">
              <span className="text-yellow-300 text-sm font-bold">
                {recBetType === 'player' ? '플레이어' : recBetType === 'banker' ? '뱅커' : '타이'} · ₩{recAmount.toLocaleString()}
              </span>
              <span className="text-slate-500 text-xs">신뢰도 {recommendation.confidence}%</span>
            </div>
          </div>
        )}

        {/* 실제 베팅 방향 */}
        <div className="mb-4">
          <div className="text-slate-400 text-xs mb-2">실제 베팅 방향</div>
          <div className="grid grid-cols-3 gap-2">
            {betOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => setBetType(opt.type)}
                className={`py-3 rounded-xl text-sm font-black transition-all active:scale-95 ${
                  betType === opt.type
                    ? opt.activeColor
                    : 'bg-slate-700 ' + opt.color
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 실제 베팅 금액 */}
        <div className="mb-4">
          <div className="text-slate-400 text-xs mb-2">실제 베팅 금액</div>

          {/* 현재 금액 표시 */}
          <div className="text-center mb-3">
            {editing ? (
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full text-center bg-slate-700 text-white font-black text-2xl rounded-xl px-4 py-3 outline-none border-2 border-yellow-500"
              />
            ) : (
              <button
                onClick={startEditing}
                className="w-full text-center bg-slate-700/50 text-white font-black text-2xl rounded-xl px-4 py-3 active:bg-slate-600/50 transition-colors"
              >
                ₩{amount.toLocaleString()}
              </button>
            )}
          </div>

          {/* 빠른 금액 버튼 */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  amount === a
                    ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                ₩{a >= 10000 ? `${a / 10000}만` : a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* 확인/스킵 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSkip}
            className="bg-slate-700 text-slate-300 py-4 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            베팅 안 함
          </button>
          <button
            onClick={() => onConfirm(betType, amount)}
            className="bg-yellow-600 text-white py-4 rounded-xl font-black text-sm active:scale-95 transition-transform"
          >
            베팅 확인
          </button>
        </div>
      </div>
    </div>
  );
}
