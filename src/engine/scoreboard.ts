import type { GameResult, BigRoadEntry, BigRoadCell, DerivedRoadEntry, DerivedRoadColor } from '../utils/types';
import { SCOREBOARD_ROWS } from '../utils/constants';

/**
 * 스코어보드 시스템
 * - 본매 (Big Road / 큰길)
 * - 중국점 1 (Big Eye Boy / 大眼仔)
 * - 중국점 2 (Small Road / 小路)
 * - 중국점 3 (Cockroach Pig / 曱甴路)
 */

// ============================================================
// 본매 (Big Road)
// ============================================================

/**
 * 본매 그리드 생성
 * - 같은 결과가 연속되면 같은 열에서 아래로
 * - 다른 결과가 나오면 새 열
 * - 타이는 별도 처리 (이전 위치에 타이 카운트 추가)
 * - 열이 6행을 초과하면 오른쪽으로 "드래곤 테일"
 */
export function buildBigRoad(results: GameResult[]): BigRoadCell[] {
  const cells: BigRoadCell[] = [];
  if (results.length === 0) return cells;

  // 타이를 제외한 P/B 결과와 타이 위치 추적
  let col = 0;
  let row = 0;
  let prevResult: 'player' | 'banker' | null = null;
  let currentTieCount = 0;

  // 그리드 점유 상태 (드래곤 테일 처리용)
  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;

  for (const result of results) {
    if (result === 'tie') {
      // 타이: 현재 위치에 타이 카운트 추가
      currentTieCount++;
      if (cells.length > 0) {
        cells[cells.length - 1].entry.tieCount = currentTieCount;
      }
      continue;
    }

    currentTieCount = 0;

    if (prevResult === null) {
      // 첫 번째 결과
      col = 0;
      row = 0;
    } else if (result === prevResult) {
      // 같은 결과 연속 - 아래로
      const nextRow = row + 1;
      if (nextRow < SCOREBOARD_ROWS && !occupied.has(key(col, nextRow))) {
        row = nextRow;
      } else {
        // 드래곤 테일: 오른쪽으로
        col++;
        // row는 유지
      }
    } else {
      // 다른 결과 - 새 열
      col++;
      row = 0;
    }

    occupied.add(key(col, row));

    const entry: BigRoadEntry = {
      result,
      tieCount: 0,
      playerPair: false,
      bankerPair: false,
    };

    cells.push({ col, row, entry });
    prevResult = result;
  }

  return cells;
}

/**
 * 본매를 열(column) 단위로 그룹화
 * 중국점 파생에 필요
 */
export function getBigRoadColumns(cells: BigRoadCell[]): BigRoadCell[][] {
  if (cells.length === 0) return [];

  const columns: BigRoadCell[][] = [];
  let currentCol = -1;
  let currentGroup: BigRoadCell[] = [];

  for (const cell of cells) {
    if (cell.col !== currentCol) {
      if (currentGroup.length > 0) {
        columns.push(currentGroup);
      }
      currentGroup = [cell];
      currentCol = cell.col;
    } else {
      currentGroup.push(cell);
    }
  }

  if (currentGroup.length > 0) {
    columns.push(currentGroup);
  }

  return columns;
}

// ============================================================
// 중국점 파생 로직
// ============================================================

/**
 * 중국점 공통 파생 로직
 *
 * 중국점은 본매의 열 길이를 비교하여 빨강/파랑을 결정한다.
 *
 * 시작 조건:
 * - 중국점 1 (Big Eye Boy): 본매 2번째 열의 첫 번째 결과부터 시작, offset=1
 * - 중국점 2 (Small Road): 본매 3번째 열의 첫 번째 결과부터 시작, offset=2
 * - 중국점 3 (Cockroach Pig): 본매 4번째 열의 첫 번째 결과부터 시작, offset=3
 *
 * 판정 규칙 (새 열의 첫 결과):
 * - 현재 열 직전 열과 offset만큼 이전 열의 길이를 비교
 * - 같으면 빨강, 다르면 파랑
 *
 * 판정 규칙 (같은 열의 연속 결과):
 * - offset만큼 이전 열의 해당 행이 존재하면 빨강, 아니면 파랑
 */
