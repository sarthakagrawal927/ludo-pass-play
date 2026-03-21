export type PlayerColor = "red" | "green" | "yellow" | "blue";

// Standard Ludo: Red top-left, Green top-right, Blue bottom-left, Yellow bottom-right
// Track order (by start position): green(0), red(13), blue(26), yellow(39)
export const ALL_COLORS: PlayerColor[] = ["green", "red", "blue", "yellow"];

export interface Piece {
  id: number;
  color: PlayerColor;
  position: number; // -1 = home, 0-51 = main track, 52-56 = home column, 57 = finished
  isHome: boolean;
  isFinished: boolean;
}

export interface ColorState {
  color: PlayerColor;
  pieces: Piece[];
  isComplete: boolean;
}

export type GamePhase = "setup" | "rolling" | "moving" | "animating" | "finished";

export interface PieceRef {
  color: PlayerColor;
  pieceId: number;
}

export type ColorAssignment = PlayerColor[][];

export interface GameStats {
  diceRolls: number[]; // overall count per value (index 0 unused, 1-6)
  diceRollsByPlayer: number[][]; // per player: diceRollsByPlayer[playerIndex][1-6]
  captures: Record<PlayerColor, number>;
  totalMoves: Record<PlayerColor, number>;
  piecesFinished: Record<PlayerColor, number>;
}

export interface GameState {
  colors: ColorState[];
  colorAssignment: ColorAssignment;
  humanPlayerCount: number;
  currentHumanPlayer: number;
  diceValue: number | null;
  phase: GamePhase;
  winner: number | null;
  consecutiveSixes: number;
  bonusTurns: number; // stacked bonus turns (6 + capture + finish can all stack)
  message: string;
  movablePieces: PieceRef[];
  stats: GameStats;
}

// Board constants
export const TOTAL_TRACK_SQUARES = 52;
export const HOME_COLUMN_LENGTH = 5;
export const FINISH_POSITION = 57;

// Start positions: each near its home base
// Red[6,1]=top-left, Blue[13,6]=bottom-left, Yellow[8,13]=bottom-right, Green[1,8]=top-right
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Home entry — last track square before piece turns into home column
// Red: [7,0]=pos50, Green: [0,7]=pos11, Yellow: [7,14]=pos24, Blue: [14,7]=pos37
// All directly adjacent to first home column square. homeEntryRel=50 for all.
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
};
// Red[7,0]→[7,1], Green[0,7]→[1,7], Yellow[7,14]→[7,13], Blue[14,7]→[13,7]
// All directly adjacent. homeEntryRel=50 for all colors.

// Safe squares: start positions + star squares between them
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];
