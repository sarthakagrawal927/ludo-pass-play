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
    <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 140 }}
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/25 px-6 py-7 backdrop-blur-xl shadow-[0_30px_80px_-35px_rgba(0,0,0,0.85)] sm:px-8 sm:py-9"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.20),transparent_38%)]" />

          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f0d8a0]/20 bg-[#f0d8a0]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-[#f0d8a0]">
              <span className="h-2 w-2 rounded-full bg-[#f0d8a0]" />
              Local Multiplayer
            </div>

            <div className="mb-8 inline-grid grid-cols-2 gap-3">
              {(["green", "blue", "red", "yellow"] as PlayerColor[]).map((c, i) => (
                <motion.div
                  key={c}
                  className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10"
                  style={{
                    background: `linear-gradient(145deg, ${COLORS[c]}, rgba(255,255,255,0.08))`,
                    boxShadow: `0 10px 24px ${COLORS[c]}45`,
                  }}
                  initial={{ scale: 0, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.08 + 0.1, type: "spring", stiffness: 220 }}
                >
                  <div className="h-7 w-7 rounded-full border border-white/35 bg-white/18" />
                </motion.div>
              ))}
            </div>

            <h1 className="max-w-xl text-6xl font-black tracking-[-0.05em] text-[#fff7ea] sm:text-7xl lg:text-8xl">
              Ludo, dressed like a proper game night.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
              One device, two to four human players, instant rematches. Pick a table size
              and pass the screen around like a real board game.
            </p>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              {[
                "Classic rules with local pass-and-play turns",
                "All four colors always in action",
                "Fast rematches with no setup friction",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-4 text-sm font-medium text-white/76"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-[32px] border border-white/10 bg-black/28 p-4 backdrop-blur-xl shadow-[0_30px_70px_-36px_rgba(0,0,0,0.8)] sm:p-6"
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f0d8a0]/85">
                Choose The Table
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                Seat the players
              </h2>
            </div>
            <p className="max-w-[7rem] text-right text-xs leading-5 text-white/42">
              All color teams are assigned automatically.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[2, 3, 4].map((count, ci) => {
              const assignment = COLOR_ASSIGNMENTS[count];
              return (
                <motion.button
                  key={count}
                  onClick={() => onStart(count)}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + ci * 0.08 }}
                  whileTap={{ scale: 0.98 }}
                  className="group w-full rounded-[28px] text-left"
                  style={{ minHeight: 92 }}
                >
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.045] px-5 py-5 transition-all group-hover:border-[#f0d8a0]/25 group-hover:bg-white/[0.075] group-active:scale-[0.99] sm:px-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-white/35">
                          Table For
                        </div>
                        <div className="mt-1 text-2xl font-black text-white">
                          {count} Players
                        </div>
                      </div>
                      <div className="rounded-full border border-[#f0d8a0]/18 bg-[#f0d8a0]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#f0d8a0]">
                        Start
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {assignment.map((colors, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-full border border-white/8 bg-black/18 px-3 py-2"
                        >
                          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/38">
                            P{i + 1}
                          </span>
                          <div className="flex gap-1.5">
                            {colors.map((c) => (
                              <div
                                key={c}
                                className="h-6 w-6 rounded-full ring-2 ring-white/12"
                                style={{
                                  backgroundColor: COLORS[c],
                                  boxShadow: `0 2px 10px ${COLORS[c]}50`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.32em] text-white/24"
          >
            Every match keeps all four colors on the table
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
