import { type PlayerColor, TOTAL_TRACK_SQUARES, HOME_ENTRY } from "./types";

// 15x15 grid. Track goes CLOCKWISE.
// Red=top-left, Green=top-right, Blue=bottom-left, Yellow=bottom-right.
// Each color's start is adjacent to their home, moving AWAY from home clockwise.

export const trackPositions: [number, number][] = [
  // === Red START (top-left home) → RIGHT along left arm, then UP top arm ===
  [6, 1],   // 0  - Red START ★  → goes RIGHT
  [6, 2],   // 1
  [6, 3],   // 2
  [6, 4],   // 3
  [6, 5],   // 4
  [5, 6],   // 5
  [4, 6],   // 6
  [3, 6],   // 7
  [2, 6],   // 8  - Safe ★
  [1, 6],   // 9
  [0, 6],   // 10
  [0, 7],   // 11
  [0, 8],   // 12

  // === Green START (top-right home) → DOWN along top arm, then RIGHT along right arm ===
  [1, 8],   // 13 - Green START ★  → goes DOWN
  [2, 8],   // 14
  [3, 8],   // 15
  [4, 8],   // 16
  [5, 8],   // 17
  [6, 9],   // 18
  [6, 10],  // 19
  [6, 11],  // 20
  [6, 12],  // 21 - Safe ★
  [6, 13],  // 22
  [6, 14],  // 23
  [7, 14],  // 24
  [8, 14],  // 25

  // === Yellow START (bottom-right home) → LEFT along right arm, then DOWN bottom arm ===
  [8, 13],  // 26 - Yellow START ★  → goes LEFT
  [8, 12],  // 27
  [8, 11],  // 28
  [8, 10],  // 29
  [8, 9],   // 30
  [9, 8],   // 31
  [10, 8],  // 32
  [11, 8],  // 33
  [12, 8],  // 34 - Safe ★
  [13, 8],  // 35
  [14, 8],  // 36
  [14, 7],  // 37
  [14, 6],  // 38

  // === Blue START (bottom-left home) → UP along bottom arm, then LEFT along left arm ===
  [13, 6],  // 39 - Blue START ★  → goes UP
  [12, 6],  // 40
  [11, 6],  // 41
  [10, 6],  // 42
  [9, 6],   // 43
  [8, 5],   // 44
  [8, 4],   // 45
  [8, 3],   // 46
  [8, 2],   // 47 - Safe ★
  [8, 1],   // 48
  [8, 0],   // 49
  [7, 0],   // 50
  [6, 0],   // 51
];

// Home columns: 5 squares leading to center
// Each entered from the adjacent HOME_ENTRY track square
export const homeColumnPositions: Record<PlayerColor, [number, number][]> = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],    // LEFT arm → center (entry from [7,0])
  green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],    // TOP arm → center (entry from [0,7])
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // RIGHT arm → center (entry from [7,14])
  blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // BOTTOM arm → center (entry from [14,7])
};

// Home bases
export const homeBasePositions: Record<PlayerColor, [number, number][]> = {
  red:    [[2, 2], [2, 4], [4, 2], [4, 4]],
  green:  [[2, 10], [2, 12], [4, 10], [4, 12]],
  blue:   [[10, 2], [10, 4], [12, 2], [12, 4]],
  yellow: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

export const centerPosition: [number, number] = [7, 7];

export function getMovePath(
  fromPos: number,
  toPos: number,
  color: PlayerColor,
): [number, number][] {
  const path: [number, number][] = [];

  if (fromPos === -1) {
    path.push(trackPositions[toPos]);
    return path;
  }

  if (fromPos < TOTAL_TRACK_SQUARES && toPos < TOTAL_TRACK_SQUARES) {
    let current = fromPos;
    while (current !== toPos) {
      current = (current + 1) % TOTAL_TRACK_SQUARES;
      path.push(trackPositions[current]);
    }
    return path;
  }

  if (fromPos < TOTAL_TRACK_SQUARES && toPos >= TOTAL_TRACK_SQUARES) {
    const homeColumns = homeColumnPositions[color];
    const entryPath = getTrackToHomeEntryPath(fromPos, color);
    path.push(...entryPath);
    const homeEnd = toPos === 57 ? homeColumns.length : toPos - TOTAL_TRACK_SQUARES + 1;
    for (let i = 0; i < homeEnd; i++) {
      if (i < homeColumns.length) path.push(homeColumns[i]);
    }
    if (toPos === 57) path.push(centerPosition);
    return path;
  }

  if (fromPos >= TOTAL_TRACK_SQUARES && toPos >= TOTAL_TRACK_SQUARES) {
    const homeColumns = homeColumnPositions[color];
    const startIdx = fromPos - TOTAL_TRACK_SQUARES + 1;
    const endIdx = toPos === 57 ? homeColumns.length : toPos - TOTAL_TRACK_SQUARES + 1;
    for (let i = startIdx; i < endIdx; i++) {
      if (i < homeColumns.length) path.push(homeColumns[i]);
    }
    if (toPos === 57) path.push(centerPosition);
    return path;
  }

  if (toPos === 57) path.push(centerPosition);
  else if (toPos >= TOTAL_TRACK_SQUARES) path.push(homeColumnPositions[color][toPos - TOTAL_TRACK_SQUARES]);
  else path.push(trackPositions[toPos]);
  return path;
}

function getTrackToHomeEntryPath(fromPos: number, color: PlayerColor): [number, number][] {
  const path: [number, number][] = [];
  const homeEntry = HOME_ENTRY[color];
  let current = fromPos;
  while (current !== homeEntry) {
    current = (current + 1) % TOTAL_TRACK_SQUARES;
    path.push(trackPositions[current]);
  }
  return path;
}

export function getPiecePosition(
  position: number, color: PlayerColor, pieceId: number, cellSize: number,
): { x: number; y: number } {
  if (position === -1) {
    const [row, col] = homeBasePositions[color][pieceId];
    return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
  }

  if (position === 57) {
    const [row, col] = centerPosition;
    const offsets: Record<PlayerColor, [number, number]> = {
      red: [-0.3, -0.3], green: [-0.3, 0.3], blue: [0.3, -0.3], yellow: [0.3, 0.3],
    };
    const [or, oc] = offsets[color];
    const po = (pieceId % 2) * 0.15;
    return { x: (col + oc + po) * cellSize + cellSize / 2, y: (row + or + po) * cellSize + cellSize / 2 };
  }

  if (position >= TOTAL_TRACK_SQUARES) {
    const homeIndex = position - TOTAL_TRACK_SQUARES;
    const [row, col] = homeColumnPositions[color][homeIndex];
    return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
  }

  const [row, col] = trackPositions[position];
  return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
}

export function getPositionCoords(position: number, color: PlayerColor): [number, number] {
  if (position === 57) return centerPosition;
  if (position >= TOTAL_TRACK_SQUARES) return homeColumnPositions[color][position - TOTAL_TRACK_SQUARES];
  if (position >= 0) return trackPositions[position];
  return homeBasePositions[color][0];
}
