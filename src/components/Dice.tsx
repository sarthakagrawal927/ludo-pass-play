import { motion } from "framer-motion";
import type { PlayerColor } from "@/game/types";

const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

interface DiceProps {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerColors: PlayerColor[];
  side: "left" | "right";
  active: boolean;
}

function DiceDots({ value, size }: { value: number; size: number }) {
  const r = size * 0.08;
  const pad = size * 0.22;
  const mid = size * 0.5;
  const far = size - pad;

  const positions: Record<number, [number, number][]> = {
    1: [[mid, mid]],
    2: [
      [pad, far],
      [far, pad],
    ],
    3: [
      [pad, far],
      [mid, mid],
      [far, pad],
    ],
    4: [
      [pad, pad],
      [pad, far],
      [far, pad],
      [far, far],
    ],
    5: [
      [pad, pad],
      [pad, far],
      [mid, mid],
      [far, pad],
      [far, far],
    ],
    6: [
      [pad, pad],
      [pad, mid],
      [pad, far],
      [far, pad],
      [far, mid],
      [far, far],
    ],
  };

  return (
    <>
      {(positions[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#1e1b4b" />
      ))}
    </>
  );
}

export default function Dice({
  value,
  rolling,
  canRoll,
  onRoll,
  playerColors,
  side,
  active,
}: DiceProps) {
  const size = 80;
  const displayValue = value ?? 1;
  const primaryColor = PLAYER_COLORS[playerColors[0]];
  const gradientId = `diceGradient-${side}`;
  const statusLabel = active
    ? (canRoll ? "Tap to roll" : (rolling ? "Rolling" : "Make your move"))
    : "Stand by";

  const borderColor =
    playerColors.length === 1 ? primaryColor : `url(#${gradientId})`;

  return (
    <div
      className="flex min-w-[116px] flex-col items-center gap-2 rounded-[26px] border border-white/10 bg-black/25 px-3.5 py-2.5 backdrop-blur-xl shadow-[0_18px_40px_-22px_rgba(0,0,0,0.75)]"
      style={{
        opacity: active ? 1 : 0.55,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: active ? "auto" : "none",
        transform: active ? "translateY(0)" : "translateY(2px)",
        boxShadow: active
          ? `0 18px 48px -24px ${primaryColor}66`
          : "0 18px 40px -22px rgba(0,0,0,0.75)",
      }}
    >
      <div className="flex min-h-[12px] items-center gap-1.5">
        {playerColors.map((c) => (
          <div
            key={c}
            className="w-3.5 h-3.5 rounded-full"
            style={{
              backgroundColor: PLAYER_COLORS[c],
              boxShadow: active ? `0 0 6px ${PLAYER_COLORS[c]}80` : "none",
            }}
          />
        ))}
        <span className="text-[10px] font-black uppercase tracking-[0.32em] text-white/35">
          {active ? "Active" : "Waiting"}
        </span>
      </div>

      <motion.div
        className="relative"
        onClick={canRoll ? onRoll : undefined}
        whileTap={canRoll ? { scale: 0.85 } : undefined}
        style={{
          cursor: canRoll ? "pointer" : "default",
          // minimum 48px touch target
          minWidth: 48,
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Active glow ring */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              margin: -6,
              border: `3px solid ${primaryColor}`,
              borderRadius: 20,
              boxShadow: `0 0 16px ${primaryColor}60, 0 0 32px ${primaryColor}30`,
            }}
            animate={{ opacity: canRoll ? [0.6, 1, 0.6] : 0.8 }}
            transition={
              canRoll
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
          />
        )}

        <motion.div
          className="relative"
          animate={rolling ? { rotate: [0, 360] } : { rotate: 0 }}
          transition={
            rolling
              ? { duration: 0.4, repeat: Infinity, ease: "linear" }
              : { type: "spring", stiffness: 400, damping: 25 }
          }
          style={{
            filter: rolling ? "blur(6px)" : "none",
            transition: "filter 0.15s ease",
          }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              {playerColors.length > 1 && (
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                  {playerColors.map((c, i) => (
                    <stop
                      key={c}
                      offset={`${(i / (playerColors.length - 1)) * 100}%`}
                      stopColor={PLAYER_COLORS[c]}
                    />
                  ))}
                </linearGradient>
              )}
            </defs>

            {/* Shadow */}
            <rect x={4} y={5} width={size - 4} height={size - 4} rx={14} fill="rgba(0,0,0,0.15)" />

            {/* Dice body */}
            <rect x={2} y={2} width={size - 4} height={size - 4} rx={14} fill="white" />

            {/* Colored border */}
            <rect
              x={2} y={2} width={size - 4} height={size - 4} rx={14}
              fill="none" stroke={borderColor} strokeWidth={active ? 4 : 2.5}
            />

            {!rolling && <DiceDots value={displayValue} size={size} />}
          </svg>
        </motion.div>
      </motion.div>

      <div className="min-h-[12px]">
        <motion.p
          className="text-center text-[10px] font-bold uppercase tracking-[0.32em] text-[#f0d8a0]/75"
          animate={{ opacity: active ? [0.45, 1, 0.45] : 0.4 }}
          transition={active ? { duration: 1.8, repeat: Infinity } : { duration: 0.25 }}
        >
          {statusLabel}
        </motion.p>
      </div>
    </div>
  );
}
