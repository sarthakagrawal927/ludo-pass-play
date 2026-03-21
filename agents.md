# Ludo - Pass & Play

Classic Ludo board game as a mobile-first PWA. Local multiplayer (2-4 players, pass-and-play on one device).

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **Animations**: Framer Motion 12 (piece movement, dice roll, UI transitions)
- **Rendering**: SVG-based board and pieces (not canvas/DOM grid)
- **PWA**: vite-plugin-pwa (service worker, manifest, offline support)
- **Testing**: Vitest 4
- **Deployment**: Vercel
- **Package manager**: pnpm 10

## Architecture

```
src/
  main.tsx              # Entry point, renders App
  App.tsx               # Router: SetupScreen vs GameBoard, localStorage persistence
  index.css             # Tailwind import + global resets (dark bg, no scroll)
  components/
    SetupScreen.tsx     # Player count selection (2/3/4), shows color assignments
    GameBoard.tsx       # Main game controller -- state machine, auto-roll/auto-move, dice + board layout
    Board.tsx           # SVG board rendering: home bases, track, home columns, center triangles
    Piece.tsx           # SVG piece with step-by-step walk animation, stacking, count badges
    Dice.tsx            # SVG dice with dot rendering, roll animation, active glow
    StatsScreen.tsx     # Post-game stats overlay: dice distribution, captures, moves
  game/
    types.ts            # All types + board constants (positions, safe squares, track layout)
    engine.ts           # Pure game logic: createGame, handleDiceRoll, movePiece, capture rules
    board-positions.ts  # 15x15 grid coordinate mappings: track, home columns, home bases, path computation
    engine.test.ts      # Unit tests for game engine
```

### Data Flow

- `engine.ts` is **pure functions** -- no side effects, no React. Takes `GameState`, returns new `GameState`.
- `GameBoard.tsx` holds the single `useState<GameState>` and calls engine functions.
- Game state persists to `localStorage` on every settled state change; cleared on win.
- Board renders on a 15x15 grid via SVG; cell size computed from viewport dimensions.

### Game Rules

- 2 players: each controls 2 colors (diagonal pairs)
- 3 players: P1=red, P2=green, P3=blue+yellow
- 4 players: one color each
- Roll 6 to leave home, 6 gives bonus turn, three consecutive 6s = lose turn
- Captures: attackers win ties, outnumbered = coexist
- Safe squares: start positions + star squares
- Exact roll required to finish; 5-square home column per color

## Key Conventions

- **State immutability**: Engine returns new state objects, never mutates
- **Path alias**: `@/` maps to `src/`
- **Dice RNG**: Uses `crypto.getRandomValues` with rejection sampling for uniform distribution

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # TypeScript check + Vite build
pnpm preview    # Preview production build
pnpm vitest     # Run tests
```

## Environment Variables

None required. Fully client-side app with no backend.

## Current State

**Done:**
- Full game engine with all standard Ludo rules + custom capture mechanics
- SVG board with animated pieces (step-by-step walk, bounce on landing)
- Dice with dot rendering and spin animation
- Auto-roll and auto-move toggles
- localStorage save/restore
- Post-game stats screen
- PWA setup, deployed to Vercel

**Not done:**
- No AI/bot players -- local multiplayer only
- No sound effects, no undo/replay, no online multiplayer
- No git repo initialized
