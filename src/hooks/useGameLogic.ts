import { useState, useCallback, useEffect } from "react";
import type { LevelData, TileColor, GameResult } from "../types";

function generateCamoPattern(width: number, height: number): TileColor[][] {
  // 1. Random noise
  let grid: TileColor[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.floor(Math.random() * 4) as TileColor)
  );

  // 2. Cellular automata smoothing (3 passes for blobby camo look)
  for (let pass = 0; pass < 3; pass++) {
    const newGrid = grid.map(row => [...row]);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const counts = [0, 0, 0, 0];
        // Count neighbors including self
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              counts[grid[ny][nx]]++;
            }
          }
        }
        // Find most common
        let maxCount = -1;
        let maxColor = 0;
        for (let c = 0; c < 4; c++) {
          // slight random tie-breaker by >= instead of >
          if (counts[c] > maxCount || (counts[c] === maxCount && Math.random() > 0.5)) {
            maxCount = counts[c];
            maxColor = c;
          }
        }
        newGrid[y][x] = maxColor as TileColor;
      }
    }
    grid = newGrid;
  }
  return grid;
}

export function useGameLogic(levelData: LevelData | null, onFinish: (result: GameResult) => void) {
  const [board, setBoard] = useState<TileColor[][]>([]);
  const [taps, setTaps] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [foundZone, setFoundZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  // Extra move budget granted by "continue" feature
  const [bonusMoves, setBonusMoves] = useState(0);

  const initBoard = useCallback(() => {
    if (!levelData) return;
    
    // Generate massive background camo
    const newBoard = generateCamoPattern(levelData.boardWidth, levelData.boardHeight);
    
    const dz = levelData.defectZone;
    const target = levelData.targetPatch;

    // Calculate how many tiles differ between defectPatch and targetPatch
    let defectDifferences = 0;
    for (let dy = 0; dy < dz.height; dy++) {
      for (let dx = 0; dx < dz.width; dx++) {
        if (levelData.defectPatch[dy][dx] !== target[dy][dx]) {
          defectDifferences++;
        }
      }
    }

    // Ensure NO background patch is as similar to the target as the true defect zone.
    // Strict threshold: other regions must have >= 50% of tiles different from target
    // AND at least (defectDifferences + 3) differences.
    const zoneSize = dz.width * dz.height;
    const strictThreshold = Math.max(
      defectDifferences + 3,
      Math.ceil(zoneSize * 0.5)
    );

    let passes = 0;
    let madeChanges = true;
    while (madeChanges && passes < 30) {
      madeChanges = false;
      passes++;
      for (let y = 0; y <= levelData.boardHeight - dz.height; y++) {
        for (let x = 0; x <= levelData.boardWidth - dz.width; x++) {
          if (x === dz.x && y === dz.y) continue;
          
          let differences = 0;
          for (let dy = 0; dy < dz.height; dy++) {
            for (let dx = 0; dx < dz.width; dx++) {
              if (newBoard[y + dy][x + dx] !== target[dy][dx]) {
                differences++;
              }
            }
          }
          
          // Scramble until at least strictThreshold tiles differ from target
          if (differences < strictThreshold) {
            madeChanges = true;
            let needed = strictThreshold - differences;
            // First try to change tiles that currently MATCH the target
            for (let dy = 0; dy < dz.height && needed > 0; dy++) {
              for (let dx = 0; dx < dz.width && needed > 0; dx++) {
                if (newBoard[y + dy][x + dx] === target[dy][dx]) {
                  // rotate 1 or 2 steps to ensure it's different
                  const step = (Math.random() > 0.5) ? 1 : 2;
                  newBoard[y + dy][x + dx] = ((newBoard[y + dy][x + dx] + step) % 4) as TileColor;
                  needed--;
                }
              }
            }
            // If still not enough, change any remaining tiles
            for (let dy = 0; dy < dz.height && needed > 0; dy++) {
              for (let dx = 0; dx < dz.width && needed > 0; dx++) {
                if (newBoard[y + dy][x + dx] !== target[dy][dx]) continue; // already different
                newBoard[y + dy][x + dx] = ((newBoard[y + dy][x + dx] + 1) % 4) as TileColor;
                needed--;
              }
            }
          }
        }
      }
    }
    
    // Inject the defect patch at the defect zone
    for (let dy = 0; dy < dz.height; dy++) {
      for (let dx = 0; dx < dz.width; dx++) {
        newBoard[dz.y + dy][dz.x + dx] = levelData.defectPatch[dy][dx];
      }
    }
    
    setBoard(newBoard);
    setTaps(0);
    setStatus("playing");
    setFoundZone(null);
  }, [levelData]);

  useEffect(() => {
    // eslint-disable-next-line
    initBoard();
  }, [initBoard]);

  const checkWinCondition = useCallback((currentBoard: TileColor[][]) => {
    if (!levelData) return null;
    const target = levelData.targetPatch;
    const th = target.length;
    const tw = target[0].length;
    const bh = currentBoard.length;
    const bw = currentBoard[0].length;

    // Scan the entire board for ANY patch that matches the target exactly
    for (let y = 0; y <= bh - th; y++) {
      for (let x = 0; x <= bw - tw; x++) {
        let match = true;
        for (let dy = 0; dy < th; dy++) {
          for (let dx = 0; dx < tw; dx++) {
            if (currentBoard[y + dy][x + dx] !== target[dy][dx]) {
              match = false;
              break;
            }
          }
          if (!match) break;
        }
        if (match) {
          return { x, y, width: tw, height: th };
        }
      }
    }
    return null;
  }, [levelData]);

  const handleTileTap = (x: number, y: number) => {
    if (!levelData) return;
    
    // Check locked
    const isLocked = levelData.lockedTiles.some(t => t.x === x && t.y === y);
    if (isLocked) return;

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      const currentColor = newBoard[y][x];
      newBoard[y][x] = ((currentColor + 1) % 4) as TileColor;
      return newBoard;
    });

    const newTaps = taps + 1;
    setTaps(newTaps);
  };

  // Check win or lose after state updates
  useEffect(() => {
    if (!levelData || board.length === 0 || status !== "playing") return;

    const matchedZone = checkWinCondition(board);
    if (matchedZone) {
      // eslint-disable-next-line
      setFoundZone(matchedZone);
      setStatus("won");
    } else if (levelData.moveLimit > 0 && taps >= levelData.moveLimit + bonusMoves) {
      setStatus("lost");
      // DO NOT call onFinish here — GameView will play the fail sound first,
      // show the defect zone for 2.5s, then call onFinish itself.
    }
  }, [board, taps, bonusMoves, checkWinCondition, levelData, status, onFinish]);

  /** Call this to grant extra moves (continue feature). Resets status to playing. */
  const addBonusMoves = useCallback((extra: number) => {
    setBonusMoves(prev => prev + extra);
    setStatus("playing");
  }, []);

  return { board, taps, status, foundZone, handleTileTap, initBoard, addBonusMoves };
}
