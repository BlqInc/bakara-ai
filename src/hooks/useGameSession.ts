import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  GameSession, SessionSettings, GameResult, BetRecord,
  BetType, BetRecommendation, RiskAlert, ProbabilityState,
} from '../utils/types';
import { DEFAULT_SETTINGS, BASE_PROBABILITY } from '../utils/constants';
import { createSimpleRound } from '../engine/baccarat';
import { ShoeTracker } from '../engine/shoeTracker';
import { ProbabilityEngine } from '../engine/probability';
import { RecommendationEngine } from '../engine/recommendation';
import { RiskManager } from '../engine/riskManager';
import { LearningEngine } from '../engine/learningEngine';
import { buildAllScoreboards } from '../engine/scoreboard';
import { saveSession, loadSession, clearSession, saveSessionToHistory, loadSettings, saveSettings } from '../utils/storage';

export function useGameSession() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [recommendation, setRecommendation] = useState<BetRecommendation | null>(null);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [probability, setProbability] = useState<ProbabilityState>(BASE_PROBABILITY);
  const [settings, setSettings] = useState<SessionSettings>(() => loadSettings() ?? DEFAULT_SETTINGS);
  const shoeTrackerRef = useRef(new ShoeTracker());
  const learningEngineRef = useRef(new LearningEngine());

  // 저장된 세션 복원
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setSession(saved);
      updateAnalysis(saved);
    }
  }, []);

  // 분석 업데이트 (학습 엔진 포함)
  const updateAnalysis = useCallback((s: GameSession) => {
    const prob = ProbabilityEngine.calculate(shoeTrackerRef.current);
    setProbability(prob);

    const rec = RecommendationEngine.generate(s, shoeTrackerRef.current, learningEngineRef.current);
    setRecommendation(rec);

    const alerts = RiskManager.evaluate(s);
    setRiskAlerts(alerts);
  }, []);

  // 이전 추천 저장 (예측 정확도 추적용)
  const lastRecommendationRef = useRef<BetRecommendation | null>(null);

  // 새 세션 시작
  const startSession = useCallback((customSettings?: SessionSettings) => {
    const s = customSettings ?? settings;

    setSettings(s);
    saveSettings(s);
    shoeTrackerRef.current.reset();

    const newSession: GameSession = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      settings: s,
      rounds: [],
      bets: [],
      currentBankroll: s.initialBankroll,
      peakBankroll: s.initialBankroll,
    };

    setSession(newSession);
    saveSession(newSession);
    setRecommendation(null);
    setRiskAlerts([]);
    setProbability(BASE_PROBABILITY);
  }, [settings]);

  // 라운드 결과 입력 (간편: P/B/T) + 학습
  const addResult = useCallback((result: GameResult, playerPair = false, bankerPair = false) => {
    const le = learningEngineRef.current;

    // 이전 추천이 있었다면 예측 정확도 기록
    const prevRec = lastRecommendationRef.current;
    if (prevRec && prevRec.betType !== 'skip') {
      const predicted = prevRec.betType as GameResult;
      le.recordPrediction('종합추천', predicted, result, prevRec.confidence);
    }

    // 결과 학습
    le.learnResult(result);

    setSession(prev => {
      if (!prev) return prev;

      const roundId = prev.rounds.length + 1;
      const round = createSimpleRound(roundId, result, playerPair, bankerPair);
      const newRounds = [...prev.rounds, round];

      const updated: GameSession = {
        ...prev,
        rounds: newRounds,
      };

      saveSession(updated);
      updateAnalysis(updated);

      // 현재 추천 저장 (다음 판 정확도 추적용)
      const newRec = RecommendationEngine.generate(updated, shoeTrackerRef.current, le);
      lastRecommendationRef.current = newRec;

      return updated;
    });
  }, [updateAnalysis]);

  // 베팅 기록
  const recordBet = useCallback((betType: BetType, amount: number, gameResult: GameResult) => {
    setSession(prev => {
      if (!prev) return prev;

      let result: 'win' | 'lose' | 'push';
      let payout = 0;

      if (gameResult === 'tie') {
        if (betType === 'tie') {
          result = 'win';
          payout = amount * 8;
        } else if (betType === 'player' || betType === 'banker') {
          result = 'push';
          payout = 0;
        } else {
          result = 'lose';
          payout = -amount;
        }
      } else if (
        (betType === 'player' && gameResult === 'player') ||
        (betType === 'banker' && gameResult === 'banker')
      ) {
        result = 'win';
        payout = betType === 'banker' ? amount * 0.95 : amount;
      } else if (betType === 'skip') {
        result = 'push';
        payout = 0;
      } else {
        result = 'lose';
        payout = -amount;
      }

      const newBankroll = prev.currentBankroll + payout;
      const bet: BetRecord = {
        roundId: prev.rounds.length,
        betType,
        amount,
        result,
        payout,
        balanceAfter: newBankroll,
        timestamp: Date.now(),
      };

      const updated: GameSession = {
        ...prev,
        bets: [...prev.bets, bet],
        currentBankroll: newBankroll,
        peakBankroll: Math.max(prev.peakBankroll, newBankroll),
      };

      saveSession(updated);
      updateAnalysis(updated);
      return updated;
    });
  }, [updateAnalysis]);

  // 세션 종료 + 전략 성과 기록
  const endSession = useCallback(() => {
    if (session) {
      saveSessionToHistory(session);

      // 전략 성과 학습
      learningEngineRef.current.recordStrategyPerformance(
        session.settings.strategy,
        session.bets,
        session.rounds.map(r => r.result)
      );

      clearSession();
    }
    setSession(null);
    setRecommendation(null);
    setRiskAlerts([]);
    shoeTrackerRef.current.reset();
    lastRecommendationRef.current = null;
  }, [session]);

  // 새 슈 시작
  const newShoe = useCallback(() => {
    shoeTrackerRef.current.reset();
    if (session) {
      const prob = ProbabilityEngine.calculate(shoeTrackerRef.current);
      setProbability(prob);
    }
  }, [session]);

  // 마지막 결과 취소
  const undoLastResult = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.rounds.length === 0) return prev;

      const newRounds = prev.rounds.slice(0, -1);
      const newBets = prev.bets.length > 0 ? prev.bets.slice(0, -1) : prev.bets;
      const lastBet = prev.bets[prev.bets.length - 1];
      const newBankroll = lastBet ? prev.currentBankroll - lastBet.payout : prev.currentBankroll;

      const updated: GameSession = {
        ...prev,
        rounds: newRounds,
        bets: newBets,
        currentBankroll: newBankroll,
      };

      saveSession(updated);
      updateAnalysis(updated);
      return updated;
    });
  }, [updateAnalysis]);

  // 설정 업데이트
  const updateSettings = useCallback((newSettings: SessionSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // 스코어보드 데이터
  const scoreboards = session
    ? buildAllScoreboards(session.rounds.map(r => r.result))
    : null;

  // 학습 통계
  const learningStats = learningEngineRef.current.getStats();

  // 슈 유형 & 전략 추천
  const shoeType = session
    ? learningEngineRef.current.classifyShoeType(session.rounds.map(r => r.result))
    : 'mixed';
  const strategyRecommendation = session
    ? learningEngineRef.current.recommendStrategy(session.rounds.map(r => r.result))
    : null;

  return {
    session,
    recommendation,
    riskAlerts,
    probability,
    settings,
    scoreboards,
    shoeState: shoeTrackerRef.current.getState(),
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
  };
}
