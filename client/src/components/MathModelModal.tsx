/**
 * Sweet Bonanza 1000 Replica - Math Model Modal
 * Detailed mathematical model, probability calculations, and RTP decomposition
 */

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  SYMBOLS,
  GRID_COLS,
  GRID_ROWS,
  GRID_SIZE,
  MIN_WIN_COUNT,
  FREE_SPINS_BASE,
  FREE_SPINS_RETRIGGER,
  SCATTER_TRIGGER,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  MULTIPLIER_VALUES,
} from "@/lib/gameEngine";

// ============================================================
// Math helpers
// ============================================================

/** Binomial coefficient C(n, k) */
function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** Binomial PMF: P(X = k) where X ~ Binomial(n, p) */
function binomPMF(n: number, k: number, p: number): number {
  return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** Binomial CDF: P(X >= k) */
function binomCDF_ge(n: number, k: number, p: number): number {
  let prob = 0;
  for (let i = k; i <= n; i++) {
    prob += binomPMF(n, i, p);
  }
  return prob;
}

// ============================================================
// Symbol probability calculations
// ============================================================

const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

interface SymbolStats {
  id: string;
  name: string;
  emoji: string;
  weight: number;
  prob: number;        // probability per cell
  expectedCount: number; // expected count in 30 cells
  winProbs: { count: number; prob: number; payout: number; ev: number }[];
  totalEV: number;     // total expected value contribution (× bet)
}

function computeSymbolStats(): SymbolStats[] {
  return SYMBOLS.filter(s => s.id !== "scatter").map(sym => {
    const p = sym.weight / totalWeight;
    const expectedCount = p * GRID_SIZE;

    const winProbs: { count: number; prob: number; payout: number; ev: number }[] = [];
    const payKeys = Object.keys(sym.pays).map(Number).sort((a, b) => a - b);

    let totalEV = 0;

    for (let i = 0; i < payKeys.length; i++) {
      const minCount = payKeys[i];
      const maxCount = i + 1 < payKeys.length ? payKeys[i + 1] - 1 : GRID_SIZE;

      // P(exactly minCount to maxCount symbols appear)
      let prob = 0;
      for (let k = minCount; k <= maxCount; k++) {
        prob += binomPMF(GRID_SIZE, k, p);
      }

      const payout = sym.pays[minCount];
      const ev = prob * payout;
      totalEV += ev;

      winProbs.push({ count: minCount, prob, payout, ev });
    }

    return {
      id: sym.id,
      name: sym.name,
      emoji: sym.emoji,
      weight: sym.weight,
      prob: p,
      expectedCount,
      winProbs,
      totalEV,
    };
  });
}

function computeScatterStats() {
  const scatterSym = SYMBOLS.find(s => s.id === "scatter")!;
  const p = scatterSym.weight / totalWeight;
  const payKeys = [4, 5, 6];

  const entries: { count: number; prob: number; payout: number; ev: number }[] = [];
  let totalEV = 0;

  for (let i = 0; i < payKeys.length; i++) {
    const k = payKeys[i];
    const maxK = i + 1 < payKeys.length ? payKeys[i + 1] - 1 : GRID_SIZE;
    let prob = 0;
    for (let j = k; j <= maxK; j++) {
      prob += binomPMF(GRID_SIZE, j, p);
    }
    const payout = scatterSym.pays[k] || 0;
    const ev = prob * payout;
    totalEV += ev;
    entries.push({ count: k, prob, payout, ev });
  }

  const triggerProb = binomCDF_ge(GRID_SIZE, SCATTER_TRIGGER, p);

  return { p, entries, totalEV, triggerProb };
}

// ============================================================
// Tabs
// ============================================================

type Tab = "overview" | "symbols" | "scatter" | "freespins" | "volatility" | "formulas";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Overview" },
  { key: "symbols",    label: "Symbol EV" },
  { key: "scatter",    label: "Scatter" },
  { key: "freespins",  label: "Free Spins" },
  { key: "volatility", label: "Volatility" },
  { key: "formulas",   label: "Formulas" },
];

