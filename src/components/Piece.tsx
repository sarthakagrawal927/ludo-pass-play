import { useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { getPiecePosition, getMovePath } from "@/game/board-positions";
import type { PlayerColor } from "@/game/types";

const COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const DARK_COLORS: Record<PlayerColor, string> = {
  red: "#b91c1c",
  green: "#15803d",
  yellow: "#a16207",
  blue: "#1d4ed8",
};

/** Milliseconds per step in the walk animation */
const STEP_DURATION = 0.1;

interface PieceProps {
  color: PlayerColor;
  pieceId: number;
  position: number;
  cellSize: number;
  highlighted: boolean;
  count: number;         // how many of this color at this position (show badge if >1)
  othersPresent: boolean; // are other colors also at this position? (use slot offset)
  onClick?: () => void;
}

// Fixed slot position per color — each color always occupies the same corner
const COLOR_SLOT_OFFSETS: Record<PlayerColor, [number, number]> = {
  red:    [-0.22, -0.22],  // top-left
  green:  [0.22, -0.22],   // top-right
  blue:   [-0.22, 0.22],   // bottom-left
  yellow: [0.22, 0.22],    // bottom-right
};

export default function Piece({
  color,
  pieceId,
  position,
  cellSize,
  highlighted,
  count,
  othersPresent,
  onClick,
}: PieceProps) {
  const prevPositionRef = useRef(position);
  const prevCellSizeRef = useRef(cellSize);

  const dest = getPiecePosition(position, color, pieceId, cellSize);
  const mx = useMotionValue(dest.x);
  const my = useMotionValue(dest.y);

  const scaleY = useMotionValue(1);

  // Handle cellSize changes (board resize) -- snap immediately, no animation
  useEffect(() => {
    if (prevCellSizeRef.current !== cellSize && prevPositionRef.current === position) {
      const target = getPiecePosition(position, color, pieceId, cellSize);
      mx.set(target.x);
      my.set(target.y);
    }
    prevCellSizeRef.current = cellSize;
  }, [cellSize, position, color, pieceId, mx, my]);

  // Animate position changes step-by-step
  useEffect(() => {
    const prevPos = prevPositionRef.current;
    prevPositionRef.current = position;

    if (prevPos === position) return;

    // Piece coming out of home base: simple spring to start position
    if (prevPos === -1) {
      const target = getPiecePosition(position, color, pieceId, cellSize);
      animate(mx, target.x, { type: "spring", stiffness: 300, damping: 25 });
      animate(my, target.y, { type: "spring", stiffness: 300, damping: 25 });
      return;
    }

    // Piece sent back home: spring back
    if (position === -1) {
      const target = getPiecePosition(position, color, pieceId, cellSize);
      animate(mx, target.x, { type: "spring", stiffness: 200, damping: 20 });
      animate(my, target.y, { type: "spring", stiffness: 200, damping: 20 });
      return;
    }

    // Normal move: compute waypoints and animate through them as keyframes
    const pathCoords = getMovePath(prevPos, position, color);

    if (pathCoords.length === 0) {
      // Fallback: just go to destination directly
      const target = getPiecePosition(position, color, pieceId, cellSize);
      animate(mx, target.x, { type: "spring", stiffness: 300, damping: 25 });
      animate(my, target.y, { type: "spring", stiffness: 300, damping: 25 });
      return;
    }

    // Convert [row,col] waypoints to pixel {x,y} coordinates
    const waypoints = pathCoords.map(([row, col]) => ({
      x: col * cellSize + cellSize / 2,
      y: row * cellSize + cellSize / 2,
    }));

    // For the finished position (57), use the offset-aware position for the final waypoint
    if (position === 57) {
      const finalTarget = getPiecePosition(57, color, pieceId, cellSize);
      waypoints[waypoints.length - 1] = finalTarget;
    }

    const xKeyframes = waypoints.map((w) => w.x);
    const yKeyframes = waypoints.map((w) => w.y);

    const totalDuration = waypoints.length * STEP_DURATION;

    // Build linear timing array so each step takes equal time
    const times = waypoints.map((_, i) =>
      waypoints.length === 1 ? 1 : i / (waypoints.length - 1),
    );

    // Animate x and y through keyframes with linear easing per step
    animate(mx, xKeyframes, {
      duration: totalDuration,
      times,
      ease: "linear",
    });

    const yAnimation = animate(my, yKeyframes, {
      duration: totalDuration,
      times,
      ease: "linear",
    });

    // After walk finishes, apply stacking offset then bounce
    yAnimation.then(() => {
      const base = getPiecePosition(position, color, pieceId, cellSize);
      let targetX = base.x;
      let targetY = base.y;
      if (othersPresent && position >= 0 && position !== 57) {
        const [ox, oy] = COLOR_SLOT_OFFSETS[color];
        targetX += ox * cellSize;
        targetY += oy * cellSize;
      }
      animate(mx, targetX, { type: "spring", stiffness: 400, damping: 30 });
      animate(my, targetY, { type: "spring", stiffness: 400, damping: 30 });

      // Bounce!
      animate(scaleY, [1, 0.75, 1.15, 0.95, 1], {
        duration: 0.35,
        ease: "easeOut",
      });
    });
  }, [position, color, pieceId, cellSize, mx, my, scaleY, othersPresent]);

  // Re-position when stacking changes (another piece arrives/leaves) without walk
  const prevOthersRef = useRef(othersPresent);
  useEffect(() => {
    if (prevOthersRef.current === othersPresent) return;
    prevOthersRef.current = othersPresent;
    const base = getPiecePosition(position, color, pieceId, cellSize);
    let targetX = base.x;
    let targetY = base.y;
    if (othersPresent && position >= 0 && position !== 57) {
      const [ox, oy] = COLOR_SLOT_OFFSETS[color];
      targetX += ox * cellSize;
      targetY += oy * cellSize;
    }
    animate(mx, targetX, { type: "spring", stiffness: 300, damping: 25 });
    animate(my, targetY, { type: "spring", stiffness: 300, damping: 25 });
  }, [othersPresent, position, color, pieceId, cellSize, mx, my]);

  // Shrink when sharing a square with other colors
  const pieceScale = othersPresent ? 0.65 : 1;
  const r = cellSize * 0.32 * pieceScale;

  const touchRadius = Math.max(r + 4, 22);

  return (
    <motion.g
      style={{ x: mx, y: my, scaleY }}
      onClick={onClick}
      cursor={highlighted ? "pointer" : "default"}
    >
      {/* Invisible touch target for iPad (min 44px) */}
      <circle cx={0} cy={0} r={touchRadius} fill="transparent" />

      {/* Bright pulsing highlight when piece can be moved */}
      {highlighted && (
        <>
          {/* Colored glow fill */}
          <motion.circle
            cx={0}
            cy={0}
            r={r + 8}
            fill={COLORS[color]}
            opacity={0.25}
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Bold white ring */}
          <motion.circle
            cx={0}
            cy={0}
            r={r + 4}
            fill="none"
            stroke="white"
            strokeWidth={3}
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Drop shadow */}
      <circle cx={1.5} cy={2.5} r={r} fill="rgba(0,0,0,0.25)" />

      {/* Main body */}
      <circle cx={0} cy={0} r={r} fill={COLORS[color]} />

      {/* 3D gradient overlay: darker at bottom */}
      <circle
        cx={0}
        cy={r * 0.15}
        r={r * 0.95}
        fill="url(#piece-gradient)"
        opacity={0.35}
      />

      {/* Specular highlight (top-left) */}
      <ellipse
        cx={-r * 0.2}
        cy={-r * 0.25}
        rx={r * 0.45}
        ry={r * 0.35}
        fill="white"
        opacity={0.35}
      />

      {/* Small bright spot */}
      <circle cx={-r * 0.15} cy={-r * 0.2} r={r * 0.15} fill="white" opacity={0.5} />

      {/* Border ring */}
      <circle
        cx={0}
        cy={0}
        r={r}
        fill="none"
        stroke={DARK_COLORS[color]}
        strokeWidth={1.5}
      />

      {/* Count badge for 2+ same-color pieces */}
      {count > 1 && (
        <>
          <circle cx={r * 0.6} cy={-r * 0.6} r={r * 0.45} fill="white" stroke={DARK_COLORS[color]} strokeWidth={1} />
          <text
            x={r * 0.6}
            y={-r * 0.55}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={r * 0.6}
            fontWeight="bold"
            fill={DARK_COLORS[color]}
            style={{ pointerEvents: "none" }}
          >
            {count}
          </text>
        </>
      )}

      <defs>
        <radialGradient id="piece-gradient" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
      </defs>
    </motion.g>
  );
}
