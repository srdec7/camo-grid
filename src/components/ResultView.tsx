import React, { useState } from "react";
import type { GameResult } from "../types";
import { RotateCcw, ArrowRight, Home, Coins, Tv, Heart } from "lucide-react";
import { showRewardedAd } from "../utils/adBridge";
import type { ShopTab } from "./ShopModal";

// Sounds are already played by GameView the moment win/fail is detected.
// ResultView is purely for UI — no duplicate sounds here.

interface ResultViewProps {
  result: GameResult;
  onRetry: () => void;
  onNext: () => void;
  onHome: () => void;
  onOpenShop: (tab?: ShopTab) => void;
  coins: number;
  hearts: number;
  maxHearts: number;
  onDoubleCoins: (bonus: number) => void;
  noAds: boolean;
}

const WIN_COIN_REWARD = 10;

export const ResultView: React.FC<ResultViewProps> = ({
  result, onRetry, onNext, onHome, onOpenShop,
  hearts, maxHearts,
  onDoubleCoins, noAds,
}) => {
  const [doubled,   setDoubled]   = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  // ── Double coins ad ──────────────────────────────────────────────────────
  const handleDoubleAd = async () => {
    if (doubled || adLoading) return;
    if (noAds) {
      onDoubleCoins(WIN_COIN_REWARD * 2);
      setDoubled(true);
      return;
    }
    setAdLoading(true);
    await showRewardedAd(
      () => {
        onDoubleCoins(WIN_COIN_REWARD * 2);
        setDoubled(true);
        setAdLoading(false);
      },
      () => setAdLoading(false),
    );
  };

  // ── Next/Retry — if no hearts, open shop directly ───────────────────────
  const handleNext = () => {
    if (!noAds && hearts <= 0) { onOpenShop("hearts"); return; }
    onNext();
  };

  const handleRetry = () => {
    if (!noAds && hearts <= 0) { onOpenShop("hearts"); return; }
    onRetry();
  };

  const noHearts = !noAds && hearts <= 0;

  return (
    <div className="result-view fade-in">
      <div className="glass-panel scale-in" style={{ textAlign: "center", width: "100%", maxWidth: 360 }}>
        {result.won ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🎉</div>
            <h2 className="result-title win">LEVEL CLEARED!</h2>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>💀</div>
            <h2 className="result-title lose">OUT OF MOVES</h2>
          </>
        )}

        <div className="result-stats">
          <p style={{ margin: "6px 0" }}>
            Taps Used: <strong style={{ color: "var(--text-primary)" }}>{result.tapsUsed}</strong>
          </p>
          {result.won && (
            <>
              <div className="coin-reward">
                <Coins size={22} fill="var(--gold)" color="var(--gold)" />
                <span>+{WIN_COIN_REWARD} COINS{doubled ? ` +${WIN_COIN_REWARD * 2} BONUS` : ""}</span>
              </div>

              {/* Double coins via ad */}
              {!doubled && (
                <button
                  className={`btn ${noAds ? "btn-premium" : "btn-ad-double"}`}
                  onClick={handleDoubleAd}
                  disabled={adLoading}
                  id="btn-double-coins-ad"
                  style={noAds ? { background: "var(--premium-grad)", borderColor: "transparent", color: "#fff" } : undefined}
                >
                  {adLoading ? (
                    <><span className="ad-spinner" /> Watching...</>
                  ) : noAds ? (
                    <>👑 VIP Claim → +{WIN_COIN_REWARD * 2} Bonus Coins</>
                  ) : (
                    <><Tv size={15} /> Watch Ad → +{WIN_COIN_REWARD * 2} Bonus Coins</>
                  )}
                </button>
              )}
              {doubled && (
                <div className="double-claimed">✅ Bonus coins claimed!</div>
              )}
            </>
          )}
          {!result.won && (
            <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Don't give up — the pattern is still there!
            </p>
          )}
        </div>

        {/* Hearts low notice */}
        {noHearts && (
          <div className="result-no-hearts-notice">
            <Heart size={14} fill="var(--heart-red)" color="var(--heart-red)" />
            <span>Out of hearts! Tap NEXT / RETRY to get more.</span>
          </div>
        )}
        {!noAds && !noHearts && hearts < maxHearts && (
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            ❤️ {hearts}/{maxHearts} hearts remaining
          </p>
        )}
        {noAds && (
          <p style={{ margin: "10px 0 0", color: "var(--accent)", fontSize: "0.85rem", fontWeight: "bold" }}>
            👑 VIP Active · Unlimited Hearts
          </p>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: 20 }}>
          <button className="btn-icon" onClick={onHome} style={{ width: 50, height: 50 }} id="btn-result-home">
            <Home size={22} />
          </button>
          <button
            className="btn-icon"
            onClick={handleRetry}
            style={{ width: 50, height: 50, color: noHearts ? "var(--heart-red)" : "var(--gold)" }}
            id="btn-result-retry"
          >
            <RotateCcw size={22} />
          </button>
          {result.won && (
            <button
              className="btn"
              onClick={handleNext}
              style={{ flex: 1, height: 50, fontSize: "1.05rem" }}
              id="btn-result-next"
            >
              {noHearts
                ? <><Heart size={16} fill="currentColor" /> Get Hearts</>
                : <>NEXT <ArrowRight size={20} /></>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
