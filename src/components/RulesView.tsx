import React from "react";
import { ArrowLeft, Search, Target, RotateCcw, Zap } from "lucide-react";

interface RulesViewProps {
  onBack: () => void;
}

const rules = [
  {
    icon: <Target size={22} />,
    iconClass: "green",
    title: "Find the Defect",
    desc: "The main grid hides one unique zone where the pattern doesn't match the TARGET shown. Only one zone is the real defect — all others are camouflage.",
  },
  {
    icon: <RotateCcw size={22} />,
    iconClass: "gold",
    title: "Rotate the Colors",
    desc: "Tap any tile inside the defect zone to cycle its color. Each tap advances the color by one step. Match every tile to the TARGET patch to clear the stage.",
  },
  {
    icon: <Zap size={22} />,
    iconClass: "blue",
    title: "Watch Your Moves",
    desc: "You have a limited number of moves (taps) to fix the defect. Plan carefully — every tap counts. Run out of moves and you'll need to retry.",
  },
  {
    icon: <Search size={22} />,
    iconClass: "red",
    title: "Use the Magnifier",
    desc: "Stuck? Tap the magnifier icon to highlight the approximate region containing the defect. You have a limited number of uses — save them for tough stages!",
  },
];

export const RulesView: React.FC<RulesViewProps> = ({ onBack }) => {
  return (
    <div className="rules-view fade-in">
      <div className="rules-header">
        <button className="btn-icon" onClick={onBack} id="btn-rules-back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="rules-title">How to Play</h2>
      </div>

      <div className="rules-cards">
        {rules.map((rule, i) => (
          <div key={i} className="rule-card">
            <div className={`rule-icon ${rule.iconClass}`}>
              {rule.icon}
            </div>
            <div className="rule-card-text">
              <h3>{rule.title}</h3>
              <p>{rule.desc}</p>
            </div>
          </div>
        ))}

        {/* Tip box */}
        <div
          className="rule-card"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            marginTop: 4,
          }}
        >
          <div className="rule-icon green" style={{ fontSize: "1.4rem" }}>💡</div>
          <div className="rule-card-text">
            <h3>Pro Tip</h3>
            <p>
              Pan and pinch-zoom the grid to get a closer look. You can zoom in freely, but can't zoom out smaller than the starting fit — so you always see the full picture at a glance.
            </p>
          </div>
        </div>
      </div>

      <button
        className="btn"
        onClick={onBack}
        id="btn-rules-got-it"
        style={{ marginTop: 28, width: "100%", maxWidth: 480 }}
      >
        Got it — Let's Play!
      </button>
    </div>
  );
};
