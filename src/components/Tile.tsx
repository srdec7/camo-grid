import React from "react";
import type { TileColor } from "../types";

interface TileProps {
  x: number;
  y: number;
  color: TileColor;
  onClick: (x: number, y: number, e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Tile: React.FC<TileProps> = ({ x, y, color, onClick }) => {
  return (
    <div
      className="tile"
      style={{ backgroundColor: `var(--camo-${color})` }}
      onClick={(e) => onClick(x, y, e)}
    />
  );
};