function deriveChinaRoad(
  columns: BigRoadCell[][],
  offset: number
): DerivedRoadColor[] {
  const colors: DerivedRoadColor[] = [];

  // 최소 offset+1 개의 열이 있어야 시작 가능
  // 2번째 열(인덱스 1)부터 판정 시작, 하지만 비교 대상이 필요
  for (let colIdx = offset; colIdx < columns.length; colIdx++) {
    const currentColumn = columns[colIdx];

    for (let rowInCol = 0; rowInCol < currentColumn.length; rowInCol++) {
      if (colIdx === offset && rowInCol === 0) {
        // 시작점 특수 처리: 첫 번째 엔트리
        // 비교 열이 충분한지 체크
        if (columns.length <= offset) continue;

        const prevCol = columns[colIdx - 1];
        const compareCol = columns[colIdx - offset];

        if (prevCol && compareCol) {
          colors.push(prevCol.length === compareCol.length ? 'red' : 'blue');
        }
        continue;
      }

      if (rowInCol === 0) {
        // 새 열의 첫 번째 결과
        const prevCol = columns[colIdx - 1];
        const compareColIdx = colIdx - offset;

        if (compareColIdx >= 0 && compareColIdx < columns.length) {
          const compareCol = columns[compareColIdx];
          colors.push(prevCol.length === compareCol.length ? 'red' : 'blue');
        }
      } else {
        // 같은 열의 연속 결과
        const compareColIdx = colIdx - offset;

        if (compareColIdx >= 0 && compareColIdx < columns.length) {
          const compareCol = columns[compareColIdx];
          // 현재 행 위치에 비교 열의 데이터가 있으면 빨강
          colors.push(rowInCol < compareCol.length ? 'red' : 'blue');
        }
      }
    }
  }

  return colors;
}

/**
 * 색상 배열을 그리드 셀로 변환
 */
function colorsToGrid(colors: DerivedRoadColor[]): DerivedRoadEntry[] {
  const entries: DerivedRoadEntry[] = [];
  let col = 0;
  let row = 0;
  let prevColor: DerivedRoadColor | null = null;

  for (const color of colors) {
    if (prevColor === null) {
      col = 0;
      row = 0;
    } else if (color === prevColor) {
      const nextRow = row + 1;
      if (nextRow < SCOREBOARD_ROWS) {
        row = nextRow;
      } else {
        col++;
      }
    } else {
      col++;
      row = 0;
    }

    entries.push({ color, col, row });
    prevColor = color;
  }

  return entries;
}

// ============================================================
// 공개 API
// ============================================================

/**
 * 중국점 1 (Big Eye Boy / 大眼仔) 생성
 */
export function buildBigEyeBoy(results: GameResult[]): DerivedRoadEntry[] {
  const bigRoad = buildBigRoad(results);
  const columns = getBigRoadColumns(bigRoad);
  const colors = deriveChinaRoad(columns, 1);
  return colorsToGrid(colors);
}

/**
 * 중국점 2 (Small Road / 小路) 생성
 */
export function buildSmallRoad(results: GameResult[]): DerivedRoadEntry[] {
  const bigRoad = buildBigRoad(results);
  const columns = getBigRoadColumns(bigRoad);
  const colors = deriveChinaRoad(columns, 2);
  return colorsToGrid(colors);
}

/**
 * 중국점 3 (Cockroach Pig / 曱甴路) 생성
 */
export function buildCockroachPig(results: GameResult[]): DerivedRoadEntry[] {
  const bigRoad = buildBigRoad(results);
  const columns = getBigRoadColumns(bigRoad);
  const colors = deriveChinaRoad(columns, 3);
  return colorsToGrid(colors);
}

/**
 * 예측: 다음에 Player가 나오면 중국점이 어떻게 될지
 */
export function predictDerivedRoad(
  results: GameResult[],
  nextResult: 'player' | 'banker'
): {
  bigEyeBoy: DerivedRoadColor | null;
  smallRoad: DerivedRoadColor | null;
  cockroachPig: DerivedRoadColor | null;
} {
  const newResults = [...results, nextResult];

  const currentBEB = buildBigEyeBoy(results);
  const newBEB = buildBigEyeBoy(newResults);

  const currentSR = buildSmallRoad(results);
  const newSR = buildSmallRoad(newResults);

  const currentCP = buildCockroachPig(results);
  const newCP = buildCockroachPig(newResults);

  return {
    bigEyeBoy: newBEB.length > currentBEB.length ? newBEB[newBEB.length - 1].color : null,
    smallRoad: newSR.length > currentSR.length ? newSR[newSR.length - 1].color : null,
    cockroachPig: newCP.length > currentCP.length ? newCP[newCP.length - 1].color : null,
  };
}

/**
 * 본매 + 중국점 전체 데이터 생성
 */
export function buildAllScoreboards(results: GameResult[]) {
  return {
    bigRoad: buildBigRoad(results),
    bigEyeBoy: buildBigEyeBoy(results),
    smallRoad: buildSmallRoad(results),
    cockroachPig: buildCockroachPig(results),
  };
}
