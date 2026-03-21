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
  const size = 68;
  const displayValue = value ?? 1;
  const primaryColor = PLAYER_COLORS[playerColors[0]];
  const gradientId = `diceGradient-${side}`;


  const borderColor =
    playerColors.length === 1 ? primaryColor : `url(#${gradientId})`;

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{
        opacity: active ? 1 : 0.35,
        transition: "opacity 0.3s ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {/* Player label */}
      <div className="flex items-center gap-1.5 mb-0.5">
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

      {canRoll && active && (
        <motion.p
          className="text-white/50 text-[10px] font-bold tracking-widest uppercase"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Tap to roll
        </motion.p>
      )}
    </div>
  );
}
