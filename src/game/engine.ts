import {
  type GameState,
  type ColorState,
  type Piece,
  type PlayerColor,
  type PieceRef,
  type ColorAssignment,
  type GameStats,
  ALL_COLORS,
  START_POSITIONS,
  HOME_ENTRY,
  SAFE_SQUARES,
  TOTAL_TRACK_SQUARES,
  HOME_COLUMN_LENGTH,
  FINISH_POSITION,
} from "./types";

// Diagonal pairs: Red(top-left)+Yellow(bottom-right), Green(top-right)+Blue(bottom-left)
const ASSIGNMENTS: Record<number, ColorAssignment> = {
  2: [["red", "yellow"], ["green", "blue"]],
  3: [["red"], ["green"], ["blue", "yellow"]],
  4: [["red"], ["green"], ["yellow"], ["blue"]],
};

function createColorState(color: PlayerColor): ColorState {
  const pieces: Piece[] = Array.from({ length: 4 }, (_, i) => ({
    id: i, color, position: -1, isHome: true, isFinished: false,
  }));
  return { color, pieces, isComplete: false };
}

function createStats(playerCount: number): GameStats {
  return {
    diceRolls: [0, 0, 0, 0, 0, 0, 0],
    diceRollsByPlayer: Array.from({ length: playerCount }, () => [0, 0, 0, 0, 0, 0, 0]),
    captures: { red: 0, green: 0, yellow: 0, blue: 0 },
    totalMoves: { red: 0, green: 0, yellow: 0, blue: 0 },
    piecesFinished: { red: 0, green: 0, yellow: 0, blue: 0 },
  };
}

function getDiceRollsByPlayer(stats: GameStats, playerCount: number): number[][] {
  return Array.from({ length: playerCount }, (_, playerIdx) => {
    const rolls = stats.diceRollsByPlayer?.[playerIdx] ?? [0, 0, 0, 0, 0, 0, 0];
    return Array.from({ length: 7 }, (_, face) => rolls[face] ?? 0);
  });
}

export function createGame(humanPlayerCount: number): GameState {
  const assignment = ASSIGNMENTS[humanPlayerCount];
  const colors = ALL_COLORS.map(createColorState);

  return {
    colors,
    colorAssignment: assignment,
    humanPlayerCount,
    currentHumanPlayer: 0,
    diceValue: null,
    phase: "rolling",
    winner: null,
    consecutiveSixes: 0,
    bonusTurns: 0,
    message: `Player 1's turn`,
    movablePieces: [],
    stats: createStats(humanPlayerCount),
  };
}

export function rollDice(): number {
  // Rejection sampling for perfectly uniform 1-6
  // Avoids modulo bias from crypto.getRandomValues
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 6) * 6; // largest multiple of 6 that fits in uint32
  let val: number;
  do {
    crypto.getRandomValues(array);
    val = array[0];
  } while (val >= limit); // reject values that would cause bias (probability < 0.0000001%)
  return (val % 6) + 1;
}

function absoluteToRelative(absolutePos: number, color: PlayerColor): number {
  return (absolutePos - START_POSITIONS[color] + TOTAL_TRACK_SQUARES) % TOTAL_TRACK_SQUARES;
}

function canPieceMove(piece: Piece, dice: number): boolean {
  if (piece.isFinished) return false;

  if (piece.isHome) return dice === 6;

  if (piece.position >= TOTAL_TRACK_SQUARES) {
    const homePos = piece.position - TOTAL_TRACK_SQUARES;
    return homePos + dice <= HOME_COLUMN_LENGTH;
  }

  const relPos = absoluteToRelative(piece.position, piece.color);
  const homeEntryRel = absoluteToRelative(HOME_ENTRY[piece.color], piece.color);

  if (relPos <= homeEntryRel && relPos + dice > homeEntryRel) {
    return (relPos + dice - homeEntryRel) <= HOME_COLUMN_LENGTH + 1;
  }

  return true;
}

function getMovablePieces(state: GameState): PieceRef[] {
  const playerColors = state.colorAssignment[state.currentHumanPlayer];
  const dice = state.diceValue!;
  const movable: PieceRef[] = [];

  for (const color of playerColors) {
    const colorState = state.colors.find((c) => c.color === color)!;
    if (colorState.isComplete) continue;
    for (const piece of colorState.pieces) {
      if (canPieceMove(piece, dice)) {
        movable.push({ color, pieceId: piece.id });
      }
    }
  }
  return movable;
}

