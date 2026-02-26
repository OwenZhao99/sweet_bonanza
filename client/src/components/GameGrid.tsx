/**
 * Sweet Bonanza 1000 Replica – Game Grid Component
 * Style: light, teaching-oriented math visualization
 * Default layout: 6 columns × 5 rows = 30 cells
 * Animations: winning symbols fade out and new symbols drop in from above
 */

import React, { useEffect, useState } from "react";
import { GridCell, MultiplierCell, SYMBOL_MAP } from "@/lib/gameEngine";
import { SYMBOL_MAP as OLYMPUS_SYMBOL_MAP } from "@/lib/gameEngineOlympus";
import type {
  GridCell as OlympusGridCell,
  MultiplierCell as OlympusMultiplierCell,
} from "@/lib/gameEngineOlympus";
import { SYMBOL_MAP as FORTUNE_SYMBOL_MAP } from "@/lib/gameEngineFortuneOlympus";
import type {
  GridCell as FortuneGridCell,
  MultiplierCell as FortuneMultiplierCell,
} from "@/lib/gameEngineFortuneOlympus";
import { SYMBOL_MAP as SUGAR_SYMBOL_MAP } from "@/lib/gameEngineSugarRush";
import type {
  GridCell as SugarGridCell,
  MultiplierSpotCell as SugarMultiplierSpotCell,
} from "@/lib/gameEngineSugarRush";
import { cn } from "@/lib/utils";

type AnyGridCell = GridCell | OlympusGridCell | FortuneGridCell | SugarGridCell;
type AnyMultiplierCell =
  | MultiplierCell
  | OlympusMultiplierCell
  | FortuneMultiplierCell
  | SugarMultiplierSpotCell
  | null;

interface GameGridProps {
  grid: AnyGridCell[];
  multipliers: AnyMultiplierCell[];
  cols: number;
  rows: number;
  winPositions: number[];
  currentWinSymbol: string | null;
  isSpinning: boolean;
  isFreeSpins: boolean;
  droppingPositions?: number[];
}

// Symbol color & background mapping (light theme)
const SYMBOL_SHAPES: Record<string, { shape: string; color: string; bg: string }> = {
  heart:      { shape: "♥",  color: "#dc2626", bg: "rgba(254,226,226,0.95)" },
  purple:     { shape: "◆",  color: "#9333ea", bg: "rgba(243,232,255,0.95)" },
  green:      { shape: "⬟",  color: "#16a34a", bg: "rgba(220,252,231,0.95)" },
  blue:       { shape: "●",  color: "#2563eb", bg: "rgba(219,234,254,0.95)" },
  apple:      { shape: "🍎", color: "#b91c1c", bg: "rgba(255,241,242,0.95)" },
  plum:       { shape: "🍑", color: "#7c3aed", bg: "rgba(245,243,255,0.95)" },
  watermelon: { shape: "🍉", color: "#059669", bg: "rgba(236,253,245,0.95)" },
  grape:      { shape: "🍇", color: "#6d28d9", bg: "rgba(245,243,255,0.95)" },
  banana:     { shape: "🍌", color: "#b45309", bg: "rgba(255,251,235,0.95)" },
  scatter:    { shape: "🍭", color: "#ea580c", bg: "rgba(255,247,237,0.95)" },
  // Olympus
  crown:      { shape: "👑", color: "#facc15", bg: "rgba(254,249,195,0.95)" },
  hourglass:  { shape: "⌛", color: "#fb923c", bg: "rgba(255,237,213,0.95)" },
  ring:       { shape: "💍", color: "#fbbf24", bg: "rgba(254,249,195,0.95)" },
  chalice:    { shape: "🏆", color: "#22c55e", bg: "rgba(220,252,231,0.95)" },
  red:        { shape: "♦",  color: "#ef4444", bg: "rgba(254,226,226,0.95)" },
  yellow:     { shape: "⬡",  color: "#facc15", bg: "rgba(254,249,195,0.95)" },
  // Fortune
  lightning:  { shape: "⚡", color: "#60a5fa", bg: "rgba(219,234,254,0.95)" },
  helmet:     { shape: "🪖", color: "#fb923c", bg: "rgba(255,237,213,0.95)" },
  // purple already exists
  // green/blue already exist
  // Sugar Rush 1000
  pink_ball:    { shape: "🍬", color: "#fb7185", bg: "rgba(254,242,242,0.95)" },
  orange_bean:  { shape: "🍊", color: "#fb923c", bg: "rgba(255,247,237,0.95)" },
  purple_bean:  { shape: "🍇", color: "#a855f7", bg: "rgba(245,243,255,0.95)" },
  green_star:   { shape: "⭐", color: "#22c55e", bg: "rgba(240,253,244,0.95)" },
  red_bear:     { shape: "🧸", color: "#ef4444", bg: "rgba(254,226,226,0.95)" },
  purple_bear:  { shape: "🧸", color: "#c084fc", bg: "rgba(245,243,255,0.95)" },
  orange_bear:  { shape: "🧸", color: "#f97316", bg: "rgba(255,237,213,0.95)" },
};