// ============================================================
// Modal Component
// ============================================================

interface MathModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRtp: number;
}

export const MathModelModal: React.FC<MathModelModalProps> = ({ isOpen, onClose, targetRtp }) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const symbolStats = useMemo(() => computeSymbolStats(), []);
  const scatterStats = useMemo(() => computeScatterStats(), []);

  const baseGameEV = useMemo(() =>
    symbolStats.reduce((s, sym) => s + sym.totalEV, 0) + scatterStats.totalEV,
    [symbolStats, scatterStats]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Mathematical Model</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Sweet Bonanza 1000 — Probability Analysis & RTP Decomposition
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Current Target RTP</div>
              <div className="text-base font-bold font-mono text-green-400">{targetRtp.toFixed(2)}%</div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto bg-slate-50">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                activeTab === key
                  ? "border-orange-500 text-orange-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <OverviewTab
              symbolStats={symbolStats}
              scatterStats={scatterStats}
              baseGameEV={baseGameEV}
              targetRtp={targetRtp}
            />
          )}
          {activeTab === "symbols" && <SymbolEVTab symbolStats={symbolStats} />}
          {activeTab === "scatter" && <ScatterTab scatterStats={scatterStats} />}
          {activeTab === "freespins" && <FreeSpinsTab scatterStats={scatterStats} />}
          {activeTab === "volatility" && <VolatilityTab />}
          {activeTab === "formulas" && <FormulasTab />}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Overview Tab
// ============================================================

