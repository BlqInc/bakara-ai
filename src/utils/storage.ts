import type { GameSession, SessionSettings } from './types';

const STORAGE_KEYS = {
  CURRENT_SESSION: 'bakara_current_session',
  SETTINGS: 'bakara_settings',
  SESSION_HISTORY: 'bakara_session_history',
} as const;

export function saveSession(session: GameSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch { /* 스토리지 초과 시 무시 */ }
}

export function loadSession(): GameSession | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

export function saveSettings(settings: SessionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function loadSettings(): SessionSettings | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveSessionToHistory(session: GameSession): void {
  try {
    const history = loadSessionHistory();
    history.push({
      id: session.id,
      startTime: session.startTime,
      endTime: Date.now(),
      rounds: session.rounds.length,
      profit: session.currentBankroll - session.settings.initialBankroll,
      initialBankroll: session.settings.initialBankroll,
      finalBankroll: session.currentBankroll,
    });
    // 최대 50개 세션만 보관
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(history));
  } catch { /* ignore */ }
}

export interface SessionSummary {
  id: string;
  startTime: number;
  endTime: number;
  rounds: number;
  profit: number;
  initialBankroll: number;
  finalBankroll: number;
}

export function loadSessionHistory(): SessionSummary[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
