/**
 * Sweet Bonanza 1000 Replica - Spin Info Component
 * Displays current spin details, tumble steps, and win calculations
 */

import React from "react";
import { TumbleStep, SYMBOL_MAP } from "@/lib/gameEngine";
import { SYMBOL_MAP as OLYMPUS_SYMBOL_MAP } from "@/lib/gameEngineOlympus";
import type { TumbleStep as OlympusTumbleStep } from "@/lib/gameEngineOlympus";
import { GamePhase } from "@/hooks/useSlotGame";
import { cn } from "@/lib/utils";

const SYMBOL_SHAPES: Record<string, { shape: string; color: string }> = {
  heart:      { shape: "♥", color: "#dc2626" },
  purple:     { shape: "◆", color: "#9333ea" },
  green:      { shape: "⬟", color: "#16a34a" },
  blue:       { shape: "●", color: "#2563eb" },
  apple:      { shape: "🍎", color: "#b91c1c" },
  plum:       { shape: "🍑", color: "#7c3aed" },
  watermelon: { shape: "🍉", color: "#059669" },
  grape:      { shape: "🍇", color: "#6d28d9" },
  banana:     { shape: "🍌", color: "#b45309" },
  scatter:    { shape: "🍭", color: "#ea580c" },
  crown:      { shape: "👑", color: "#facc15" },
  hourglass:  { shape: "⌛", color: "#fb923c" },
  ring:       { shape: "💍", color: "#fbbf24" },
  chalice:    { shape: "🏆", color: "#22c55e" },
  red:        { shape: "♦", color: "#ef4444" },
  yellow:     { shape: "⬡", color: "#facc15" },
};

interface SpinInfoProps {
  phase: GamePhase;
  message: string;
  currentTumbleStep: TumbleStep | OlympusTumbleStep | null;
  currentTumbleIndex: number;
  spinWin: number;
  spinWinMultiplier: number;
  bet: number;
  isFreeSpins: boolean;
  lastScatterCount: number;
  lastScatterPayout: number;
}

export const SpinInfo: React.FC<SpinInfoProps> = ({
  phase,
  message,
  currentTumbleStep,
  currentTumbleIndex,
  spinWin,
  spinWinMultiplier,
  bet,
  isFreeSpins,
  lastScatterCount,
  lastScatterPayout,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 h-[200px] overflow-y-auto shadow-sm">
      {/* Status message */}
      <div className={cn(
        "text-sm font-medium text-center py-1 px-3 rounded-lg",
        phase === "tumbling" ? "bg-blue-50 text-blue-700 border border-blue-200" :
        phase === "bonus_trigger" ? "bg-yellow-50 text-amber-700 border border-yellow-300 animate-pulse" :
        phase === "free_spins_end" ? "bg-green-50 text-green-700 border border-green-200" :
        spinWin > 0 ? "bg-green-50 text-green-700 border border-green-200" :
        "bg-slate-50 text-slate-500 border border-slate-200"
      )}>
        {message}
      </div>

      {/* Tumble step details */}
      {phase === "tumbling" && currentTumbleStep && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
            Tumble #{currentTumbleIndex + 1} Details
          </div>

          <div className="space-y-1">
            {currentTumbleStep.wins.map((win, i) => {
              const shape = SYMBOL_SHAPES[win.symbolId];
                  const sym = (SYMBOL_MAP as any)[win.symbolId] || (OLYMPUS_SYMBOL_MAP as any)[win.symbolId];
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1 border border-slate-100"
                >
                  <span style={{ color: shape?.color }} className="text-base">
                    {shape?.shape}
                  </span>
                  <span className="text-[10px] text-slate-600">{sym?.name}</span>
                  <span className="text-[10px] text-slate-400">×{win.count}</span>
                  <span className="ml-auto text-[11px] font-mono font-bold text-green-600">
                    +{win.payout.toFixed(2)}x
                  </span>
                </div>
              );
            })}
          </div>

          {/* Multiplier calculation (free spins) */}
              {isFreeSpins && (currentTumbleStep as any).multiplierTotal > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <div className="text-[10px] text-amber-600 mb-1">Multiplier Bomb Calculation</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-mono">
                  {currentTumbleStep.payout.toFixed(2)}x
                </span>
                <span className="text-slate-400">×</span>
                <span className="text-amber-600 font-mono font-bold">
                      {(currentTumbleStep as any).multiplierTotal}x
                </span>
                <span className="text-slate-400">=</span>
                <span className="text-green-600 font-mono font-bold">
                      {(currentTumbleStep.payout * (currentTumbleStep as any).multiplierTotal).toFixed(2)}x
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spin result summary */}
      {(phase === "result" || phase === "idle") && spinWin > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="text-[10px] text-green-600 mb-1">Spin Result</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">Win Multiplier</span>
            <span className="text-amber-600 font-bold font-mono">
              {spinWinMultiplier.toFixed(2)}x
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-slate-500 text-xs">Win Amount</span>
            <span className="text-green-600 font-bold font-mono">
              +{spinWin.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Free spins trigger notification */}
      {phase === "bonus_trigger" && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-center">
          <div className="text-amber-700 font-bold text-sm">
            🍭 × {lastScatterCount} — Free Spins Triggered!
          </div>
          {lastScatterPayout > 0 && (
            <div className="text-amber-500 text-xs mt-1">
              Scatter payout: {lastScatterPayout.toFixed(2)}x
            </div>
          )}
        </div>
      )}
    </div>
  );
};
