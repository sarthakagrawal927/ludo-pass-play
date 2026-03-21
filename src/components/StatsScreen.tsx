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
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
        className="w-full max-w-lg bg-gray-900/95 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          border: `2px solid ${PLAYER_COLORS[winnerColors[0]]}40`,
          boxShadow: `0 0 40px ${PLAYER_COLORS[winnerColors[0]]}20`,
        }}
      >
        {/* Winner header */}
        <div className="text-center mb-6">
          <div className="flex justify-center gap-2 mb-3">
            {winnerColors.map((c) => (
              <motion.div
                key={c}
                className="w-8 h-8 rounded-full"
                style={{
                  backgroundColor: PLAYER_COLORS[c],
                  boxShadow: `0 0 12px ${PLAYER_COLORS[c]}80`,
                }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
          <h2 className="text-3xl font-black text-white">
            Player {winner + 1} Wins!
          </h2>
          <p className="text-white/40 text-sm mt-1">Game Statistics</p>
        </div>

        {/* Dice Roll Distribution */}
        <div className="mb-6">
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
            Dice Rolls by Team
          </h3>
          <div className="space-y-3">
            {playerStats.map((ps) => {
              const isWinner = ps.idx === winner;
              return (
                <div
                  key={ps.idx}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: isWinner
                      ? `${PLAYER_COLORS[ps.colors[0]]}12`
                      : "rgba(255,255,255,0.03)",
                    border: isWinner
                      ? `1px solid ${PLAYER_COLORS[ps.colors[0]]}26`
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
                    <span className="text-white/35 text-[10px] font-mono ml-auto">
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
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
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
                  className="rounded-xl p-3"
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
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">
            Pieces Finished by Color
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {(["red", "green", "yellow", "blue"] as PlayerColor[]).map((c) => (
              <div
                key={c}
                className="flex flex-col items-center gap-1.5 rounded-xl p-2"
                style={{ backgroundColor: `${PLAYER_COLORS[c]}10` }}
              >
                <div
                  className="w-5 h-5 rounded-full"
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
            className="w-full py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            whileTap={{ scale: 0.97 }}
            style={{ minHeight: 48 }}
          >
            Restart
          </motion.button>
          <motion.button
            onClick={onChangePlayers}
            className="w-full py-3.5 rounded-2xl bg-white/5 text-white/80 font-bold text-base hover:bg-white/10 active:scale-[0.98] transition-all"
            whileTap={{ scale: 0.97 }}
            style={{ minHeight: 48 }}
          >
            Change Players
          </motion.button>
          <motion.button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-base hover:bg-white/15 active:scale-[0.98] transition-all"
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
