import { useState } from 'react';
import type { ViewTab } from './utils/types';
import { useGameSession } from './hooks/useGameSession';
import { Dashboard } from './components/Dashboard';
import { Scoreboard } from './components/Scoreboard';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { CameraInput } from './components/CameraInput';
import { LearningStats } from './components/LearningStats';

const TAB_CONFIG: { id: ViewTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: '홈', icon: '⬟' },
  { id: 'scoreboard', label: '스코어', icon: '▦' },
  { id: 'statistics', label: '통계', icon: '▤' },
  { id: 'history', label: 'AI학습', icon: '◎' },
  { id: 'settings', label: '설정', icon: '⚙' },
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewTab>('dashboard');
  const {
    session,
    recommendation,
    riskAlerts,
    probability,
    settings,
    scoreboards,
    learningStats,
    shoeType,
    strategyRecommendation,
    startSession,
    addResult,
    recordBet,
    endSession,
    newShoe,
    undoLastResult,
    updateSettings,
  } = useGameSession();

  // 세션이 없으면 설정/시작 화면
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-4">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              바카라 AI
            </h1>
            <p className="text-slate-400 text-sm mt-1">실시간 베팅 어시스턴트</p>
          </div>

          <Settings
            settings={settings}
            onSave={updateSettings}
            onStartSession={startSession}
            isSessionActive={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {/* 탑 바 */}
      <div className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-700/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            바카라 AI
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={newShoe}
              className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              새 슈
            </button>
            <button
              onClick={endSession}
              className="text-xs bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              종료
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {currentView === 'dashboard' && (
          <Dashboard
            session={session}
            recommendation={recommendation}
            riskAlerts={riskAlerts}
            shoeType={shoeType}
            learningRounds={learningStats.totalRoundsLearned}
            onResult={addResult}
            onUndo={undoLastResult}
            onRecordBet={recordBet}
          />
        )}

        {currentView === 'scoreboard' && scoreboards && (
          <div className="space-y-4">
            <Scoreboard {...scoreboards} />
            <CameraInput onResult={(r) => addResult(r)} />
          </div>
        )}

        {currentView === 'statistics' && (
          <Statistics session={session} probability={probability} />
        )}

        {currentView === 'history' && (
          <LearningStats
            stats={learningStats}
            shoeType={shoeType}
            strategyRecommendation={strategyRecommendation}
          />
        )}

        {currentView === 'settings' && (
          <Settings
            settings={settings}
            onSave={updateSettings}
            onStartSession={startSession}
            isSessionActive={true}
          />
        )}
      </div>

      {/* 하단 탭 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 z-50">
        <div className="max-w-md mx-auto flex">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
                currentView === tab.id
                  ? 'text-yellow-400'
                  : 'text-slate-500'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
