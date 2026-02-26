/**
 * Fortune of Olympus - Paytable & Rules
 * Shows official-style parameters (payout values are expressed as “table value × base bet”).
 */

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SYMBOLS,
  MULTIPLIER_VALUES,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  MAX_WIN_MULTIPLIER,
  freeSpinsForScatterCount,
} from "@/lib/gameEngineFortuneOlympus";

type Tab = "paytable" | "rules" | "math";

const PAY_TIERS = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5] as const;
const tierLabel = (t: number) => (t === 15 ? "15-49" : String(t));

export const PaytableFortuneOlympus: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("paytable");

  const paySymbols = useMemo(() => SYMBOLS.filter((s) => s.id !== "scatter"), []);

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
                ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab === "paytable" ? "Paytable" : tab === "rules" ? "Rules" : "Math Notes"}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === "paytable" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Symbols use a{" "}
              <span className="font-semibold text-slate-700">cluster pays</span> mechanic: any group of{" "}
              <span className="font-semibold text-slate-700">5 or more</span> matching symbols
              connected horizontally or vertically forms a win. Help‑screen values are expressed as{" "}
              <span className="font-semibold">coin wins</span>; actual cash win in this model is
              table value × <span className="font-semibold">Base Bet</span> (total bet = Base Bet ×
              Bet Multiplier).
            </p>

            <div className="grid grid-cols-1 gap-2">
              {paySymbols.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                      <span className="text-xl" style={{ color: s.color }}>
                        {s.emoji}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700">{s.name}</div>
                      <div className="text-[10px] text-slate-400">Cluster pays (min 5)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {PAY_TIERS.map((t) => {
                      const v = s.pays[t] ?? 0;
                      return (
                        <div
                          key={t}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <span className="text-[10px] text-slate-400 font-mono">{tierLabel(t)}</span>
                          <span
                            className={cn(
                              "text-[10px] font-mono font-bold",
                              v >= 100 ? "text-amber-700" : v >= 10 ? "text-orange-600" : v >= 2 ? "text-green-600" : "text-slate-600",
                            )}
                          >
                            {v}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <span className="font-bold">🧙 Scatter:</span> 4–7 Scatters anywhere on the grid trigger
              the Free Spins feature (the original help screen does not specify a fixed scatter
              paytable for this game).
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">Basic rules</h4>
              <p>• 7 × 7 grid.</p>
              <p>• Cluster pays: 5+ symbols connected horizontally/vertically form a winning cluster.</p>
              <p>
                • After each evaluation, winning clusters are removed and symbols tumble: symbols above
                fall down and new symbols are spawned from the top until no new clusters form.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Multiplier symbols</h4>
              <p>• Multiplier symbols can appear in both base game and free spins, including during tumbles.</p>
              <p>
                • When the tumble sequence for a spin ends, all multiplier values on the grid are added
                together and the total win for the spin is multiplied by that sum.
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {MULTIPLIER_VALUES.map((v) => (
                  <span
                    key={v}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                      v >= 250 ? "bg-amber-100 text-amber-800 border-amber-300" :
                      v >= 50  ? "bg-orange-50 text-orange-700 border-orange-200" :
                                 "bg-slate-100 text-slate-600 border-slate-200",
                    )}
                  >
                    {v}×
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">Free spins</h4>
              <p>
                • Trigger: 4/5/6/7 Scatters award{" "}
                {freeSpinsForScatterCount(4)}/{freeSpinsForScatterCount(5)}/
                {freeSpinsForScatterCount(6)}/{freeSpinsForScatterCount(7)} free spins respectively.
              </p>
              <p>• Additional 4–7 Scatters during the feature retrigger the same tier of free spins.</p>
              <p>
                • Free spins use a “cumulative total multiplier”: when multiplier symbols hit,
                their values are added to a running total that is applied to current and subsequent wins.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Special Bets & Buy Feature</h4>
              <p>• Normal: bet multiplier 20×.</p>
              <p>• Ante 1: 40×, free‑spin trigger chance ×5.</p>
              <p>• Ante 2: 140×, free‑spin trigger chance ×5; minimum multiplier value 5× during FS.</p>
              <p>• Super 1: 200×, guarantees at least one multiplier each spin; Free Spins cannot trigger.</p>
              <p>
                • Super 2: 5000×, guarantees at least one multiplier each spin with minimum 50×; Free
                Spins cannot trigger.
              </p>
              <div className="mt-2 text-[11px] text-slate-500">
                Buy Free Spins: {BUY_FREE_SPINS_COST}× total bet. Buy Super FS:{" "}
                {BUY_SUPER_FREE_SPINS_COST}× total bet (minimum FS multiplier 5×).
              </div>
            </div>
          </div>
        )}

        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">Core parameters (help-screen values)</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Theoretical RTP: 96.55%</li>
                <li>Volatility: High</li>
                <li>
                  Max win:
                  <span className="font-semibold text-amber-600">
                    {" "}
                    {MAX_WIN_MULTIPLIER.toLocaleString()}× bet
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded p-2 space-y-1 border border-emerald-200">
              <h4 className="text-emerald-700 font-bold text-sm">About this project&apos;s math model</h4>
              <p className="text-xs text-slate-600">
                This implementation follows a simulation‑first approach (symbol weights, probability
                knobs, RTP scaling). Because no official PAR sheet is available, trigger frequencies and
                distributions may differ from the production game, but rule semantics and parameter
                structure are kept aligned so that further fitting and calibration can be done.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

