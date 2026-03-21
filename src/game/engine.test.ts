import { describe, it, expect } from "vitest";
import { createGame, handleDiceRoll, movePiece } from "./engine";
import type { GameState } from "./types";

function withDice(value: number, fn: () => void) {
  const orig = Math.random;
  // crypto.getRandomValues is used in the real code, but tests use Math.random override
  // We need to mock crypto too
  const origCrypto = crypto.getRandomValues;
  crypto.getRandomValues = ((arr: Uint32Array) => {
    // Map dice value to a uint32 that produces it via rejection sampling
    arr[0] = value - 1; // (value - 1) % 6 + 1 = value
    return arr;
  }) as typeof crypto.getRandomValues;
  Math.random = () => (value - 0.5) / 6;
  try { fn(); } finally {
    Math.random = orig;
    crypto.getRandomValues = origCrypto;
  }
}

// Roll and auto-move if only one option (simulating what the UI does)
function rollAndMove(state: GameState, dice: number): GameState {
  let result!: GameState;
  withDice(dice, () => { result = handleDiceRoll(state); });
  // If in moving phase with pieces, move the first one (simulating auto-move)
  if (result.phase === "moving" && result.movablePieces.length > 0) {
    result = movePiece(result, result.movablePieces[0]);
  }
  return result;
}

function rollOnly(state: GameState, dice: number): GameState {
  let result!: GameState;
  withDice(dice, () => { result = handleDiceRoll(state); });
  return result;
}

function colorIndex(state: GameState, color: string): number {
  return state.colors.findIndex((c) => c.color === color);
}

describe("createGame", () => {
  it("creates a 2-player game with 4 colors", () => {
    const game = createGame(2);
    expect(game.colors).toHaveLength(4);
    expect(game.colorAssignment).toEqual([["red", "yellow"], ["green", "blue"]]);
  });

  it("creates a 4-player game", () => {
    const game = createGame(4);
    expect(game.colorAssignment).toEqual([["red"], ["green"], ["yellow"], ["blue"]]);
  });

  it("all pieces start at home", () => {
    const game = createGame(2);
    for (const cs of game.colors) {
      for (const piece of cs.pieces) {
        expect(piece.isHome).toBe(true);
        expect(piece.position).toBe(-1);
      }
    }
  });
});

describe("dice rolling", () => {
  it("rolling non-6 with all pieces home = no moves, next turn", () => {
    const game = createGame(2);
    const after = rollAndMove(game, 3);
    expect(after.currentHumanPlayer).toBe(1);
  });

  it("rolling 6 with pieces home = can move a piece out", () => {
    const game = createGame(2);
    const afterRoll = rollOnly(game, 6);
    expect(afterRoll.phase).toBe("moving");
    expect(afterRoll.movablePieces.length).toBeGreaterThan(0);

    const afterMove = movePiece(afterRoll, afterRoll.movablePieces[0]);
    const ref = afterRoll.movablePieces[0];
    const piece = afterMove.colors.find((c) => c.color === ref.color)!.pieces[ref.pieceId];
    expect(piece.isHome).toBe(false);
    expect(piece.position).toBeGreaterThanOrEqual(0);
    expect(afterMove.currentHumanPlayer).toBe(0); // bonus from 6
  });

  it("three consecutive 6s loses the turn", () => {
    let game = createGame(2);
    game = rollAndMove(game, 6);
    expect(game.currentHumanPlayer).toBe(0);
    game = rollAndMove(game, 6);
    expect(game.currentHumanPlayer).toBe(0);
    game = rollAndMove(game, 6);
    expect(game.currentHumanPlayer).toBe(1);
  });
});

describe("piece movement", () => {
  it("moves a piece along the track", () => {
    let game = createGame(4);
    // Roll 6 to move red out. Red START=0.
    game = rollAndMove(game, 6);
    const redIdx = colorIndex(game, "red");
    expect(game.colors[redIdx].pieces[0].position).toBe(0);
    // Bonus turn from 6. Roll 4.
    game = rollAndMove(game, 4);
    expect(game.colors[redIdx].pieces[0].position).toBe(4);
  });

  it("captures opponent piece and gives bonus turn", () => {
    let game = createGame(4);
    game = rollAndMove(game, 6); // red out at 0
    game = rollAndMove(game, 6); // red to 6, bonus
    game = rollAndMove(game, 5); // red to 11
    const rp = game.colors[colorIndex(game, "red")].pieces[0];
    expect(rp.position).toBe(11);
  });
});

