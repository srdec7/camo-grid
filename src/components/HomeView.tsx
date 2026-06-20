import React, { useState, useEffect } from "react";
import { Play, BookOpen, RefreshCw, Heart, Coins, Clock, Search } from "lucide-react";
import { AnimatedBadge } from "./AnimatedBadge";
import type { ShopTab } from "./ShopModal";

interface HomeViewProps {
  onPlay: () => void;
  onRules: () => void;
  onReset: () => void;
  onOpenShop: (tab?: ShopTab) => void;
  coins: number;
  hearts: number;
  hints: number;
  maxHearts: number;
  heartRefillMs: number;
  currentLevelId: number;
  currentLevelTheme: "jungle" | "desert" | "arctic";
  noAds: boolean;
}

function getDifficultyLabel(levelId: number): { label: string; cls: string } {
  const id = Math.min(levelId, 100);
  if (id <= 15)  return { label: "EASY",   cls: "diff-easy" };
  if (id <= 50)  return { label: "NORMAL", cls: "diff-normal" };
  if (id <= 85)  return { label: "HARD",   cls: "diff-hard" };
  return              { label: "MASTER", cls: "diff-master" };
}

const THEME_LABELS: Record<string, string> = {
  jungle: "🌿 JUNGLE",
  desert: "🏜️ DESERT",
  arctic: "❄️ ARCTIC",
};

/** Formats milliseconds as "MM:SS" */
function formatMs(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onPlay, onRules, onReset, onOpenShop,
  coins, hearts, hints, maxHearts, heartRefillMs: _heartRefillMs,
  currentLevelId, currentLevelTheme, noAds,
}) => {
  const diff  = getDifficultyLabel(currentLevelId);
  const theme = currentLevelTheme; // ← 실제 레벨 데이터의 테마를 사용 (불일치 버그 수정)

  // ── Heart refill countdown ───────────────────────────────────────────────
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (hearts >= maxHearts) { setCountdown(null); return; }

    const updateCountdown = () => {
      const refillAtISO = localStorage.getItem("camo_heart_refill_at");
      if (!refillAtISO) { setCountdown(null); return; }
      const ms = new Date(refillAtISO).getTime() - Date.now();
      setCountdown(ms > 0 ? ms : 0);
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [hearts, maxHearts]);

  const noHearts = !noAds && hearts <= 0;

  return (
    <div className="home-view fade-in">
      {/* Top bar */}
      <div className="home-top-bar">
        <span className="home-top-logo">CAMO GRID</span>
        <div className="home-economy-bar">
          <AnimatedBadge
            value={noAds ? "∞" : hearts}
            icon={<Heart size={16} color="var(--heart-red)" fill="var(--heart-red)" />}
            onClick={() => onOpenShop("hearts")}
            tappable
          />
          <AnimatedBadge
            value={hints}
            icon={<Search size={16} color="var(--accent)" />}
            onClick={() => onOpenShop("hints")}
            tappable
          />
          <AnimatedBadge
            value={coins}
            icon={<Coins size={16} color="var(--gold)" fill="var(--gold)" />}
            onClick={() => onOpenShop("coins")}
            tappable
          />
        </div>
      </div>

      {/* Body */}
      <div className="home-body">
        {/* Level card */}
        <div className={`level-card theme-${theme}`}>
          <span className={`difficulty-badge ${diff.cls}`}>{diff.label}</span>
          <div className="level-card-label">CURRENT LEVEL</div>
          <div className="level-card-number">{currentLevelId}</div>
          <div className={`level-card-theme ${theme}`}>{THEME_LABELS[theme]}</div>
        </div>

        {/* Play button — always clickable; if no hearts, App.tsx opens shop */}
        <button
          className={`btn home-play-btn${noHearts ? " btn-heart-needed" : ""}`}
          onClick={onPlay}
          id="btn-play-level"
        >
          {noHearts ? (
            <><Heart size={20} fill="currentColor" /> Get Hearts to Play</>
          ) : (
            <><Play size={20} /> PLAY LEVEL {currentLevelId}</>
          )}
        </button>

        {/* Heart refill timer (when hearts < max but > 0) */}
        {!noAds && !noHearts && hearts < maxHearts && countdown !== null && (
          <div className="heart-timer-bar">
            <Clock size={13} color="var(--text-muted)" />
            <span>Next heart in <strong>{formatMs(countdown)}</strong></span>
          </div>
        )}

        {/* Shop nudge — always visible as a friendly tap prompt */}
        <button
          className="btn btn-ghost btn-shop-entry"
          onClick={() => onOpenShop("hearts")}
          id="btn-open-shop"
        >
          🛍️ Shop  <span className="shop-entry-hint">Hearts · Hints · Coins</span>
        </button>

        {/* Secondary buttons */}
        <div className="home-footer-btns">
          <button className="btn btn-ghost" onClick={onRules} id="btn-home-rules" style={{ flex: 1, padding: "12px" }}>
            <BookOpen size={16} /> Rules
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (window.confirm("Reset all progress? Level will restart from 1.")) {
                onReset();
              }
            }}
            id="btn-reset-progress"
            style={{ flex: 1, padding: "12px" }}
          >
            <RefreshCw size={16} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};
