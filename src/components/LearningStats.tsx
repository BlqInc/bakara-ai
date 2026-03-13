import type { StrategyType } from '../utils/types';
import { STRATEGY_LABELS } from '../utils/constants';

interface LearningStatsData {
  totalRoundsLearned: number;
  totalPredictions: number;
  overallAccuracy: number;
  recentAccuracy: number;
  bestPattern: { name: string; accuracy: number; weight: number } | null;
  worstPattern: { name: string; accuracy: number; weight: number } | null;
  learnedSequences: number;
  dataSize: number;
}

interface Props {
  stats: LearningStatsData;
  shoeType: 'streak' | 'chop' | 'mixed';
  strategyRecommendation: { strategy: StrategyType; reason: string } | null;
}

const SHOE_TYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  streak: { label: '줄형', color: 'text-red-400', desc: '연속 패턴이 강한 슈' },
  chop: { label: '깍두기형', color: 'text-blue-400', desc: '교대 패턴이 강한 슈' },
  mixed: { label: '혼합형', color: 'text-yellow-400', desc: '뚜렷한 패턴 없음' },
};

export function LearningStats({ stats, shoeType, strategyRecommendation }: Props) {
  const shoeInfo = SHOE_TYPE_LABELS[shoeType];

  return (
    <div className="space-y-4">
      {/* AI 학습 상태 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-white font-bold text-sm">AI 학습 엔진</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-2.5">
            <div className="text-slate-400 text-xs">누적 학습</div>
            <div className="text-white font-bold text-sm">{stats.totalRoundsLearned}판</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2.5">
            <div className="text-slate-400 text-xs">학습 시퀀스</div>
            <div className="text-white font-bold text-sm">{stats.learnedSequences}개</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2.5">
            <div className="text-slate-400 text-xs">전체 정확도</div>
            <div className={`font-bold text-sm ${stats.overallAccuracy >= 0.5 ? 'text-green-400' : 'text-orange-400'}`}>
              {stats.totalPredictions > 0 ? `${(stats.overallAccuracy * 100).toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2.5">
            <div className="text-slate-400 text-xs">최근 정확도</div>
            <div className={`font-bold text-sm ${stats.recentAccuracy >= 0.5 ? 'text-green-400' : 'text-orange-400'}`}>
              {stats.totalPredictions > 0 ? `${(stats.recentAccuracy * 100).toFixed(1)}%` : '-'}
            </div>
          </div>
        </div>

        {/* 정확도 게이지 */}
        {stats.totalPredictions > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">예측 성능</span>
              <span className="text-white">{stats.totalPredictions}건 예측</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.recentAccuracy >= 0.55 ? 'bg-green-500' :
                  stats.recentAccuracy >= 0.45 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(5, stats.recentAccuracy * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* 슈 유형 분석 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">슈 유형 분석</h3>
        <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
          <div className={`text-2xl font-black ${shoeInfo.color}`}>
            {shoeType === 'streak' ? '▮▮▮' : shoeType === 'chop' ? '▮▯▮' : '▮▯▯'}
          </div>
          <div>
            <div className={`font-bold ${shoeInfo.color}`}>{shoeInfo.label}</div>
            <div className="text-slate-400 text-xs">{shoeInfo.desc}</div>
          </div>
        </div>

        {/* 전략 추천 */}
        {strategyRecommendation && (
          <div className="mt-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="text-yellow-400 text-xs font-bold mb-1">AI 전략 추천</div>
            <div className="text-white font-bold text-sm">
              {STRATEGY_LABELS[strategyRecommendation.strategy]}
            </div>
            <div className="text-slate-400 text-xs mt-1">{strategyRecommendation.reason}</div>
          </div>
        )}
      </div>

      {/* 패턴 학습 성과 */}
      {(stats.bestPattern || stats.worstPattern) && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">패턴 학습 성과</h3>
          <div className="space-y-2">
            {stats.bestPattern && (
              <div className="flex justify-between items-center bg-slate-700/50 rounded-lg p-2.5">
                <div>
                  <div className="text-green-400 text-xs font-bold">최고 성과 패턴</div>
                  <div className="text-white text-sm">{stats.bestPattern.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold text-sm">
                    {(stats.bestPattern.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    가중치 {stats.bestPattern.weight.toFixed(2)}x
                  </div>
                </div>
              </div>
            )}
            {stats.worstPattern && stats.worstPattern.name !== stats.bestPattern?.name && (
              <div className="flex justify-between items-center bg-slate-700/50 rounded-lg p-2.5">
                <div>
                  <div className="text-red-400 text-xs font-bold">저성과 패턴</div>
                  <div className="text-white text-sm">{stats.worstPattern.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold text-sm">
                    {(stats.worstPattern.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    가중치 {stats.worstPattern.weight.toFixed(2)}x
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 학습 데이터 정보 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">학습 데이터</h3>
        <div className="text-slate-400 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span>총 저장 데이터</span>
            <span className="text-white">{stats.dataSize}건</span>
          </div>
          <div className="flex justify-between">
            <span>학습된 N-gram 시퀀스</span>
            <span className="text-white">{stats.learnedSequences}개</span>
          </div>
          <div className="flex justify-between">
            <span>예측 히스토리</span>
            <span className="text-white">{stats.totalPredictions}건</span>
          </div>
        </div>
        {/* 데이터 레벨 */}
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">학습 레벨</div>
          <div className="flex gap-1">
            {[100, 500, 1000, 3000, 10000].map((threshold, i) => (
              <div
                key={threshold}
                className={`flex-1 h-1.5 rounded-full ${
                  stats.dataSize >= threshold ? 'bg-green-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>초급</span>
            <span>중급</span>
            <span>고급</span>
          </div>
        </div>
      </div>
    </div>
  );
}
