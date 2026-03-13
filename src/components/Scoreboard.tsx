import { useState } from 'react';
import type { BigRoadCell, DerivedRoadEntry } from '../utils/types';

interface Props {
  bigRoad: BigRoadCell[];
  bigEyeBoy: DerivedRoadEntry[];
  smallRoad: DerivedRoadEntry[];
  cockroachPig: DerivedRoadEntry[];
}

type Tab = 'bigRoad' | 'bigEyeBoy' | 'smallRoad' | 'cockroachPig';

const TAB_LABELS: Record<Tab, string> = {
  bigRoad: '본매',
  bigEyeBoy: '중국점1',
  smallRoad: '중국점2',
  cockroachPig: '중국점3',
};

export function Scoreboard({ bigRoad, bigEyeBoy, smallRoad, cockroachPig }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('bigRoad');

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* 탭 */}
      <div className="flex border-b border-slate-700">
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
              activeTab === tab
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 그리드 */}
      <div className="p-3 overflow-x-auto">
        {activeTab === 'bigRoad' ? (
          <BigRoadGrid cells={bigRoad} />
        ) : (
          <DerivedRoadGrid
            entries={
              activeTab === 'bigEyeBoy' ? bigEyeBoy
                : activeTab === 'smallRoad' ? smallRoad
                : cockroachPig
            }
          />
        )}
      </div>

      {/* 통계 바 */}
      <div className="px-3 pb-3">
        <ResultBar bigRoad={bigRoad} />
      </div>
    </div>
  );
}

function BigRoadGrid({ cells }: { cells: BigRoadCell[] }) {
  if (cells.length === 0) {
    return <div className="text-slate-500 text-center py-8 text-sm">결과를 입력하세요</div>;
  }

  const maxCol = Math.max(...cells.map(c => c.col), 0);
  const visibleCols = Math.max(maxCol + 1, 10);
  const startCol = Math.max(0, maxCol - 19); // 최근 20열 표시

  const ROWS = 6;
  const CELL_SIZE = 28;

  const visibleCells = cells.filter(c => c.col >= startCol);

  return (
    <div className="relative" style={{ minHeight: ROWS * CELL_SIZE + 4 }}>
      <svg
        width={(visibleCols - startCol) * CELL_SIZE + 4}
        height={ROWS * CELL_SIZE + 4}
        className="min-w-full"
      >
        {/* 그리드 라인 */}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0} y1={i * CELL_SIZE + 2}
            x2={(visibleCols - startCol) * CELL_SIZE + 4} y2={i * CELL_SIZE + 2}
            stroke="#334155" strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: visibleCols - startCol + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * CELL_SIZE + 2} y1={0}
            x2={i * CELL_SIZE + 2} y2={ROWS * CELL_SIZE + 4}
            stroke="#334155" strokeWidth={0.5}
          />
        ))}

        {/* 결과 원 */}
        {visibleCells.map((cell, idx) => {
          const x = (cell.col - startCol) * CELL_SIZE + CELL_SIZE / 2 + 2;
          const y = cell.row * CELL_SIZE + CELL_SIZE / 2 + 2;
          const r = CELL_SIZE / 2 - 3;
          const color = cell.entry.result === 'banker' ? '#dc2626' : '#2563eb';

          return (
            <g key={idx}>
              <circle cx={x} cy={y} r={r} fill={color} opacity={0.9} />
              {/* 타이 마커 */}
              {cell.entry.tieCount > 0 && (
                <line
                  x1={x - r} y1={y} x2={x + r} y2={y}
                  stroke="#16a34a" strokeWidth={2}
                />
              )}
              {/* 페어 마커 */}
              {cell.entry.playerPair && (
                <circle cx={x - r + 2} cy={y + r - 2} r={3} fill="#2563eb" stroke="#fff" strokeWidth={1} />
              )}
              {cell.entry.bankerPair && (
                <circle cx={x + r - 2} cy={y - r + 2} r={3} fill="#dc2626" stroke="#fff" strokeWidth={1} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DerivedRoadGrid({ entries }: { entries: DerivedRoadEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-slate-500 text-center py-8 text-sm">데이터 부족</div>;
  }

  const maxCol = Math.max(...entries.map(e => e.col), 0);
  const startCol = Math.max(0, maxCol - 24);

  const ROWS = 6;
  const CELL_SIZE = 22;

  const visibleEntries = entries.filter(e => e.col >= startCol);
  const cols = maxCol - startCol + 1;

  return (
    <div className="relative" style={{ minHeight: ROWS * CELL_SIZE + 4 }}>
      <svg
        width={Math.max(cols, 15) * CELL_SIZE + 4}
        height={ROWS * CELL_SIZE + 4}
        className="min-w-full"
      >
        {/* 그리드 */}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0} y1={i * CELL_SIZE + 2}
            x2={Math.max(cols, 15) * CELL_SIZE + 4} y2={i * CELL_SIZE + 2}
            stroke="#334155" strokeWidth={0.5}
          />
        ))}

        {/* 중국점 원 (작은 원) */}
        {visibleEntries.map((entry, idx) => {
          const x = (entry.col - startCol) * CELL_SIZE + CELL_SIZE / 2 + 2;
          const y = entry.row * CELL_SIZE + CELL_SIZE / 2 + 2;
          const r = CELL_SIZE / 2 - 3;
          const color = entry.color === 'red' ? '#dc2626' : '#2563eb';

          return (
            <circle
              key={idx}
              cx={x} cy={y} r={r}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ResultBar({ bigRoad }: { bigRoad: BigRoadCell[] }) {
  const total = bigRoad.length;
  if (total === 0) return null;

  const bankerCount = bigRoad.filter(c => c.entry.result === 'banker').length;
  const playerCount = bigRoad.filter(c => c.entry.result === 'player').length;
  const bankerPct = (bankerCount / total * 100).toFixed(1);
  const playerPct = (playerCount / total * 100).toFixed(1);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-blue-400">P {playerCount} ({playerPct}%)</span>
        <span className="text-slate-400">{total}판</span>
        <span className="text-red-400">B {bankerCount} ({bankerPct}%)</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${playerPct}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${bankerPct}%` }}
        />
      </div>
    </div>
  );
}
