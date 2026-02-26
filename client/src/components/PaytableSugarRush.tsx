/**
 * Sugar Rush 1000 – Paytable & Rules
 * Based on in‑game help screen (7×7 cluster pays with multiplier spots).
 */

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SYMBOLS,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  MAX_WIN_MULTIPLIER,
  freeSpinsForScatterCount,
} from "@/lib/gameEngineSugarRush";

type Tab = "paytable" | "rules" | "math";

const PAY_TIERS = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5] as const;
const tierLabel = (t: number) => (t === 15 ? "15+" : String(t));

export const PaytableSugarRush: React.FC = () => {
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
                ? "bg-pink-50 text-pink-600 border-b-2 border-pink-500"
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
              <span className="font-semibold text-slate-700">cluster pays</span> mechanic:
              any group of{" "}
              <span className="font-semibold text-slate-700">5 or more</span> matching symbols
              connected horizontally or vertically forms a win. Values below are shown as
              multipliers on the total bet.
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
                              v >= 200 ? "text-amber-700" : v >= 50 ? "text-orange-600" : v >= 2 ? "text-green-600" : "text-slate-600",
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
              <span className="font-bold">🍬 Scatter:</span> 3–7 Scatters anywhere on the grid trigger
              the Free Spins feature. The original help screen does not specify a separate scatter
              paytable; in this simulation scatters are purely a trigger symbol.
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-pink-600 font-bold text-sm">Basic rules</h4>
              <p>• 7 × 7 grid (49 positions).</p>
              <p>• Cluster pays: 5+ symbols connected horizontally/vertically form a winning block.</p>
              <p>
                • After each evaluation, winning clusters are removed and symbols tumble: remaining
                symbols fall down and new ones drop from above until no new wins appear.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Multiplier spots</h4>
              <p>• Whenever a winning symbol explodes it marks its spot on the grid.</p>
              <p>
                • The first hit only marks the cell; from the second hit onward the spot gains a
                multiplier that starts at <span className="font-semibold">x2</span> and doubles on
                every subsequent hit on that exact cell, up to{" "}
                <span className="font-semibold">x1024</span>.
              </p>
              <p>
                • For each winning cluster, all multiplier values under that cluster are{" "}
                <span className="font-semibold">added together</span> and applied to the cluster&apos;s
                payout. If no multipliers are present the cluster is paid at 1×.
              </p>
              <p>
                • In the base game these marked spots last only for the current tumble sequence; in
                Free Spins they persist for the whole feature and can continue to grow.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">Free spins</h4>
              <p>
                • Trigger: 3 / 4 / 5 / 6 / 7 Scatters award{" "}
                {freeSpinsForScatterCount(3)}/
                {freeSpinsForScatterCount(4)}/
                {freeSpinsForScatterCount(5)}/
                {freeSpinsForScatterCount(6)}/
                {freeSpinsForScatterCount(7)}{" "}
                free spins respectively.
              </p>
              <p>
                • During Free Spins, all marked spots and their multipliers remain on the grid between
                spins and can continue to increase when wins land on them again.
              </p>
              <p>
                • Hitting 3–7 Scatters during the feature retriggers the same number of free spins for
                the corresponding tier.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Buy feature</h4>
              <p>
                • Buy Free Spins:{" "}
                <span className="font-semibold text-amber-600">
                  {BUY_FREE_SPINS_COST}× total bet
                </span>
                .
              </p>
              <p>
                • Buy Super Free Spins (all spots start at x2):{" "}
                <span className="font-semibold text-amber-600">
                  {BUY_SUPER_FREE_SPINS_COST}× total bet
                </span>
                .
              </p>
              <p className="text-[11px] text-slate-500">
                In this project, buy features are implemented via conditional sampling: we repeatedly
                draw full RNG‑driven grids and only accept spins that naturally trigger the bonus.
              </p>
            </div>
          </div>
        )}

        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-pink-600 font-bold text-sm">Core parameters</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Theoretical RTP (base config): 96.53%.</li>
                <li>Volatility: Very High.</li>
                <li>
                  Max win per spin sequence:{" "}
                  <span className="font-semibold text-amber-600">
                    {MAX_WIN_MULTIPLIER.toLocaleString()}× bet
                  </span>
                  .
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-slate-700 font-bold text-sm">About this math model</h4>
              <p className="text-xs text-slate-600">
                The implementation mirrors the public Sugar Rush 1000 rules: 7×7 cluster pays, tumble
                feature, marked multiplier spots up to x1024, and Free Spins with persistent marks. RTP
                is controlled via a single linear scaling factor so that long‑term return can be tuned
                without changing visible rules.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