interface CellProps {
  symbolId: AnyGridCell;
  multiplier: AnyMultiplierCell;
  isWin: boolean;
  isScatter: boolean;
  index: number;
  cols: number;
  isSpinning: boolean;
  isDropping: boolean;
  dropRow: number;
}

const Cell: React.FC<CellProps> = ({
  symbolId,
  multiplier,
  isWin,
  isScatter,
  index,
  cols,
  isSpinning,
  isDropping,
  dropRow,
}) => {
  // Use a counter to force re-render and re-trigger animation
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isDropping) {
      setAnimKey((k) => k + 1);
    }
  }, [isDropping]);

  const hasMultiplier = multiplier !== null;

  if (symbolId === null && !hasMultiplier) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 flex items-center justify-center transition-opacity duration-300 opacity-30">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
      </div>
    );
  }

  const shape = symbolId ? SYMBOL_SHAPES[symbolId] : undefined;
  const sym = symbolId
    ? (SYMBOL_MAP as any)[symbolId] ||
      (OLYMPUS_SYMBOL_MAP as any)[symbolId] ||
      (FORTUNE_SYMBOL_MAP as any)[symbolId] ||
      (SUGAR_SYMBOL_MAP as any)[symbolId]
    : null;

  // Calculate drop distance in % of cell height (each row = 100%)
  const dropDistance = dropRow > 0 ? dropRow * 120 : 150;

  return (
    <div
      key={`cell-${index}-${animKey}`}
      className={cn(
        "rounded border flex flex-col items-center justify-center relative select-none min-h-0",
        isWin
          ? "border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)] z-10 animate-win-pop"
          : isScatter
          ? "border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
          : "border-slate-200",
        isSpinning && "animate-pulse",
        isDropping ? "animate-drop" : "transition-all duration-200",
      )}
      style={{
        background: hasMultiplier ? "rgba(120,53,15,0.10)" : shape?.bg || "rgba(248,250,252,0.95)",
        animationDelay: isDropping ? `${(index % cols) * 40}ms` : undefined,
        // CSS custom property for drop distance
        ["--drop-distance" as string]: `-${dropDistance}%`,
      }}
    >
      {!hasMultiplier && (
        <>
          {/* Symbol glyph */}
          <span
            className="text-3xl leading-none select-none"
            style={{ color: shape?.color || "#64748b" }}
          >
            {shape?.shape || "?"}
          </span>

          {/* Symbol name (small label) */}
          <span className="text-[10px] font-medium text-slate-600 mt-0.5 leading-none">
            {sym?.name || symbolId}
          </span>
        </>
      )}

      {hasMultiplier && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-900/70 rounded">
          <div className="flex flex-col items-center">
            <span className="text-xl">💣</span>
            <span className="text-yellow-200 font-bold text-sm leading-none">
              {multiplier!.value}x
            </span>
          </div>
        </div>
      )}

      {/* Winning highlight overlay */}
      {isWin && (
        <div className="absolute inset-0 bg-yellow-300/20 rounded animate-pulse" />
      )}
    </div>
  );
};

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  multipliers,
  cols,
  rows,
  winPositions,
  currentWinSymbol,
  isSpinning,
  isFreeSpins,
  droppingPositions = [],
}) => {
  const winSet = new Set(winPositions);
  const dropSet = new Set(droppingPositions);

  // Calculate how many rows each dropping cell falls from
  const getDropRow = (index: number): number => {
    if (!dropSet.has(index)) return 0;
    const row = Math.floor(index / cols);
    // Cells higher up in the column drop from further away
    return row + 1;
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-1 w-full h-full flex flex-col",
        isFreeSpins
          ? "border-yellow-400 bg-gradient-to-b from-yellow-50 to-amber-50 shadow-[0_0_20px_rgba(234,179,8,0.25)]"
          : "border-slate-200 bg-white shadow-sm"
      )}
      style={{ overflow: "hidden" }}
    >
      {/* Free spins indicator */}
      {isFreeSpins && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-0.5 rounded-full z-20">
          FREE SPINS
        </div>
      )}

      {/* Grid – overflow hidden while still allowing drop animation above the board */}
      <div
        className="grid gap-0.5 flex-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          alignContent: "stretch",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const symbolId = grid[i] || null;
          const multiplier = multipliers[i] || null;
          const isWin = winSet.has(i);
          const isScatter = symbolId === "scatter";
          const isDropping = dropSet.has(i);
          const dropRow = getDropRow(i);

          return (
            <Cell
              key={i}
              symbolId={symbolId}
              multiplier={multiplier}
              isWin={isWin}
              isScatter={isScatter}
              index={i}
              cols={cols}
              isSpinning={isSpinning && symbolId === null}
              isDropping={isDropping}
              dropRow={dropRow}
            />
          );
        })}
      </div>

      {/* Column labels */}
      <div
        className="grid gap-1 mt-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="text-center text-[9px] text-slate-400">
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};