export function handleDiceRoll(state: GameState): GameState {
  const dice = rollDice();
  const newStats = {
    ...state.stats,
    diceRolls: [...state.stats.diceRolls],
    diceRollsByPlayer: getDiceRollsByPlayer(state.stats, state.humanPlayerCount),
  };
  newStats.diceRolls[dice]++;
  newStats.diceRollsByPlayer[state.currentHumanPlayer][dice]++;

  const newState = { ...state, diceValue: dice, stats: newStats };
  const playerLabel = `Player ${state.currentHumanPlayer + 1}`;

  // Three consecutive 6s = lose turn
  if (state.consecutiveSixes >= 2 && dice === 6) {
    return advanceTurn({
      ...newState,
      consecutiveSixes: 0,
      bonusTurns: 0,
      message: `Three 6s! ${playerLabel} loses turn`,
    });
  }

  const movable = getMovablePieces(newState);

  if (movable.length === 0) {
    // No moves available
    if (state.bonusTurns > 0) {
      // Still have bonus turns, use one and roll again
      return {
        ...newState,
        phase: "rolling",
        bonusTurns: state.bonusTurns - 1,
        consecutiveSixes: dice === 6 ? state.consecutiveSixes + 1 : 0,
        message: `Rolled ${dice} — no moves. Bonus roll!`,
      };
    }
    if (dice === 6) {
      // 6 with no moves but still get extra turn for the 6
      return {
        ...newState,
        phase: "rolling",
        consecutiveSixes: state.consecutiveSixes + 1,
        message: `Rolled 6 — no moves available`,
      };
    }
    return advanceTurn({
      ...newState,
      message: `Rolled ${dice} — no moves`,
    });
  }

  // Always return "moving" phase so the UI can show the dice result first
  // The UI will auto-move after a delay if there's only 1 option
  return {
    ...newState,
    phase: "moving",
    movablePieces: movable,
    message: `Rolled ${dice} — pick a piece`,
  };
}

export interface MoveResult {
  state: GameState;
  fromPos: number;
  toPos: number;
  color: PlayerColor;
  pieceId: number;
  captured: boolean;
}

export function movePiece(state: GameState, ref: PieceRef): GameState {
  const dice = state.diceValue!;
  const playerLabel = `Player ${state.currentHumanPlayer + 1}`;

  const newColors = state.colors.map((cs) => ({
    ...cs,
    pieces: cs.pieces.map((p) => ({ ...p })),
  }));

  const newStats = {
    ...state.stats,
    captures: { ...state.stats.captures },
    totalMoves: { ...state.stats.totalMoves },
    piecesFinished: { ...state.stats.piecesFinished },
  };

  const colorState = newColors.find((c) => c.color === ref.color)!;
  const piece = colorState.pieces[ref.pieceId];
  const oldPosition = piece.position;

  newStats.totalMoves[ref.color]++;

  let opponentsCaptured = 0;
  let selfCaptured = false;
  let finished = false;

  if (piece.isHome && dice === 6) {
    piece.position = START_POSITIONS[ref.color];
    piece.isHome = false;
    const result = checkCaptureOnArrival(newColors, ref.color, piece.position, state.colorAssignment);
    opponentsCaptured = result.opponentsCaptured;
    selfCaptured = result.selfCaptured;
  } else if (piece.position >= TOTAL_TRACK_SQUARES) {
    const homePos = piece.position - TOTAL_TRACK_SQUARES;
    if (homePos + dice === HOME_COLUMN_LENGTH) {
      piece.position = FINISH_POSITION;
      piece.isFinished = true;
      finished = true;
    } else {
      piece.position = piece.position + dice;
    }
  } else {
    const relPos = absoluteToRelative(piece.position, ref.color);
    const homeEntryRel = absoluteToRelative(HOME_ENTRY[ref.color], ref.color);

    if (relPos <= homeEntryRel && relPos + dice > homeEntryRel) {
      const stepsIntoHome = relPos + dice - homeEntryRel;
      if (stepsIntoHome === HOME_COLUMN_LENGTH + 1) {
        piece.position = FINISH_POSITION;
        piece.isFinished = true;
        finished = true;
      } else {
        piece.position = TOTAL_TRACK_SQUARES + (stepsIntoHome - 1);
      }
    } else {
      piece.position = (piece.position + dice) % TOTAL_TRACK_SQUARES;
      const result = checkCaptureOnArrival(newColors, ref.color, piece.position, state.colorAssignment);
      opponentsCaptured = result.opponentsCaptured;
      selfCaptured = result.selfCaptured;
    }
  }

  // Check departure captures at old position (if piece left a shared square)
  if (!selfCaptured && oldPosition >= 0 && oldPosition < TOTAL_TRACK_SQUARES) {
    checkCaptureOnDeparture(newColors, ref.color, oldPosition, state.colorAssignment);
  }

  if (opponentsCaptured > 0) {
    newStats.captures[ref.color] += opponentsCaptured;
  }
  if (finished) {
    newStats.piecesFinished[ref.color]++;
  }

  colorState.isComplete = colorState.pieces.every((p) => p.isFinished);

  const playerColors = state.colorAssignment[state.currentHumanPlayer];
  const hasWon = playerColors.every(
    (c) => newColors.find((cs) => cs.color === c)!.isComplete,
  );

  const newState: GameState = {
    ...state,
    colors: newColors,
    movablePieces: [],
    winner: hasWon ? state.currentHumanPlayer : null,
    phase: hasWon ? "finished" : state.phase,
    stats: newStats,
  };

  if (hasWon) {
    return { ...newState, message: `${playerLabel} wins!` };
  }

  // BONUS TURN STACKING: each event adds a bonus turn independently
  // Only OPPONENT captures give bonus (not self-captures)
  const bonusFromDice = dice === 6 ? 1 : 0;
  const bonusFromCapture = selfCaptured ? 0 : opponentsCaptured;
  const bonusFromFinish = finished ? 1 : 0;
  const totalNewBonus = bonusFromDice + bonusFromCapture + bonusFromFinish;

  // Add to existing bonus turns
  let newBonusTurns = state.bonusTurns + totalNewBonus;

  if (newBonusTurns > 0) {
    const reasons: string[] = [];
    if (bonusFromDice) reasons.push("6");
    if (bonusFromCapture) reasons.push(`${opponentsCaptured > 1 ? opponentsCaptured + "x " : ""}capture`);
    if (bonusFromFinish) reasons.push("home");

    return {
      ...newState,
      phase: "rolling",
      bonusTurns: newBonusTurns - 1, // use one for the upcoming roll
      consecutiveSixes: dice === 6 ? state.consecutiveSixes + 1 : 0,
      message: `${playerLabel}: ${reasons.join(" + ")}! Roll again${newBonusTurns > 1 ? ` (${newBonusTurns - 1} more bonus)` : ""}`,
    };
  }

  return advanceTurn(newState);
}

