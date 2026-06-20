import React, { useState, useEffect, useRef, useCallback } from "react";
import type { LevelData, GameResult } from "../types";
import { useGameLogic } from "../hooks/useGameLogic";
import { Board } from "./Board";
import { AnimatedBadge } from "./AnimatedBadge";
import { Home, RotateCcw, Heart, Coins, Search, X, ArrowRight, Tv, Trees, Sun, Snowflake, Volume2, VolumeX } from "lucide-react";
import { playTapSound, playWinSound, playFailSound, toggleBGM, isBGMEnabled } from "../utils/audio";
import { showRewardedAd } from "../utils/adBridge";
import type { ShopTab } from "./ShopModal";

const CONTINUE_COIN_COST  = 30;  // coins to continue after fail
const BONUS_MOVES_ON_CONTINUE = 5;

// ── Floating moves indicator type (module-level) ─────────────────────────────
interface FloatingMove {
  id: number;
  x: number;
  y: number;
  value: number | string;
}

interface GameViewProps {
  levelData: LevelData;
  onFinish: (result: GameResult) => void;
  onHome: () => void;
  onContinueWithCoins: (cost: number) => void;
  onOpenShop: (tab?: ShopTab) => void;
  onUseHint: () => void;
  coins: number;
  hearts: number;
  hints: number;
  noAds: boolean;
}

function getDifficultyLabel(levelId: number): { label: string; cls: string } {
  const id = Math.min(levelId, 100);
  if (id <= 15)  return { label: "EASY",   cls: "diff-easy" };
  if (id <= 50)  return { label: "NORMAL", cls: "diff-normal" };
  if (id <= 85)  return { label: "HARD",   cls: "diff-hard" };
  return              { label: "MASTER", cls: "diff-master" };
}

