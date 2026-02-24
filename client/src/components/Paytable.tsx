/**
 * Sweet Bonanza 1000 Replica - Paytable Component
 * Tabs: Paytable | Rules | Math Model
 */

import React, { useState } from "react";
import { getPaytable, SYMBOLS, BUY_FREE_SPINS_COST, BUY_SUPER_FREE_SPINS_COST } from "@/lib/gameEngine";
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
};

type Tab = "paytable" | "rules" | "math";

export const Paytable: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("paytable");
  const paytable = getPaytable();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-slate-200">
        {(["paytable", "rules", "math"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-orange-50 text-orange-600 border-b-2 border-orange-500"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab === "paytable" ? "Paytable" : tab === "rules" ? "Rules" : "Math Model"}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Paytable */}
        {activeTab === "paytable" && (
          <div className="space-y-1">
            <p className="text-xs text-slate-400 mb-3">
              Min. 8 matching symbols anywhere on the grid wins. Payout = multiplier × bet.
            </p>
            {paytable.map(({ symbol, pays }) => {
              const shape = SYMBOL_SHAPES[symbol.id];
              return (
                <div
                  key={symbol.id}
                  className="flex items-center gap-3 py-2 px-3 rounded bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
                >
                  <div className="w-9 h-9 flex items-center justify-center rounded border border-slate-200 bg-white shrink-0">
                    <span className="text-lg" style={{ color: shape?.color }}>
                      {shape?.shape}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 w-20 shrink-0">
                    {symbol.name}
                  </span>
                  <div className="flex gap-1 flex-nowrap ml-auto">
                    {(() => {
                      const sorted = [...pays].sort((a, b) => a.count - b.count);
                      const merged: { label: string; multiplier: number }[] = [];
                      let i = 0;
                      while (i < sorted.length) {
                        const cur = sorted[i];
                        let j = i;
                        while (j + 1 < sorted.length && sorted[j + 1].multiplier === cur.multiplier) j++;
                        const isLast = j === sorted.length - 1;
                        const startCount = cur.count;
                        const endCount = sorted[j].count;
                        let label: string;
                        if (startCount === endCount) {
                          label = isLast ? `${startCount}+` : `${startCount}`;
                        } else {
                          label = isLast ? `${startCount}+` : `${startCount}-${endCount}`;
                        }
                        merged.push({ label, multiplier: cur.multiplier });
                        i = j + 1;
                      }
                      return merged.map(({ label, multiplier }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <span className="text-xs text-slate-400">{label}</span>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              multiplier >= 100
                                ? "text-amber-600"
                                : multiplier >= 10
                                ? "text-orange-500"
                                : multiplier >= 1
                                ? "text-green-600"
                                : "text-slate-500"
                            )}
                          >
                            {multiplier}x
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              );
            })}

            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              <span className="font-bold">🍭 Scatter (Lollipop):</span>{" "}
              4=2.4x | 5=4x | 6=80x<br />
              4 or more scatters trigger <span className="text-amber-600 font-bold">10 Free Spins</span>
            </div>
          </div>
        )}

        {/* Rules */}
        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Basic Rules</h4>
              <p>• 6 columns × 5 rows = 30 cells</p>
              <p>• Symbols can appear anywhere (no paylines)</p>
              <p>• <span className="text-amber-600 font-semibold">≥ 8</span> matching symbols = win</p>
              <p>• Win = symbol multiplier × bet</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">Tumble Mechanic</h4>
              <p>• Winning symbols disappear</p>
              <p>• Symbols above fall down</p>
              <p>• New symbols fill empty cells</p>
              <p>• Continues until no new wins</p>
              <p>• No tumble limit</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Free Spins</h4>
              <p>• Trigger: 4/5/6 scatter symbols</p>
              <p>• Base: 10 free spins</p>
              <p>• Scatter payout: 4=2.4x, 5=4x, 6=80x</p>
              <p>• Retrigger: ≥3 scatters during FS = +5 spins</p>
              <p>• Multiplier bombs: 2x–1000x</p>
              <p>• Multipliers accumulate and apply to total win</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Buy Feature</h4>
              <p>• Buy Free Spins: <span className="text-amber-600 font-semibold">{BUY_FREE_SPINS_COST}× bet</span></p>
              <p>• Buy Super Free Spins: <span className="text-amber-600 font-semibold">{BUY_SUPER_FREE_SPINS_COST}× bet</span></p>
              <p>• Super FS: minimum multiplier ≥ 20x</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Ante Bet</h4>
              <p>• Bet increases by 25%</p>
              <p>• Scatter symbol frequency doubled</p>
              <p>• Buy Feature disabled</p>
            </div>
          </div>
        )}

        {/* Math Model */}
        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Core Parameters</h4>
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-white rounded p-1.5 border border-slate-200">
                  <div className="text-slate-400 text-xs">Theoretical RTP</div>
                  <div className="text-green-600 font-bold">96.53%</div>
                </div>
                <div className="bg-white rounded p-1.5 border border-slate-200">
                  <div className="text-slate-400 text-xs">Volatility</div>
                  <div className="text-red-500 font-bold">High (5/5)</div>
                </div>
                <div className="bg-white rounded p-1.5 border border-slate-200">
                  <div className="text-slate-400 text-xs">Max Win</div>
                  <div className="text-amber-600 font-bold">25,000x</div>
                </div>
                <div className="bg-white rounded p-1.5 border border-slate-200">
                  <div className="text-slate-400 text-xs">Hit Frequency</div>
                  <div className="text-blue-600 font-bold">1 in 2.33</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">Expected Value</h4>
              <p className="text-slate-500">Expected return per spin:</p>
              <p className="font-mono text-green-600">E = bet × 96.53%</p>
              <p className="text-slate-500 mt-1">Long-term per 100 units wagered:</p>
              <p className="font-mono text-amber-600">Expected loss = 3.47 units</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">Multiplier Bomb Probability</h4>
              <p>During free spins, ~8% chance per cell on refill</p>
              <p>Multiplier values (14 tiers):</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {[2,3,4,5,6,8,10,12,15,20,25,50,100,1000].map(v => (
                  <span key={v} className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-mono border",
                    v >= 500 ? "bg-amber-100 text-amber-700 border-amber-300" :
                    v >= 100 ? "bg-orange-50 text-orange-600 border-orange-200" :
                    v >= 20 ? "bg-green-50 text-green-600 border-green-200" :
                    "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {v}x
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Symbol Weights (Appearance Probability)</h4>
              <div className="space-y-0.5">
                {SYMBOLS.map(sym => {
                  const shape = SYMBOL_SHAPES[sym.id];
                  const totalWeight = SYMBOLS.reduce((s, x) => s + x.weight, 0);
                  const prob = (sym.weight / totalWeight * 100).toFixed(1);
                  return (
                    <div key={sym.id} className="flex items-center gap-2">
                      <span style={{ color: shape?.color }} className="w-4 text-center">{shape?.shape}</span>
                      <span className="text-slate-500 w-20 text-xs">{sym.name}</span>
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full bg-orange-400"
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs w-10 text-right">{prob}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
