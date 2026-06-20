import React, { useState } from "react";
import { X, Heart, Coins, Search } from "lucide-react";
import { showRewardedAd, restorePurchases } from "../utils/adBridge";

export type ShopTab = "hearts" | "hints" | "coins";

interface ShopModalProps {
  tab: ShopTab;
  coins: number;
  hearts: number;
  hints: number;
  maxHearts: number;
  noAds: boolean;
  onClose: () => void;
  onGrantHeart: () => void;
  onGrantHint: () => void;
  onGrantCoins: (amount: number) => void;
  onSpendCoins: (amount: number) => void;
  onPurchaseNoAds: () => void;
  onRestorePurchases: () => void;
}

const HEART_AD_REWARD    = 1;
const HEART_COIN_COST    = 50;   // Full refill (5 hearts)
const HINT_AD_REWARD     = 1;
const HINT_COIN_COST     = 30;   // Bundle of 3 hints
const HINT_BUNDLE_SIZE   = 3;
const COIN_AD_REWARD     = 20;

export const ShopModal: React.FC<ShopModalProps> = ({
  tab: initialTab,
  coins, hearts, hints, maxHearts,
  noAds,
  onClose, onGrantHeart, onGrantHint, onGrantCoins, onSpendCoins, onPurchaseNoAds, onRestorePurchases,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>(initialTab);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [iapLoading, setIapLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const isLoading = (id: string) => loadingId === id;

  const withAd = async (id: string, onSuccess: () => void) => {
    if (loadingId) return;
    setLoadingId(id);
    await showRewardedAd(
      () => { onSuccess(); setLoadingId(null); },
      () => setLoadingId(null),
    );
  };

  const handlePurchaseNoAds = async () => {
    if (iapLoading) return;
    setIapLoading(true);
    await new Promise<void>((r) => setTimeout(r, 800));
    onPurchaseNoAds();
    setIapLoading(false);
  };

  const handleRestore = async () => {
    if (restoreLoading) return;
    setRestoreLoading(true);
    await restorePurchases(
      () => {
        onRestorePurchases();
        setRestoreLoading(false);
      },
      () => setRestoreLoading(false)
    );
  };

  const heartsEmpty = hearts >= maxHearts;
  const coinsForHearts = coins >= HEART_COIN_COST;
  const coinsForHints  = coins >= HINT_COIN_COST;

  const TABS: { id: ShopTab; emoji: string; label: string }[] = [
    { id: "hearts", emoji: "❤️", label: "Hearts" },
    { id: "hints",  emoji: "🔍", label: "Hints"  },
    { id: "coins",  emoji: "🪙", label: "Coins"  },
  ];

  return (
    <div className="shop-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shop-modal scale-in">
        {/* Header */}
        <div className="shop-modal-header">
          <span className="shop-modal-title">🛍️ Shop</span>
          <button className="shop-close-btn" onClick={onClose} id="btn-shop-close" aria-label="Close shop">
            <X size={20} />
          </button>
        </div>

        {/* Balance bar */}
        <div className="shop-balance-bar">
          <div className="shop-balance-item">
            <Heart size={14} color="var(--heart-red)" fill="var(--heart-red)" />
            <span>{noAds ? "∞" : `${hearts}/${maxHearts}`}</span>
          </div>
          <div className="shop-balance-item">
            <Search size={14} color="var(--accent)" />
            <span>{noAds ? "∞" : hints}</span>
          </div>
          <div className="shop-balance-item">
            <Coins size={14} color="var(--gold)" fill="var(--gold)" />
            <span>{coins}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="shop-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`shop-tab${activeTab === t.id ? " active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              id={`btn-shop-tab-${t.id}`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="shop-content">

          {/* ── HEARTS TAB ── */}
          {activeTab === "hearts" && (
            <div className="shop-offers">
              <div className="shop-section-title">Refill Your Hearts</div>

              {noAds ? (
                <div className="shop-full-notice shop-vip-active-notice" style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px dashed var(--premium-purple, #a855f7)", padding: "24px 16px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: 8 }}>
                  <span style={{ fontSize: "2rem" }}>👑</span>
                  <span style={{ fontWeight: 800, color: "var(--premium-purple, #a855f7)", fontSize: "1.1rem" }}>VIP UNLIMITED HEARTS ACTIVE</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>You have infinite lives. Enjoy playing without limits!</span>
                </div>
              ) : heartsEmpty ? (
                <div className="shop-full-notice">
                  <Heart size={28} color="var(--heart-red)" fill="var(--heart-red)" />
                  <span>Hearts are full! ({maxHearts}/{maxHearts})</span>
                </div>
              ) : (
                <>
                  <div className="offer-card offer-card-ad">
                    <div className="offer-card-icon">{noAds ? "👑" : "📺"}</div>
                    <div className="offer-card-info">
                      <div className="offer-card-name">{noAds ? "VIP Reward" : "Watch Ad"}</div>
                      <div className="offer-card-desc">{noAds ? "Instant • Free" : "Free • 30 sec"}</div>
                    </div>
                    <button
                      className={`offer-btn ${noAds ? "offer-btn-premium" : "offer-btn-ad"}${isLoading("heart-ad") ? " loading" : ""}`}
                      onClick={() => {
                        if (noAds) onGrantHeart();
                        else withAd("heart-ad", onGrantHeart);
                      }}
                      disabled={!!loadingId}
                      id="btn-shop-heart-ad"
                    >
                      {isLoading("heart-ad") ? <span className="ad-spinner" /> : null}
                      {isLoading("heart-ad") ? "Playing..." : `+${HEART_AD_REWARD} ❤️`}
                    </button>
                  </div>

                  <div className={`offer-card offer-card-coin${!coinsForHearts ? " offer-disabled" : ""}`}>
                    <div className="offer-card-icon">🪙</div>
                    <div className="offer-card-info">
                      <div className="offer-card-name">Full Refill</div>
                      <div className="offer-card-desc">{HEART_COIN_COST} coins · Fill all hearts</div>
                    </div>
                    <button
                      className={`offer-btn offer-btn-gold`}
                      onClick={() => {
                        if (!coinsForHearts) return;
                        onSpendCoins(HEART_COIN_COST);
                        // Grant hearts up to max
                        const needed = maxHearts - hearts;
                        for (let i = 0; i < needed; i++) onGrantHeart();
                        onClose();
                      }}
                      disabled={!coinsForHearts}
                      id="btn-shop-heart-coins"
                    >
                      {coinsForHearts ? `${HEART_COIN_COST} 🪙` : "Need coins"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── HINTS TAB ── */}
          {activeTab === "hints" && (
            <div className="shop-offers">
              <div className="shop-section-title">Get Magnifier Hints</div>

              {noAds ? (
                <div className="shop-full-notice shop-vip-active-notice" style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px dashed var(--premium-purple, #a855f7)", padding: "24px 16px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: 8 }}>
                  <span style={{ fontSize: "2rem" }}>👑</span>
                  <span style={{ fontWeight: 800, color: "var(--premium-purple, #a855f7)", fontSize: "1.1rem" }}>VIP UNLIMITED HINTS ACTIVE</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>You have infinite magnifier hints. Use them freely in-game!</span>
                </div>
              ) : (
                <>
                  <div className="offer-card offer-card-ad">
                    <div className="offer-card-icon">{noAds ? "👑" : "📺"}</div>
                    <div className="offer-card-info">
                      <div className="offer-card-name">{noAds ? "VIP Reward" : "Watch Ad"}</div>
                      <div className="offer-card-desc">{noAds ? "Instant • Free" : "Free • 30 sec"}</div>
                    </div>
                    <button
                      className={`offer-btn ${noAds ? "offer-btn-premium" : "offer-btn-ad"}${isLoading("hint-ad") ? " loading" : ""}`}
                      onClick={() => {
                        if (noAds) onGrantHint();
                        else withAd("hint-ad", onGrantHint);
                      }}
                      disabled={!!loadingId}
                      id="btn-shop-hint-ad"
                    >
                      {isLoading("hint-ad") ? <span className="ad-spinner" /> : null}
                      {isLoading("hint-ad") ? "Playing..." : `+${HINT_AD_REWARD} 🔍`}
                    </button>
                  </div>

                  <div className={`offer-card offer-card-coin${!coinsForHints ? " offer-disabled" : ""}`}>
                    <div className="offer-card-icon">🪙</div>
                    <div className="offer-card-info">
                      <div className="offer-card-name">Hint Bundle</div>
                      <div className="offer-card-desc">{HINT_COIN_COST} coins · {HINT_BUNDLE_SIZE} magnifiers</div>
                    </div>
                    <button
                      className={`offer-btn offer-btn-gold`}
                      onClick={() => {
                        if (!coinsForHints) return;
                        onSpendCoins(HINT_COIN_COST);
                        for (let i = 0; i < HINT_BUNDLE_SIZE; i++) onGrantHint();
                      }}
                      disabled={!coinsForHints}
                      id="btn-shop-hint-coins"
                    >
                      {coinsForHints ? `${HINT_COIN_COST} 🪙` : "Need coins"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── COINS TAB ── */}
          {activeTab === "coins" && (
            <div className="shop-offers">
              <div className="shop-section-title">Earn Coins</div>

              <div className="offer-card offer-card-ad">
                <div className="offer-card-icon">{noAds ? "👑" : "📺"}</div>
                <div className="offer-card-info">
                  <div className="offer-card-name">{noAds ? "VIP Reward" : "Watch Ad"}</div>
                  <div className="offer-card-desc">{noAds ? "Instant • Free" : "Free • 30 sec"}</div>
                </div>
                <button
                  className={`offer-btn ${noAds ? "offer-btn-premium" : "offer-btn-ad"}${isLoading("coin-ad") ? " loading" : ""}`}
                  onClick={() => {
                    if (noAds) onGrantCoins(COIN_AD_REWARD);
                    else withAd("coin-ad", () => onGrantCoins(COIN_AD_REWARD));
                  }}
                  disabled={!!loadingId}
                  id="btn-shop-coin-ad"
                >
                  {isLoading("coin-ad") ? <span className="ad-spinner" /> : null}
                  {isLoading("coin-ad") ? "Playing..." : `+${COIN_AD_REWARD} 🪙`}
                </button>
              </div>

              {!noAds && (
                <div className="offer-card offer-card-premium">
                  <div className="offer-card-icon">🚫</div>
                  <div className="offer-card-info">
                    <div className="offer-card-name">Remove Ads</div>
                    <div className="offer-card-desc">One-time purchase · Forever ad-free</div>
                  </div>
                  <button
                    className="offer-btn offer-btn-premium"
                    onClick={handlePurchaseNoAds}
                    disabled={iapLoading}
                    id="btn-shop-no-ads"
                  >
                    {iapLoading ? <span className="ad-spinner" /> : "$1.99"}
                  </button>
                </div>
              )}

              {noAds && (
                <div className="shop-full-notice" style={{ marginTop: 8 }}>
                  <span>👑</span>
                  <span>You have the No-Ads VIP pass! Enjoy instant rewards.</span>
                </div>
              )}
              
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <button 
                  onClick={handleRestore}
                  disabled={restoreLoading}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", textDecoration: "underline", fontSize: "0.9rem", cursor: "pointer" }}
                >
                  {restoreLoading ? "Restoring..." : "Restore Purchases"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
