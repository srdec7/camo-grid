import React, { useEffect, useRef, useState } from "react";
import { playTickSound } from "../utils/audio";

interface AnimatedBadgeProps {
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  glowColor?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** If true, shows a small + hint that the badge is tappable */
  tappable?: boolean;
}

/**
 * AnimatedBadge
 * Displays a rolling counter that ticks up/down with:
 *  - Tick sound on each step
 *  - Haptic vibration on each step (mobile)
 *  - Visual bounce (CSS .badge-pop class toggled)
 *  - Optional onClick handler (for opening shop)
 */
export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  value,
  icon,
  color,
  style,
  onClick,
  tappable,
}) => {
  const [displayed, setDisplayed] = useState<number | string>(value);
  const [popping, setPopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRef = useRef<number | string>(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    if (typeof value === "string" || typeof prev === "string") {
      setDisplayed(value);
      return;
    }

    if (prev === value) return;

    const delta = (value as number) - (prev as number);
    const steps = Math.abs(delta);
    const direction = delta > 0 ? 1 : -1;
    let count = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    // Trigger pop animation
    setPopping(false);
    // force reflow to restart animation
    void (document.body as any).offsetHeight;
    setPopping(true);
    const resetTimer = setTimeout(() => setPopping(false), 450);

    // Tick interval speed: faster for large deltas
    const tickMs = Math.max(30, Math.min(90, 600 / steps));

    intervalRef.current = setInterval(() => {
      count++;
      setDisplayed(d => (d as number) + direction);
      playTickSound();
      if (navigator.vibrate) navigator.vibrate(8);
      if (count >= steps) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, tickMs);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(resetTimer);
    };
  }, [value]);

  return (
    <div
      className={`economy-badge${popping ? " badge-pop" : ""}${onClick ? " badge-tappable" : ""}`}
      style={{ color: color, cursor: onClick ? "pointer" : undefined, ...style }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "Open shop" : undefined}
    >
      {icon}
      <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
        {displayed}
      </span>
      {tappable && <span className="badge-tap-hint">+</span>}
    </div>
  );
};
