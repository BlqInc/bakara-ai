import type { RiskAlert as RiskAlertType } from '../utils/types';

interface Props {
  alerts: RiskAlertType[];
}

const LEVEL_STYLES = {
  info: 'bg-blue-900/50 border-blue-500/50 text-blue-200',
  warning: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-200',
  danger: 'bg-orange-900/50 border-orange-500/50 text-orange-200',
  critical: 'bg-red-900/60 border-red-500/70 text-red-200 animate-pulse',
};

const LEVEL_ICONS = {
  info: 'i',
  warning: '!',
  danger: '!!',
  critical: '!!!',
};

export function RiskAlertPanel({ alerts }: Props) {
  if (alerts.length === 0) return null;

  // 가장 심각한 것부터 표시
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, danger: 1, warning: 2, info: 3 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-2">
      {sorted.slice(0, 3).map((alert, i) => (
        <div
          key={i}
          className={`${LEVEL_STYLES[alert.level]} border rounded-xl px-4 py-3`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xs font-black mt-0.5 opacity-70">
              {LEVEL_ICONS[alert.level]}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">{alert.message}</p>
              {alert.action && (
                <p className="text-xs opacity-80 mt-1">{alert.action}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
