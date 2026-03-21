import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Board from "./Board";
import Piece from "./Piece";
import Dice from "./Dice";
import StatsScreen from "./StatsScreen";
import { createGame, handleDiceRoll, movePiece } from "@/game/engine";
import { getPositionCoords } from "@/game/board-positions";
import type { GameState, PlayerColor, PieceRef } from "@/game/types";

const STORAGE_KEY = "ludo-game";

const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

interface GameBoardProps {
  playerCount: number;
  initialState?: GameState;
  onReset: () => void;
}

// Check if movable pieces produce genuinely different outcomes (user needs to pick)
function hasUniqueChoice(state: GameState): boolean {
  if (state.movablePieces.length <= 1) return false;

  const positions = state.movablePieces.map((ref) => {
    const cs = state.colors.find((c) => c.color === ref.color)!;
    return `${cs.pieces[ref.pieceId].position}-${ref.color}`;
  });

  return new Set(positions).size > 1;
}

function saveGame(playerCount: number, state: GameState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ playerCount, state }),
    );
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function clearSavedGame(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export default function GameBoard({ playerCount, initialState, onReset }: GameBoardProps) {
  const [state, setState] = useState<GameState>(
    () => initialState ?? createGame(playerCount),
  );
  const [isRolling, setIsRolling] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [autoDice, setAutoDice] = useState(true);
  const [autoMove, setAutoMove] = useState(true);
  const autoRollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastDice, setLastDice] = useState<Record<number, number | null>>({});

  const currentColors = state.colorAssignment[state.currentHumanPlayer];

  // Persist state to localStorage on every settled state change
  useEffect(() => {
    if (isRolling) return; // Don't save mid-animation
    if (state.winner !== null) {
      clearSavedGame();
      return;
    }
    saveGame(playerCount, state);
  }, [state, isRolling, playerCount]);

  // Update lastDice when a roll happens
  useEffect(() => {
    if (state.diceValue !== null) {
      setLastDice((prev) => ({ ...prev, [state.currentHumanPlayer]: state.diceValue }));
    }
  }, [state.diceValue, state.currentHumanPlayer]);

  // Player 1 colors (left dice) and Player 2 colors (right dice)
  const player1Colors = state.colorAssignment[0];
  const player2Colors = state.colorAssignment.length > 1 ? state.colorAssignment[1] : null;

  const clearPendingTimers = useCallback(() => {
    if (autoRollTimer.current) {
      clearTimeout(autoRollTimer.current);
      autoRollTimer.current = null;
    }
    if (rollTimer.current) {
      clearTimeout(rollTimer.current);
      rollTimer.current = null;
    }
    if (autoMoveTimer.current) {
      clearTimeout(autoMoveTimer.current);
      autoMoveTimer.current = null;
    }
    setIsRolling(false);
  }, []);

  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const cellSize = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Vertical layout: dice top + board + dice bottom + controls
    const availableWidth = vw - 24; // 12px padding each side
    const availableHeight = vh - 340; // top dice ~80 + bottom dice ~80 + banner ~60 + controls ~120
    const available = Math.min(availableWidth, availableHeight);
    return Math.floor(Math.max(available, 200) / 15);
  }, []);

  const boardSize = cellSize * 15;

  // Compute highlighted squares: grid positions of all movable pieces
  const highlightedSquares = useMemo<[number, number][]>(() => {
    if (state.phase !== "moving") return [];

    return state.movablePieces.map((ref) => {
      const cs = state.colors.find((c) => c.color === ref.color)!;
      const piece = cs.pieces[ref.pieceId];
      return getPositionCoords(piece.position, ref.color);
    });
  }, [state.phase, state.movablePieces, state.colors]);

  // --- AUTO DICE ROLL ---
  useEffect(() => {
    if (!autoDice) return;
    if (state.phase !== "rolling" || isRolling || state.winner !== null) return;

    autoRollTimer.current = setTimeout(() => {
      autoRollTimer.current = null;
      setIsRolling(true);
      rollTimer.current = setTimeout(() => {
        setState((prev) => handleDiceRoll(prev));
        rollTimer.current = null;
        setIsRolling(false);
      }, 600);
    }, 1000);

    return () => {
      if (autoRollTimer.current) {
        clearTimeout(autoRollTimer.current);
        autoRollTimer.current = null;
      }
    };
  }, [autoDice, state.phase, state.currentHumanPlayer, state.bonusTurns, isRolling, state.winner]);

  // --- AUTO PIECE MOVE ---
  // Only when enabled AND no real choice exists
  useEffect(() => {
    if (!autoMove) return;
    if (state.phase !== "moving") return;
    if (state.movablePieces.length === 0) return;
    if (hasUniqueChoice(state)) return;

    // Wait so user can see dice result before piece moves
    autoMoveTimer.current = setTimeout(() => {
      setState((prev) => movePiece(prev, prev.movablePieces[0]));
      autoMoveTimer.current = null;
    }, 800);
    return () => {
      if (autoMoveTimer.current) {
        clearTimeout(autoMoveTimer.current);
        autoMoveTimer.current = null;
      }
    };
  }, [autoMove, state.phase, state.movablePieces, state.colors]);

  // Manual roll (tap dice to skip auto-roll delay)
  const handleRoll = useCallback(() => {
    if (state.phase !== "rolling" || isRolling) return;

    if (autoRollTimer.current) {
      clearTimeout(autoRollTimer.current);
      autoRollTimer.current = null;
    }

    setIsRolling(true);
    rollTimer.current = setTimeout(() => {
      setState((prev) => handleDiceRoll(prev));
      rollTimer.current = null;
      setIsRolling(false);
    }, 600);
  }, [state.phase, isRolling]);

  const handlePieceClick = useCallback(
    (ref: PieceRef) => {
      if (state.phase !== "moving") return;
      const isMovable = state.movablePieces.some(
        (m) => m.color === ref.color && m.pieceId === ref.pieceId,
      );
      if (!isMovable) return;

      setState((prev) => movePiece(prev, ref));
    },
    [state.phase, state.movablePieces],
  );

  const isPieceHighlighted = (color: PlayerColor, pieceId: number) =>
    state.phase === "moving" &&
    state.movablePieces.some((m) => m.color === color && m.pieceId === pieceId);

  // Compute piece render list: group same-color pieces at same position,
  // render one representative per (position, color) with a count badge
  const pieceRenderList = useMemo(() => {
    // Track position → set of colors present
    const posColors = new Map<number, Set<PlayerColor>>();
    // Track (position, color) → pieceIds
    const groups = new Map<string, number[]>();

    for (const cs of state.colors) {
      for (const piece of cs.pieces) {
        if (piece.isHome || piece.isFinished) continue;
        if (!posColors.has(piece.position)) posColors.set(piece.position, new Set());
        posColors.get(piece.position)!.add(cs.color);

        const gk = `${piece.position}-${cs.color}`;
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk)!.push(piece.id);
      }
    }

    const list: {
      color: PlayerColor;
      pieceId: number;
      position: number;
      count: number;
      othersPresent: boolean;
      isRepresentative: boolean;
    }[] = [];

    for (const cs of state.colors) {
      for (const piece of cs.pieces) {
        if (piece.isHome || piece.isFinished) {
          // Home and finished pieces always render individually
          list.push({
            color: cs.color, pieceId: piece.id, position: piece.position,
            count: 1, othersPresent: false, isRepresentative: true,
          });
          continue;
        }
        const gk = `${piece.position}-${cs.color}`;
        const group = groups.get(gk)!;
        const isRep = group[0] === piece.id; // only first piece renders
        if (!isRep) continue;

        const colorsAtPos = posColors.get(piece.position)!;
        list.push({
          color: cs.color, pieceId: piece.id, position: piece.position,
          count: group.length,
          othersPresent: colorsAtPos.size > 1,
          isRepresentative: true,
        });
      }
    }
    return list;
  }, [state.colors]);

  const handleRestartGame = useCallback(() => {
    clearPendingTimers();
    clearSavedGame();
    setShowStats(false);
    setLastDice({});
    setState(createGame(playerCount));
  }, [clearPendingTimers, playerCount]);

  const handleChangePlayers = useCallback(() => {
    clearPendingTimers();
    clearSavedGame();
    onReset();
  }, [clearPendingTimers, onReset]);

  // Per-team dice distribution
  const teamDiceData = useMemo(() => {
    return state.colorAssignment.map((colors, playerIdx) => {
      const rolls = state.stats.diceRollsByPlayer?.[playerIdx] ?? [0, 0, 0, 0, 0, 0, 0];
      const total = rolls.slice(1).reduce((s, n) => s + n, 0);
      return { colors, rolls, total, playerIdx };
    });
  }, [state.stats.diceRollsByPlayer, state.colorAssignment]);
  const anyRolls = teamDiceData.some((t) => t.total > 0);

  return (
    <div className="flex flex-col items-center justify-between min-h-full py-3 px-2">
      {/* Player indicator banner */}
      <div className="flex flex-col items-center gap-1.5 mb-2">
        <motion.div
          key={`${state.currentHumanPlayer}-${currentColors.join()}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl px-8 py-3.5"
          style={{
            background:
              currentColors.length === 1
                ? `${PLAYER_COLORS[currentColors[0]]}30`
                : `linear-gradient(135deg, ${currentColors.map((c) => `${PLAYER_COLORS[c]}30`).join(", ")})`,
            boxShadow: `0 0 24px ${PLAYER_COLORS[currentColors[0]]}50, 0 0 48px ${PLAYER_COLORS[currentColors[0]]}20`,
            border: `2px solid ${PLAYER_COLORS[currentColors[0]]}70`,
          }}
        >
          <div className="flex gap-2">
            {currentColors.map((c) => (
              <motion.div
                key={c}
                className="w-7 h-7 rounded-full"
                style={{
                  backgroundColor: PLAYER_COLORS[c],
                  boxShadow: `0 0 10px ${PLAYER_COLORS[c]}90`,
                }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <span
            className="text-xl font-black tracking-wide"
            style={{ color: PLAYER_COLORS[currentColors[0]] }}
          >
            Player {state.currentHumanPlayer + 1}
          </span>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={state.message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-white/50 text-xs font-medium h-4"
          >
            {state.message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Player 1 dice (top) */}
      <div className="flex items-center justify-center gap-3">
        <Dice
          value={state.currentHumanPlayer === 0 ? state.diceValue : lastDice[0] ?? null}
          rolling={state.currentHumanPlayer === 0 && isRolling}
          canRoll={state.currentHumanPlayer === 0 && state.phase === "rolling" && !isRolling}
          onRoll={handleRoll}
          playerColors={player1Colors}
          side="left"
          active={state.currentHumanPlayer === 0}
        />
      </div>

      {/* Board */}
      <svg
        width={boardSize}
        height={boardSize}
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        className="rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
      >
        <Board cellSize={cellSize} highlightedSquares={highlightedSquares} />

        {pieceRenderList.map((p) => (
          <Piece
            key={`${p.color}-${p.pieceId}`}
            color={p.color}
            pieceId={p.pieceId}
            position={p.position}
            cellSize={cellSize}
            highlighted={isPieceHighlighted(p.color, p.pieceId)}
            count={p.count}
            othersPresent={p.othersPresent}
            onClick={() => handlePieceClick({ color: p.color, pieceId: p.pieceId })}
          />
        ))}
      </svg>

      {/* Player 2 dice (bottom) */}
      {player2Colors && (
        <div className="flex items-center justify-center gap-3">
          <Dice
            value={state.currentHumanPlayer === 1 ? state.diceValue : lastDice[1] ?? null}
            rolling={state.currentHumanPlayer === 1 && isRolling}
            canRoll={state.currentHumanPlayer === 1 && state.phase === "rolling" && !isRolling}
            onRoll={handleRoll}
            playerColors={player2Colors}
            side="right"
            active={state.currentHumanPlayer === 1}
          />
        </div>
      )}

      {/* Bottom: score bar + dice distribution + controls */}
      <div className="flex flex-col items-center gap-2.5 mt-3">
        {/* Score bar */}
        <div className="flex gap-5">
          {state.colors.map((cs) => {
            const done = cs.pieces.filter((p) => p.isFinished).length;
            return (
              <div key={cs.color} className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{
                    backgroundColor: PLAYER_COLORS[cs.color],
                    opacity: cs.isComplete ? 0.3 : 1,
                  }}
                />
                <span className="text-white/40 text-[11px] font-mono font-bold">
                  {done}/4
                </span>
              </div>
            );
          })}
        </div>

        {/* Per-team dice distribution */}
        {anyRolls && (
          <div className="flex gap-4 w-full max-w-[400px] justify-center">
            {teamDiceData.map((team) => {
              const max = Math.max(...team.rolls.slice(1));
              return (
                <div key={team.playerIdx} className="flex-1 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {/* Team header */}
                  <div className="flex items-center gap-1 mb-1">
                    {team.colors.map((c) => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAYER_COLORS[c] }} />
                    ))}
                    <span className="text-white/30 text-[9px] font-mono ml-1">{team.total} rolls</span>
                  </div>
                  {/* Bars */}
                  {[1, 2, 3, 4, 5, 6].map((face) => {
                    const count = team.rolls[face];
                    const pct = team.total > 0 ? Math.round((count / team.total) * 100) : 0;
                    const barW = max > 0 ? (count / max) * 100 : 0;
                    const isSix = face === 6;
                    return (
                      <div key={face} className="flex items-center gap-1" style={{ height: 13 }}>
                        <span className="font-mono font-bold shrink-0" style={{ fontSize: 9, width: 8, color: isSix ? "rgba(245,190,80,0.7)" : "rgba(255,255,255,0.3)" }}>
                          {face}
                        </span>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full transition-all duration-300" style={{
                            width: `${barW}%`,
                            background: isSix ? "rgba(245,190,80,0.5)" : "rgba(255,255,255,0.2)",
                          }} />
                        </div>
                        <span className="font-mono shrink-0 text-right" style={{ fontSize: 8, width: 30, color: isSix ? "rgba(245,190,80,0.5)" : "rgba(255,255,255,0.25)" }}>
                          {count} <span style={{ fontSize: 7 }}>{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Auto Roll", value: autoDice, toggle: () => setAutoDice((v) => !v) },
            { label: "Auto Move", value: autoMove, toggle: () => setAutoMove((v) => !v) },
          ].map(({ label, value, toggle }) => (
            <button key={label} onClick={toggle} className="flex items-center gap-2 py-1">
              <div
                className="w-8 h-[18px] rounded-full relative transition-colors duration-200"
                style={{ backgroundColor: value ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200"
                  style={{ left: value ? 15 : 2, opacity: value ? 1 : 0.4 }}
                />
              </div>
              <span className="text-white/40 text-[10px] font-medium">{label}</span>
            </button>
          ))}
          <button
            onClick={handleRestartGame}
            className="px-4 py-2 rounded-full bg-white text-slate-950 text-[11px] font-bold shadow-lg hover:bg-white/90 active:scale-[0.98] transition-all"
            style={{ minHeight: 36 }}
          >
            Restart
          </button>
          <button
            onClick={handleChangePlayers}
            className="text-white/35 text-[10px] font-medium hover:text-white/55 transition-colors"
          >
            Change Players
          </button>
        </div>
      </div>

      {/* Winner overlay */}
      <AnimatePresence>
        {state.winner !== null && !showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-8 z-50"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="text-center"
            >
              {/* Confetti-like floating circles */}
              <div className="relative">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        PLAYER_COLORS[
                          state.colorAssignment[state.winner!][
                            i % state.colorAssignment[state.winner!].length
                          ]
                        ],
                      left: `${50 + Math.cos((i * Math.PI) / 4) * 60}%`,
                      top: `${50 + Math.sin((i * Math.PI) / 4) * 60}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.6, 1, 0.6],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}

                <div className="flex justify-center gap-3 mb-5">
                  {state.colorAssignment[state.winner].map((c) => (
                    <motion.div
                      key={c}
                      className="w-12 h-12 rounded-full"
                      style={{
                        backgroundColor: PLAYER_COLORS[c],
                        boxShadow: `0 0 20px ${PLAYER_COLORS[c]}80`,
                      }}
                      animate={{ scale: [1, 1.2, 1], y: [0, -12, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: Math.random() * 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>

              <motion.h2
                className="text-5xl font-black text-white mb-2"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Player {state.winner + 1}
              </motion.h2>
              <p className="text-white/50 text-lg font-medium">
                Wins the game!
              </p>
            </motion.div>

            <div className="flex gap-4">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowStats(true)}
                className="px-8 py-3.5 rounded-full bg-white/10 border border-white/20 text-white font-bold text-base"
                whileTap={{ scale: 0.95 }}
                style={{ minHeight: 48 }}
              >
                View Stats
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleRestartGame}
                className="px-8 py-3.5 rounded-full bg-white text-indigo-950 font-bold text-base shadow-lg"
                whileTap={{ scale: 0.95 }}
                style={{ minHeight: 48 }}
              >
                Restart
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats screen */}
      <AnimatePresence>
        {showStats && state.winner !== null && (
          <StatsScreen
            stats={state.stats}
            colorAssignment={state.colorAssignment}
            winner={state.winner}
            onRestart={handleRestartGame}
            onChangePlayers={handleChangePlayers}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
