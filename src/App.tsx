import { useState, useCallback, useEffect } from "react";
import type { GameState, GameResult } from "./types";
import { generateLevel } from "./data/levels";
import { IntroView }  from "./components/IntroView";
import { RulesView }  from "./components/RulesView";
import { HomeView }   from "./components/HomeView";
import { GameView }   from "./components/GameView";
import { ResultView } from "./components/ResultView";
import { TallyView }  from "./components/TallyView";
import { ShopModal }  from "./components/ShopModal";
import type { ShopTab } from "./components/ShopModal";

// ── localStorage helpers ───────────────────────────────────────────────────
const LS_LEVEL      = "camo_level_id";
const LS_COINS      = "camo_coins";
const LS_HEARTS     = "camo_hearts";
const LS_HINTS      = "camo_hints";
const LS_HEART_TIME = "camo_heart_refill_at"; // ISO timestamp of next heart refill
const LS_NO_ADS     = "camo_no_ads";

const MAX_HEARTS      = 5;
const HEART_REFILL_MS = 20 * 60 * 1000; // 20 minutes per heart
const DEFAULT_HINTS   = 3;

function loadInt(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? parseInt(v, 10) : fallback;
  } catch { return fallback; }
}
function loadBool(key: string): boolean {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}
function save(key: string, value: number | string | boolean) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

