import React, { useRef, useState, useEffect, useCallback } from "react";
import type { TileColor } from "../types";
import { Tile } from "./Tile";

interface BoardProps {
  boardData: TileColor[][];
  onTileTap: (x: number, y: number, e: React.MouseEvent<HTMLDivElement>) => void;
  magnified: boolean;
  defectZone: { x: number; y: number; width: number; height: number };
  theme: string;
  isCleared?: boolean;
  isLost?: boolean;
  targetPatch?: TileColor[][];
  clearedZone?: { x: number; y: number; width: number; height: number };
}

export const Board: React.FC<BoardProps> = ({ boardData, onTileTap, magnified, defectZone, theme, isCleared, isLost, targetPatch, clearedZone }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  const height = boardData.length;
  const width = height > 0 ? boardData[0].length : 0;
  
  const TILE_SIZE = 25;
  const GAP_SIZE = 2;
  const BOARD_PADDING = 8;
  const boardWidthPx = width > 0 ? width * TILE_SIZE + (width - 1) * GAP_SIZE + BOARD_PADDING * 2 : 0;
  const boardHeightPx = height > 0 ? height * TILE_SIZE + (height - 1) * GAP_SIZE + BOARD_PADDING * 2 : 0;

  // Limits
  const minScaleRef = useRef(0.2);
  const MAX_SCALE = 5;

  const clampPosition = useCallback((x: number, y: number, s: number) => {
    if (!containerRef.current) return { x, y };
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    // allow panning so at least 50px of the board is visible
    const margin = 50;
    const bw = boardWidthPx * s;
    const bh = boardHeightPx * s;

    const minX = -bw + margin;
    const maxX = cw - margin;
    const minY = -bh + margin;
    const maxY = ch - margin;

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }, [boardWidthPx, boardHeightPx]);

  const zoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    const scaleX = cw / boardWidthPx;
    const scaleY = ch / boardHeightPx;
    const fitScale = Math.min(scaleX, scaleY) * 0.9; // 10% margin
    const clampedScale = Math.max(0.2, Math.min(fitScale, 1.5));
    minScaleRef.current = clampedScale; // Set the dynamic minimum scale to the initial fit scale
    
    const x = (cw - boardWidthPx * clampedScale) / 2;
    // Shift slightly upward (using 0.10 multiplier to move it higher)
    const y = Math.max(8, (ch - boardHeightPx * clampedScale) * 0.10);
    
    setPosition({ x, y });
    setScale(clampedScale);
  }, [boardWidthPx, boardHeightPx]);

  // Initial mount
  useEffect(() => {
    zoomToFit();
  }, [width, height, zoomToFit]);

  // Handle programmatic magnification
  useEffect(() => {
    if (!containerRef.current) return;
    if (magnified) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const targetScale = 1.6;
      
      const defectCenterX = BOARD_PADDING + defectZone.x * (TILE_SIZE + GAP_SIZE) + (defectZone.width * TILE_SIZE + (defectZone.width - 1) * GAP_SIZE) / 2;
      const defectCenterY = BOARD_PADDING + defectZone.y * (TILE_SIZE + GAP_SIZE) + (defectZone.height * TILE_SIZE + (defectZone.height - 1) * GAP_SIZE) / 2;
      
      const targetX = cw / 2 - defectCenterX * targetScale;
      const targetY = ch / 2 - defectCenterY * targetScale;
      
      setIsAnimating(true);
      setPosition(clampPosition(targetX, targetY, targetScale));
      setScale(targetScale);
      
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      zoomToFit();
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [magnified, defectZone, zoomToFit, clampPosition]);

  const dragState = useRef({ startX: 0, startY: 0, isDragging: false });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const initialPinchDist = useRef<number | null>(null);
  const initialScale = useRef<number>(1);
  const initialPosition = useRef({ x: 0, y: 0 });
  const initialPinchCenter = useRef({ x: 0, y: 0 });

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      dragState.current = { startX: e.clientX, startY: e.clientY, isDragging: false };
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      initialPinchDist.current = getDistance(pts[0], pts[1]);
      initialScale.current = scale;
      initialPosition.current = position;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const center = getCenter(pts[0], pts[1]);
        initialPinchCenter.current = {
          x: center.x - rect.left,
          y: center.y - rect.top
        };
      }
      dragState.current.isDragging = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      if (e.buttons !== 1 && e.pointerType === 'mouse') return;
      
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      
      // Only mark as dragging (and pan) when zoomed in beyond minimum scale.
      // At fit-to-screen scale, single-finger moves are treated as taps, not drags.
      const isZoomedIn = scale > minScaleRef.current + 0.01;

      if (isZoomedIn && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.current.isDragging = true;
      }

      if (dragState.current.isDragging && isZoomedIn) {
        setPosition(prev => clampPosition(prev.x + e.movementX, prev.y + e.movementY, scale));
      }
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const currentDist = getDistance(pts[0], pts[1]);
      if (initialPinchDist.current && containerRef.current) {
        const scaleFactor = currentDist / initialPinchDist.current;
        let newScale = initialScale.current * scaleFactor;
        newScale = Math.min(Math.max(minScaleRef.current, newScale), MAX_SCALE);
        
        // Focal point zoom math
        const px = initialPinchCenter.current.x;
        const py = initialPinchCenter.current.y;
        
        const boardX = (px - initialPosition.current.x) / initialScale.current;
        const boardY = (py - initialPosition.current.y) / initialScale.current;
        
        // Current center position of pinch to allow panning while zooming
        const rect = containerRef.current.getBoundingClientRect();
        const currentCenter = getCenter(pts[0], pts[1]);
        const currentPx = currentCenter.x - rect.left;
        const currentPy = currentCenter.y - rect.top;

        const newX = currentPx - boardX * newScale;
        const newY = currentPy - boardY * newScale;
        
        setScale(newScale);
        setPosition(clampPosition(newX, newY, newScale));
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      initialPinchDist.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const zoomSensitivity = 0.002;
    let newScale = scale * (1 - e.deltaY * zoomSensitivity);
    newScale = Math.min(Math.max(minScaleRef.current, newScale), MAX_SCALE);
    
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    const boardX = (px - position.x) / scale;
    const boardY = (py - position.y) / scale;
    
    const newX = px - boardX * newScale;
    const newY = py - boardY * newScale;
    
    setScale(newScale);
    setPosition(clampPosition(newX, newY, newScale));
  };

  return (
    <div
      className={`board-container theme-${theme}`}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        className={`board ${isAnimating ? "animating" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${width}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${height}, ${TILE_SIZE}px)`,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        {/* Hint Highlight Overlay — 2-tile padding around the real defect zone */}
        {magnified && (() => {
          const HINT_PAD = 2; // tiles of extra padding
          const hx = Math.max(0, defectZone.x - HINT_PAD);
          const hy = Math.max(0, defectZone.y - HINT_PAD);
          const hw = (defectZone.width  + HINT_PAD * 2) * TILE_SIZE + (defectZone.width  + HINT_PAD * 2 - 1) * GAP_SIZE;
          const hh = (defectZone.height + HINT_PAD * 2) * TILE_SIZE + (defectZone.height + HINT_PAD * 2 - 1) * GAP_SIZE;
          return (
            <div
              className="defect-highlight"
              style={{
                left:   BOARD_PADDING + hx * (TILE_SIZE + GAP_SIZE) - 2,
                top:    BOARD_PADDING + hy * (TILE_SIZE + GAP_SIZE) - 2,
                width:  hw + 4,
                height: hh + 4,
              }}
            />
          );
        })()}
        
        {/* Win Clear Highlight Overlay */}
        {isCleared && (() => {
          const cz = clearedZone || defectZone;
          return (
            <div 
              className="clear-highlight"
              style={{
                left: BOARD_PADDING + cz.x * (TILE_SIZE + GAP_SIZE) - 4,
                top: BOARD_PADDING + cz.y * (TILE_SIZE + GAP_SIZE) - 4,
                width: cz.width * TILE_SIZE + (cz.width - 1) * GAP_SIZE + 8,
                height: cz.height * TILE_SIZE + (cz.height - 1) * GAP_SIZE + 8
              }}
            />
          );
        })()}
        
        {/* Lost: Red highlight showing WHERE the defect was */}
        {isLost && (
          <div
            className="lost-highlight"
            style={{
              left:   BOARD_PADDING + defectZone.x * (TILE_SIZE + GAP_SIZE) - 4,
              top:    BOARD_PADDING + defectZone.y * (TILE_SIZE + GAP_SIZE) - 4,
              width:  defectZone.width  * TILE_SIZE + (defectZone.width  - 1) * GAP_SIZE + 8,
              height: defectZone.height * TILE_SIZE + (defectZone.height - 1) * GAP_SIZE + 8,
            }}
          />
        )}

        {/* Lost: Ghost tiles showing WHAT the answer should have been */}
        {isLost && targetPatch && targetPatch.map((row, dy) =>
          row.map((color, dx) => (
            <div
              key={`ghost-${dx}-${dy}`}
              className={`ghost-tile theme-${theme}`}
              style={{
                left: BOARD_PADDING + (defectZone.x + dx) * (TILE_SIZE + GAP_SIZE),
                top:  BOARD_PADDING + (defectZone.y + dy) * (TILE_SIZE + GAP_SIZE),
                width:  TILE_SIZE,
                height: TILE_SIZE,
                backgroundColor: `var(--camo-${color})`,
              }}
            />
          ))
        )}

        {boardData.map((row, y) =>
          row.map((color, x) => (
            <Tile
              key={`${x}-${y}`}
              x={x}
              y={y}
              color={color}
              onClick={(tx, ty, e) => {
                if (!dragState.current.isDragging) {
                   onTileTap(tx, ty, e);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