export const GameView: React.FC<GameViewProps> = ({
  levelData, onFinish, onHome, onContinueWithCoins, onOpenShop, onUseHint,
  coins, hearts, hints, noAds,
}) => {
  const { board, taps, status, foundZone, handleTileTap, initBoard, addBonusMoves } = useGameLogic(levelData, onFinish);
  const [magnified, setMagnified] = useState(false);

  const [bgmEnabled, setBgmEnabled] = useState(() => isBGMEnabled());
  const handleBgmToggle = () => {
    const nextEnabled = toggleBGM();
    setBgmEnabled(nextEnabled);
  };

  // Fail reveal + continue offer
  const [showFailOptions, setShowFailOptions] = useState(false);
  const [adLoading,       setAdLoading]       = useState(false);
  // Track if user already used "continue" once per round
  const [continueUsed, setContinueUsed] = useState(false);

  // ── Floating moves indicator state ──────────────────────────────────────────
  const [floatingMoves, setFloatingMoves] = useState<FloatingMove[]>([]);
  const floatingIdRef = useRef(0);
  const gameViewRef = useRef<HTMLDivElement>(null);

  // ── REF guards ──────────────────────────────────────────────────────────
  const firedRef     = useRef(false);
  const firedFailRef = useRef(false);
  const onFinishRef  = useRef(onFinish);
  const tapsRef      = useRef(taps);
  const levelIdRef   = useRef(levelData.levelId);

  onFinishRef.current = onFinish;
  tapsRef.current     = taps;
  levelIdRef.current  = levelData.levelId;

  // Win ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "won") return;
    if (firedRef.current) return;
    firedRef.current = true;

    playWinSound();
    if (navigator.vibrate) navigator.vibrate([200, 60, 200, 60, 400]);

    const timer = setTimeout(() => {
      onFinishRef.current({
        won: true,
        tapsUsed: tapsRef.current,
        timeUsed: 0,
        levelId: levelIdRef.current,
      });
    }, 1600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Fail — show options panel (continue or give up) ──────────────────────
  useEffect(() => {
    if (status !== "lost") return;
    if (firedFailRef.current) return;
    firedFailRef.current = true;

    playFailSound();
    if (navigator.vibrate) navigator.vibrate([300, 80, 300]);

    const timer = setTimeout(() => setShowFailOptions(true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const dismissToResult = () => {
    setShowFailOptions(false);
    onFinishRef.current({
      won: false,
      tapsUsed: tapsRef.current,
      timeUsed: 0,
      levelId: levelIdRef.current,
    });
  };

  // ── Continue with coins ─────────────────────────────────────────────────
  const handleContinueCoins = () => {
    if (coins < CONTINUE_COIN_COST || continueUsed) return;
    onContinueWithCoins(CONTINUE_COIN_COST);
    addBonusMoves(BONUS_MOVES_ON_CONTINUE);
    setContinueUsed(true);
    firedFailRef.current = false; // allow fail to fire again
    setShowFailOptions(false);
  };

  // ── Continue with ad ────────────────────────────────────────────────────
  const handleContinueAd = async () => {
    if (adLoading || continueUsed) return;
    
    if (noAds) {
      addBonusMoves(BONUS_MOVES_ON_CONTINUE);
      setContinueUsed(true);
      firedFailRef.current = false;
      setShowFailOptions(false);
      return;
    }

    setAdLoading(true);
    await showRewardedAd(
      () => {
        addBonusMoves(BONUS_MOVES_ON_CONTINUE);
        setContinueUsed(true);
        firedFailRef.current = false;
        setShowFailOptions(false);
        setAdLoading(false);
      },
      () => setAdLoading(false),
    );
  };

  // ── Magnifier (hint) ─────────────────────────────────────────────────────
  const handleMagnifierToggle = () => {
    if (magnified) {
      // Toggle off — no cost
      setMagnified(false);
      return;
    }
    if (noAds || hints > 0) {
      // Activate and consume one hint if not VIP
      if (!noAds) onUseHint();
      setMagnified(true);
    } else {
      // No hints left — open shop on hints tab
      onOpenShop("hints");
    }
  };

  // ── Tap handler — MUST be before any early return ───────────────────────
  const handleTap = useCallback((x: number, y: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (status !== "playing") return;
    playTapSound();
    handleTileTap(x, y);

    // Compute moves left AFTER this tap
    const nextTaps = taps + 1;
    const nextMovesLeft = levelData.moveLimit > 0
      ? Math.max(0, levelData.moveLimit - nextTaps)
      : Infinity;
    const displayValue: number | string = nextMovesLeft === Infinity ? "∞" : nextMovesLeft;

    // Convert viewport coords → game-view relative coords
    if (gameViewRef.current) {
      const rect = gameViewRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const id = ++floatingIdRef.current;
      setFloatingMoves(prev => [...prev, { id, x: relX, y: relY, value: displayValue }]);
      setTimeout(() => {
        setFloatingMoves(prev => prev.filter(fm => fm.id !== id));
      }, 850);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, taps, levelData.moveLimit, handleTileTap]);

  if (board.length === 0) return null;

  const movesLeft = levelData.moveLimit > 0
    ? Math.max(0, levelData.moveLimit - taps)
    : Infinity;
  const movesWarn = typeof movesLeft === "number" && movesLeft <= 5;

  const canContinue = !continueUsed;
  const canContinueCoins = canContinue && coins >= CONTINUE_COIN_COST;

  const diff = getDifficultyLabel(levelData.levelId);

  // Theme banner config
  const THEME_BANNER: Record<string, { label: string; accent: string; icon: React.ReactNode }> = {
    jungle: {
      label: "Jungle",
      accent: "#15A349",
      icon: <Trees size={20} strokeWidth={1.5} />,
    },
    desert: {
      label: "Desert",
      accent: "#FFB340",
      icon: <Sun size={20} strokeWidth={1.5} />,
    },
    arctic: {
      label: "Arctic",
      accent: "#6CE3FF",
      icon: <Snowflake size={20} strokeWidth={1.5} />,
    },
  };
  const banner = THEME_BANNER[levelData.theme] ?? THEME_BANNER.jungle;

  return (
    <div className="game-view fade-in" ref={gameViewRef}>
      {/* Header */}
      <div className="game-header">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-icon" onClick={onHome} id="btn-game-home">
            <Home size={18} />
          </button>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", fontFamily: "Outfit" }}>
            LVL {levelData.levelId}
          </div>
        </div>

        <div className="moves-display">
          <span className="moves-label">MOVES LEFT</span>
          <span className={`moves-count${movesWarn ? " warn" : ""}`}>
            {movesLeft === Infinity ? "∞" : movesLeft}
          </span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <AnimatedBadge
            value={noAds ? "∞" : hearts}
            icon={<Heart size={15} color="var(--heart-red)" fill="var(--heart-red)" />}
            onClick={() => onOpenShop("hearts")}
          />
          <AnimatedBadge
            value={coins}
            icon={<Coins size={15} color="var(--gold)" fill="var(--gold)" />}
            onClick={() => onOpenShop("coins")}
          />
        </div>
      </div>

      {/* ── Theme Banner ── */}
      <div
        className={`theme-banner theme-banner-${levelData.theme}`}
        style={{ "--theme-accent": banner.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" } as React.CSSProperties}
      >
        <span className="theme-banner-icon" aria-hidden="true">{banner.icon}</span>
        <span className="theme-banner-label">{banner.label}</span>
        <span className="theme-banner-dot">•</span>
        <span className={`theme-banner-difficulty ${diff.cls}`}>{diff.label}</span>
        <span className="theme-banner-dot">•</span>
        <button
          onClick={handleBgmToggle}
          className="bgm-toggle-banner-btn"
          title={bgmEnabled ? "Mute BGM" : "Unmute BGM"}
          style={{ background: "transparent", border: "none", color: bgmEnabled ? "var(--theme-accent)" : "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "2px", margin: 0, transition: "color 0.2s ease" }}
          aria-label="Toggle Background Music"
          id="btn-bgm-toggle-game"
        >
          {bgmEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Floating Target */}
      <div className="floating-target prominent-target">
        <div className="target-label">TARGET</div>
        <div
          className="target-grid"
          style={{
            gridTemplateColumns: `repeat(${levelData.defectZone.width}, 16px)`,
            gridTemplateRows: `repeat(${levelData.defectZone.height}, 16px)`,
          }}
        >
          {levelData.targetPatch.map((row, y) =>
            row.map((color, x) => (
              <div
                key={`${x}-${y}`}
                className={`target-tile theme-${levelData.theme}`}
                style={{ backgroundColor: `var(--camo-${color})` }}
              />
            ))
          )}
        </div>

        {/* Magnifier button — shows hint count; 0 hints shows + icon to get more */}
        <button
          className={`magnifier-btn${magnified ? " active" : ""}${!noAds && hints <= 0 ? " no-hints" : ""}`}
          onClick={handleMagnifierToggle}
          id="btn-magnifier"
          title={noAds ? "Use hint (Unlimited)" : hints > 0 ? `Use hint (${hints} left)` : "Get more hints"}
        >
          <Search size={18} />
          {noAds ? (
            <div className="badge-count">∞</div>
          ) : hints > 0 ? (
            <div className="badge-count">{hints}</div>
          ) : (
            <div className="badge-count badge-count-plus">+</div>
          )}
        </button>
      </div>

      {/* Board */}
      <Board
        boardData={board}
        onTileTap={handleTap}
        magnified={magnified}
        defectZone={levelData.defectZone}
        theme={levelData.theme}
        isCleared={status === "won"}
        isLost={status === "lost"}
        targetPatch={levelData.targetPatch}
        clearedZone={foundZone || levelData.defectZone}
      />

      {/* Floating Moves Indicators */}
      {floatingMoves.map(fm => (
        <div
          key={fm.id}
          className="floating-move-indicator"
          style={{ left: fm.x, top: fm.y }}
          aria-hidden="true"
        >
          {fm.value}
        </div>
      ))}

      {/* Bottom shelf */}
      <div className="bottom-shelf">
        <button className="btn-icon" onClick={initBoard} id="btn-reset-board">
          <RotateCcw size={20} />
        </button>
      </div>

      {/* ── Fail Options Panel ── */}
      {showFailOptions && (
        <div className="fail-banner fade-in" id="fail-banner">
          <button
            className="fail-banner-close"
            onClick={dismissToResult}
            id="btn-fail-close"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="fail-banner-body">
            <div className="fail-banner-emoji">💀</div>
            <div className="fail-banner-text">
              <div className="fail-banner-title">OUT OF MOVES</div>
              <div className="fail-banner-sub">The defect zone is highlighted above</div>
            </div>
          </div>

          {canContinue && (
            <div className="continue-options">
              {/* Continue with ad / VIP */}
              <button
                className={`btn ${noAds ? "btn-premium" : "btn-ad-continue"}`}
                onClick={handleContinueAd}
                disabled={adLoading}
                id="btn-continue-ad"
                style={noAds ? { background: "var(--premium-grad)", borderColor: "transparent", color: "#fff", marginBottom: 8 } : { marginBottom: 8 }}
              >
                {adLoading ? (
                  <><span className="ad-spinner" /> Watching...</>
                ) : noAds ? (
                  <>👑 VIP Claim → +{BONUS_MOVES_ON_CONTINUE} Moves</>
                ) : (
                  <><Tv size={16} /> Watch Ad → +{BONUS_MOVES_ON_CONTINUE} Moves</>
                )}
              </button>

              {/* Continue with coins */}
              <button
                className={`btn ${canContinueCoins ? "btn-gold" : "btn-ghost"} btn-continue-coins`}
                onClick={handleContinueCoins}
                disabled={!canContinueCoins}
                id="btn-continue-coins"
              >
                <Coins size={16} />
                {canContinueCoins
                  ? `${CONTINUE_COIN_COST} Coins → +${BONUS_MOVES_ON_CONTINUE} Moves`
                  : `Need ${CONTINUE_COIN_COST} Coins`}
              </button>
            </div>
          )}

          <button
            className="btn btn-ghost fail-banner-continue"
            onClick={dismissToResult}
            id="btn-fail-continue"
          >
            Give Up <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
