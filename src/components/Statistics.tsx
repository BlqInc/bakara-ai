import type { GameSession, ProbabilityState } from '../utils/types';
import { RiskManager } from '../engine/riskManager';
import { ProbabilityEngine } from '../engine/probability';

interface Props {
  session: GameSession;
  probability: ProbabilityState;
}

export function Statistics({ session, probability }: Props) {
  const stats = RiskManager.getSessionStats(session);
  const observed = ProbabilityEngine.calculateObserved(session.rounds);
  const ev = ProbabilityEngine.calculateEV(probability, session.settings.bankerCommission ?? 5);

  return (
    <div className="space-y-4">
      {/* 세션 요약 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">세션 요약</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatItem
            label="수익/손실"
            value={`${stats.profit >= 0 ? '+' : ''}₩${stats.profit.toLocaleString()}`}
            color={stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatItem
            label="수익률"
            value={`${(stats.profitRate * 100).toFixed(1)}%`}
            color={stats.profitRate >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatItem label="총 베팅" value={`${stats.totalBets}회`} />
          <StatItem
            label="승률"
            value={`${(stats.winRate * 100).toFixed(1)}%`}
            color={stats.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}
          />
          <StatItem label="최대 연승" value={`${stats.maxConsecWin}회`} color="text-green-400" />
          <StatItem label="최대 연패" value={`${stats.maxConsecLoss}회`} color="text-red-400" />
          <StatItem
            label="최대 드로다운"
            value={`${(stats.maxDrawdown * 100).toFixed(1)}%`}
            color="text-orange-400"
          />
          <StatItem
            label="플레이 시간"
            value={`${Math.floor(stats.sessionMinutes)}분`}
          />
        </div>
      </div>

      {/* 관측된 확률 vs 이론 확률 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">확률 비교 (관측 vs 이론)</h3>
        <div className="space-y-3">
          <ProbBar
            label="뱅커"
            observed={observed.bankerWin}
            theoretical={probability.bankerWin}
            color="bg-red-500"
          />
          <ProbBar
            label="플레이어"
            observed={observed.playerWin}
            theoretical={probability.playerWin}
            color="bg-blue-500"
          />
          <ProbBar
            label="타이"
            observed={observed.tie}
            theoretical={probability.tie}
            color="bg-green-500"
          />
        </div>
      </div>

      {/* 기대값 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">기대값 (EV)</h3>
        <div className="space-y-2">
          <EVItem label="뱅커 베팅" value={ev.bankerEV} />
          <EVItem label="플레이어 베팅" value={ev.playerEV} />
          <EVItem label="타이 베팅" value={ev.tieEV} />
          <EVItem label="P 페어" value={ev.playerPairEV} />
          <EVItem label="B 페어" value={ev.bankerPairEV} />
        </div>
      </div>

      {/* 결과 분포 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">결과 분포</h3>
        <div className="flex items-center gap-4 justify-center">
          <div className="text-center">
            <div className="text-3xl font-black text-blue-400">{observed.playerCount}</div>
            <div className="text-xs text-slate-400">플레이어</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-green-400">{observed.tieCount}</div>
            <div className="text-xs text-slate-400">타이</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-red-400">{observed.bankerCount}</div>
            <div className="text-xs text-slate-400">뱅커</div>
          </div>
        </div>
      </div>

      {/* 최근 베팅 기록 */}
      {session.bets.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">최근 베팅 ({session.bets.length}건)</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {session.bets.slice(-10).reverse().map((bet, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-700/50 rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    bet.betType === 'banker' ? 'text-red-400' :
                    bet.betType === 'player' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {bet.betType === 'banker' ? 'B' : bet.betType === 'player' ? 'P' : '-'}
                  </span>
                  <span className="text-slate-300">₩{bet.amount.toLocaleString()}</span>
                </div>
                <span className={`font-bold ${
                  bet.result === 'win' ? 'text-green-400' :
                  bet.result === 'lose' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {bet.result === 'win' ? `+₩${bet.payout.toLocaleString()}` :
                   bet.result === 'lose' ? `-₩${Math.abs(bet.payout).toLocaleString()}` : 'PUSH'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, color = 'text-white' }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-2.5">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className={`${color} font-bold text-sm`}>{value}</div>
    </div>
  );
}

function ProbBar({ label, observed, theoretical, color }: {
  label: string; observed: number; theoretical: number; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-white">
          {(observed * 100).toFixed(1)}% <span className="text-slate-500">/ {(theoretical * 100).toFixed(1)}%</span>
        </span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full">
        <div
          className={`absolute h-full ${color} rounded-full opacity-40`}
          style={{ width: `${theoretical * 100}%` }}
        />
        <div
          className={`absolute h-full ${color} rounded-full`}
          style={{ width: `${observed * 100}%` }}
        />
      </div>
    </div>
  );
}

function EVItem({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(2);
  const isPositive = value >= 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-300 text-sm">{label}</span>
      <span className={`font-bold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{pct}%
      </span>
    </div>
  );
}
