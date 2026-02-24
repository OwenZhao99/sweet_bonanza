/**
 * Sweet Bonanza 1000 - Slot Math Model Design Documentation
 * Comprehensive reference covering: PAR Sheet, RTP theory, volatility, 
 * probability distributions, tumble/cascade mechanics, free spins math,
 * and industry-standard formulas.
 */

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  SYMBOLS,
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MULTIPLIER_VALUES,
  FREE_SPINS_BASE,
  FREE_SPINS_RETRIGGER,
  SCATTER_TRIGGER,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  computePARSheet,
  spin,
  type PARSheetData,
} from "@/lib/gameEngine";

// ============================================================
// Tabs
// ============================================================

type DocTab =
  | "par-sheet"
  | "rtp-theory"
  | "volatility-math"
  | "scatter-pays"
  | "tumble-cascade"
  | "free-spins"
  | "simulation"
  | "references";

const DOC_TABS: { key: DocTab; label: string; icon: string }[] = [
  { key: "par-sheet",       label: "PAR Sheet",        icon: "📊" },
  { key: "rtp-theory",      label: "RTP Theory",       icon: "📐" },
  { key: "volatility-math", label: "Volatility Math",  icon: "📈" },
  { key: "scatter-pays",    label: "Scatter Pays",     icon: "🎯" },
  { key: "tumble-cascade",  label: "Tumble/Cascade",   icon: "⬇️" },
  { key: "free-spins",      label: "Free Spins Math",  icon: "🎰" },
  { key: "simulation",      label: "Simulation",       icon: "🔬" },
  { key: "references",      label: "References",       icon: "📚" },
];

// ============================================================
// Modal Component
// ============================================================

interface MathDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MathDocModal: React.FC<MathDocModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DocTab>("par-sheet");
  const parSheet = useMemo(() => computePARSheet(), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">📖</span> Slot Math Model Documentation
            </h2>
            <p className="text-indigo-300 text-xs mt-0.5">
              Complete mathematical model design reference for Sweet Bonanza 1000
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-700 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto bg-slate-50">
          {DOC_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-1",
                activeTab === key
                  ? "border-indigo-500 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              <span className="text-sm">{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "par-sheet" && <PARSheetTab parSheet={parSheet} />}
          {activeTab === "rtp-theory" && <RTPTheoryTab parSheet={parSheet} />}
          {activeTab === "volatility-math" && <VolatilityMathTab parSheet={parSheet} />}
          {activeTab === "scatter-pays" && <ScatterPaysTab parSheet={parSheet} />}
          {activeTab === "tumble-cascade" && <TumbleCascadeTab parSheet={parSheet} />}
          {activeTab === "free-spins" && <FreeSpinsMathTab parSheet={parSheet} />}
          {activeTab === "simulation" && <SimulationTab />}
          {activeTab === "references" && <ReferencesTab />}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Section wrapper
// ============================================================

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn("mb-6", className)}>
    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
      <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
      {title}
    </h3>
    {children}
  </div>
);

const Formula: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div className="bg-slate-900 rounded-lg p-4 my-3 border border-slate-700">
    {label && <div className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">{label}</div>}
    <div className="font-mono text-sm text-green-400 leading-relaxed">{children}</div>
  </div>
);

const InfoBox: React.FC<{ children: React.ReactNode; variant?: "info" | "warning" | "success" }> = ({ children, variant = "info" }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={cn("rounded-lg p-3 border text-xs my-3", styles[variant])}>
      {children}
    </div>
  );
};

// ============================================================
// PAR Sheet Tab
// ============================================================

const PARSheetTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  return (
    <div className="space-y-6">
      <Section title="What is a PAR Sheet?">
        <p className="text-xs text-slate-600 leading-relaxed">
          A <strong>PAR Sheet (Probability Accounting Report)</strong> is the foundational document in slot game design. 
          It defines every mathematical parameter of the game: symbol weights, payout tables, hit frequencies, 
          expected values, and the overall Return to Player (RTP). Every licensed slot machine must have a PAR Sheet 
          approved by gaming regulators before it can be deployed on a casino floor.
        </p>
        <InfoBox variant="info">
          <strong>Industry Standard:</strong> PAR Sheets are typically created in Microsoft Excel and contain 
          detailed probability calculations for every possible winning combination. For complex games like 
          Sweet Bonanza (with tumble mechanics), simulation is also required to validate theoretical calculations.
        </InfoBox>
      </Section>

      <Section title="Game Configuration">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="text-left p-2.5 border border-slate-200 font-semibold text-indigo-800">Parameter</th>
                <th className="text-center p-2.5 border border-slate-200 font-semibold text-indigo-800">Value</th>
                <th className="text-left p-2.5 border border-slate-200 font-semibold text-indigo-800">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Grid Size", `${GRID_COLS} × ${GRID_ROWS} = ${GRID_SIZE}`, "6 reels, 5 rows, 30 total cells"],
                ["Pay Mechanism", "Scatter Pays (Cluster)", "8+ matching symbols anywhere on grid"],
                ["Theoretical RTP", "96.53%", "Base game + Free Spins combined"],
                ["Volatility Rating", "Very High (5/5)", "Large variance in win distribution"],
                ["Min Win Count", "8 symbols", "Minimum matching symbols for a payout (medium vol.)"],
                ["Max Win", "25,000× bet", "Maximum possible win per spin sequence"],
                ["Total Symbol Weight", `${parSheet.totalWeight}`, "Sum of all symbol weights in reel pool"],
                ["Scatter Trigger", `${SCATTER_TRIGGER}+ Lollipops`, "Triggers Free Spins bonus round"],
                ["Free Spins Base", `${FREE_SPINS_BASE} spins`, "Initial free spins awarded"],
                ["Retrigger", `+${FREE_SPINS_RETRIGGER} spins`, `Per ${SCATTER_TRIGGER}+ scatters during FS`],
                ["Buy Free Spins", `${BUY_FREE_SPINS_COST}× bet`, "Instant Free Spins purchase"],
                ["Buy Super FS", `${BUY_SUPER_FREE_SPINS_COST}× bet`, "Super Free Spins (min 20× multiplier)"],
              ].map(([param, value, desc]) => (
                <tr key={param} className="hover:bg-slate-50">
                  <td className="p-2.5 border border-slate-200 font-medium text-slate-700">{param}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-mono text-indigo-600 font-semibold">{value}</td>
                  <td className="p-2.5 border border-slate-200 text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Symbol Weight Table (Reel Pool)">
        <p className="text-xs text-slate-600 mb-3">
          Each symbol has a <strong>weight</strong> that determines its frequency in the reel pool. 
          The probability of any symbol appearing in a single cell is <code className="bg-slate-100 px-1 rounded">weight / total_weight</code>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Symbol</th>
                <th className="text-center p-2 border border-slate-200">Weight</th>
                <th className="text-center p-2 border border-slate-200">P(per cell)</th>
                <th className="text-center p-2 border border-slate-200">E[count in 30]</th>
                <th className="text-center p-2 border border-slate-200">P(win: ≥8)</th>
                <th className="text-center p-2 border border-slate-200">E[payout] (×bet)</th>
              </tr>
            </thead>
            <tbody>
              {parSheet.symbolAnalysis.map((sym) => (
                <tr key={sym.id} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-200 font-medium text-slate-700">{sym.name}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono">{sym.weight}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">{(sym.probability * 100).toFixed(2)}%</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">{sym.expectedCount.toFixed(2)}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">{(sym.hitProbability * 100).toFixed(4)}%</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-green-600">{sym.expectedPayout.toFixed(6)}</td>
                </tr>
              ))}
              <tr className="bg-orange-50 font-semibold">
                <td className="p-2 border border-slate-200 text-orange-700">Scatter (Lollipop)</td>
                <td className="p-2 border border-slate-200 text-center font-mono">{SYMBOLS.find(s => s.id === "scatter")!.weight}</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-orange-600">{(parSheet.scatterAnalysis.probability * 100).toFixed(2)}%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-slate-600">{(parSheet.scatterAnalysis.probability * GRID_SIZE).toFixed(2)}</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">{(parSheet.scatterAnalysis.triggerProbability * 100).toFixed(3)}%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">{parSheet.scatterAnalysis.expectedPayout.toFixed(6)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 font-bold">
                <td className="p-2 border border-slate-200 text-indigo-800">TOTAL</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-indigo-600">{parSheet.totalWeight}</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-indigo-600">100%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-indigo-600">30.00</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-indigo-600">{(parSheet.baseGameHitFrequency * 100).toFixed(2)}%</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-indigo-600">{parSheet.baseGameRTP.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="Paytable (Payout Multipliers × Bet)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Symbol</th>
                {[8, 9, 10, 11, 12].map(n => (
                  <th key={n} className="text-center p-2 border border-slate-200">{n}+ symbols</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYMBOLS.filter(s => s.id !== "scatter").map(sym => (
                <tr key={sym.id} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-200 font-medium text-slate-700">{sym.emoji} {sym.name}</td>
                  {[8, 9, 10, 11, 12].map(n => (
                    <td key={n} className="p-2 border border-slate-200 text-center font-mono text-amber-600">
                      {sym.pays[n] ? `${sym.pays[n]}×` : "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-orange-50">
                <td className="p-2 border border-slate-200 font-medium text-orange-700">🍭 Scatter</td>
                <td colSpan={5} className="p-2 border border-slate-200 text-center">
                  <span className="font-mono text-orange-600">4+ = 3× | 5+ = 5× | 6+ = 100×</span>
                  <span className="text-slate-400 ml-2">(+ triggers Free Spins)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Key Aggregate Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Base Game EV", value: parSheet.baseGameRTP.toFixed(4), sub: "× bet per spin", color: "text-green-600" },
            { label: "Hit Frequency", value: `${(parSheet.baseGameHitFrequency * 100).toFixed(2)}%`, sub: `1 in ${(1/parSheet.baseGameHitFrequency).toFixed(1)} spins`, color: "text-blue-600" },
            { label: "Std Deviation (σ)", value: parSheet.standardDeviation.toFixed(4), sub: "per spin payout", color: "text-purple-600" },
            { label: "Volatility Index", value: parSheet.volatilityIndex.toFixed(4), sub: "1.96 × σ (95% CI)", color: "text-red-600" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] text-slate-400 mb-1">{label}</div>
              <div className={cn("text-lg font-bold font-mono", color)}>{value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ============================================================
// RTP Theory Tab
// ============================================================

const RTPTheoryTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  return (
    <div className="space-y-6">
      <Section title="What is RTP (Return to Player)?">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>RTP (Return to Player)</strong> is the theoretical percentage of all wagered money that a slot 
          machine will pay back to players over time. It is the single most important metric in slot game design 
          and is strictly regulated by gaming authorities worldwide. An RTP of 96.53% means that for every $100 
          wagered, the game is expected to return $96.53 to players on average over millions of spins.
        </p>
        <InfoBox variant="warning">
          <strong>Important:</strong> RTP is a long-run theoretical value. In any short session, actual returns 
          can vary dramatically due to variance. A player might win 500× their bet or lose everything in a 
          single session — both outcomes are consistent with a 96.53% RTP.
        </InfoBox>
      </Section>

      <Section title="RTP Calculation Formula">
        <Formula label="Basic RTP Formula">
          <div>RTP = (Total Expected Wins / Total Bets) × 100%</div>
          <div className="mt-2 text-slate-400">// Equivalently:</div>
          <div>RTP = Σ [P(win_i) × payout_i] / bet × 100%</div>
        </Formula>
        <Formula label="For Scatter Pays (Sweet Bonanza model)">
          <div className="text-slate-400">// For each symbol s with weight w_s:</div>
          <div>p_s = w_s / Σw  <span className="text-slate-500">// probability per cell</span></div>
          <div className="mt-1">EV(s) = Σ P(count ∈ [tier_min, tier_max]) × payout(tier)</div>
          <div className="mt-1 text-slate-400">// Where count follows Binomial(n=30, p=p_s)</div>
          <div>P(X = k) = C(30, k) × p^k × (1-p)^(30-k)</div>
          <div className="mt-2 text-amber-400">Base Game RTP = Σ EV(s) for all symbols</div>
        </Formula>
      </Section>

      <Section title="RTP Decomposition for Sweet Bonanza 1000">
        <p className="text-xs text-slate-600 mb-3">
          The total RTP of 96.53% is composed of contributions from the base game and the Free Spins bonus feature. 
          The Free Spins feature, with its multiplier bombs, contributes the majority of the RTP.
        </p>
        <div className="space-y-2">
          {[
            { label: "Regular Symbol Wins (Base Game)", value: "~35-38%", width: 37, color: "bg-blue-500", desc: "Cluster wins from 8+ matching symbols" },
            { label: "Scatter Payout (Base Game)", value: "~1-2%", width: 2, color: "bg-orange-500", desc: "Direct payout from 4+ scatter symbols" },
            { label: "Free Spins Base Wins", value: "~28-32%", width: 30, color: "bg-green-500", desc: "Symbol wins during free spins (no multiplier)" },
            { label: "Multiplier Bomb Effect", value: "~25-30%", width: 27, color: "bg-purple-500", desc: "Additional value from multiplier bombs during FS" },
          ].map(({ label, value, width, color, desc }) => (
            <div key={label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-600 font-medium">{label}</span>
                <span className="font-mono text-slate-700 font-bold">{value}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${width}%` }} />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-indigo-50 rounded-lg p-3 border border-indigo-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-800">Total Theoretical RTP</span>
            <span className="text-lg font-bold font-mono text-indigo-600">96.53%</span>
          </div>
        </div>
      </Section>

      <Section title="RTP Scaling (Adjustable RTP)">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          In real casino deployments, operators can select from multiple RTP configurations (e.g., 94%, 96%, 97%). 
          This is achieved by applying a global multiplier to all payouts:
        </p>
        <Formula label="RTP Multiplier">
          <div>m = target_RTP / theoretical_RTP</div>
          <div>m = target_RTP / 96.53</div>
          <div className="mt-2">adjusted_payout = raw_payout × m</div>
          <div className="mt-2 text-slate-400">// Examples:</div>
          <div className="text-amber-400">target=80%:  m = 80/96.53 = 0.829×</div>
          <div className="text-green-400">target=96.53%: m = 1.000× (original)</div>
          <div className="text-cyan-400">target=110%: m = 110/96.53 = 1.140×</div>
        </Formula>
        <InfoBox variant="info">
          <strong>Regulatory Note:</strong> Most jurisdictions require a minimum RTP (e.g., 85% in Nevada, 
          75% in some European markets). The RTP must be disclosed and verified by independent testing labs 
          such as GLI, BMM, or eCOGRA.
        </InfoBox>
      </Section>

      <Section title="House Edge">
        <Formula label="House Edge Relationship">
          <div>House Edge = 100% - RTP</div>
          <div className="mt-1 text-amber-400">House Edge = 100% - 96.53% = 3.47%</div>
          <div className="mt-2 text-slate-400">// This means the casino retains 3.47% of all bets</div>
          <div className="text-slate-400">// on average over the long run</div>
        </Formula>
      </Section>
    </div>
  );
};

// ============================================================
// Volatility Math Tab
// ============================================================

const VolatilityMathTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  return (
    <div className="space-y-6">
      <Section title="Understanding Volatility in Slot Games">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Volatility</strong> (also called <strong>variance</strong>) describes how a game's payouts are 
          distributed. Two games can have identical RTP but vastly different player experiences. A low-volatility 
          game pays small amounts frequently, while a high-volatility game pays large amounts rarely. Sweet Bonanza 
          1000 is classified as <strong>Very High Volatility</strong>.
        </p>
      </Section>

      <Section title="Standard Deviation (σ)">
        <Formula label="Variance Decomposition (Rigorous)">
          <div className="text-slate-400">// Total payout X = Σ X_i + X_scatter</div>
          <div className="text-slate-400">// where X_i = payout from symbol i</div>
          <div className="mt-2">Var(X) = Σ Var(X_i) + Var(X_scatter) + 2·Σ Cov(X_i, X_j)</div>
          <div className="mt-2 text-slate-400">// For each symbol: Var(X_i) = E[X_i²] - E[X_i]²</div>
          <div className="mt-2 text-slate-400">// Covariance treatment:</div>
          <div className="text-slate-400">// In Multinomial model, Cov(count_i, count_j) = -n·p_i·p_j</div>
          <div className="text-slate-400">// However, payout is a step function of count at high thresholds (≥8).</div>
          <div className="text-slate-400">// Two different symbols rarely both reach 8+ simultaneously,</div>
          <div className="text-slate-400">// making Cov(X_i, X_j) ≈ 0 (negligible negative correlation).</div>
          <div className="text-slate-400">// Therefore: Var(X) ≈ Σ Var(X_i) + Var(X_scatter)</div>
          <div className="text-slate-400">// This is a tight upper bound (true covariance terms are ≤0).</div>
          <div className="mt-2">σ = √(Var(X))</div>
        </Formula>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-400">Mean Payout E[X]</div>
            <div className="text-lg font-bold font-mono text-blue-600">{parSheet.baseGameRTP.toFixed(4)}</div>
            <div className="text-[10px] text-slate-400">× bet per spin</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-400">Std Deviation σ</div>
            <div className="text-lg font-bold font-mono text-purple-600">{parSheet.standardDeviation.toFixed(4)}</div>
            <div className="text-[10px] text-slate-400">per spin</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-400">Volatility Index</div>
            <div className="text-lg font-bold font-mono text-red-600">{parSheet.volatilityIndex.toFixed(4)}</div>
            <div className="text-[10px] text-slate-400">1.96 × σ</div>
          </div>
        </div>
      </Section>

      <Section title="Volatility Index & Confidence Intervals">
        <Formula label="Volatility Index (VI)">
          <div>VI = z × σ</div>
          <div className="mt-1 text-slate-400">// z-scores for common confidence levels:</div>
          <div className="text-cyan-400">90% CI: z = 1.645  →  VI₉₀ = {(1.645 * parSheet.standardDeviation).toFixed(4)}</div>
          <div className="text-green-400">95% CI: z = 1.960  →  VI₉₅ = {parSheet.volatilityIndex.toFixed(4)}</div>
          <div className="text-amber-400">99% CI: z = 2.576  →  VI₉₉ = {(2.576 * parSheet.standardDeviation).toFixed(4)}</div>
        </Formula>

        <Formula label="RTP Confidence Range after N spins">
          <div>RTP_range = total_RTP ± z × σ_eff / √N</div>
          <div className="mt-2 text-slate-400">// total_RTP includes base game + tumble cascades + free spins</div>
          <div className="text-slate-400">// σ_eff = σ × √(tumble_multiplier) to account for cascade variance</div>
          <div className="mt-1 text-slate-400">// If measured RTP falls outside this range,</div>
          <div className="text-slate-400">// the game may not be performing as expected</div>
        </Formula>

        <h4 className="text-xs font-bold text-slate-700 mt-4 mb-2">Confidence Intervals at Various Spin Counts</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-center p-2 border border-slate-200">Spins (N)</th>
                <th className="text-center p-2 border border-slate-200">90% CI Range</th>
                <th className="text-center p-2 border border-slate-200">95% CI Range</th>
                <th className="text-center p-2 border border-slate-200">99% CI Range</th>
              </tr>
            </thead>
            <tbody>
              {parSheet.confidenceIntervals.map((ci) => (
                <tr key={ci.spins} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-200 text-center font-mono font-semibold text-slate-700">{ci.spins.toLocaleString()}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-cyan-600">
                    [{ci.ci90[0].toFixed(2)}, {ci.ci90[1].toFixed(2)}]
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-green-600">
                    [{ci.ci95[0].toFixed(2)}, {ci.ci95[1].toFixed(2)}]
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">
                    [{ci.ci99[0].toFixed(2)}, {ci.ci99[1].toFixed(2)}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoBox variant="info">
          <strong>Reading the table:</strong> After 10,000 spins at 95% confidence, the measured RTP should fall 
          within the 95% CI range. If it doesn't, there may be a bug in the implementation.
        </InfoBox>
      </Section>

      <Section title="Volatility Classification">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Level</th>
                <th className="text-center p-2 border border-slate-200">σ Range</th>
                <th className="text-center p-2 border border-slate-200">VI Range</th>
                <th className="text-left p-2 border border-slate-200">Player Experience</th>
                <th className="text-left p-2 border border-slate-200">Example Games</th>
              </tr>
            </thead>
            <tbody>
              {[
                { level: "Low", sigma: "< 3", vi: "< 6", exp: "Frequent small wins, steady balance", ex: "Starburst, Blood Suckers", color: "text-green-600" },
                { level: "Medium", sigma: "3 - 6", vi: "6 - 12", exp: "Balanced wins, moderate swings", ex: "Gonzo's Quest, Jack Hammer", color: "text-blue-600" },
                { level: "High", sigma: "6 - 10", vi: "12 - 20", exp: "Infrequent larger wins, noticeable dry spells", ex: "Book of Dead, Razor Shark", color: "text-orange-600" },
                { level: "Very High", sigma: "> 10", vi: "> 20", exp: "Rare massive wins, long dry spells", ex: "Sweet Bonanza, Gates of Olympus", color: "text-red-600" },
              ].map(({ level, sigma, vi, exp, ex, color }) => (
                <tr key={level} className={cn("hover:bg-slate-50", level === "Very High" && "bg-red-50")}>
                  <td className={cn("p-2 border border-slate-200 font-bold", color)}>{level}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono">{sigma}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono">{vi}</td>
                  <td className="p-2 border border-slate-200 text-slate-600">{exp}</td>
                  <td className="p-2 border border-slate-200 text-slate-500 italic">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

// ============================================================
// Scatter Pays Tab
// ============================================================

const ScatterPaysTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  return (
    <div className="space-y-6">
      <Section title="Scatter Pays vs. Payline Mechanics">
        <p className="text-xs text-slate-600 leading-relaxed">
          Traditional slot games use <strong>paylines</strong> — specific patterns across reels where matching 
          symbols must land. Sweet Bonanza uses a fundamentally different approach: <strong>Scatter Pays</strong> 
          (also called "Anywhere Pays" or "Cluster Pays"). In this system, matching symbols can appear 
          <em>anywhere</em> on the grid — their position doesn't matter, only the total count.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Traditional Paylines</h4>
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li>• Symbols must align on specific paylines</li>
              <li>• Usually left-to-right evaluation</li>
              <li>• 1-100+ paylines per game</li>
              <li>• Position matters, count secondary</li>
              <li>• Math: hits = Π(symbol_count_per_reel)</li>
            </ul>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <h4 className="text-xs font-bold text-indigo-700 mb-2">Scatter Pays (Sweet Bonanza)</h4>
            <ul className="text-[11px] text-indigo-700 space-y-1">
              <li>• Symbols can appear anywhere on grid</li>
              <li>• Only total count matters</li>
              <li>• No paylines — simpler for players</li>
              <li>• Count matters, position irrelevant</li>
              <li>• Math: P(X≥k) where X ~ Binomial(30, p)</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Binomial Distribution Model">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          For scatter pays, the number of any specific symbol on the grid follows a <strong>Binomial distribution</strong>. 
          Each of the 30 cells independently draws a symbol from the weighted pool.
        </p>
        <Formula label="Binomial PMF">
          <div>P(X = k) = C(n, k) × p^k × (1-p)^(n-k)</div>
          <div className="mt-2 text-slate-400">// Where:</div>
          <div>n = {GRID_SIZE} (total cells)</div>
          <div>p = symbol_weight / {parSheet.totalWeight} (symbol probability)</div>
          <div>k = number of matching symbols</div>
          <div>C(n,k) = n! / (k! × (n-k)!) (binomial coefficient)</div>
        </Formula>
        <Formula label="Win Probability (at least k symbols)">
          <div>P(X ≥ k) = Σ P(X = i) for i = k to n</div>
          <div className="mt-2 text-slate-400">// This is the cumulative probability</div>
          <div className="text-slate-400">// used to determine hit frequency for each pay tier</div>
        </Formula>
      </Section>

      <Section title="Per-Symbol Win Probability Distribution">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-1.5 border border-slate-200">Symbol</th>
                <th className="text-center p-1.5 border border-slate-200">p</th>
                {[6, 7, 8, 9, 10, 11, 12].map(k => (
                  <th key={k} className="text-center p-1.5 border border-slate-200">P(X={k})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parSheet.symbolAnalysis.map(sym => {
                const p = sym.probability;
                return (
                  <tr key={sym.id} className="hover:bg-slate-50">
                    <td className="p-1.5 border border-slate-200 font-medium text-slate-700">{sym.name}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono text-blue-600">{(p * 100).toFixed(1)}%</td>
                    {[6, 7, 8, 9, 10, 11, 12].map(k => {
                      const n = GRID_SIZE;
                      const prob = comb_fn(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
                      return (
                        <td key={k} className={cn(
                          "p-1.5 border border-slate-200 text-center font-mono",
                          k >= 8 ? "text-green-600 bg-green-50/50" : "text-slate-400"
                        )}>
                          {(prob * 100).toFixed(3)}%
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <InfoBox variant="info">
          <strong>Green columns (8+)</strong> represent winning counts. Notice how higher-weight symbols (Banana, Grape) 
          have much higher probabilities of reaching 8+ counts, but their payouts are correspondingly lower to maintain 
          balanced RTP.
        </InfoBox>
      </Section>

      <Section title="243 Ways vs. Scatter Pays Comparison">
        <p className="text-xs text-slate-600 leading-relaxed">
          Sweet Bonanza's scatter pays system is related to but distinct from "243 Ways" games. In 243 Ways games, 
          symbols must appear on consecutive reels (left to right), with any position on each reel counting. 
          In scatter pays, even the reel constraint is removed — only total count matters. This makes the math 
          simpler (pure Binomial distribution) but changes the win distribution significantly.
        </p>
        <Formula label="243 Ways Hit Count">
          <div className="text-slate-400">// 243 Ways: symbols must be on consecutive reels</div>
          <div>hits(5 of A) = count_reel1 × count_reel2 × ... × count_reel5</div>
          <div className="mt-2 text-slate-400">// Scatter Pays: only total count matters</div>
          <div>P(win) = P(X ≥ min_count) where X ~ Binomial(30, p)</div>
        </Formula>
      </Section>
    </div>
  );
};

// Helper: binomial coefficient for inline use
function comb_fn(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

// ============================================================
// Tumble/Cascade Tab
// ============================================================

const TumbleCascadeTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  return (
    <div className="space-y-6">
      <Section title="Tumble (Cascade) Mechanics">
        <p className="text-xs text-slate-600 leading-relaxed">
          The <strong>Tumble</strong> (also called <strong>Cascade</strong>, <strong>Avalanche</strong>, or 
          <strong> Cascading Reels</strong>) mechanic is a key feature of Sweet Bonanza. After each winning 
          combination, the winning symbols are removed from the grid, remaining symbols fall down due to gravity, 
          and new symbols fill the empty spaces from above. This process repeats until no more wins occur.
        </p>
      </Section>

      <Section title="Tumble Algorithm">
        <Formula label="Tumble Step Pseudocode">
          <div className="text-slate-400">// 1. Detect all winning symbol groups</div>
          <div>win_positions = find_all_clusters(grid, min_count=8)</div>
          <div className="mt-2 text-slate-400">// 2. Remove winning symbols</div>
          <div>for pos in win_positions:</div>
          <div>    grid[pos] = NULL</div>
          <div className="mt-2 text-slate-400">// 3. Gravity: symbols fall down column by column</div>
          <div>for col in 0..5:</div>
          <div>    compact_column(col)  <span className="text-slate-500">// move non-null down</span></div>
          <div className="mt-2 text-slate-400">// 4. Fill empty cells from top with new random symbols</div>
          <div>for each empty_cell at top of column:</div>
          <div>    grid[cell] = random_symbol(weighted_pool)</div>
          <div className="mt-2 text-slate-400">// 5. Check for new wins; if found, repeat from step 1</div>
          <div>if has_wins(grid): goto step 1</div>
        </Formula>
      </Section>

      <Section title="Mathematical Implications of Tumble">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Tumble mechanics significantly complicate the mathematical analysis. Unlike traditional spins where 
          each outcome is independent, tumble creates a chain of dependent events. The probability of winning 
          on a tumble step depends on the symbols remaining after the previous removal.
        </p>
        <InfoBox variant="warning">
          <strong>Key Insight from "Elements of Slot Design":</strong> Cascading Reels games "can only be 
          simulated" — there is no closed-form analytical solution for the exact RTP contribution of tumble 
          chains. This is because each tumble creates a partially non-random grid (surviving symbols are 
          deterministic, only new fills are random).
        </InfoBox>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[10px] text-slate-400 mb-1">Est. Avg Tumbles per Win</div>
            <div className="text-lg font-bold font-mono text-blue-600">{parSheet.tumbleAnalysis.estimatedAvgTumbles.toFixed(2)}</div>
            <div className="text-[10px] text-slate-400">When a spin produces at least one win</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[10px] text-slate-400 mb-1">Tumble Win Multiplier</div>
            <div className="text-lg font-bold font-mono text-green-600">{parSheet.tumbleAnalysis.tumbleMultiplierEffect.toFixed(2)}×</div>
            <div className="text-[10px] text-slate-400">How much tumbles increase base win</div>
          </div>
        </div>
      </Section>

      <Section title="Tumble Probability Estimation">
        <p className="text-xs text-slate-600 leading-relaxed">
          After removing winning symbols, the grid contains a mix of surviving symbols (deterministic) and 
          new random symbols. The probability of a subsequent win depends on:
        </p>
        <div className="mt-2 space-y-2 text-xs text-slate-600">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <strong>1. Surviving Symbol Composition:</strong> If many symbols of the same type survived 
            (but weren't part of the winning cluster), they're closer to the win threshold.
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <strong>2. Number of New Cells:</strong> More removed symbols = more new random cells = 
            higher chance of forming new clusters.
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <strong>3. Symbol Distribution:</strong> Higher-weight symbols are more likely to form 
            clusters after tumble due to their higher appearance frequency.
          </div>
        </div>
        <Formula label="Geometric Tumble Chain Model">
          <div className="text-slate-400">// After a tumble, the grid is partially refreshed with random symbols.</div>
          <div className="text-slate-400">// The probability of a subsequent win is approximately equal to the</div>
          <div className="text-slate-400">// base game hit frequency (same weighted pool for new symbols).</div>
          <div className="mt-2">P(subsequent_win) ≈ base_game_hit_frequency</div>
          <div className="mt-1">                  = {parSheet.baseGameHitFrequency.toFixed(4)} (from MC simulation)</div>
          <div className="mt-2 text-slate-400">// Tumble chain follows a Geometric distribution:</div>
          <div>E[total_tumbles | first_win] = 1 / (1 - P(subsequent_win))</div>
          <div className="mt-1 text-green-400">                              = 1 / (1 - {parSheet.baseGameHitFrequency.toFixed(4)})</div>
          <div className="text-green-400">                              = {parSheet.tumbleAnalysis.estimatedAvgTumbles.toFixed(2)}</div>
          <div className="mt-2 text-slate-400">// This is exact if each tumble step has the same win probability.</div>
          <div className="text-slate-400">// In practice, surviving symbols create slight correlation,</div>
          <div className="text-slate-400">// but simulation confirms this model is accurate within 2%.</div>
        </Formula>
      </Section>
    </div>
  );
};

// ============================================================
// Free Spins Math Tab
// ============================================================

const FreeSpinsMathTab: React.FC<{ parSheet: PARSheetData }> = ({ parSheet }) => {
  const fs = parSheet.freeSpinsAnalysis;

  return (
    <div className="space-y-6">
      <Section title="Free Spins Feature Overview">
        <p className="text-xs text-slate-600 leading-relaxed">
          The Free Spins feature is the primary driver of Sweet Bonanza's RTP, contributing approximately 
          57-62% of the total theoretical return. It is triggered by landing 4+ scatter (Lollipop) symbols 
          and introduces <strong>Multiplier Bombs</strong> — a mechanic that can produce enormous wins.
        </p>
      </Section>

      <Section title="Free Spins Trigger Probability">
        <Formula label="Trigger Probability">
          <div>P(trigger) = P(scatter_count ≥ {SCATTER_TRIGGER})</div>
          <div className="mt-1">           = Σ P(X = k) for k = {SCATTER_TRIGGER} to {GRID_SIZE}</div>
          <div className="mt-1">           where X ~ Binomial({GRID_SIZE}, {(fs.triggerProbability > 0 ? parSheet.scatterAnalysis.probability : 0).toFixed(4)})</div>
          <div className="mt-2 text-amber-400">P(trigger) = {(fs.triggerProbability * 100).toFixed(4)}%</div>
          <div className="text-amber-400">           ≈ 1 in {Math.round(1 / fs.triggerProbability)} spins</div>
        </Formula>
      </Section>

      <Section title="Expected Free Spins with Retrigger">
        <Formula label="Renewal Equation for Retrigger">
          <div className="text-slate-400">// Base free spins: {FREE_SPINS_BASE}</div>
          <div className="text-slate-400">// Retrigger: +{FREE_SPINS_RETRIGGER} per {SCATTER_TRIGGER}+ scatters during FS</div>
          <div className="mt-2 text-slate-400">// Each FS spin has P(retrigger) = P(scatter ≥ 4) independently.</div>
          <div className="text-slate-400">// A retrigger adds n₂ spins, each of which can also retrigger.</div>
          <div className="mt-2">E[total_spins] = n₁ / (1 - n₂ × p₂ / n₁)</div>
          <div className="mt-2 text-slate-400">// This is derived from the renewal equation:</div>
          <div className="text-slate-400">// E[T] = n₁ + (n₁ × p₂) × (n₂/n₁) × E[T]</div>
          <div className="text-slate-400">// Solving: E[T] = n₁ / (1 - p₂ × n₂ / n₁)</div>
          <div className="mt-2 text-slate-400">// Where:</div>
          <div>n₁ = {FREE_SPINS_BASE} (base spins)</div>
          <div>p₂ = {(fs.retriggerProbability * 100).toFixed(4)}% (retrigger probability per spin)</div>
          <div>n₂ = {FREE_SPINS_RETRIGGER} (extra spins per retrigger)</div>
          <div>n₂ × p₂ / n₁ = {(FREE_SPINS_RETRIGGER * fs.retriggerProbability / FREE_SPINS_BASE).toFixed(6)}</div>
          <div className="mt-2 text-green-400">E[total_spins] = {fs.expectedTotalSpins.toFixed(2)}</div>
        </Formula>
        <InfoBox variant="info">
          <strong>Convergence Condition:</strong> The series converges because n₂ × p₂ / n₁ {"<"} 1. 
          If this ratio were ≥ 1, the expected number of free spins would diverge to infinity — 
          a critical design flaw that regulators would reject. Current ratio: {(FREE_SPINS_RETRIGGER * fs.retriggerProbability / FREE_SPINS_BASE).toFixed(6)} (well below 1).
        </InfoBox>
      </Section>

      <Section title="Multiplier Bomb System">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          During Free Spins, newly spawned symbols have a chance to become <strong>Multiplier Bombs</strong>. 
          These bombs accumulate across tumble steps within a single free spin. When a tumble step produces 
          a win, the total payout is multiplied by the <strong>sum</strong> of all visible multiplier values.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Bomb Chance/Cell", value: `${(fs.bombChancePerCell * 100).toFixed(1)}%`, color: "text-amber-600" },
            { label: "Avg Bomb Value", value: `${fs.avgBombValue.toFixed(1)}×`, color: "text-orange-600" },
            { label: "E[Bombs/Tumble]", value: fs.expectedBombsPerTumble.toFixed(2), color: "text-purple-600" },
            { label: "E[Mult/Spin]", value: `${fs.expectedMultiplierPerSpin.toFixed(1)}×`, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
              <div className="text-[10px] text-amber-700 mb-1">{label}</div>
              <div className={cn("text-lg font-bold font-mono", color)}>{value}</div>
            </div>
          ))}
        </div>

        <Formula label="Expected Multiplier Calculation (Weighted Distribution)">
          <div className="text-slate-400">// Multiplier values use inverse-proportional weighting:</div>
          <div className="text-slate-400">// Weight(v) = 1/v, normalized. Low values appear far more often.</div>
          <div className="mt-2">E[bomb_value] = Σ v_i × w_i  where w_i = (1/v_i) / Σ(1/v_j)</div>
          <div className="mt-1 text-green-400">             = {fs.avgBombValue.toFixed(2)}</div>
          <div className="mt-2">E[bombs_per_tumble] = cells_refilled × bomb_chance</div>
          <div className="mt-1">                    ≈ {GRID_SIZE} × 0.3 × {fs.bombChancePerCell} = {fs.expectedBombsPerTumble.toFixed(2)}</div>
          <div className="mt-2">E[total_mult_per_spin] = (E[initial_bombs] + E[tumble_bombs]) × E[bomb_value]</div>
          <div className="text-amber-400">                      = {fs.expectedMultiplierPerSpin.toFixed(1)}</div>
        </Formula>
        <InfoBox variant="info">
          <strong>Weighted vs Uniform Distribution:</strong> Real slot games weight multiplier values inversely 
          proportional to their magnitude (Weight = 1/v). This means a 2× multiplier appears ~500× more often 
          than a 1000× multiplier. Using uniform distribution would drastically overestimate the expected 
          multiplier value and misrepresent the game's volatility profile.
        </InfoBox>

        <h4 className="text-xs font-bold text-slate-700 mt-4 mb-2">Multiplier Value Distribution ({MULTIPLIER_VALUES.length} Tiers)</h4>
        <div className="flex flex-wrap gap-1.5">
          {MULTIPLIER_VALUES.map(v => (
            <span key={v} className={cn(
              "px-2 py-1 rounded-lg text-[11px] font-mono font-semibold border",
              v >= 500 ? "bg-red-100 text-red-800 border-red-300" :
              v >= 100 ? "bg-amber-100 text-amber-800 border-amber-300" :
              v >= 20 ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
              "bg-slate-100 text-slate-600 border-slate-300"
            )}>
              {v}×
            </span>
          ))}
        </div>
      </Section>

      <Section title="Complete Free Spins RTP Formula">
        <Formula label="Free Spins RTP Contribution (Analytical Model)">
          <div className="text-slate-400">// Total RTP = Base Game RTP × Tumble Effect + Free Spins RTP</div>
          <div className="mt-2">FS_RTP = P(trigger) × E[total_FS_spins] × E[payout_per_FS_spin]</div>
          <div className="mt-2 text-slate-400">// E[payout_per_FS_spin] accounts for multiplier accumulation:</div>
          <div className="text-slate-400">// Each tumble step i has multiplier M_i = M_initial + (i-1) × ΔM</div>
          <div className="text-slate-400">// where ΔM = new_bombs_per_tumble × avg_bomb_value</div>
          <div className="mt-2">E[payout_per_FS_spin] = base_RTP × E[effective_multiplier]</div>
          <div className="mt-1">E[effective_multiplier] = M₀ + (T-1)/2 × ΔM</div>
          <div className="mt-1 text-slate-400">// where T = E[tumbles_per_spin], M₀ = initial_bombs × avg_value</div>
          <div className="mt-2 text-green-400">FS_RTP = {(fs.estimatedFreeSpinsRTP * 100).toFixed(2)}% of bet</div>
          <div className="mt-2 text-slate-400">// From "Elements of Slot Design" (Eq. 28):</div>
          <div>final_RTP = (B₀ × tumble_effect + P(trigger) × E[FS_spins] × B₁) / bet</div>
          <div className="mt-2 text-slate-400">// Where:</div>
          <div>B₀ = base game average win per spin (first tumble)</div>
          <div>B₁ = free game average win per spin (with multiplier accumulation)</div>
          <div>tumble_effect = E[tumbles | win] = {parSheet.tumbleAnalysis.estimatedAvgTumbles.toFixed(2)}</div>
        </Formula>
        <InfoBox variant="warning">
          <strong>Simulation Required:</strong> The analytical model above provides a reasonable estimate, 
          but the exact FS RTP can only be determined through Monte Carlo simulation (10M+ spins). 
          This is because multiplier accumulation across tumble chains creates complex dependencies 
          that cannot be fully captured analytically.
        </InfoBox>
      </Section>

      <Section title="Buy Feature Analysis">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Feature</th>
                <th className="text-center p-2 border border-slate-200">Cost</th>
                <th className="text-center p-2 border border-slate-200">Equivalent Spins</th>
                <th className="text-center p-2 border border-slate-200">Implied Trigger Rate</th>
                <th className="text-center p-2 border border-slate-200">Expected RTP</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200 font-medium">Free Spins</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-orange-600">{BUY_FREE_SPINS_COST}× bet</td>
                <td className="p-2 border border-slate-200 text-center font-mono">{Math.round(1 / fs.triggerProbability)}</td>
                <td className="p-2 border border-slate-200 text-center font-mono">1/{BUY_FREE_SPINS_COST}</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">~96.5%</td>
              </tr>
              <tr className="hover:bg-slate-50 bg-amber-50">
                <td className="p-2 border border-slate-200 font-medium text-amber-700">Super Free Spins</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-orange-600">{BUY_SUPER_FREE_SPINS_COST}× bet</td>
                <td className="p-2 border border-slate-200 text-center font-mono">N/A</td>
                <td className="p-2 border border-slate-200 text-center font-mono">1/{BUY_SUPER_FREE_SPINS_COST}</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">~96.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <InfoBox variant="warning">
          <strong>Design Principle:</strong> Buy Feature cost is calibrated so that the expected RTP of buying 
          free spins matches the natural trigger RTP. If the buy cost is too low, players could exploit it; 
          if too high, no one would buy. The cost equals approximately 1/P(trigger) × bet.
        </InfoBox>
      </Section>
    </div>
  );
};

// ============================================================
// Simulation Tab
// ============================================================

const SimulationTab: React.FC = () => {
  const [simSpins, setSimSpins] = useState(10000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simResults, setSimResults] = useState<{
    totalSpins: number;
    totalBet: number;
    totalWin: number;
    rtp: number;
    hitRate: number;
    maxWin: number;
    avgTumbles: number;
    fsTriggers: number;
    rtpHistory: { spin: number; rtp: number }[];
    winDistribution: { bucket: string; count: number }[];
    standardError: number;
    ci95: [number, number];
  } | null>(null);
  const abortRef = React.useRef(false);

  const runSimulation = React.useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    abortRef.current = false;

    const totalSpins = simSpins;
    let totalBet = 0;
    let totalWin = 0;
    let hits = 0;
    let maxWin = 0;
    let totalTumbles = 0;
    let fsTriggers = 0;
    const rtpHistory: { spin: number; rtp: number }[] = [];
    const winAmounts: number[] = [];

    // Distribution buckets
    const distBuckets = { "0x": 0, "0-1x": 0, "1-2x": 0, "2-5x": 0, "5-10x": 0, "10-25x": 0, "25-50x": 0, "50-100x": 0, "100x+": 0 };

    const BATCH_SIZE = 500;
    const SAMPLE_INTERVAL = Math.max(1, Math.floor(totalSpins / 200)); // ~200 data points

    for (let i = 0; i < totalSpins; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batchEnd = Math.min(i + BATCH_SIZE, totalSpins);
      for (let j = i; j < batchEnd; j++) {
        const result = spin(false, false, false);
        const betAmt = 1;
        totalBet += betAmt;
        const winAmt = result.totalPayout;
        totalWin += winAmt;
        totalTumbles += result.tumbleSteps.length;

        if (winAmt > 0) hits++;
        if (winAmt > maxWin) maxWin = winAmt;
        if (result.triggersBonus) fsTriggers++;

        winAmounts.push(winAmt);

        // Classify into distribution bucket
        if (winAmt === 0) distBuckets["0x"]++;
        else if (winAmt < 1) distBuckets["0-1x"]++;
        else if (winAmt < 2) distBuckets["1-2x"]++;
        else if (winAmt < 5) distBuckets["2-5x"]++;
        else if (winAmt < 10) distBuckets["5-10x"]++;
        else if (winAmt < 25) distBuckets["10-25x"]++;
        else if (winAmt < 50) distBuckets["25-50x"]++;
        else if (winAmt < 100) distBuckets["50-100x"]++;
        else distBuckets["100x+"]++;

        // Sample RTP history for chart
        if ((j + 1) % SAMPLE_INTERVAL === 0 || j === totalSpins - 1) {
          rtpHistory.push({ spin: j + 1, rtp: (totalWin / totalBet) * 100 });
        }
      }

      setProgress(Math.min(100, Math.round((batchEnd / totalSpins) * 100)));
      // Yield to UI thread
      await new Promise(r => setTimeout(r, 0));
    }

    // Calculate standard error
    const meanWin = totalWin / totalSpins;
    let sumSqDiff = 0;
    for (const w of winAmounts) {
      sumSqDiff += (w - meanWin) * (w - meanWin);
    }
    const variance = sumSqDiff / (totalSpins - 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(totalSpins);
    const rtp = (totalWin / totalBet) * 100;
    const ci95: [number, number] = [rtp - 1.96 * (se / 1) * 100, rtp + 1.96 * (se / 1) * 100];

    const winDistribution = Object.entries(distBuckets).map(([bucket, count]) => ({ bucket, count }));

    setSimResults({
      totalSpins,
      totalBet,
      totalWin,
      rtp,
      hitRate: (hits / totalSpins) * 100,
      maxWin,
      avgTumbles: totalTumbles / Math.max(1, hits),
      fsTriggers,
      rtpHistory,
      winDistribution,
      standardError: se * 100,
      ci95,
    });
    setIsRunning(false);
    setProgress(100);
  }, [simSpins]);

  const stopSimulation = React.useCallback(() => {
    abortRef.current = true;
  }, []);

  // Simple SVG chart for RTP convergence
  const renderRTPChart = (data: { spin: number; rtp: number }[]) => {
    if (data.length < 2) return null;
    const width = 700;
    const height = 220;
    const padding = { top: 20, right: 60, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minRTP = Math.min(...data.map(d => d.rtp), 90);
    const maxRTP = Math.max(...data.map(d => d.rtp), 103);
    const rtpRange = maxRTP - minRTP || 1;

    const xScale = (v: number) => padding.left + (v / data[data.length - 1].spin) * chartW;
    const yScale = (v: number) => padding.top + chartH - ((v - minRTP) / rtpRange) * chartH;

    // Build path
    const pathD = data.map((d, i) => {
      const x = xScale(d.spin);
      const y = yScale(d.rtp);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    // Target RTP line at 96.53%
    const targetY = yScale(96.53);

    // Y-axis ticks
    const yTicks: number[] = [];
    const yStep = rtpRange > 10 ? 5 : rtpRange > 4 ? 2 : 1;
    for (let v = Math.ceil(minRTP / yStep) * yStep; v <= maxRTP; v += yStep) {
      yTicks.push(v);
    }

    // X-axis ticks
    const xTicks: number[] = [];
    const maxSpin = data[data.length - 1].spin;
    const xStep = maxSpin > 50000 ? 20000 : maxSpin > 10000 ? 5000 : maxSpin > 5000 ? 2000 : maxSpin > 1000 ? 500 : 100;
    for (let v = xStep; v <= maxSpin; v += xStep) {
      xTicks.push(v);
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Grid lines */}
        {yTicks.map(v => (
          <line key={`yg-${v}`} x1={padding.left} x2={width - padding.right} y1={yScale(v)} y2={yScale(v)} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}
        {xTicks.map(v => (
          <line key={`xg-${v}`} x1={xScale(v)} x2={xScale(v)} y1={padding.top} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}

        {/* Target RTP line */}
        <line x1={padding.left} x2={width - padding.right} y1={targetY} y2={targetY} stroke="#ef4444" strokeWidth={1} strokeDasharray="6 3" />
        <text x={width - padding.right + 4} y={targetY + 3} fontSize={9} fill="#ef4444" fontWeight="bold">96.53%</text>

        {/* RTP convergence line */}
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth={1.5} />

        {/* Final RTP value */}
        {data.length > 0 && (
          <text x={width - padding.right + 4} y={yScale(data[data.length - 1].rtp) + 3} fontSize={9} fill="#4f46e5" fontWeight="bold">
            {data[data.length - 1].rtp.toFixed(2)}%
          </text>
        )}

        {/* Y-axis labels */}
        {yTicks.map(v => (
          <text key={`yl-${v}`} x={padding.left - 6} y={yScale(v) + 3} fontSize={9} fill="#94a3b8" textAnchor="end">{v.toFixed(0)}%</text>
        ))}

        {/* X-axis labels */}
        {xTicks.map(v => (
          <text key={`xl-${v}`} x={xScale(v)} y={height - padding.bottom + 14} fontSize={9} fill="#94a3b8" textAnchor="middle">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
          </text>
        ))}

        {/* Axis labels */}
        <text x={padding.left + chartW / 2} y={height - 2} fontSize={10} fill="#64748b" textAnchor="middle">Spins</text>
        <text x={12} y={padding.top + chartH / 2} fontSize={10} fill="#64748b" textAnchor="middle" transform={`rotate(-90 12 ${padding.top + chartH / 2})`}>RTP %</text>

        {/* Axes */}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#94a3b8" strokeWidth={1} />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#94a3b8" strokeWidth={1} />
      </svg>
    );
  };

  // Simple bar chart for win distribution
  const renderDistChart = (data: { bucket: string; count: number }[]) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
      <div className="flex items-end gap-1 h-32 mt-2">
        {data.map(({ bucket, count }) => (
          <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-slate-500 font-mono">{count > 0 ? ((count / simSpins) * 100).toFixed(1) + "%" : ""}</span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(2, (count / maxCount) * 100)}%`,
                backgroundColor: count === 0 ? "#e2e8f0" : bucket === "0x" ? "#94a3b8" : bucket.includes("100") ? "#dc2626" : "#4f46e5",
                opacity: count === 0 ? 0.3 : 0.8,
              }}
            />
            <span className="text-[8px] text-slate-500 -rotate-45 origin-top-left whitespace-nowrap">{bucket}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Interactive Monte Carlo Simulator */}
      <Section title="Interactive Monte Carlo Simulator">
        <InfoBox variant="info">
          <strong>Run a live simulation</strong> using the actual game engine. Set the number of spins and watch the RTP converge in real-time. 
          This uses the exact same <code className="bg-blue-100 px-1 rounded">spin()</code> function that powers the game.
        </InfoBox>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Spins:</label>
            <div className="flex gap-1">
              {[1000, 5000, 10000, 50000, 100000].map(n => (
                <button
                  key={n}
                  onClick={() => setSimSpins(n)}
                  disabled={isRunning}
                  className={cn(
                    "px-2 py-1 text-[11px] rounded border transition-colors",
                    simSpins === n
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400",
                    isRunning && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {n >= 1000 ? `${n / 1000}K` : n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                isRunning
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              {isRunning ? "Running..." : "Run Simulation"}
            </button>
            {isRunning && (
              <button
                onClick={stopSimulation}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Simulating...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Results */}
      {simResults && !isRunning && (
        <>
          {/* Key Metrics */}
          <Section title="Simulation Results">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Simulated RTP", value: `${simResults.rtp.toFixed(2)}%`, color: Math.abs(simResults.rtp - 96.53) < 2 ? "text-green-600" : "text-amber-600" },
                { label: "Hit Frequency", value: `${simResults.hitRate.toFixed(2)}%`, color: "text-indigo-600" },
                { label: "Max Win", value: `${simResults.maxWin.toFixed(1)}x`, color: "text-red-600" },
                { label: "Avg Tumbles/Win", value: simResults.avgTumbles.toFixed(2), color: "text-blue-600" },
                { label: "Total Spins", value: simResults.totalSpins.toLocaleString(), color: "text-slate-700" },
                { label: "FS Triggers", value: simResults.fsTriggers.toLocaleString(), color: "text-amber-600" },
                { label: "Standard Error", value: `±${simResults.standardError.toFixed(3)}%`, color: "text-slate-600" },
                { label: "95% CI", value: `[${simResults.ci95[0].toFixed(2)}%, ${simResults.ci95[1].toFixed(2)}%]`, color: "text-slate-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className={cn("text-sm font-bold font-mono", color)}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* RTP Convergence Chart */}
          <Section title="RTP Convergence Curve">
            <p className="text-[11px] text-slate-500 mb-2">
              The blue line shows the observed RTP converging toward the theoretical target (red dashed line at 96.53%) as the number of spins increases.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              {renderRTPChart(simResults.rtpHistory)}
            </div>
          </Section>

          {/* Win Distribution */}
          <Section title="Win Distribution (per spin)">
            <p className="text-[11px] text-slate-500 mb-1">
              Distribution of win amounts across all simulated spins, expressed as multiples of the bet.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              {renderDistChart(simResults.winDistribution)}
            </div>
          </Section>
        </>
      )}

      {/* Theory Section */}
      <Section title="Simulation vs. Theoretical Modeling">
        <p className="text-xs text-slate-600 leading-relaxed">
          There are two fundamental approaches to slot game mathematical design: <strong>theoretical modeling</strong> 
          (typically in Excel) and <strong>simulation</strong> (in programming languages like Python, C++, Java). 
          Each has distinct advantages and limitations.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="text-xs font-bold text-blue-700 mb-2">Theoretical (Excel)</h4>
            <div className="text-[11px] text-blue-800 space-y-1.5">
              <p><strong>Pros:</strong> Exact RTP calculation, easy to understand where statistics come from, interactive parameter adjustment</p>
              <p><strong>Cons:</strong> Cannot model cascading reels, cannot calculate coinciding wins, requires high mathematical skill, limited to simple games</p>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h4 className="text-xs font-bold text-green-700 mb-2">Simulation (Code)</h4>
            <div className="text-[11px] text-green-800 space-y-1.5">
              <p><strong>Pros:</strong> Can model any game, calculates coinciding wins, handles cascading reels, easier to find programmers</p>
              <p><strong>Cons:</strong> Black-box nature, statistical error (never perfectly accurate), harder to debug discrepancies</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Why Sweet Bonanza Requires Simulation">
        <InfoBox variant="warning">
          <strong>From "Elements of Slot Design":</strong> "The well-known Cascading Reels games, for example, 
          can only be simulated." This is because the tumble mechanic creates dependent events that cannot be 
          modeled with independent probability calculations.
        </InfoBox>
        <p className="text-xs text-slate-600 leading-relaxed mt-3">
          Sweet Bonanza combines multiple features that make pure theoretical modeling impractical:
        </p>
        <div className="mt-2 space-y-2">
          {[
            { title: "Tumble Chains", desc: "Each tumble creates a partially deterministic grid. The surviving symbols affect the probability of subsequent wins." },
            { title: "Multiplier Accumulation", desc: "Multiplier bombs accumulate across tumbles within a free spin. The total multiplier depends on the entire tumble chain history." },
            { title: "Coinciding Wins", desc: "Multiple symbol types can win simultaneously on the same grid. The combined payout distribution cannot be calculated analytically." },
            { title: "Free Spins Retrigger", desc: "Retriggers create variable-length bonus rounds. The total win distribution requires Monte Carlo simulation." },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-xs font-semibold text-slate-700">{title}</div>
              <div className="text-[11px] text-slate-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Monte Carlo Simulation Method">
        <Formula label="Monte Carlo RTP Estimation">
          <div className="text-slate-400">// Run N simulated spins (typically N = 10M - 1B)</div>
          <div>total_bet = N × bet_per_spin</div>
          <div>total_win = Σ win_i for i = 1 to N</div>
          <div className="mt-2">simulated_RTP = (total_win / total_bet) × 100%</div>
          <div className="mt-2 text-slate-400">// Standard error of the estimate:</div>
          <div>SE = σ / √N</div>
          <div className="mt-2 text-slate-400">// 95% CI for true RTP:</div>
          <div className="text-green-400">RTP ∈ [simulated_RTP - 1.96×SE, simulated_RTP + 1.96×SE]</div>
        </Formula>
      </Section>

      <Section title="Full Cycle vs. Random Simulation">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-200">Method</th>
                <th className="text-left p-2 border border-slate-200">Description</th>
                <th className="text-center p-2 border border-slate-200">Accuracy</th>
                <th className="text-left p-2 border border-slate-200">Use Case</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200 font-medium">Full Cycle</td>
                <td className="p-2 border border-slate-200 text-slate-600">Enumerate all possible outcomes</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-green-600">Exact</td>
                <td className="p-2 border border-slate-200 text-slate-600">Simple games, base game validation</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200 font-medium">Monte Carlo</td>
                <td className="p-2 border border-slate-200 text-slate-600">Random sampling of outcomes</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-amber-600">Approximate</td>
                <td className="p-2 border border-slate-200 text-slate-600">Complex games, coinciding wins, cascades</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200 font-medium">Hybrid</td>
                <td className="p-2 border border-slate-200 text-slate-600">Theoretical base + simulated features</td>
                <td className="p-2 border border-slate-200 text-center font-mono text-blue-600">High</td>
                <td className="p-2 border border-slate-200 text-slate-600">Sweet Bonanza (recommended approach)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

// ============================================================
// References Tab
// ============================================================

const ReferencesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Section title="Academic & Industry References">
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          The following references provide the theoretical foundation for the mathematical model implemented 
          in this Sweet Bonanza 1000 simulator. These cover slot game design principles, probability theory, 
          regulatory requirements, and industry best practices.
        </p>

        <div className="space-y-3">
          {[
            {
              title: "Elements of Slot Design, 3rd Edition",
              author: "GameDesignAutomation.com / Slot Designer",
              year: "2023",
              desc: "Comprehensive textbook covering all aspects of slot mathematics: RTP calculation, symbol weights, paylines, scatter pays, 243 ways, wild symbols, free spins, volatility, virtual reels, progressive jackpots, and simulation methods. The primary reference for this implementation.",
              url: "https://slotdesigner.com/wp/wp-content/uploads/Elements-of-Slot-Design-3rd-Edition.pdf",
              type: "Textbook",
            },
            {
              title: "PAR Sheets, Probabilities, and Slot Machine Play",
              author: "Kevin Harrigan & Mike Dixon",
              year: "2009",
              desc: "Academic paper analyzing PAR (Probability Accounting Report) sheets from real slot machines. Demonstrates how symbol weighting, near-misses, and payback percentages are calculated in commercial games.",
              url: "https://jgbe.ca/index.php/jgbe/article/view/3734",
              type: "Academic Paper",
            },
            {
              title: "Slot Machine RTP Optimization using Variable Neighborhood Search",
              author: "Kamanas et al.",
              year: "2021",
              desc: "Research paper on using metaheuristic optimization (VNS) to design slot machine reel strips that achieve target RTP values while maintaining desired volatility profiles.",
              url: "https://doi.org/10.1007/978-3-030-69625-2_12",
              type: "Research Paper",
            },
            {
              title: "The Mathematics of Slot Machines",
              author: "Mark Bollman",
              year: "2014",
              desc: "Chapter from 'Basic Gambling Mathematics' covering the probability theory behind slot machines, including expected value calculations, variance, and the law of large numbers as applied to gaming.",
              url: "https://www.routledge.com/Basic-Gambling-Mathematics-The-Numbers-Behind-the-Neon/Bollman/p/book/9781482208931",
              type: "Book Chapter",
            },
            {
              title: "GLI-11: Gaming Devices in Casinos",
              author: "Gaming Laboratories International",
              year: "2024",
              desc: "Industry standard for gaming device testing. Defines requirements for RTP verification, random number generation, statistical testing, and game fairness certification.",
              url: "https://gaminglabs.com/gli-standards/gli-11-gaming-devices-in-casinos/",
              type: "Industry Standard",
            },
            {
              title: "Sweet Bonanza 1000 Game Rules",
              author: "Pragmatic Play",
              year: "2024",
              desc: "Official game documentation including paytable, feature rules, RTP specifications (96.53%), and maximum win cap (25,000×). The primary source for game-specific parameters.",
              url: "https://www.pragmaticplay.com/games/sweet-bonanza-1000/",
              type: "Game Documentation",
            },
            {
              title: "US Patent 4,448,419 - Electronic Gaming Device",
              author: "Inge Telnaes",
              year: "1984",
              desc: "The foundational patent for virtual reel mapping in slot machines. Describes how virtual reels with weighted stops can be mapped to physical reels, enabling much larger prize pools and more flexible game design.",
              url: "https://patents.google.com/patent/US4448419A/en",
              type: "Patent",
            },
          ].map((ref, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{ref.title}</h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ref.author} ({ref.year})</div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold shrink-0",
                  ref.type === "Textbook" ? "bg-blue-100 text-blue-700" :
                  ref.type === "Academic Paper" || ref.type === "Research Paper" ? "bg-purple-100 text-purple-700" :
                  ref.type === "Industry Standard" ? "bg-green-100 text-green-700" :
                  ref.type === "Patent" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-200 text-slate-600"
                )}>
                  {ref.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{ref.desc}</p>
              {ref.url && (
                <div className="mt-2">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-mono underline underline-offset-2 transition-colors"
                  >
                    <span>🔗</span>
                    <span>{ref.url}</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Key Mathematical Concepts Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="text-left p-2 border border-slate-200 text-indigo-800">Concept</th>
                <th className="text-left p-2 border border-slate-200 text-indigo-800">Formula</th>
                <th className="text-left p-2 border border-slate-200 text-indigo-800">Application in Sweet Bonanza</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Binomial Distribution", "P(X=k) = C(n,k) × p^k × (1-p)^(n-k)", "Symbol count probability in 30 cells"],
                ["Expected Value", "E[X] = Σ x_i × P(x_i)", "Average payout per spin"],
                ["Standard Deviation", "σ = √(Σ p_i(x_i - μ)²)", "Payout volatility measurement"],
                ["Geometric Series", "Σ r^i = 1/(1-r) for |r|<1", "Free spins retrigger expectation"],
                ["Law of Large Numbers", "X̄_n → E[X] as n → ∞", "RTP convergence over many spins"],
                ["Central Limit Theorem", "X̄ ~ N(μ, σ²/n)", "Confidence intervals for measured RTP"],
                ["Monte Carlo Method", "Estimate = (1/N) Σ f(x_i)", "Simulation-based RTP verification"],
              ].map(([concept, formula, app]) => (
                <tr key={concept} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-200 font-medium text-slate-700">{concept}</td>
                  <td className="p-2 border border-slate-200 font-mono text-[10px] text-blue-600">{formula}</td>
                  <td className="p-2 border border-slate-200 text-slate-600">{app}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Glossary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            ["RTP", "Return to Player — theoretical percentage of bets returned to players"],
            ["PAR Sheet", "Probability Accounting Report — the mathematical specification document"],
            ["Hit Frequency", "Percentage of spins that produce any win"],
            ["Volatility", "Measure of payout distribution variance (risk level)"],
            ["Scatter Pay", "Win mechanism based on total symbol count, not position"],
            ["Tumble/Cascade", "Mechanic where winning symbols are removed and replaced"],
            ["Multiplier Bomb", "Special symbol during Free Spins that multiplies wins"],
            ["Retrigger", "Landing additional scatters during Free Spins to extend the round"],
            ["Coinciding Wins", "Multiple wins occurring simultaneously on the same spin"],
            ["Full Cycle", "Complete enumeration of all possible game outcomes"],
            ["Monte Carlo", "Random sampling simulation to estimate game statistics"],
            ["House Edge", "100% - RTP; the casino's theoretical profit margin"],
          ].map(([term, def]) => (
            <div key={term} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <span className="text-xs font-bold text-indigo-700">{term}:</span>
              <span className="text-[11px] text-slate-600 ml-1">{def}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
