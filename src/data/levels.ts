import type { LevelData, TileColor } from "../types";

// 시드 기반의 난수 생성기 (동일한 levelId → 항상 동일한 레벨 디자인)
function getPseudoRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 난이도 레벨을 100레벨로 상한 (패턴 시드는 실제 levelId 사용 → 무한 다양성)
const DIFFICULTY_CAP = 100;

export function generateLevel(levelId: number): LevelData {
  const rand = getPseudoRandom(levelId * 1337);
  const diffId = Math.min(levelId, DIFFICULTY_CAP); // 난이도 상한선

  // Random theme selection for variety
  const themes: Array<"jungle" | "desert" | "arctic"> = ["jungle", "desert", "arctic"];
  const theme = themes[Math.floor(rand() * themes.length)];

  // ── 난이도별 파라미터 ──────────────────────────────────────────────────
  let boardWidth: number;
  let boardHeight: number;
  let defectSize: number;
  let errorTilesCount: number;
  let bonusMoves: number;

  if (diffId <= 15) {
    // Easy
    boardWidth = 14 + Math.floor(diffId / 5);
    boardHeight = 20 + Math.floor(diffId / 3);
    defectSize = 3;
    errorTilesCount = 3 + Math.floor(rand() * 2); // 3–4
    bonusMoves = 4 + Math.floor(rand() * 3);      // 4–6
  } else if (diffId <= 50) {
    // Normal
    const rel = diffId - 15;
    boardWidth = 18 + Math.floor(rel / 6);
    boardHeight = 26 + Math.floor(rel / 4);
    defectSize = 4;
    errorTilesCount = 5 + Math.floor(rand() * 4); // 5–8
    bonusMoves = 4 + Math.floor(rand() * 3);      // 4–6
  } else if (diffId <= 85) {
    // Hard
    const rel = diffId - 50;
    boardWidth = 24 + Math.floor(rel / 8);
    boardHeight = 35 + Math.floor(rel / 5);
    defectSize = 5;
    errorTilesCount = 9 + Math.floor(rand() * 5); // 9–13
    bonusMoves = 2 + Math.floor(rand() * 3);      // 2–4
  } else {
    // Master (100레벨 이상 상한 유지)
    boardWidth = 32;
    boardHeight = 46;
    defectSize = rand() > 0.5 ? 5 : 6;
    errorTilesCount = 14 + Math.floor(rand() * 5); // 14–18
    bonusMoves = 2 + Math.floor(rand() * 2);        // 2–3
  }

  // ── 결함 위치 ─────────────────────────────────────────────────────────
  const margin = 2;
  const dx = margin + Math.floor(rand() * (boardWidth  - defectSize - margin * 2));
  const dy = margin + Math.floor(rand() * (boardHeight - defectSize - margin * 2));

  // ── 정답(Target) 패턴 생성 ───────────────────────────────────────────
  const targetPatch: TileColor[][] = Array.from({ length: defectSize }, () =>
    Array.from({ length: defectSize }, () => Math.floor(rand() * 4) as TileColor)
  );

  // ── 결함(Defect) 패턴 생성 ───────────────────────────────────────────
  const defectPatch: TileColor[][] = targetPatch.map(row => [...row]);
  let scrambled = 0;
  let totalShiftsNeeded = 0;
  let attempts = 0;

  while (scrambled < errorTilesCount && attempts < 300) {
    const rx = Math.floor(rand() * defectSize);
    const ry = Math.floor(rand() * defectSize);
    if (defectPatch[ry][rx] === targetPatch[ry][rx]) {
      const shift = 1 + Math.floor(rand() * 3); // 1, 2, 3
      defectPatch[ry][rx] = ((defectPatch[ry][rx] + shift) % 4) as TileColor;
      totalShiftsNeeded += (4 - shift) % 4;
      scrambled++;
    }
    attempts++;
  }

  const moveLimit = totalShiftsNeeded + bonusMoves;

  return {
    levelId,
    theme,
    boardWidth,
    boardHeight,
    moveLimit,
    timeLimit: 0,
    winCondition: "FixDefect",
    defectZone: { x: dx, y: dy, width: defectSize, height: defectSize },
    targetPatch,
    defectPatch,
    lockedTiles: [],
  };
}

// 하위 호환을 위해 levelId를 실시간으로 generate하는 proxy array 제거됨.
// 사용처: generateLevel(currentLevelId) 로 직접 호출.
