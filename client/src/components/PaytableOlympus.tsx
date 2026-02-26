/**
 * Gates of Olympus 1000 - Paytable & Rules
 * Shows official-style rules and payouts; does not alter the local math engine.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "paytable" | "rules" | "math";

interface OlympusSymbol {
  id: string;
  name: string;
  shape: string;
  color: string;
  pays: {
    "12+": number;
    "10-11": number;
    "8-9": number;
  };
}

// Values based on Pragmatic public documentation and game screenshots, expressed as multipliers (× total bet)
const OLYMPUS_SYMBOLS: OlympusSymbol[] = [
  {
    id: "crown",
    name: "Crown",
    shape: "👑",
    color: "#facc15",
    pays: { "12+": 50, "10-11": 25, "8-9": 10 },
  },
  {
    id: "hourglass",
    name: "Hourglass",
    shape: "⌛",
    color: "#f97316",
    pays: { "12+": 25, "10-11": 10, "8-9": 2.5 },
  },
  {
    id: "ring",
    name: "Ring",
    shape: "💍",
    color: "#eab308",
    pays: { "12+": 15, "10-11": 5, "8-9": 2 },
  },
  {
    id: "chalice",
    name: "Chalice",
    shape: "🏆",
    color: "#22c55e",
    pays: { "12+": 12, "10-11": 2, "8-9": 1.5 },
  },
  {
    id: "red-gem",
    name: "Red Gem",
    shape: "♦",
    color: "#ef4444",
    pays: { "12+": 10, "10-11": 1.5, "8-9": 1 },
  },
  {
    id: "purple-gem",
    name: "Purple Gem",
    shape: "⬢",
    color: "#a855f7",
    pays: { "12+": 8, "10-11": 1.2, "8-9": 0.8 },
  },
  {
    id: "yellow-gem",
    name: "Yellow Gem",
    shape: "⬡",
    color: "#facc15",
    pays: { "12+": 5, "10-11": 1, "8-9": 0.5 },
  },
  {
    id: "green-gem",
    name: "Green Gem",
    shape: "⬢",
    color: "#22c55e",
    pays: { "12+": 4, "10-11": 0.9, "8-9": 0.4 },
  },
  {
    id: "blue-gem",
    name: "Blue Gem",
    shape: "⬢",
    color: "#3b82f6",
    pays: { "12+": 2, "10-11": 0.75, "8-9": 0.25 },
  },
];

export const PaytableOlympus: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("paytable");

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
        {/* Paytable */}
        {activeTab === "paytable" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Symbols use a “pays anywhere / scatter pays” mechanic:
              <span className="font-semibold text-slate-700">
                {" "}
                8 or more of the same symbol on the 6×5 grid award a win
              </span>
              , with payout equal to the table multiplier × total bet.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 border border-slate-200">Symbol</th>
                    <th className="text-center p-2 border border-slate-200">12 – 30</th>
                    <th className="text-center p-2 border border-slate-200">10 – 11</th>
                    <th className="text-center p-2 border border-slate-200">8 – 9</th>
                  </tr>
                </thead>
                <tbody>
                  {OLYMPUS_SYMBOLS.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center bg-white">
                            <span className="text-lg" style={{ color: s.color }}>
                              {s.shape}
                            </span>
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{s.name}</span>
                        </div>
                      </td>
                      {["12+", "10-11", "8-9"].map((tier) => (
                        <td
                          key={tier}
                          className="p-2 border border-slate-200 text-center font-mono"
                        >
                          <span
                            className={cn(
                              "text-xs font-bold",
                              s.pays[tier as keyof OlympusSymbol["pays"]] >= 25
                                ? "text-amber-600"
                                : s.pays[tier as keyof OlympusSymbol["pays"]] >= 10
                                ? "text-orange-500"
                                : s.pays[tier as keyof OlympusSymbol["pays"]] >= 2
                                ? "text-green-600"
                                : "text-slate-600",
                            )}
                          >
                            {s.pays[tier as keyof OlympusSymbol["pays"]]}x
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Scatter row */}
                  <tr className="bg-purple-50">
                    <td className="p-2 border border-slate-200 font-medium text-purple-700">
                      🧙 Zeus Scatter
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      6 = 100x
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      5 = 5x
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      4 = 3x
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
              These values mirror Pragmatic Play&apos;s published paytable and are shown for reference
              only. The local simulation still uses the Sweet Bonanza 1000–style math engine for
              teaching and visualization purposes.
            </div>
          </div>
        )}

        {/* Rules */}
        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">Basic rules</h4>
              <p>• 6 columns × 5 rows, 30 positions.</p>
              <p>• No paylines; symbols pay “anywhere” using scatter‑pays logic.</p>
              <p>
                • A symbol appearing{" "}
                <span className="font-semibold text-emerald-700">8 or more times</span> awards a win.
              </p>
              <p>• Payout = table multiplier × total bet.</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">Tumble feature</h4>
              <p>• After each win, winning symbols are removed from the grid.</p>
              <p>• Symbols above fall down to fill empty spaces; new symbols are spawned from the top.</p>
              <p>• As long as new winning combinations form, tumbling continues.</p>
              <p>• There is no hard limit on the number of tumbles per spin.</p>
              <p>• After all tumbles finish, the total win for the spin is added to the balance.</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">Multiplier symbols</h4>
              <p>• Multiplier orbs can appear randomly in both base game and Free Spins.</p>
              <p>
                • Each orb has a random value{" "}
                <span className="font-semibold text-amber-700">2x – 1000x</span>.
              </p>
              <p>• When the tumble sequence for a spin ends, all orb values on screen are added.</p>
              <p>• The spin&apos;s total win is then multiplied by this combined multiplier.</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">Free spins</h4>
              <p>• 4/5/6 Zeus Scatters anywhere trigger the Free Spins feature.</p>
              <p>• The trigger spin immediately pays 3x / 5x / 100x total bet.</p>
              <p>
                • Free Spins start with <span className="font-semibold text-purple-700">15 spins</span>.
              </p>
              <p>
                • During Free Spins, 3 or more Scatters add{" "}
                <span className="font-semibold">+5 extra spins</span>.
              </p>
              <p>
                • Free Spins maintain a <strong>cumulative total multiplier</strong>; when multiplier
                orbs participate in a win, their values are added to this total.
              </p>
              <p>
                • On any winning Free Spin, the sum of current orbs plus the accumulated total is applied
                to that spin&apos;s win amount.
              </p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Ante Bet / Buy Free Spins</h4>
              <p>
                • <span className="font-semibold">Ante Bet</span>: bet amount +25%, Scatter frequency
                increased; Buy Feature is disabled.
              </p>
              <p>
                • <span className="font-semibold">Buy Free Spins</span>: pay{" "}
                <span className="font-semibold text-emerald-700">100x total bet</span> to trigger Free
                Spins directly (with at least 4 Scatters).
              </p>
            </div>
          </div>
        )}

        {/* Math notes */}
        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">Core parameters (official)</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  Theoretical RTP:
                  <span className="font-semibold text-green-700"> 96.50% </span>
                  (base game & Ante Bet)
                </li>
                <li>
                  RTP when using Buy Free Spins:
                  <span className="font-semibold text-green-700"> 96.49%</span>
                </li>
                <li>
                  Volatility: <span className="font-semibold text-red-600">High</span>
                </li>
                <li>
                  Maximum single spin win:
                  <span className="font-semibold text-amber-600"> 15,000x total bet</span>
                </li>
                <li>Official hit frequency is about 28.57% (roughly 1 in 3.5 spins pays any win).</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">Relation to this simulation</h4>
              <p className="text-xs text-slate-600">
                The current code-level math engine is still based on Sweet Bonanza 1000, with UI and copy
                adapted to resemble Gates of Olympus 1000.
                If you later need a <strong>fully 1:1 replicated</strong> version of the Gates of Olympus
                1000 math model, you can:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs mt-1">
                <li>Implement separate symbol weights and paytable (SYMBOLS / pays) for Gates of Olympus.</li>
                <li>Reuse the existing tumble / multiplier / free‑spins framework, only swapping constants and distributions.</li>
                <li>Run long Monte Carlo simulations (≥ 1,000,000 spins) to verify realized RTP.</li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded p-2 space-y-1 border border-emerald-200">
              <h4 className="text-emerald-700 font-bold text-sm">Expected value intuition</h4>
              <p className="text-xs text-slate-600">
                With an official RTP of 96.50%, in the long run every 100 units wagered are expected to
                return 96.5 units on average, for an expected loss of 3.5 units.
                High volatility means short‑term outcomes may deviate dramatically from this average,
                with a large share of return concentrated in Free Spins and high multipliers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

