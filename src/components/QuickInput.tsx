import { useState } from 'react';
import type { GameResult } from '../utils/types';

interface Props {
  onResult: (result: GameResult, playerPair?: boolean, bankerPair?: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function QuickInput({ onResult, onUndo, canUndo }: Props) {
  const [showPairOptions, setShowPairOptions] = useState(false);
  const [pendingResult, setPendingResult] = useState<GameResult | null>(null);

  const handleQuickResult = (result: GameResult) => {
    if (result === 'tie') {
      onResult('tie');
      return;
    }
    setPendingResult(result);
    setShowPairOptions(true);
  };

  const confirmResult = (playerPair: boolean, bankerPair: boolean) => {
    if (pendingResult) {
      onResult(pendingResult, playerPair, bankerPair);
    }
    setShowPairOptions(false);
    setPendingResult(null);
  };

  if (showPairOptions && pendingResult) {
    return (
      <div className="bg-slate-800 rounded-2xl p-4">
        <div className="text-center text-white/70 text-sm mb-3">
          {pendingResult === 'banker' ? '뱅커' : '플레이어'} 승 - 페어 확인
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => confirmResult(true, false)}
            className="bg-blue-600/30 border border-blue-500/50 text-blue-300 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            P 페어
          </button>
          <button
            onClick={() => confirmResult(false, true)}
            className="bg-red-600/30 border border-red-500/50 text-red-300 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            B 페어
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => confirmResult(true, true)}
            className="bg-purple-600/30 border border-purple-500/50 text-purple-300 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            양쪽 페어
          </button>
          <button
            onClick={() => confirmResult(false, false)}
            className="bg-slate-700 text-white py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            페어 없음
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="text-center text-white/50 text-xs mb-3">결과 입력</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <button
          onClick={() => handleQuickResult('player')}
          className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-xl font-black shadow-lg active:scale-95 transition-transform"
        >
          P
        </button>
        <button
          onClick={() => handleQuickResult('tie')}
          className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-xl font-black shadow-lg active:scale-95 transition-transform"
        >
          T
        </button>
        <button
          onClick={() => handleQuickResult('banker')}
          className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-xl font-black shadow-lg active:scale-95 transition-transform"
        >
          B
        </button>
      </div>
      {canUndo && (
        <button
          onClick={onUndo}
          className="w-full bg-slate-700 text-slate-300 py-2 rounded-lg text-sm active:scale-98 transition-transform"
        >
          마지막 결과 취소
        </button>
      )}
    </div>
  );
}