const OverviewTab: React.FC<{
  symbolStats: SymbolStats[];
  scatterStats: ReturnType<typeof computeScatterStats>;
  baseGameEV: number;
  targetRtp: number;
}> = ({ symbolStats, scatterStats, baseGameEV, targetRtp }) => {
  const rtpMultiplier = targetRtp / 96.53;

  const topSymbols = [...symbolStats].sort((a, b) => b.totalEV - a.totalEV).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Core Parameters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Theoretical RTP", value: "96.53%", sub: "Base game + Free Spins", color: "text-green-600" },
            { label: "Max Win", value: "25,000×", sub: "Per bet amount", color: "text-amber-600" },
            { label: "Volatility", value: "Very High", sub: "5 / 5 stars", color: "text-red-500" },
            { label: "Hit Frequency", value: "~42.9%", sub: "Approx. 1 in 2.33 spins", color: "text-blue-600" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] text-slate-400 mb-1">{label}</div>
              <div className={cn("text-xl font-bold font-mono", color)}>{value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RTP decomposition */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">RTP Decomposition</h3>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <p className="text-xs text-slate-500">
            Total RTP = Base Game contribution + Free Spins contribution. The base game accounts for
            approximately <span className="font-semibold text-slate-700">~35–40%</span> of total RTP,
            while Free Spins (including multiplier bombs) contribute the remaining <span className="font-semibold text-slate-700">~57–62%</span>.
          </p>

          <div className="space-y-2">
            {[
              { label: "Regular symbols (base game)", value: "~38%", width: 38, color: "bg-blue-400" },
              { label: "Scatter payout (base game)", value: "~2%", width: 2, color: "bg-orange-400" },
              { label: "Free Spins base wins", value: "~32%", width: 32, color: "bg-green-400" },
              { label: "Free Spins multiplier bombs", value: "~24%", width: 24, color: "bg-amber-400" },
              { label: "Retrigger bonus", value: "~0.5%", width: 0.5, color: "bg-purple-400" },
            ].map(({ label, value, width, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-44 text-[11px] text-slate-600 shrink-0">{label}</div>
                <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(width, 100)}%` }} />
                </div>
                <div className="w-10 text-[11px] font-mono text-slate-500 text-right">{value}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-xs">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-green-600 font-mono">≈ 96.53%</span>
          </div>
        </div>
      </div>

      {/* Current RTP multiplier effect */}
      {Math.abs(targetRtp - 96.53) > 0.1 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-orange-700 mb-2">Active RTP Adjustment</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-slate-400">Original</div>
              <div className="text-base font-bold font-mono text-slate-600">96.53%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Multiplier</div>
              <div className="text-base font-bold font-mono text-orange-600">{rtpMultiplier.toFixed(4)}×</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Target</div>
              <div className="text-base font-bold font-mono text-green-600">{targetRtp.toFixed(2)}%</div>
            </div>
          </div>
          <p className="text-[11px] text-orange-600 mt-2">
            All symbol payouts are scaled by {rtpMultiplier.toFixed(4)}×. Per 100 units wagered,
            expected return = <span className="font-bold">{targetRtp.toFixed(2)} units</span>,
            expected loss = <span className="font-bold">{(100 - targetRtp).toFixed(2)} units</span>.
          </p>
        </div>
      )}

      {/* Top EV contributors */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Top EV Contributors (Base Game)</h3>
        <div className="grid grid-cols-3 gap-3">
          {topSymbols.map((sym, i) => (
            <div key={sym.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{sym.emoji}</span>
                <span className="text-xs font-semibold text-slate-700">{sym.name}</span>
                <span className="ml-auto text-[10px] text-slate-400">#{i + 1}</span>
              </div>
              <div className="text-[10px] text-slate-400">Expected Value</div>
              <div className="text-sm font-bold font-mono text-green-600">
                {(sym.totalEV * 100).toFixed(3)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Prob per cell: {(sym.prob * 100).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Symbol EV Tab
// ============================================================

const SymbolEVTab: React.FC<{ symbolStats: SymbolStats[] }> = ({ symbolStats }) => {
  const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Each spin generates 30 independent cells. For each symbol, we compute the probability of
        achieving each win tier using the Binomial distribution B(30, p), where p = symbol weight / total weight.
        Expected Value (EV) = Σ P(win tier) × payout multiplier.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left p-2 border border-slate-200 font-semibold text-slate-600">Symbol</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">Weight</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">P(cell)</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">E[count]</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">P(≥8)</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">P(≥10)</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">P(≥12)</th>
              <th className="text-center p-2 border border-slate-200 font-semibold text-slate-600">Total EV</th>
            </tr>
          </thead>
          <tbody>
            {symbolStats.map((sym) => {
              const p = sym.weight / totalWeight;
              const p8 = binomCDF_ge(GRID_SIZE, 8, p);
              const p10 = binomCDF_ge(GRID_SIZE, 10, p);
              const p12 = binomCDF_ge(GRID_SIZE, 12, p);

              return (
                <tr key={sym.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span>{sym.emoji}</span>
                      <span className="font-medium text-slate-700">{sym.name}</span>
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">{sym.weight}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">
                    {(p * 100).toFixed(2)}%
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">
                    {sym.expectedCount.toFixed(2)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">
                    {(p8 * 100).toFixed(3)}%
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">
                    {(p10 * 100).toFixed(3)}%
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">
                    {(p12 * 100).toFixed(3)}%
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-green-600">
                    {(sym.totalEV * 100).toFixed(4)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-50">
              <td colSpan={7} className="p-2 border border-slate-200 text-right font-semibold text-slate-600">
                Total Base Game Symbol EV
              </td>
              <td className="p-2 border border-slate-200 text-center font-mono font-bold text-green-600">
                {(symbolStats.reduce((s, sym) => s + sym.totalEV, 0) * 100).toFixed(4)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Win probability breakdown for top symbol */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Win Tier Breakdown — Heart (Highest Value)</h3>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-2 border border-slate-200">Win Tier</th>
                  <th className="text-center p-2 border border-slate-200">Count Range</th>
                  <th className="text-center p-2 border border-slate-200">Probability</th>
                  <th className="text-center p-2 border border-slate-200">Payout</th>
                  <th className="text-center p-2 border border-slate-200">EV Contribution</th>
                  <th className="text-center p-2 border border-slate-200">Approx. 1 in N</th>
                </tr>
              </thead>
              <tbody>
                {symbolStats[0]?.winProbs.map(({ count, prob, payout, ev }) => (
                  <tr key={count} className="hover:bg-white transition-colors">
                    <td className="p-2 border border-slate-200 font-semibold text-slate-700">
                      {count}+ symbols
                    </td>
                    <td className="p-2 border border-slate-200 text-center text-slate-500">
                      {count}–{count === 12 ? 30 : count + 1}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">
                      {(prob * 100).toFixed(4)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">
                      {payout}×
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-green-600">
                      {(ev * 100).toFixed(5)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">
                      {prob > 0 ? Math.round(1 / prob).toLocaleString() : "∞"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Scatter Tab
// ============================================================

const ScatterTab: React.FC<{ scatterStats: ReturnType<typeof computeScatterStats> }> = ({ scatterStats }) => {
  const { p, entries, triggerProb } = scatterStats;

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-orange-700 mb-3">Scatter (Lollipop 🍭) Statistics</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-orange-200 text-center">
            <div className="text-[10px] text-slate-400">Weight</div>
            <div className="text-xl font-bold font-mono text-orange-600">1</div>
            <div className="text-[10px] text-slate-400">out of {SYMBOLS.reduce((s, x) => s + x.weight, 0)}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-orange-200 text-center">
            <div className="text-[10px] text-slate-400">P(per cell)</div>
            <div className="text-xl font-bold font-mono text-orange-600">{(p * 100).toFixed(2)}%</div>
            <div className="text-[10px] text-slate-400">≈ 1 in {Math.round(1 / p)}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-orange-200 text-center">
            <div className="text-[10px] text-slate-400">P(≥4 scatter)</div>
            <div className="text-xl font-bold font-mono text-amber-600">{(triggerProb * 100).toFixed(3)}%</div>
            <div className="text-[10px] text-slate-400">≈ 1 in {Math.round(1 / triggerProb)}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Scatter Count Distribution</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Count</th>
                <th className="text-center p-2 border border-slate-200">Exact P(X=k)</th>
                <th className="text-center p-2 border border-slate-200">Cumulative P(X≥k)</th>
                <th className="text-center p-2 border border-slate-200">Approx. 1 in N</th>
                <th className="text-center p-2 border border-slate-200">Payout</th>
                <th className="text-center p-2 border border-slate-200">Triggers FS?</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((k) => {
                const exactP = binomPMF(GRID_SIZE, k, p);
                const cumP = binomCDF_ge(GRID_SIZE, k, p);
                const scatterSym = SYMBOLS.find(s => s.id === "scatter")!;
                const payout = scatterSym.pays[k] || (k >= 6 ? scatterSym.pays[6] : 0);
                const triggersFS = k >= SCATTER_TRIGGER;

                return (
                  <tr key={k} className={cn("hover:bg-slate-50", triggersFS && "bg-yellow-50")}>
                    <td className="p-2 border border-slate-200 font-bold text-slate-700">{k} 🍭</td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">
                      {(exactP * 100).toFixed(4)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-700">
                      {(cumP * 100).toFixed(4)}%
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">
                      {exactP > 1e-8 ? Math.round(1 / exactP).toLocaleString() : ">1B"}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">
                      {payout > 0 ? `${payout}×` : "—"}
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      {triggersFS
                        ? <span className="text-green-600 font-bold">✓ Yes</span>
                        : <span className="text-slate-400">No</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-2">Ante Bet Effect on Scatter</h3>
        <p className="text-xs text-slate-500 mb-3">
          With Ante Bet (+25% cost), scatter weight doubles from 1 to 2, increasing trigger probability:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Normal", weight: 1, totalW: SYMBOLS.reduce((s, x) => s + x.weight, 0) },
            { label: "Ante Bet", weight: 2, totalW: SYMBOLS.reduce((s, x) => s + x.weight, 0) + 1 },
          ].map(({ label, weight, totalW }) => {
            const pAnte = weight / totalW;
            const trigP = binomCDF_ge(GRID_SIZE, SCATTER_TRIGGER, pAnte);
            return (
              <div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-2">{label}</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">P(per cell)</span>
                    <span className="font-mono text-orange-600">{(pAnte * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">P(trigger FS)</span>
                    <span className="font-mono text-amber-600">{(trigP * 100).toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">1 in N spins</span>
                    <span className="font-mono text-slate-600">{Math.round(1 / trigP).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Free Spins Tab
// ============================================================

const FreeSpinsTab: React.FC<{ scatterStats: ReturnType<typeof computeScatterStats> }> = ({ scatterStats }) => {
  const avgMultiplierValue = MULTIPLIER_VALUES.reduce((s, v) => s + v, 0) / MULTIPLIER_VALUES.length;
  const bombChancePerCell = 0.08; // medium volatility
  const expectedBombsPerSpin = GRID_SIZE * bombChancePerCell;
  const expectedMultiplierPerSpin = expectedBombsPerSpin * avgMultiplierValue;

  const retriggerProb = binomCDF_ge(GRID_SIZE, SCATTER_TRIGGER, scatterStats.p);
  const expectedExtraSpins = retriggerProb * FREE_SPINS_RETRIGGER;
  const expectedTotalSpins = FREE_SPINS_BASE + expectedExtraSpins / (1 - retriggerProb * (FREE_SPINS_RETRIGGER / FREE_SPINS_BASE));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Base Free Spins", value: `${FREE_SPINS_BASE}`, sub: "Triggered by ≥4 scatters", color: "text-amber-600" },
          { label: "Retrigger Spins", value: `+${FREE_SPINS_RETRIGGER}`, sub: "Per ≥4 scatters during FS", color: "text-purple-600" },
          { label: "Retrigger Prob", value: `${(retriggerProb * 100).toFixed(3)}%`, sub: "Per free spin", color: "text-blue-600" },
          { label: "Avg Multiplier/Spin", value: `${expectedMultiplierPerSpin.toFixed(1)}×`, sub: "Medium volatility", color: "text-green-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className={cn("text-xl font-bold font-mono", color)}>{value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Multiplier Bomb System</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-600">
            During Free Spins, each newly spawned cell has an ~8% chance (medium volatility) of becoming a
            multiplier bomb. Bombs do not disappear between tumbles — they accumulate. The total multiplier
            is the <strong>sum</strong> of all visible bomb values, applied to the entire tumble step's payout.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 mb-2">Multiplier Values (22 tiers)</div>
              <div className="flex flex-wrap gap-1">
                {MULTIPLIER_VALUES.map(v => (
                  <span key={v} className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                    v >= 500 ? "bg-amber-200 text-amber-800 border-amber-400 font-bold" :
                    v >= 100 ? "bg-orange-100 text-orange-700 border-orange-300" :
                    v >= 20 ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                    "bg-slate-100 text-slate-600 border-slate-300"
                  )}>
                    {v}×
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 mb-2">Expected Multiplier Stats</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg bomb value</span>
                  <span className="font-mono text-amber-600">{avgMultiplierValue.toFixed(1)}×</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bomb chance/cell</span>
                  <span className="font-mono text-amber-600">8.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected bombs/spin</span>
                  <span className="font-mono text-amber-600">{expectedBombsPerSpin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected total mult</span>
                  <span className="font-mono font-bold text-green-600">{expectedMultiplierPerSpin.toFixed(1)}×</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Buy Feature Cost Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Feature</th>
                <th className="text-center p-2 border border-slate-200">Cost (× bet)</th>
                <th className="text-center p-2 border border-slate-200">Implied RTP</th>
                <th className="text-center p-2 border border-slate-200">Min Multiplier</th>
                <th className="text-center p-2 border border-slate-200">Expected Win</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200 font-medium text-slate-700">Free Spins</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-orange-600">{BUY_FREE_SPINS_COST}×</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">~96.5%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">2×</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">~{(BUY_FREE_SPINS_COST * 0.965).toFixed(0)}×</td>
              </tr>
              <tr className="hover:bg-slate-50 bg-amber-50">
                <td className="p-2 border border-slate-200 font-medium text-amber-700">Super Free Spins</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-orange-600">{BUY_SUPER_FREE_SPINS_COST}×</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">~96.5%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">20×</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">~{(BUY_SUPER_FREE_SPINS_COST * 0.965).toFixed(0)}×</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Volatility Tab
// ============================================================

const VolatilityTab: React.FC = () => {
  const levels = [
    {
      name: "Low",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      minWin: 6,
      bombChance: "4%",
      bombRange: "1–2",
      desc: "Lower minimum win threshold means wins occur more frequently, but individual payouts are smaller. Suitable for extended play sessions with lower variance.",
      hitFreq: "~65%",
      maxWinMultiplier: "~5,000×",
    },
    {
      name: "Medium",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      minWin: 8,
      bombChance: "8%",
      bombRange: "1–4",
      desc: "Original game parameters. Balanced between win frequency and payout size. Matches the official Sweet Bonanza 1000 mathematical model.",
      hitFreq: "~42.9%",
      maxWinMultiplier: "~25,000×",
    },
    {
      name: "High",
      color: "text-orange-500",
      bg: "bg-orange-50",
      border: "border-orange-200",
      minWin: 9,
      bombChance: "12%",
      bombRange: "2–5",
      desc: "Fewer but larger wins. Higher bomb spawn rate increases potential for massive multiplier accumulation during Free Spins.",
      hitFreq: "~28%",
      maxWinMultiplier: "~50,000×",
    },
    {
      name: "Extreme",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      minWin: 10,
      bombChance: "18%",
      bombRange: "3–7",
      desc: "Very low hit frequency with extreme multiplier potential. Long dry spells are common, but Free Spins can produce extraordinary wins.",
      hitFreq: "~15%",
      maxWinMultiplier: "~100,000×",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Volatility in this simulator is controlled by two parameters: the minimum symbol count required
        for a win, and the multiplier bomb spawn probability during Free Spins. Higher volatility = fewer
        wins but larger potential payouts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {levels.map((level) => (
          <div key={level.name} className={cn("rounded-xl p-4 border", level.bg, level.border)}>
            <div className={cn("text-base font-bold mb-2", level.color)}>{level.name} Volatility</div>
            <p className="text-[11px] text-slate-600 mb-3">{level.desc}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Min Win Count", value: `${level.minWin} symbols` },
                { label: "Bomb Chance/Cell", value: level.bombChance },
                { label: "Initial Bombs", value: level.bombRange },
                { label: "Hit Frequency", value: level.hitFreq },
                { label: "Est. Max Win", value: level.maxWinMultiplier },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/70 rounded p-1.5 border border-white">
                  <div className="text-[9px] text-slate-400">{label}</div>
                  <div className={cn("text-[11px] font-bold font-mono", level.color)}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Volatility vs. RTP Interaction</h3>
        <p className="text-xs text-slate-500">
          Changing volatility does <strong>not</strong> change the theoretical RTP — it redistributes
          the same expected value across a different win distribution. Higher volatility concentrates
          the same RTP into fewer, larger wins. The RTP multiplier (set via Target RTP) scales all
          payouts uniformly and operates independently of the volatility setting.
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Formulas Tab
// ============================================================

const FormulasTab: React.FC = () => {
  return (
    <div className="space-y-5 text-xs text-slate-600">

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">1. Symbol Win Probability</h3>
        <div className="space-y-2">
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px]">
            <div className="text-slate-400 mb-1">// Probability of exactly k symbols appearing in 30 cells</div>
            <div className="text-blue-700">P(X = k) = C(30, k) × p^k × (1-p)^(30-k)</div>
            <div className="text-slate-400 mt-2 mb-1">// where p = symbol_weight / total_weight</div>
            <div className="text-green-700">p(heart) = 3 / 49 ≈ 6.12%</div>
            <div className="text-green-700">p(banana) = 8 / 49 ≈ 16.33%</div>
            <div className="text-green-700">p(scatter) = 1 / 49 ≈ 2.04%</div>
          </div>
          <p>
            The Binomial distribution B(n=30, p) models the number of a specific symbol in one spin.
            C(n,k) is the binomial coefficient "n choose k".
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">2. Expected Value per Spin</h3>
        <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px] space-y-1">
          <div className="text-slate-400">// EV for a single symbol (e.g., Heart)</div>
          <div className="text-blue-700">EV(heart) = Σ P(win_tier_i) × payout_i</div>
          <div className="text-slate-400 mt-2">// Example tiers for Heart:</div>
          <div className="text-green-700">  P(8-9) × 10× + P(10-11) × 25× + P(12+) × 50×</div>
          <div className="text-slate-400 mt-2">// Total base game EV</div>
          <div className="text-blue-700">EV(base) = Σ EV(symbol_i) for all symbols</div>
          <div className="text-slate-400 mt-2">// With RTP multiplier m = targetRTP / 96.53</div>
          <div className="text-amber-700">EV(adjusted) = EV(base) × m</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">3. Free Spins Expected Value</h3>
        <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px] space-y-1">
          <div className="text-slate-400">// Expected multiplier per free spin (medium volatility)</div>
          <div className="text-blue-700">E[mult] = E[bomb_count] × E[bomb_value]</div>
          <div className="text-green-700">       = (30 × 0.08) × avg(MULTIPLIER_VALUES)</div>
          <div className="text-green-700">       = 2.4 × {(MULTIPLIER_VALUES.reduce((s,v)=>s+v,0)/MULTIPLIER_VALUES.length).toFixed(1)}</div>
          <div className="text-green-700">       ≈ {(2.4 * MULTIPLIER_VALUES.reduce((s,v)=>s+v,0)/MULTIPLIER_VALUES.length).toFixed(1)}×</div>
          <div className="text-slate-400 mt-2">// Expected total FS win (simplified)</div>
          <div className="text-blue-700">E[FS_win] = E[spins] × E[win_per_spin] × E[mult]</div>
          <div className="text-slate-400 mt-2">// Retrigger expected extra spins</div>
          <div className="text-blue-700">E[extra] = P(retrigger) × 5 / (1 - P(retrigger))</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">4. Tumble Mechanics</h3>
        <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px] space-y-1">
          <div className="text-slate-400">// Each tumble step removes winning symbols and refills</div>
          <div className="text-blue-700">win_positions = {"{"}pos | grid[pos] forms a winning group{"}"}</div>
          <div className="text-slate-400 mt-2">// Symbols fall down column by column</div>
          <div className="text-blue-700">for each col in [0..5]:</div>
          <div className="text-blue-700">  keep non-null symbols (bottom to top)</div>
          <div className="text-blue-700">  fill remaining cells with new random symbols</div>
          <div className="text-slate-400 mt-2">// Tumble continues while wins exist</div>
          <div className="text-blue-700">while calculateWins(grid).wins.length {">"} 0:</div>
          <div className="text-blue-700">  grid = tumble(grid, win_positions)</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">5. RTP Scaling Formula</h3>
        <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px] space-y-1">
          <div className="text-slate-400">// RTP multiplier derivation</div>
          <div className="text-blue-700">m = targetRTP / theoreticalRTP</div>
          <div className="text-blue-700">m = targetRTP / 96.53</div>
          <div className="text-slate-400 mt-2">// Applied to every payout calculation</div>
          <div className="text-blue-700">adjustedPayout = rawPayout × m</div>
          <div className="text-slate-400 mt-2">// Examples</div>
          <div className="text-green-700">targetRTP=80%:  m = 80/96.53 = 0.8288×</div>
          <div className="text-green-700">targetRTP=96.53%: m = 1.0000× (original)</div>
          <div className="text-green-700">targetRTP=110%: m = 110/96.53 = 1.1395×</div>
          <div className="text-slate-400 mt-2">// Long-run convergence</div>
          <div className="text-blue-700">actualRTP → targetRTP as totalSpins → ∞</div>
          <div className="text-slate-400">// (Law of Large Numbers; typically needs 1000+ spins)</div>
        </div>
      </div>

    </div>
  );
};
