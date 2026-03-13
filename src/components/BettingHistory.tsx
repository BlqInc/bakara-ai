import type { BetRecord } from '../utils/types';

interface Props {
  bets: BetRecord[];
  initialBankroll: number;
}

const BET_TYPE_LABELS: Record<string, string> = {
  player: '플레이어',
  banker: '뱅커',
  tie: '타이',
  skip: '건너뛰기',
  player_pair: 'P 페어',
  banker_pair: 'B 페어',
};

export function BettingHistory({ bets, initialBankroll }: Props) {
  if (bets.length === 0) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 text-center">
        <p className="text-slate-400">베팅 기록이 없습니다</p>
      </div>
    );
  }

  // 수익 그래프 데이터
  const balanceHistory = [initialBankroll, ...bets.map(b => b.balanceAfter)];
  const maxBalance = Math.max(...balanceHistory);
  const minBalance = Math.min(...balanceHistory);
  const range = maxBalance - minBalance || 1;

  // SVG 그래프
  const graphWidth = 320;
  const graphHeight = 100;
  const points = balanceHistory.map((b, i) => {
    const x = (i / (balanceHistory.length - 1)) * graphWidth;
    const y = graphHeight - ((b - minBalance) / range) * (graphHeight - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  const lastBalance = balanceHistory[balanceHistory.length - 1];
  const isProfit = lastBalance >= initialBankroll;

  return (
    <div className="space-y-4">
      {/* 수익 그래프 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">수익 추이</h3>
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-24">
          {/* 기준선 (초기 자본금) */}
          <line
            x1={0}
            y1={graphHeight - ((initialBankroll - minBalance) / range) * (graphHeight - 10) - 5}
            x2={graphWidth}
            y2={graphHeight - ((initialBankroll - minBalance) / range) * (graphHeight - 10) - 5}
            stroke="#475569"
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
          {/* 수익 라인 */}
          <polyline
            points={points}
            fill="none"
            stroke={isProfit ? '#4ade80' : '#f87171'}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-500">시작</span>
          <span className={isProfit ? 'text-green-400' : 'text-red-400'}>
            {isProfit ? '+' : ''}₩{(lastBalance - initialBankroll).toLocaleString()}
          </span>
          <span className="text-slate-500">현재</span>
        </div>
      </div>

      {/* 베팅 기록 리스트 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">최근 베팅 ({bets.length}건)</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {[...bets].reverse().slice(0, 30).map((bet, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                bet.result === 'win' ? 'bg-green-900/20'
                  : bet.result === 'lose' ? 'bg-red-900/20'
                  : 'bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">#{bet.roundId}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  bet.betType === 'banker' ? 'bg-red-600/30 text-red-300'
                    : bet.betType === 'player' ? 'bg-blue-600/30 text-blue-300'
                    : 'bg-slate-600/30 text-slate-300'
                }`}>
                  {BET_TYPE_LABELS[bet.betType] ?? bet.betType}
                </span>
                <span className="text-white text-xs">₩{bet.amount.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold ${
                  bet.result === 'win' ? 'text-green-400'
                    : bet.result === 'lose' ? 'text-red-400'
                    : 'text-slate-400'
                }`}>
                  {bet.payout >= 0 ? '+' : ''}₩{bet.payout.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