// Get which player (index) controls a color
function getPlayerForColor(color: PlayerColor, assignment: ColorAssignment): number {
  return assignment.findIndex((colors) => colors.includes(color));
}

// Count pieces per player at a given position
function countPiecesPerPlayer(
  colors: ColorState[],
  position: number,
  assignment: ColorAssignment,
): Map<number, Piece[]> {
  const map = new Map<number, Piece[]>();
  for (const cs of colors) {
    for (const piece of cs.pieces) {
      if (piece.isHome || piece.isFinished || piece.position !== position) continue;
      const player = getPlayerForColor(cs.color, assignment);
      if (!map.has(player)) map.set(player, []);
      map.get(player)!.push(piece);
    }
  }
  return map;
}

// Send all pieces in a list back home. Returns count.
function sendHome(pieces: Piece[]): number {
  for (const p of pieces) {
    p.position = -1;
    p.isHome = true;
  }
  return pieces.length;
}

// Check captures at a position after a piece ARRIVES.
// Rules:
//   arriving team count > opponent count → opponent captured
//   arriving team count == opponent count → arriving team captured (defenders win ties)
//   arriving team count < opponent count → coexist
// Returns: { opponentsCaptured, selfCaptured }
function checkCaptureOnArrival(
  colors: ColorState[],
  arrivingColor: PlayerColor,
  position: number,
  assignment: ColorAssignment,
): { opponentsCaptured: number; selfCaptured: boolean } {
  if (SAFE_SQUARES.includes(position)) return { opponentsCaptured: 0, selfCaptured: false };

  const arrivingPlayer = getPlayerForColor(arrivingColor, assignment);
  const perPlayer = countPiecesPerPlayer(colors, position, assignment);
  const arrivingPieces = perPlayer.get(arrivingPlayer);
  if (!arrivingPieces) return { opponentsCaptured: 0, selfCaptured: false };
  const arrivingCount = arrivingPieces.length;

  let opponentsCaptured = 0;
  let selfCaptured = false;

  for (const [player, pieces] of perPlayer) {
    if (player === arrivingPlayer) continue;
    const oppCount = pieces.length;

    if (arrivingCount >= oppCount) {
      // Arriving team matches or outnumbers → opponent captured (attackers win ties)
      opponentsCaptured += sendHome(pieces);
    }
    // arrivingCount < oppCount → coexist
  }

  return { opponentsCaptured, selfCaptured };
}

// Check captures at old position after a piece DEPARTS.
// If departing team's remaining count <= opponent count → remaining pieces captured.
// Returns count of pieces captured (these are the current player's own pieces, no bonus).
function checkCaptureOnDeparture(
  colors: ColorState[],
  departingColor: PlayerColor,
  oldPosition: number,
  assignment: ColorAssignment,
): number {
  if (oldPosition < 0 || oldPosition >= TOTAL_TRACK_SQUARES) return 0; // home or home column
  if (SAFE_SQUARES.includes(oldPosition)) return 0;

  const departingPlayer = getPlayerForColor(departingColor, assignment);
  const perPlayer = countPiecesPerPlayer(colors, oldPosition, assignment);
  const remainingPieces = perPlayer.get(departingPlayer);
  if (!remainingPieces || remainingPieces.length === 0) return 0;

  for (const [player, pieces] of perPlayer) {
    if (player === departingPlayer) continue;
    if (remainingPieces.length <= pieces.length) {
      // Lost advantage → remaining pieces captured
      return sendHome(remainingPieces);
    }
  }
  return 0;
}

function advanceTurn(state: GameState): GameState {
  const next = (state.currentHumanPlayer + 1) % state.humanPlayerCount;
  return {
    ...state,
    currentHumanPlayer: next,
    diceValue: null,
    phase: "rolling",
    consecutiveSixes: 0,
    bonusTurns: 0,
    movablePieces: [],
    message: `Player ${next + 1}'s turn`,
  };
}
