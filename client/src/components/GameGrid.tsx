/**
 * Sweet Bonanza 1000 复刻版 - 游戏网格组件
 * 设计风格：教学型数学可视化（亮色主题）
 * 6列 × 5行 = 30个格子，使用简洁图形表示符号
 * 动画：赢的符号淡出消失，新符号从上方缓慢落下
 */

import React, { useEffect, useState } from "react";
import { GridCell, MultiplierCell, SYMBOL_MAP, GRID_COLS, GRID_ROWS } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";

interface GameGridProps {
  grid: GridCell[];
  multipliers: MultiplierCell[];
  winPositions: number[];
  currentWinSymbol: string | null;
  isSpinning: boolean;
  isFreeSpins: boolean;
  droppingPositions?: number[];
}

// 符号颜色映射（亮色背景）
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
};

interface CellProps {
  symbolId: GridCell;
  multiplier: MultiplierCell;
  isWin: boolean;
  isScatter: boolean;
  index: number;
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

  if (symbolId === null) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 flex items-center justify-center transition-opacity duration-300 opacity-30">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
      </div>
    );
  }

  const shape = SYMBOL_SHAPES[symbolId];
  const sym = SYMBOL_MAP[symbolId];

  // Calculate drop distance in % of cell height (each row = 100%)
  const dropDistance = dropRow > 0 ? dropRow * 120 : 150;

  return (
    <div
      key={`cell-${index}-${animKey}`}
      className={cn(
        "rounded border flex flex-col items-center justify-center relative select-none min-h-0",
        isWin
          ? "border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)] scale-105 z-10 animate-win-pop"
          : isScatter
          ? "border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
          : "border-slate-200",
        isSpinning && "animate-pulse",
        isDropping ? "animate-drop" : "transition-all duration-200",
      )}
      style={{
        background: shape?.bg || "rgba(248,250,252,0.95)",
        animationDelay: isDropping ? `${(index % GRID_COLS) * 40}ms` : undefined,
        // CSS custom property for drop distance
        ["--drop-distance" as string]: `-${dropDistance}%`,
      }}
    >
      {/* 符号图形 */}
      <span
        className="text-3xl leading-none select-none"
        style={{ color: shape?.color || "#64748b" }}
      >
        {shape?.shape || "?"}
      </span>

      {/* 符号名称（小字） */}
      <span className="text-[10px] font-medium text-slate-600 mt-0.5 leading-none">
        {sym?.name || symbolId}
      </span>

      {/* 乘数炸弹覆盖层 */}
      {multiplier !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-900/70 rounded">
          <div className="flex flex-col items-center">
            <span className="text-xl">💣</span>
            <span className="text-yellow-200 font-bold text-sm leading-none">
              {multiplier.value}x
            </span>
          </div>
        </div>
      )}

      {/* 获胜高亮效果 */}
      {isWin && (
        <div className="absolute inset-0 bg-yellow-300/20 rounded animate-pulse" />
      )}
    </div>
  );
};

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  multipliers,
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
    const row = Math.floor(index / GRID_COLS);
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
      style={{ overflow: "visible" }}
    >
      {/* 免费旋转标识 */}
      {isFreeSpins && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-0.5 rounded-full z-20">
          FREE SPINS
        </div>
      )}

      {/* 网格 - overflow visible to allow drop animation from above */}
      <div
        className="grid gap-0.5 flex-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          alignContent: "stretch",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
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
              isSpinning={isSpinning && symbolId === null}
              isDropping={isDropping}
              dropRow={dropRow}
            />
          );
        })}
      </div>

      {/* 列标签 */}
      <div
        className="grid gap-1 mt-1"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
      >
        {Array.from({ length: GRID_COLS }, (_, i) => (
          <div key={i} className="text-center text-[9px] text-slate-400">
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};
