import React, { useEffect, useRef, useState } from "react";
import { Coins } from "lucide-react";
import { playTickSound, playCoinSound } from "../utils/audio";

interface TallyViewProps {
  fromCoins: number;
  toCoins: number;
  nextLevelId: number;
  onComplete: () => void;
}

export const TallyView: React.FC<TallyViewProps> = ({
  fromCoins,
  toCoins,
  nextLevelId,
  onComplete,
}) => {
  const [displayed, setDisplayed] = useState(fromCoins);
  const [phase, setPhase] = useState<"counting" | "done">("counting");
  const [pop, setPop] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const delta = toCoins - fromCoins;
    if (delta <= 0) {
      // No counting needed — just wait briefly and proceed
      timeoutRef.current = setTimeout(onComplete, 1200);
      return;
    }

    const steps = delta;
    let count = 0;
    const tickMs = Math.max(40, Math.min(120, 800 / steps));

    // Play coin win fanfare at start
    playCoinSound();
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);

    intervalRef.current = setInterval(() => {
      count++;
      setDisplayed(d => d + 1);
      setPop(true);
      setTimeout(() => setPop(false), tickMs * 0.8);

      playTickSound();
      if (navigator.vibrate) navigator.vibrate(8);

      if (count >= steps) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setPhase("done");
        // Victory pulse after counting done
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
        // Auto-advance after 900ms rest
        timeoutRef.current = setTimeout(onComplete, 900);
      }
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tally-view fade-in">
      {/* Background glow orbs */}
      <div className="tally-bg-orb tally-orb-1" />
      <div className="tally-bg-orb tally-orb-2" />

      {/* Next level pill */}
      <div className="tally-level-pill">
        STAGE {nextLevelId} UNLOCKED
      </div>

      {/* Coin counter — the centerpiece */}
      <div className={`tally-counter-wrap${pop ? " tally-pop" : ""}${phase === "done" ? " tally-done" : ""}`}>
        <div className="tally-coin-icon">
          <Coins size={52} color="var(--gold)" fill="var(--gold)" />
        </div>
        <div className="tally-number">{displayed}</div>
        <div className="tally-label">COINS</div>
      </div>

      {phase === "done" && (
        <div className="tally-ready fade-in">
          Get ready...
        </div>
      )}
    </div>
  );
};
