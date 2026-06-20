export type TileColor = 0 | 1 | 2 | 3; // 0=Light Brown, 1=Dark Green, 2=Deep Brown, 3=Black

export interface TileData {
  id: string; // e.g. "x,y"
  color: TileColor;
  locked?: boolean;
}

export interface LevelData {
  levelId: number;
  theme: "jungle" | "desert" | "arctic";
  boardWidth: number;
  boardHeight: number;
  moveLimit: number;
  timeLimit: number; // 0 = unlimited
  winCondition: "FixDefect";
  defectZone: { x: number; y: number; width: number; height: number };
  targetPatch: TileColor[][]; // What it SHOULD look like
  defectPatch: TileColor[][]; // What it CURRENTLY looks like
  lockedTiles: { x: number; y: number }[];
  specialRules?: string[];
}

export type GameState = "intro" | "rules" | "home" | "playing" | "result" | "tally";
export type GamePlayStatus = "playing" | "won" | "lost";

export interface GameResult {
  won: boolean;
  tapsUsed: number;
  timeUsed: number;
  levelId: number;
}
