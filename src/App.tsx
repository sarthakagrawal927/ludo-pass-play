import { useState } from "react";
import SetupScreen from "./components/SetupScreen";
import GameBoard from "./components/GameBoard";
import type { GameState } from "./game/types";

const STORAGE_KEY = "ludo-game";

interface SavedGame {
  playerCount: number;
  state: GameState;
}

function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedGame = JSON.parse(raw);
    if (
      typeof parsed.playerCount === "number" &&
      parsed.state &&
      typeof parsed.state.phase === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [saved] = useState<SavedGame | null>(() => loadSavedGame());
  const [playerCount, setPlayerCount] = useState<number | null>(
    saved ? saved.playerCount : null,
  );
  const [initialState, setInitialState] = useState<GameState | undefined>(
    saved?.state,
  );

  if (playerCount === null) {
    return <SetupScreen onStart={setPlayerCount} />;
  }

  return (
    <GameBoard
      key={playerCount + "-" + (initialState ? "restored" : Date.now())}
      playerCount={playerCount}
      initialState={initialState}
      onReset={() => {
        setInitialState(undefined);
        setPlayerCount(null);
      }}
    />
  );
}
