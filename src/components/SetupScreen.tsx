import { motion } from "framer-motion";
import type { PlayerColor } from "@/game/types";

const COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const COLOR_ASSIGNMENTS: Record<number, PlayerColor[][]> = {
  2: [["red", "yellow"], ["green", "blue"]],
  3: [["red"], ["green"], ["blue", "yellow"]],
  4: [["red"], ["green"], ["yellow"], ["blue"]],
};

interface SetupScreenProps {
  onStart: (playerCount: number) => void;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 py-8">
      {/* Logo area */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 150 }}
        className="text-center mb-12"
      >
        {/* Board-like color grid */}
        <div className="inline-grid grid-cols-2 gap-3 mb-6">
          {(["green", "blue", "red", "yellow"] as PlayerColor[]).map((c, i) => (
            <motion.div
              key={c}
              className="w-14 h-14 rounded-2xl"
              style={{
                backgroundColor: COLORS[c],
                boxShadow: `0 4px 20px ${COLORS[c]}50`,
              }}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.08 + 0.1, type: "spring", stiffness: 200 }}
            />
          ))}
        </div>
        <h1 className="text-7xl font-black text-white tracking-tight">LUDO</h1>
        <p className="text-white/30 text-base mt-2 font-semibold tracking-[0.3em] uppercase">
          Pass & Play
        </p>
      </motion.div>

      {/* Player count selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        {[2, 3, 4].map((count, ci) => {
          const assignment = COLOR_ASSIGNMENTS[count];
          return (
            <motion.button
              key={count}
              onClick={() => onStart(count)}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + ci * 0.1 }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-3xl overflow-hidden"
              style={{ minHeight: 80 }}
            >
              <div className="relative bg-white/8 hover:bg-white/12 active:bg-white/15 transition-colors border border-white/10 rounded-3xl px-8 py-5 flex items-center justify-between">
                <div>
                  <div className="text-white font-extrabold text-2xl mb-2">
                    {count} Players
                  </div>
                  <div className="flex gap-4">
                    {assignment.map((colors, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/30 text-sm font-bold">
                          P{i + 1}
                        </span>
                        <div className="flex gap-1.5">
                          {colors.map((c) => (
                            <div
                              key={c}
                              className="w-6 h-6 rounded-full ring-2 ring-white/15"
                              style={{
                                backgroundColor: COLORS[c],
                                boxShadow: `0 2px 8px ${COLORS[c]}40`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-white/20 text-3xl font-light">›</div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/15 text-xs mt-8 tracking-widest uppercase"
      >
        All 4 colors always in play
      </motion.p>
    </div>
  );
}