describe("new capture rules", () => {
  it("1 piece landing on 2 opponents: coexist (outnumbered)", () => {
    let game = createGame(4);
    const greenIdx = colorIndex(game, "green");
    game.colors[greenIdx].pieces[0].position = 5;
    game.colors[greenIdx].pieces[0].isHome = false;
    game.colors[greenIdx].pieces[1].position = 5;
    game.colors[greenIdx].pieces[1].isHome = false;
    const redIdx = colorIndex(game, "red");
    game.colors[redIdx].pieces[0].position = 2;
    game.colors[redIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    game = rollAndMove(game, 3); // red lands at 5 where 2 green are
    // 1 red < 2 green → coexist
    expect(game.colors[greenIdx].pieces[0].isHome).toBe(false);
    expect(game.colors[greenIdx].pieces[1].isHome).toBe(false);
    expect(game.colors[redIdx].pieces[0].position).toBe(5);
  });

  it("equal count arriving: defenders captured (attackers win ties)", () => {
    let game = createGame(4);
    const greenIdx = colorIndex(game, "green");
    const redIdx = colorIndex(game, "red");
    game.colors[greenIdx].pieces[0].position = 5;
    game.colors[greenIdx].pieces[0].isHome = false;
    game.colors[redIdx].pieces[0].position = 2;
    game.colors[redIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "moving";
    game.diceValue = 3;
    game.movablePieces = [{ color: "red", pieceId: 0 }];

    game = movePiece(game, { color: "red", pieceId: 0 });
    // 1 red arrives at 5 where 1 green sits. Equal (1==1). Green captured.
    expect(game.colors[greenIdx].pieces[0].isHome).toBe(true);
    expect(game.colors[redIdx].pieces[0].position).toBe(5);
  });

  it("2 arriving vs 1 defender: defender captured", () => {
    let game = createGame(4);
    const greenIdx = colorIndex(game, "green");
    const redIdx = colorIndex(game, "red");
    game.colors[greenIdx].pieces[0].position = 5;
    game.colors[greenIdx].pieces[0].isHome = false;
    game.colors[redIdx].pieces[0].position = 5;
    game.colors[redIdx].pieces[0].isHome = false;
    game.colors[redIdx].pieces[1].position = 2;
    game.colors[redIdx].pieces[1].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "moving";
    game.diceValue = 3;
    game.movablePieces = [{ color: "red", pieceId: 1 }];

    game = movePiece(game, { color: "red", pieceId: 1 }); // red[1] → 5
    expect(game.colors[greenIdx].pieces[0].isHome).toBe(true);
    expect(game.stats.captures.red).toBe(1);
  });

  it("same player colors don't capture each other", () => {
    let game = createGame(2);
    const redIdx = colorIndex(game, "red");
    const yellowIdx = colorIndex(game, "yellow");
    game.colors[redIdx].pieces[0].position = 5;
    game.colors[redIdx].pieces[0].isHome = false;
    game.colors[yellowIdx].pieces[0].position = 2;
    game.colors[yellowIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "moving";
    game.diceValue = 3;
    game.movablePieces = [{ color: "yellow", pieceId: 0 }];

    game = movePiece(game, { color: "yellow", pieceId: 0 }); // yellow → 5
    expect(game.colors[redIdx].pieces[0].position).toBe(5);
    expect(game.colors[yellowIdx].pieces[0].position).toBe(5);
  });

  it("departure: losing advantage captures remaining pieces", () => {
    let game = createGame(4);
    const redIdx = colorIndex(game, "red");
    const greenIdx = colorIndex(game, "green");
    // 2 red + 1 green at position 5
    game.colors[redIdx].pieces[0].position = 5;
    game.colors[redIdx].pieces[0].isHome = false;
    game.colors[redIdx].pieces[1].position = 5;
    game.colors[redIdx].pieces[1].isHome = false;
    game.colors[greenIdx].pieces[0].position = 5;
    game.colors[greenIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    // Red[0] moves away from 5 → 1 red left vs 1 green → red captured
    game = rollAndMove(game, 2); // red[0] moves to 7
    expect(game.colors[redIdx].pieces[0].position).toBe(7); // moved away
    expect(game.colors[redIdx].pieces[1].isHome).toBe(true); // remaining red captured
    expect(game.colors[greenIdx].pieces[0].position).toBe(5); // green stays
  });
});

describe("home column entry", () => {
  it("piece enters home column correctly", () => {
    let game = createGame(4);
    const redIdx = colorIndex(game, "red");
    // Red HOME_ENTRY=50. Place red at position 49.
    game.colors[redIdx].pieces[0].position = 49;
    game.colors[redIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    game = rollAndMove(game, 3);
    const rp = game.colors[redIdx].pieces[0];
    expect(rp.position).toBe(53);
    expect(rp.isFinished).toBe(false);
  });

  it("exact roll finishes a piece", () => {
    let game = createGame(4);
    const redIdx = colorIndex(game, "red");
    game.colors[redIdx].pieces[0].position = 56;
    game.colors[redIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    game = rollAndMove(game, 1);
    expect(game.colors[redIdx].pieces[0].position).toBe(57);
    expect(game.colors[redIdx].pieces[0].isFinished).toBe(true);
  });

  it("overshooting home column doesn't move", () => {
    let game = createGame(4);
    const redIdx = colorIndex(game, "red");
    game.colors[redIdx].pieces[0].position = 56;
    game.colors[redIdx].pieces[0].isHome = false;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    game = rollOnly(game, 3);
    const redMovable = game.movablePieces.filter(
      (m) => m.color === "red" && m.pieceId === 0,
    );
    expect(redMovable).toHaveLength(0);
  });
});

describe("winning condition", () => {
  it("player wins when all their colors complete", () => {
    let game = createGame(2);
    const redIdx = colorIndex(game, "red");
    for (let i = 0; i < 3; i++) {
      game.colors[redIdx].pieces[i].position = 57;
      game.colors[redIdx].pieces[i].isHome = false;
      game.colors[redIdx].pieces[i].isFinished = true;
    }
    game.colors[redIdx].pieces[3].position = 56;
    game.colors[redIdx].pieces[3].isHome = false;
    const yellowIdx = colorIndex(game, "yellow");
    for (const p of game.colors[yellowIdx].pieces) {
      p.position = 57; p.isHome = false; p.isFinished = true;
    }
    game.colors[yellowIdx].isComplete = true;
    game.currentHumanPlayer = 0;
    game.phase = "rolling";

    game = rollAndMove(game, 1);
    expect(game.winner).toBe(0);
    expect(game.phase).toBe("finished");
  });
});

describe("full game simulation", () => {
  it("can play through many turns without errors", () => {
    let game = createGame(2);
    const origCrypto = crypto.getRandomValues;
    let seed = 42;
    crypto.getRandomValues = ((arr: Uint32Array) => {
      seed = (seed * 16807) % 2147483647;
      arr[0] = ((seed - 1) % 6);
      return arr;
    }) as typeof crypto.getRandomValues;

    let turns = 0;
    while (game.phase !== "finished" && turns < 2000) {
      if (game.phase === "rolling") {
        game = handleDiceRoll(game);
      } else if (game.phase === "moving" && game.movablePieces.length > 0) {
        game = movePiece(game, game.movablePieces[0]);
      } else break;
      turns++;
    }

    crypto.getRandomValues = origCrypto;

    for (const cs of game.colors) {
      for (const piece of cs.pieces) {
        if (piece.isFinished) expect(piece.position).toBe(57);
        if (piece.isHome) expect(piece.position).toBe(-1);
      }
    }
    console.log(`Game in ${turns} turns. Winner: Player ${game.winner !== null ? game.winner + 1 : "none"}`);
  });
});
