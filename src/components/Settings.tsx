import { useState } from 'react';
import type { SessionSettings, StrategyType } from '../utils/types';
import { STRATEGY_LABELS } from '../utils/constants';
import { getStrategyRiskProfile } from '../engine/bettingStrategy';

interface Props {
  settings: SessionSettings;
  onSave: (settings: SessionSettings) => void;
  onStartSession: (settings: SessionSettings) => void;
  isSessionActive: boolean;
}

export function Settings({ settings, onSave, onStartSession, isSessionActive }: Props) {
  const [form, setForm] = useState<SessionSettings>({ ...settings });

  const update = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const handleStart = () => {
    onSave(form);
    onStartSession(form);
  };

  return (
    <div className="space-y-4">
      {/* 자본금 설정 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">자본금 설정</h3>
        <div className="space-y-3">
          <NumberInput
            label="초기 자본금"
            value={form.initialBankroll}
            onChange={v => update('initialBankroll', v)}
            step={100000}
            min={100000}
            prefix="₩"
          />
          <NumberInput
            label="최소 베팅"
            value={form.minBet}
            onChange={v => update('minBet', v)}
            step={5000}
            min={1000}
            prefix="₩"
          />
          <NumberInput
            label="최대 베팅"
            value={form.maxBet}
            onChange={v => update('maxBet', v)}
            step={50000}
            min={form.minBet}
            prefix="₩"
          />
        </div>
      </div>

      {/* 리스크 관리 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">리스크 관리</h3>
        <div className="space-y-3">
          <NumberInput
            label="손절선"
            value={form.stopLoss}
            onChange={v => update('stopLoss', v)}
            step={50000}
            min={50000}
            prefix="₩"
          />
          <NumberInput
            label="이익실현선"
            value={form.takeProfit}
            onChange={v => update('takeProfit', v)}
            step={50000}
            min={50000}
            prefix="₩"
          />
          <NumberInput
            label="최대 연패 허용"
            value={form.maxConsecutiveLoss}
            onChange={v => update('maxConsecutiveLoss', v)}
            step={1}
            min={3}
            max={20}
            suffix="회"
          />
          <NumberInput
            label="세션 시간 제한"
            value={form.sessionTimeLimit}
            onChange={v => update('sessionTimeLimit', v)}
            step={30}
            min={30}
            max={480}
            suffix="분"
          />
        </div>
      </div>

      {/* 베팅 전략 */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="text-white font-bold text-sm mb-3">베팅 전략</h3>
        <div className="space-y-2">
          {(Object.keys(STRATEGY_LABELS) as StrategyType[]).map(strategy => {
            const profile = getStrategyRiskProfile(strategy);
            const isActive = form.strategy === strategy;
            return (
              <button
                key={strategy}
                onClick={() => update('strategy', strategy)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-yellow-600/20 border-2 border-yellow-500/50'
                    : 'bg-slate-700/50 border-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${isActive ? 'text-yellow-300' : 'text-white'}`}>
                    {STRATEGY_LABELS[strategy]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    profile.riskLevel === 'low' ? 'bg-green-600/30 text-green-300'
                      : profile.riskLevel === 'medium' ? 'bg-yellow-600/30 text-yellow-300'
                      : 'bg-red-600/30 text-red-300'
                  }`}>
                    {profile.riskLevel === 'low' ? '저위험' : profile.riskLevel === 'medium' ? '중위험' : '고위험'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{profile.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-2 pb-20">
        <button
          onClick={handleSave}
          className="w-full bg-slate-700 text-white py-3 rounded-xl font-bold active:scale-98 transition-transform"
        >
          설정 저장
        </button>
        {!isSessionActive && (
          <button
            onClick={handleStart}
            className="w-full bg-yellow-600 text-white py-4 rounded-xl font-black text-lg active:scale-98 transition-transform"
          >
            새 세션 시작
          </button>
        )}
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, step, min, max, prefix, suffix }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const decrease = () => {
    const next = value - step;
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  const increase = () => {
    const next = value + step;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  const startEditing = () => {
    setInputValue(String(value));
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    const parsed = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed)) return;
    let clamped = parsed;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') finishEditing();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={decrease}
          className="w-8 h-8 bg-slate-600 text-white rounded-lg text-lg font-bold active:scale-90 transition-transform"
        >
          -
        </button>
        {editing ? (
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-[100px] text-center bg-slate-600 text-white font-bold text-sm rounded-lg px-2 py-1 outline-none border-2 border-yellow-500"
          />
        ) : (
          <button
            onClick={startEditing}
            className="text-white font-bold text-sm min-w-[100px] text-center py-1 rounded-lg hover:bg-slate-700/50 active:bg-slate-600/50 transition-colors"
          >
            {prefix}{value.toLocaleString()}{suffix}
          </button>
        )}
        <button
          onClick={increase}
          className="w-8 h-8 bg-slate-600 text-white rounded-lg text-lg font-bold active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
}
