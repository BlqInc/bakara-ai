import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // 뒤쪽 스크롤 차단 (단순 overflow hidden)
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  const resultLabel = gameResult === 'player' ? '플레이어 승' : gameResult === 'banker' ? '뱅커 승' : '타이';
  const resultBg = gameResult === 'player' ? 'bg-blue-600' : gameResult === 'banker' ? 'bg-red-600' : 'bg-green-600';

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

  const modal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* 배경 오버레이 */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
        }}
      />

      {/* 모달 본체 */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          backgroundColor: '#1e293b',
          borderRadius: '24px 24px 0 0',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, backgroundColor: '#475569', borderRadius: 999 }} />
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '0 16px 8px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* 결과 표시 */}
          <div className={`${resultBg} rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between`}>
            <span className="text-white/70 text-xs">이번 판 결과</span>
            <span className="text-white text-lg font-black">{resultLabel}</span>
          </div>

          {/* 추천 정보 */}
          {recommendation && recBetType !== 'skip' && (
            <div className="bg-slate-700/50 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">AI 추천</span>
                <span className="text-yellow-300 text-sm font-bold">
                  {recBetType === 'player' ? 'P' : recBetType === 'banker' ? 'B' : 'T'} · ₩{recAmount.toLocaleString()}
                </span>
              </div>
              <span className="text-slate-500 text-xs">{recommendation.confidence}%</span>
            </div>
          )}

          {/* 실제 베팅 방향 */}
          <div className="mb-3">
            <div className="text-slate-400 text-xs mb-1.5">실제 베팅 방향</div>
            <div className="grid grid-cols-3 gap-2">
              {betOptions.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setBetType(opt.type)}
                  className={`py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
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
          <div className="mb-2">
            <div className="text-slate-400 text-xs mb-1.5">실제 베팅 금액</div>
            <div className="text-center mb-2">
              {editing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onBlur={finishEditing}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full text-center bg-slate-700 text-white font-black text-xl rounded-xl px-4 py-2.5 outline-none border-2 border-yellow-500"
                />
              ) : (
                <button
                  onClick={startEditing}
                  className="w-full text-center bg-slate-700/50 text-white font-black text-xl rounded-xl px-4 py-2.5 active:bg-slate-600/50 transition-colors"
                >
                  ₩{amount.toLocaleString()}
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
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
        </div>

        {/* 하단 버튼 - 항상 보임 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            padding: '12px 16px 24px',
            borderTop: '1px solid rgba(71,85,105,0.5)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onSkip}
            className="bg-slate-700 text-slate-300 py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            베팅 안 함
          </button>
          <button
            onClick={() => onConfirm(betType, amount)}
            className="bg-yellow-600 text-white py-3.5 rounded-xl font-black text-sm active:scale-95 transition-transform"
          >
            베팅 확인
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
