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
  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const [lastDice, setLastDice] = useState<Record<number, number | null>>({});
  const [boardAreaSize, setBoardAreaSize] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    const boardArea = boardAreaRef.current;
    if (!boardArea) return;

    const updateBoardAreaSize = () => {
      const rect = boardArea.getBoundingClientRect();
      setBoardAreaSize({
        width: Math.max(Math.floor(rect.width), 0),
        height: Math.max(Math.floor(rect.height), 0),
      });
    };

    updateBoardAreaSize();

    const observer = new ResizeObserver(updateBoardAreaSize);
    observer.observe(boardArea);

    return () => observer.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    const measuredSize = Math.min(boardAreaSize.width, boardAreaSize.height);
    const fallbackSize = typeof window === "undefined"
      ? 300
      : Math.min(window.innerWidth - 24, window.innerHeight - 420);
    const boardPixels = measuredSize > 0 ? measuredSize : fallbackSize;
    return Math.max(1, Math.floor(boardPixels / 15));
  }, [boardAreaSize.height, boardAreaSize.width]);

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
  const totalTrackedRolls = teamDiceData.reduce((sum, team) => sum + team.total, 0);
  const diceLedgerMinHeight = teamDiceData.length > 2 ? 120 : 72;

  return (
    <div
      className={`relative mx-auto grid h-full w-full max-w-[1400px] justify-items-center gap-y-2.5 overflow-hidden px-2 py-3 sm:px-4 sm:py-4 ${
        player2Colors
          ? "grid-rows-[auto_auto_minmax(0,1fr)_auto_auto]"
          : "grid-rows-[auto_auto_minmax(0,1fr)_auto]"
      }`}
    >
      {/* Player indicator banner */}
      <div className="flex flex-col items-center gap-1.5">
        <motion.div
          key={`${state.currentHumanPlayer}-${currentColors.join()}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center gap-3 rounded-[28px] border border-white/10 px-5 py-3.5 backdrop-blur-xl shadow-[0_28px_70px_-38px_rgba(0,0,0,0.85)] sm:px-7"
          style={{
            background:
              currentColors.length === 1
                ? `linear-gradient(145deg, rgba(0,0,0,0.34), ${PLAYER_COLORS[currentColors[0]]}30)`
                : `linear-gradient(135deg, rgba(0,0,0,0.34), ${currentColors.map((c) => `${PLAYER_COLORS[c]}30`).join(", ")})`,
            boxShadow: `0 0 26px ${PLAYER_COLORS[currentColors[0]]}28, 0 24px 50px -28px rgba(0,0,0,0.8)`,
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
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/38">
              Current Turn
            </span>
            <span
              className="text-2xl font-black tracking-[-0.04em]"
              style={{ color: PLAYER_COLORS[currentColors[0]] }}
            >
              Player {state.currentHumanPlayer + 1}
            </span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={state.message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          className="h-4 text-xs font-medium text-white/50"
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
      <div ref={boardAreaRef} className="relative flex min-h-0 w-full items-center justify-center self-stretch">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-[min(82vw,82vh)] w-[min(82vw,82vh)] rounded-full bg-[radial-gradient(circle,rgba(240,191,96,0.12),transparent_58%)] blur-3xl" />
        </div>
        <svg
          width={boardSize}
          height={boardSize}
          viewBox={`0 0 ${boardSize} ${boardSize}`}
          className="relative rounded-[28px] shadow-[0_24px_80px_-22px_rgba(0,0,0,0.62)]"
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
      </div>

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
      <div className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-black/28 px-4 py-3 backdrop-blur-xl shadow-[0_28px_80px_-36px_rgba(0,0,0,0.82)] sm:px-5">
        <div className="flex flex-col items-center gap-2.5">
        {/* Score bar */}
        <div className="flex flex-wrap justify-center gap-2.5">
          {state.colors.map((cs) => {
            const done = cs.pieces.filter((p) => p.isFinished).length;
            return (
              <div
                key={cs.color}
                className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.045] px-3 py-1.5"
              >
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{
                    backgroundColor: PLAYER_COLORS[cs.color],
                    opacity: cs.isComplete ? 0.3 : 1,
                  }}
                />
                <span className="text-[11px] font-mono font-bold text-white/55">
                  {done}/4
                </span>
              </div>
            );
          })}
        </div>

        {/* Per-team dice distribution */}
        <div className="w-full" style={{ minHeight: diceLedgerMinHeight }}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/34">
            <span>Roll Ledger</span>
            <span>{anyRolls ? `${totalTrackedRolls} rolls tracked` : "Awaiting first toss"}</span>
          </div>
          <div className={`grid gap-2 ${teamDiceData.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
            {teamDiceData.map((team) => {
              const max = Math.max(...team.rolls.slice(1));
              return (
                <div
                  key={team.playerIdx}
                  className="rounded-[22px] border border-white/8 px-3 py-2 transition-opacity"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    opacity: anyRolls || team.total > 0 ? 1 : 0.68,
                  }}
                >
                  {/* Team header */}
                  <div className="mb-1.5 flex items-center gap-1.5">
                    {team.colors.map((c) => (
                      <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLAYER_COLORS[c] }} />
                    ))}
                    <span className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/38">
                      P{team.playerIdx + 1}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-white/34">
                      {team.total} rolls
                    </span>
                  </div>
                  {/* Bars */}
                  {[1, 2, 3, 4, 5, 6].map((face) => {
                    const count = team.rolls[face];
                    const pct = team.total > 0 ? Math.round((count / team.total) * 100) : 0;
                    const barW = max > 0 ? (count / max) * 100 : 0;
                    const isSix = face === 6;
                    return (
                      <div key={face} className="flex items-center gap-1.5" style={{ height: 13 }}>
                        <span className="shrink-0 font-mono font-bold" style={{ fontSize: 9, width: 8, color: isSix ? "rgba(245,190,80,0.7)" : "rgba(255,255,255,0.3)" }}>
                          {face}
                        </span>
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barW}%`,
                              background: isSix ? "rgba(245,190,80,0.5)" : "rgba(255,255,255,0.2)",
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-right font-mono" style={{ fontSize: 8, width: 30, color: isSix ? "rgba(245,190,80,0.5)" : "rgba(255,255,255,0.25)" }}>
                          {count} <span style={{ fontSize: 7 }}>{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "Auto Roll", value: autoDice, toggle: () => setAutoDice((v) => !v) },
            { label: "Auto Move", value: autoMove, toggle: () => setAutoMove((v) => !v) },
          ].map(({ label, value, toggle }) => (
            <button
              key={label}
              onClick={toggle}
              className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.045] px-3 py-2"
            >
              <div
                className="relative h-[18px] w-8 rounded-full transition-colors duration-200"
                style={{ backgroundColor: value ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all duration-200"
                  style={{ left: value ? 15 : 2, opacity: value ? 1 : 0.4 }}
                />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/46">
                {label}
              </span>
            </button>
          ))}
          <button
            onClick={handleRestartGame}
            className="rounded-full bg-[#f0d8a0] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#18261f] shadow-lg transition-all hover:bg-[#f5dfad] active:scale-[0.98]"
            style={{ minHeight: 36 }}
          >
            Restart
          </button>
          <button
            onClick={handleChangePlayers}
            className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/35 transition-colors hover:text-white/55"
          >
            Change Players
          </button>
        </div>
        </div>
      </div>

      {/* Winner overlay */}
      <AnimatePresence>
        {state.winner !== null && !showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-xl"
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
              className="w-full max-w-xl rounded-[36px] border border-white/10 bg-black/32 px-6 py-8 text-center shadow-[0_36px_100px_-42px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:px-8"
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
                className="mb-2 text-5xl font-black text-white"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Player {state.winner + 1}
              </motion.h2>
              <p className="text-white/50 text-lg font-medium">
                Wins the game!
              </p>
            </motion.div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowStats(true)}
                className="rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-base font-bold text-white"
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
                className="rounded-full bg-[#f0d8a0] px-8 py-3.5 text-base font-black text-[#1a2a21] shadow-lg"
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
