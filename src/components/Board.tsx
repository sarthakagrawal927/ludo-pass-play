import { trackPositions, homeColumnPositions, homeBasePositions } from "@/game/board-positions";
import { SAFE_SQUARES, START_POSITIONS, type PlayerColor } from "@/game/types";

const COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const LIGHT_COLORS: Record<PlayerColor, string> = {
  red: "#fee2e2",
  green: "#dcfce7",
  yellow: "#fef9c3",
  blue: "#dbeafe",
};

const MID_COLORS: Record<PlayerColor, string> = {
  red: "#fca5a5",
  green: "#86efac",
  yellow: "#fde047",
  blue: "#93c5fd",
};

// Map track index to its color (start squares only for coloring)
function getTrackSquareColor(index: number): PlayerColor | null {
  for (const [color, startPos] of Object.entries(START_POSITIONS)) {
    if (index === startPos) return color as PlayerColor;
  }
  return null;
}

interface BoardProps {
  cellSize: number;
  highlightedSquares: [number, number][];
}

export default function Board({ cellSize, highlightedSquares }: BoardProps) {
  const size = 15 * cellSize;
  const highlightSet = new Set(highlightedSquares.map(([r, c]) => `${r},${c}`));

  return (
    <g>
      {/* === SVG Defs for filters and animations === */}
      <defs>
        {/* Subtle inner shadow for home bases */}
        <filter id="homeBaseShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx={0} dy={2} stdDeviation={3} floodColor="rgba(0,0,0,0.15)" />
        </filter>

        {/* Soft glow for highlighted squares */}
        <filter id="highlightGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={2.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Pulsing animation for highlighted squares */}
        <style>{`
          @keyframes pulse-ring {
            0% { opacity: 0.8; transform-origin: center; r: ${cellSize * 0.35}px; }
            50% { opacity: 0.3; transform-origin: center; r: ${cellSize * 0.5}px; }
            100% { opacity: 0.8; transform-origin: center; r: ${cellSize * 0.35}px; }
          }
          @keyframes pulse-glow {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          .highlight-ring {
            animation: pulse-glow 1.2s ease-in-out infinite;
          }
        `}</style>
      </defs>

      {/* === Board background === */}
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        fill="#faf7f2"
        rx={12}
        stroke="#e8e4dc"
        strokeWidth={1.5}
      />

      {/* === Home Bases (4 colored corners) === */}
      {(["green", "red", "blue", "yellow"] as PlayerColor[]).map((color) => {
        const positions = homeBasePositions[color];
        const minRow = Math.min(...positions.map((p) => p[0]));
        const maxRow = Math.max(...positions.map((p) => p[0]));
        const minCol = Math.min(...positions.map((p) => p[1]));
        const maxCol = Math.max(...positions.map((p) => p[1]));

        // Expand to include 1-cell margin around the piece positions
        const baseX = (minCol - 1) * cellSize + 3;
        const baseY = (minRow - 1) * cellSize + 3;
        const baseW = (maxCol - minCol + 3) * cellSize - 6;
        const baseH = (maxRow - minRow + 3) * cellSize - 6;

        // Inner white area with padding
        const innerPad = cellSize * 0.7;
        const innerX = baseX + innerPad;
        const innerY = baseY + innerPad;
        const innerW = baseW - innerPad * 2;
        const innerH = baseH - innerPad * 2;

        return (
          <g key={`home-${color}`}>
            {/* Outer colored rect */}
            <rect
              x={baseX}
              y={baseY}
              width={baseW}
              height={baseH}
              fill={COLORS[color]}
              rx={10}
              filter="url(#homeBaseShadow)"
            />

            {/* Inner white area */}
            <rect
              x={innerX}
              y={innerY}
              width={innerW}
              height={innerH}
              fill="white"
              rx={8}
            />

            {/* Piece circles */}
            {positions.map(([row, col], i) => {
              const cx = col * cellSize + cellSize / 2;
              const cy = row * cellSize + cellSize / 2;
              const r = cellSize * 0.3;
              const isHighlighted = highlightSet.has(`${row},${col}`);

              return (
                <g key={i}>
                  {/* Shadow */}
                  <circle cx={cx + 1} cy={cy + 1.5} r={r} fill="rgba(0,0,0,0.08)" />

                  {/* Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={LIGHT_COLORS[color]}
                    stroke={MID_COLORS[color]}
                    strokeWidth={1.5}
                  />

                  {/* Highlight ring */}
                  {isHighlighted && (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 4}
                        fill="none"
                        stroke={COLORS[color]}
                        strokeWidth={2.5}
                        className="highlight-ring"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 8}
                        fill="none"
                        stroke={COLORS[color]}
                        strokeWidth={1}
                        opacity={0.3}
                        className="highlight-ring"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* === Track Squares (52 total) === */}
      {trackPositions.map(([row, col], i) => {
        const startColor = getTrackSquareColor(i);
        const isSafe = SAFE_SQUARES.includes(i);
        const isStart = startColor !== null;
        const isHighlighted = highlightSet.has(`${row},${col}`);

        const fill = isStart ? LIGHT_COLORS[startColor!] : "white";
        const stroke = isStart ? COLORS[startColor!] : "#d4d0c8";

        const x = col * cellSize + 1;
        const y = row * cellSize + 1;
        const w = cellSize - 2;
        const h = cellSize - 2;

        return (
          <g key={`track-${i}`}>
            {/* Square */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.8}
              rx={3}
            />

            {/* Star marker for safe and start squares */}
            {(isSafe || isStart) && (
              <text
                x={col * cellSize + cellSize / 2}
                y={row * cellSize + cellSize / 2 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={cellSize * 0.4}
                fill={isStart ? stroke : "#c4b998"}
                opacity={isStart ? 0.7 : 0.45}
                style={{ pointerEvents: "none" }}
              >
                ★
              </text>
            )}

            {/* Highlight effect */}
            {isHighlighted && (
              <>
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={w + 4}
                  height={h + 4}
                  fill="none"
                  stroke={isStart ? COLORS[startColor!] : "#f59e0b"}
                  strokeWidth={2.5}
                  rx={5}
                  className="highlight-ring"
                />
                <rect
                  x={x - 5}
                  y={y - 5}
                  width={w + 10}
                  height={h + 10}
                  fill="none"
                  stroke={isStart ? COLORS[startColor!] : "#f59e0b"}
                  strokeWidth={1}
                  rx={7}
                  opacity={0.25}
                  className="highlight-ring"
                />
              </>
            )}
          </g>
        );
      })}

      {/* === Home Columns (5 colored squares per color) === */}
      {(["green", "red", "blue", "yellow"] as PlayerColor[]).map((color) =>
        homeColumnPositions[color].map(([row, col], i) => {
          const isHighlighted = highlightSet.has(`${row},${col}`);
          const x = col * cellSize + 1;
          const y = row * cellSize + 1;
          const w = cellSize - 2;
          const h = cellSize - 2;

          return (
            <g key={`home-col-${color}-${i}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={LIGHT_COLORS[color]}
                stroke={MID_COLORS[color]}
                strokeWidth={0.8}
                rx={3}
              />

              {/* Arrow on the last home column square (closest to center) */}
              {i === 4 && (
                <text
                  x={col * cellSize + cellSize / 2}
                  y={row * cellSize + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellSize * 0.3}
                  fill={COLORS[color]}
                  opacity={0.35}
                  style={{ pointerEvents: "none" }}
                >
                  ▲
                </text>
              )}

              {/* Highlight */}
              {isHighlighted && (
                <>
                  <rect
                    x={x - 2}
                    y={y - 2}
                    width={w + 4}
                    height={h + 4}
                    fill="none"
                    stroke={COLORS[color]}
                    strokeWidth={2.5}
                    rx={5}
                    className="highlight-ring"
                  />
                  <rect
                    x={x - 5}
                    y={y - 5}
                    width={w + 10}
                    height={h + 10}
                    fill="none"
                    stroke={COLORS[color]}
                    strokeWidth={1}
                    rx={7}
                    opacity={0.25}
                    className="highlight-ring"
                  />
                </>
              )}
            </g>
          );
        }),
      )}

      {/* === Center Triangles (finish area, 3x3 center) === */}
      {(["green", "red", "blue", "yellow"] as PlayerColor[]).map((color) => {
        const cx = 7.5 * cellSize;
        const cy = 7.5 * cellSize;
        const half = cellSize * 1.5;

        // Triangles: base faces the arm with their home column
        // Red=LEFT arm, Green=TOP arm, Blue=BOTTOM arm, Yellow=RIGHT arm
        const triangles: Record<PlayerColor, string> = {
          red:    `${cx},${cy} ${cx - half},${cy - half} ${cx - half},${cy + half}`, // base at LEFT
          green:  `${cx},${cy} ${cx - half},${cy - half} ${cx + half},${cy - half}`, // base at TOP
          blue:   `${cx},${cy} ${cx - half},${cy + half} ${cx + half},${cy + half}`, // base at BOTTOM
          yellow: `${cx},${cy} ${cx + half},${cy - half} ${cx + half},${cy + half}`, // base at RIGHT
        };

        return (
          <polygon
            key={`center-${color}`}
            points={triangles[color]}
            fill={COLORS[color]}
            stroke="white"
            strokeWidth={2}
            strokeLinejoin="round"
            opacity={0.88}
          />
        );
      })}

      {/* Center circle overlay */}
      <circle
        cx={7.5 * cellSize}
        cy={7.5 * cellSize}
        r={cellSize * 0.45}
        fill="white"
        opacity={0.25}
      />
      <circle
        cx={7.5 * cellSize}
        cy={7.5 * cellSize}
        r={cellSize * 0.2}
        fill="white"
        opacity={0.15}
      />
    </g>
  );
}
