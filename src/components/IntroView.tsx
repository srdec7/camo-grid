import React, { useState, useEffect } from "react";
import { Play, BookOpen } from "lucide-react";

interface IntroViewProps {
  onPlay: () => void;
  onRules: () => void;
}

// Mini decorative camo tile preview grid
const PREVIEW = [
  [0, 1, 2, 0, 3],
  [3, 2, 0, 1, 0],
  [1, 0, 3, 2, 1],
  [2, 3, 1, 0, 2],
  [0, 1, 2, 3, 0],
];
// Use jungle colours for the preview, but we'll cycle them
const COLORS = ["#A8FF78", "#27AE60", "#1A5C2E", "#0A1F0F"];

export const IntroView: React.FC<IntroViewProps> = ({ onPlay, onRules }) => {
  const [offset, setOffset] = useState(0);

  // Cycle colors every 800ms
  useEffect(() => {
    const timer = setInterval(() => {
      setOffset(prev => (prev + 1) % 4);
    }, 800);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="intro-view fade-in">
      <div className="intro-logo-wrapper">
        {/* Mini tile grid as logo decoration */}
        <div className="intro-tile-preview float-anim">
          {PREVIEW.map((row, y) =>
            row.map((c, x) => (
              <div
                key={`${x}-${y}`}
                className="intro-tile-preview-cell"
                style={{ backgroundColor: COLORS[(c + offset) % 4] }}
              />
            ))
          )}
        </div>

        <h1 className="intro-title">CAMO GRID</h1>
        <p className="intro-subtitle">Find the Glitch. Fix the Pattern.</p>
      </div>

      <div className="intro-btn-group">
        <button className="btn home-play-btn" onClick={onPlay} id="btn-start-game">
          <Play size={20} />
          START GAME
        </button>
        <button className="btn btn-ghost" style={{ padding: "14px 28px" }} onClick={onRules} id="btn-how-to-play">
          <BookOpen size={18} />
          HOW TO PLAY
        </button>
      </div>

      {/* Version tag */}
      <p style={{ position: "absolute", bottom: 16, color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.08em" }}>
        v1.0 · CAMO GRID
      </p>
    </div>
  );
};
