# agents.md — ludo-pass-play

## Purpose
Local-multiplayer (pass-and-play) Ludo PWA for 2–4 players sharing one device.

## Stack
- Framework: Vite 8 + React 19
- Language: TypeScript (strict)
- Styling: Tailwind CSS v4 (via `@tailwindcss/vite`)
- Animations: Framer Motion 12
- DB: None (in-memory + localStorage)
- Auth: None
- Testing: Vitest 4
- Deploy: Vercel (static PWA)
- Package manager: pnpm 10

## Repo structure
```
src/
  main.tsx             # Entry point
  App.tsx              # Screen router (SetupScreen vs GameBoard) + localStorage persistence
  index.css            # Tailwind + global resets
  components/
    SetupScreen.tsx    # Player count + color assignment UI
    GameBoard.tsx      # Main game controller — state machine, auto-roll/auto-move
    Board.tsx          # SVG board rendering (15x15 grid)
    Piece.tsx          # SVG piece with walk animation, stacking, count badges
    Dice.tsx           # SVG dice with dot rendering + spin animation
    StatsScreen.tsx    # Post-game stats overlay
  game/
    types.ts           # All types + board constants
    engine.ts          # Pure game logic (createGame, handleDiceRoll, movePiece, capture)
    board-positions.ts # 15x15 grid coordinate mappings
    engine.test.ts     # Unit tests for game engine
public/                # PWA icons + favicon
vite.config.ts         # Vite + PWA manifest config
```

## Key commands
```bash
pnpm dev        # Vite dev server
pnpm build      # tsc + vite build
pnpm preview    # Preview production build
pnpm vitest     # Run unit tests
```

## Architecture notes
- **`engine.ts` is pure functions** — no side effects, no React. Takes `GameState`, returns new `GameState`. All game logic isolated here.
- **`GameBoard.tsx`** holds the single `useState<GameState>` and calls engine functions.
- **Game state** persists to `localStorage` on every settled state change; cleared on win.
- **SVG board**: 15x15 grid; cell size computed from viewport dimensions.
- **Player color assignments**: 2P = Red+Yellow vs Green+Blue (diagonal pairs); 3P = Red/Green/Blue+Yellow; 4P = one each.
- **Dice**: `crypto.getRandomValues` with rejection sampling for uniform distribution.
- **PWA**: `autoUpdate` strategy; manifest embedded in `vite.config.ts`. Offline support via Workbox.
- `@/` alias maps to `src/`.
- No server, no env vars required.

## Active context
