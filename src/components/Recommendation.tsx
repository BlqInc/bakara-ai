import type { BetRecommendation } from '../utils/types';

interface Props {
  recommendation: BetRecommendation | null;
}

const RISK_LABELS = {
  low: { text: '낮음', color: 'bg-green-500' },
  medium: { text: '보통', color: 'bg-yellow-500' },
  high: { text: '높음', color: 'bg-orange-500' },
  extreme: { text: '위험', color: 'bg-red-600' },
};

export function Recommendation({ recommendation }: Props) {
  if (!recommendation) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 text-center">
        <p className="text-slate-400 text-lg">결과를 입력하면 추천이 시작됩니다</p>
      </div>
    );
  }

  const { betType, amount, confidence, reasoning, riskLevel, expectedValue } = recommendation;
  const risk = RISK_LABELS[riskLevel];

  const isSkip = betType === 'skip';
  const betLabel = betType === 'banker' ? '뱅커'
    : betType === 'player' ? '플레이어'
    : betType === 'tie' ? '타이'
    : '건너뛰기';

  const bgColor = betType === 'banker' ? 'from-red-600 to-red-800'
    : betType === 'player' ? 'from-blue-600 to-blue-800'
    : 'from-slate-600 to-slate-800';

  const borderColor = betType === 'banker' ? 'border-red-500'
    : betType === 'player' ? 'border-blue-500'
    : 'border-slate-500';

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-2xl p-5 border-2 ${borderColor} shadow-lg`}>
      {/* 메인 추천 */}
      <div className="text-center mb-4">
        <div className="text-sm text-white/70 mb-1">AI 추천</div>
        <div className="text-3xl font-black text-white mb-2">
          {isSkip ? '쉬어가기' : `${betLabel} 베팅`}
        </div>
        {!isSkip && (
          <div className="text-2xl font-bold text-yellow-300">
            ₩{amount.toLocaleString()}
          </div>
        )}
      </div>

      {/* 신뢰도 & 리스크 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">신뢰도</span>
          <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-white font-bold text-sm">{confidence}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/70 text-sm">리스크</span>
          <span className={`${risk.color} text-white text-xs px-2 py-0.5 rounded-full font-bold`}>
            {risk.text}
          </span>
        </div>
      </div>

      {/* 기대값 */}
      {!isSkip && (
        <div className="text-center mb-3">
          <span className="text-white/60 text-xs">기대값: </span>
          <span className={`text-sm font-bold ${expectedValue >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {expectedValue >= 0 ? '+' : ''}₩{Math.round(expectedValue).toLocaleString()}
          </span>
        </div>
      )}

      {/* 추천 근거 */}
      <div className="bg-black/20 rounded-xl p-3">
        <div className="text-white/50 text-xs mb-2">분석 근거</div>
        <ul className="space-y-1">
          {reasoning.slice(0, 4).map((reason, i) => (
            <li key={i} className="text-white/80 text-xs flex items-start gap-1">
              <span className="text-yellow-400 mt-0.5">{'>'}</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
