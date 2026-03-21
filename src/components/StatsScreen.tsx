import { motion } from "framer-motion";
import type { GameStats, ColorAssignment, PlayerColor } from "@/game/types";

const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const COLOR_LABELS: Record<PlayerColor, string> = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};

interface StatsScreenProps {
  stats: GameStats;
  colorAssignment: ColorAssignment;
  winner: number;
  onRestart: () => void;
  onChangePlayers: () => void;
  onClose: () => void;
}

export default function StatsScreen({
  stats,
  colorAssignment,
  winner,
  onRestart,
  onChangePlayers,
  onClose,
}: StatsScreenProps) {
  const winnerColors = colorAssignment[winner];

  // Per-player aggregated stats
  const playerStats = colorAssignment.map((colors, idx) => {
    const rolls = stats.diceRollsByPlayer?.[idx] ?? [0, 0, 0, 0, 0, 0, 0];
    const totalCaptures = colors.reduce(
      (sum, c) => sum + (stats.captures[c] ?? 0),
      0,
    );
    const totalMoves = colors.reduce(
      (sum, c) => sum + (stats.totalMoves[c] ?? 0),
      0,
    );
    const totalFinished = colors.reduce(
      (sum, c) => sum + (stats.piecesFinished[c] ?? 0),
      0,
    );
    const totalRolls = rolls.slice(1).reduce((sum, count) => sum + count, 0);
    const maxRolls = Math.max(...rolls.slice(1), 1);
    return {
      idx,
      colors,
      rolls,
      totalRolls,
      maxRolls,
      totalCaptures,
      totalMoves,
      totalFinished,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/76 p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
        className="w-full max-w-2xl overflow-y-auto rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,23,18,0.95),rgba(8,14,11,0.98))] p-6 shadow-[0_34px_100px_-42px_rgba(0,0,0,0.9)] max-h-[90vh] sm:p-7"
        style={{
          boxShadow: `0 0 42px ${PLAYER_COLORS[winnerColors[0]]}18, 0 34px 100px -42px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Winner header */}
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f0d8a0]/18 bg-[#f0d8a0]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-[#f0d8a0]">
            Match Summary
          </div>
          <div className="mb-3 flex justify-center gap-2">
            {winnerColors.map((c) => (
              <motion.div
                key={c}
                className="h-8 w-8 rounded-full"
                style={{
                  backgroundColor: PLAYER_COLORS[c],
                  boxShadow: `0 0 12px ${PLAYER_COLORS[c]}80`,
                }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
          <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Player {winner + 1} Wins!
          </h2>
          <p className="mt-1 text-sm text-white/46">Game Statistics</p>
        </div>

        {/* Dice Roll Distribution */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/54">
            Dice Rolls by Team
          </h3>
          <div className="space-y-3">
            {playerStats.map((ps) => {
              const isWinner = ps.idx === winner;
              return (
                <div
                  key={ps.idx}
                  className="rounded-[26px] p-4"
                  style={{
                    backgroundColor: isWinner
                      ? `${PLAYER_COLORS[ps.colors[0]]}14`
                      : "rgba(255,255,255,0.035)",
                    border: isWinner
                      ? `1px solid ${PLAYER_COLORS[ps.colors[0]]}28`
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-1">
                      {ps.colors.map((c) => (
                        <div
                          key={c}
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: PLAYER_COLORS[c] }}
                        />
                      ))}
                    </div>
                    <span className="text-white/80 text-sm font-bold">
                      Player {ps.idx + 1}
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-white/35">
                      {ps.totalRolls} rolls
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 h-24">
                    {[1, 2, 3, 4, 5, 6].map((val) => {
                      const count = ps.rolls[val] ?? 0;
                      const pct = ps.maxRolls > 0 ? (count / ps.maxRolls) * 100 : 0;
                      return (
                        <div
                          key={val}
                          className="flex flex-col items-center justify-end gap-1"
                        >
                          <span className="text-white/45 text-[10px] font-mono font-bold">
                            {count}
                          </span>
                          <motion.div
                            className="w-full rounded-t-md"
                            style={{
                              backgroundColor:
                                val === 6 ? "#f59e0b" : "rgba(255,255,255,0.15)",
                              minHeight: 4,
                            }}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(pct, count > 0 ? 8 : 5)}%` }}
                            transition={{ delay: 0.3 + ps.idx * 0.08 + val * 0.03, duration: 0.45 }}
                          />
                          <span className="text-white/70 text-xs font-bold">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-player stats */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/54">
            Player Breakdown
          </h3>
          <div className="space-y-3">
            {playerStats.map((ps) => {
              const isWinner = ps.idx === winner;
              return (
                <motion.div
                  key={ps.idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + ps.idx * 0.1 }}
                  className="rounded-[26px] p-4"
                  style={{
                    backgroundColor: isWinner
                      ? `${PLAYER_COLORS[ps.colors[0]]}15`
                      : "rgba(255,255,255,0.03)",
                    border: isWinner
                      ? `1px solid ${PLAYER_COLORS[ps.colors[0]]}30`
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1">
                      {ps.colors.map((c) => (
                        <div
                          key={c}
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: PLAYER_COLORS[c] }}
                        />
                      ))}
                    </div>
                    <span className="text-white font-bold text-sm">
                      Player {ps.idx + 1}
                    </span>
                    {isWinner && (
                      <span className="text-yellow-400 text-xs font-bold ml-auto">
                        WINNER
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatCell label="Moves" value={ps.totalMoves} />
                    <StatCell label="Captures" value={ps.totalCaptures} />
                    <StatCell label="Finished" value={`${ps.totalFinished}/${ps.colors.length * 4}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Per-color pieces finished */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/54">
            Pieces Finished by Color
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {(["red", "green", "yellow", "blue"] as PlayerColor[]).map((c) => (
              <div
                key={c}
                className="flex flex-col items-center gap-1.5 rounded-[22px] border border-white/6 p-3"
                style={{ backgroundColor: `${PLAYER_COLORS[c]}10` }}
              >
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[c] }}
                />
                <span className="text-white/70 text-[10px] font-bold uppercase">
                  {COLOR_LABELS[c]}
                </span>
                <span className="text-white text-lg font-black">
                  {stats.piecesFinished[c] ?? 0}/4
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            onClick={onRestart}
            className="w-full rounded-2xl bg-[#f0d8a0] py-3.5 text-base font-black text-[#16241d] transition-all hover:bg-[#f5dfad] active:scale-[0.98]"
            whileTap={{ scale: 0.97 }}
            style={{ minHeight: 48 }}
          >
            Restart
          </motion.button>
          <motion.button
            onClick={onChangePlayers}
            className="w-full rounded-2xl bg-white/5 py-3.5 text-base font-bold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98]"
            whileTap={{ scale: 0.97 }}
            style={{ minHeight: 48 }}
          >
            Change Players
          </motion.button>
          <motion.button
            onClick={onClose}
            className="w-full rounded-2xl bg-white/10 py-3.5 text-base font-bold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
            whileTap={{ scale: 0.97 }}
            style={{ minHeight: 48 }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCell({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center">
      <div className="text-white text-base font-black">{value}</div>
      <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