/** Work out how many hearts should have refilled since `refillAt` and return updated hearts + new refillAt */
function calcHeartRefill(currentHearts: number, refillAtISO: string | null): { hearts: number; refillAt: string | null } {
  if (currentHearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, refillAt: null };
  if (!refillAtISO) {
    // Start the timer now
    const next = new Date(Date.now() + HEART_REFILL_MS).toISOString();
    return { hearts: currentHearts, refillAt: next };
  }

  const refillAt = new Date(refillAtISO).getTime();
  const now = Date.now();
  if (now < refillAt) {
    // Defense against clock jumping (e.g., user skipped forward, spent hearts, then reverted time)
    if (refillAt - now > HEART_REFILL_MS * 1.2) {
      const reset = new Date(now + HEART_REFILL_MS).toISOString();
      return { hearts: currentHearts, refillAt: reset };
    }
    return { hearts: currentHearts, refillAt: refillAtISO };
  }

  // How many hearts have accumulated?
  const elapsed = now - refillAt;
  const gained  = 1 + Math.floor(elapsed / HEART_REFILL_MS);
  const newHearts = Math.min(MAX_HEARTS, currentHearts + gained);

  if (newHearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, refillAt: null };

  // Schedule the next tick from where we left off
  const ticks = gained; // number of ticks that fired
  const nextRefillAt = new Date(refillAt + ticks * HEART_REFILL_MS).toISOString();
  return { hearts: newHearts, refillAt: nextRefillAt };
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState,      setGameState]      = useState<GameState>("intro");
  const [currentLevelId, setCurrentLevelId] = useState(() => loadInt(LS_LEVEL, 1));
  const [lastResult,     setLastResult]     = useState<GameResult | null>(null);
  const [noAds,          setNoAds]          = useState(() => loadBool(LS_NO_ADS));

  // ── Economy ──────────────────────────────────────────────────────────────
  const [coins,  setCoinsRaw]  = useState(() => loadInt(LS_COINS, 100));
  const [hints,  setHintsRaw]  = useState(() => loadInt(LS_HINTS, DEFAULT_HINTS));
  const [hearts, setHeartsRaw] = useState(() => {
    const stored = loadInt(LS_HEARTS, MAX_HEARTS);
    // Apply any offline refill
    const refillAtISO = localStorage.getItem(LS_HEART_TIME);
    const { hearts: h, refillAt } = calcHeartRefill(stored, refillAtISO);
    save(LS_HEARTS, h);
    if (refillAt) save(LS_HEART_TIME, refillAt);
    else localStorage.removeItem(LS_HEART_TIME);
    return h;
  });

  // ── Shop modal state ─────────────────────────────────────────────────────
  const [shopOpen, setShopOpen]         = useState(false);
  const [shopTab,  setShopTab]          = useState<ShopTab>("hearts");

  const openShop = useCallback((tab: ShopTab = "hearts") => {
    setShopTab(tab);
    setShopOpen(true);
  }, []);

  const closeShop = useCallback(() => setShopOpen(false), []);

  // ── Persisted setters ────────────────────────────────────────────────────
  const setCoins = useCallback((updater: number | ((prev: number) => number)) => {
    setCoinsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      save(LS_COINS, next);
      return next;
    });
  }, []);

  const setHints = useCallback((updater: number | ((prev: number) => number)) => {
    setHintsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const clamped = Math.max(0, next);
      save(LS_HINTS, clamped);
      return clamped;
    });
  }, []);

  const setHearts = useCallback((updater: number | ((prev: number) => number)) => {
    setHeartsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const clamped = Math.min(MAX_HEARTS, Math.max(0, next));
      save(LS_HEARTS, clamped);

      // Start refill timer if hearts dropped below max
      if (clamped < MAX_HEARTS) {
        const existing = localStorage.getItem(LS_HEART_TIME);
        if (!existing) {
          save(LS_HEART_TIME, new Date(Date.now() + HEART_REFILL_MS).toISOString());
        }
      } else {
        localStorage.removeItem(LS_HEART_TIME);
      }
      return clamped;
    });
  }, []);

  // ── Coin transition state for TallyView ────────────────────────────────
  const [prevCoins, setPrevCoins] = useState(coins);

  // ── Heart refill ticker (checks every 30 s) ────────────────────────────
  useEffect(() => {
    const tick = () => {
      setHeartsRaw(prev => {
        if (prev >= MAX_HEARTS) return prev;
        const refillAtISO = localStorage.getItem(LS_HEART_TIME);
        const { hearts: h, refillAt } = calcHeartRefill(prev, refillAtISO);
        save(LS_HEARTS, h);
        if (refillAt) save(LS_HEART_TIME, refillAt);
        else localStorage.removeItem(LS_HEART_TIME);
        return h;
      });
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Level data ─────────────────────────────────────────────────────────
  const currentLevelData = generateLevel(currentLevelId);

  // ── Game handlers ──────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (!noAds) {
      if (hearts <= 0) { openShop("hearts"); return; }
      setHearts(h => h - 1);
    }
    setGameState("playing");
  };

  const handleFinishGame = useCallback((result: GameResult) => {
    if (result.won) {
      setCoinsRaw(prevCoinValue => {
        setPrevCoins(prevCoinValue);
        const next = prevCoinValue + 10;
        save(LS_COINS, next);
        return next;
      });
      setCurrentLevelId(prev => {
        const next = prev + 1;
        save(LS_LEVEL, next);
        return next;
      });
    }
    setLastResult(result);
    setGameState("result");
  }, []);

  /** Player used coins to continue — add extra moves back in GameView */
  const handleContinueWithCoins = useCallback((coinCost: number) => {
    setCoins(c => c - coinCost);
  }, [setCoins]);

  const handleRetry = () => {
    if (!noAds) {
      if (hearts <= 0) { openShop("hearts"); return; }
      setHearts(h => h - 1);
    }
    setGameState("playing");
  };

  const handleNext = () => {
    if (!noAds) {
      if (hearts <= 0) { openShop("hearts"); return; }
      setHearts(h => h - 1);
    }
    setGameState("tally");
  };

  const handleTallyComplete = () => setGameState("playing");

  // ── Shop action handlers (centralized) ────────────────────────────────────
  const handleGrantHeart = useCallback(() => {
    setHearts(h => Math.min(MAX_HEARTS, h + 1));
  }, [setHearts]);

  const handleGrantHint = useCallback(() => {
    setHints(h => h + 1);
  }, [setHints]);

  const handleUseHint = useCallback(() => {
    if (noAds) return;
    setHints(h => Math.max(0, h - 1));
  }, [noAds, setHints]);

  const handleGrantCoins = useCallback((amount: number) => {
    setCoins(c => c + amount);
  }, [setCoins]);

  const handleSpendCoins = useCallback((amount: number) => {
    setCoins(c => c - amount);
  }, [setCoins]);

  /** Grant coins from ad watch (called by ResultView double-reward) */
  const handleDoubleCoins = useCallback((bonus: number) => {
    setCoins(c => c + bonus);
    setPrevCoins(prev => prev + bonus);
  }, [setCoins]);

  /** Purchase No Ads */
  const handlePurchaseNoAds = useCallback(() => {
    setNoAds(true);
    save(LS_NO_ADS, true);
  }, []);

  const handleReset = () => {
    setCurrentLevelId(1); save(LS_LEVEL, 1);
    setCoinsRaw(100);     save(LS_COINS, 100);
    setHeartsRaw(MAX_HEARTS); save(LS_HEARTS, MAX_HEARTS);
    setHintsRaw(DEFAULT_HINTS); save(LS_HINTS, DEFAULT_HINTS);
    setPrevCoins(100);
    localStorage.removeItem(LS_HEART_TIME);
    setNoAds(false);      localStorage.removeItem(LS_NO_ADS);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {gameState === "intro" && (
        <IntroView
          onPlay={() => setGameState("home")}
          onRules={() => setGameState("rules")}
        />
      )}

      {gameState === "rules" && (
        <RulesView onBack={() => setGameState("intro")} />
      )}

      {gameState === "home" && (
        <HomeView
          onPlay={handlePlay}
          onRules={() => setGameState("rules")}
          onReset={handleReset}
          onOpenShop={openShop}
          coins={coins}
          hearts={hearts}
          hints={hints}
          maxHearts={MAX_HEARTS}
          heartRefillMs={HEART_REFILL_MS}
          currentLevelId={currentLevelId}
          currentLevelTheme={currentLevelData.theme}
          noAds={noAds}
        />
      )}

      {gameState === "playing" && (
        <GameView
          key={`game-${currentLevelId}`}
          levelData={currentLevelData}
          onFinish={handleFinishGame}
          onHome={() => setGameState("home")}
          onContinueWithCoins={handleContinueWithCoins}
          onOpenShop={openShop}
          onUseHint={handleUseHint}
          coins={coins}
          hearts={hearts}
          hints={hints}
          noAds={noAds}
        />
      )}

      {gameState === "result" && lastResult && (
        <ResultView
          result={lastResult}
          onRetry={handleRetry}
          onNext={handleNext}
          onHome={() => setGameState("home")}
          onOpenShop={openShop}
          coins={coins}
          hearts={hearts}
          maxHearts={MAX_HEARTS}
          onDoubleCoins={handleDoubleCoins}
          noAds={noAds}
        />
      )}

      {gameState === "tally" && (
        <TallyView
          fromCoins={prevCoins}
          toCoins={coins}
          nextLevelId={currentLevelId}
          onComplete={handleTallyComplete}
        />
      )}

      {/* ── Global Shop Modal ── */}
      {shopOpen && (
        <ShopModal
          tab={shopTab}
          coins={coins}
          hearts={hearts}
          hints={hints}
          maxHearts={MAX_HEARTS}
          noAds={noAds}
          onClose={closeShop}
          onGrantHeart={handleGrantHeart}
          onGrantHint={handleGrantHint}
          onGrantCoins={handleGrantCoins}
          onSpendCoins={handleSpendCoins}
          onPurchaseNoAds={handlePurchaseNoAds}
          onRestorePurchases={handlePurchaseNoAds}
        />
      )}
    </>
  );
}
