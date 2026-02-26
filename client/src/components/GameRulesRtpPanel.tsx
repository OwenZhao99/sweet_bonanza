import React from "react";
import type { GameId } from "@/hooks/useSlotGame";
import { cn } from "@/lib/utils";

interface GameRulesRtpPanelProps {
  gameId: GameId;
  targetRtp: number;
  actualRtp: number;
  baseBet: number;
  effectiveBet: number;
}

export const GameRulesRtpPanel: React.FC<GameRulesRtpPanelProps> = ({
  gameId,
  targetRtp,
  actualRtp,
  baseBet,
  effectiveBet,
}) => {
  const isSweet = gameId === "sweet-bonanza-1000";
  const isOlympus = gameId === "gates-of-olympus-1000";
  const isFortune = gameId === "fortune-of-olympus";

  const gameName = isSweet
    ? "Sweet Bonanza 1000"
    : isOlympus
    ? "Gates of Olympus 1000"
    : "Fortune of Olympus";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <h3 className="text-sm font-semibold text-slate-800">
          {gameName} – Detailed Rules &amp; RTP Information
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          This page documents rules and payout structure for math and QA only. The current build is a
          local simulation and does not connect to real-money accounts or regulated environments.
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3 text-sm text-slate-700">
        {/* RTP & expectation */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            RTP (Return-to-Player) overview
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <div className="text-[10px] text-emerald-600">Current target theoretical RTP</div>
              <div className="text-lg font-mono font-bold text-emerald-700">
                {targetRtp.toFixed(1)}%
              </div>
              <p className="mt-1 text-[11px] text-emerald-700/80">
                Changing the RTP slider linearly scales the entire payout model so that the long‑term
                theoretical return stays within{" "}
                <span className="font-semibold">75%–200%</span>.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
              <div className="text-[10px] text-slate-500">Observed RTP (this session)</div>
              <div
                className={cn(
                  "text-lg font-mono font-bold",
                  actualRtp === 0
                    ? "text-slate-400"
                    : actualRtp >= targetRtp
                    ? "text-green-600"
                    : "text-amber-600",
                )}
              >
                {actualRtp > 0 ? `${actualRtp.toFixed(1)}%` : "—"}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Based only on local history for this run;
                <span className="font-semibold"> it does not predict future results</span>.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            All RTP values shown here are{" "}
            <span className="font-semibold">long‑term theoretical values</span>: the percentage of
            total wagers that would be returned to players over a very large number of plays.
            This project does not implement progressive jackpots or mystery awards, so RTP comes
            solely from base game and free‑spin features.
          </p>
        </section>

        {/* Bets & limits */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Bet structure & limits
          </h4>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs space-y-1">
            <p>
              •
              <span className="font-semibold"> Base bet</span> (per‑spin stake before multipliers) is{" "}
              <span className="font-mono text-slate-800">{baseBet.toFixed(2)}</span>, typically in the
              range <span className="font-mono">0.20 – 240.00</span> in this demo.
            </p>
            {isFortune ? (
              <p>
                •{" "}
                <span className="font-semibold">
                  Total bet = Base bet × Bet Multiplier
                </span>
                . Multipliers for the special bet modes are: Normal 20×, Ante1 40×, Ante2 140×,
                Super1 200×, Super2 5000×.
              </p>
            ) : (
              <p>
                • Approximate{" "}
                <span className="font-semibold">total bet</span> is{" "}
                <span className="font-semibold">
                  Base bet ×{" "}
                  {isSweet ? "(1.00 when Ante disabled, 1.25 in some Ante modes)" : "1.00"}
                </span>
                . The UI field <span className="font-semibold">“Effective Bet”</span> always shows the
                actual amount deducted per spin.
              </p>
            )}
            <p>
              • For the current configuration, the total stake per spin is{" "}
              <span className="font-mono text-orange-600">
                {effectiveBet.toFixed(2)}
              </span>
              , deducted in full from the balance when you press “Spin”.
            </p>
          </div>
        </section>

        {/* Payout style & odds */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Payout rules & odds
          </h4>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs space-y-1">
            {isSweet && (
              <>
                <p>• 6 columns × 5 rows, for 30 symbol positions.</p>
                <p>• No fixed paylines; wins use a “scatter pays anywhere” mechanic.</p>
                <p>
                  • A symbol appearing{" "}
                  <span className="font-semibold text-amber-700">8 or more times</span> anywhere on the
                  grid awards a win; payout = paytable multiplier × base bet.
                </p>
                <p>
                  • In Free Spins, multiplier bombs (2x–1000x) are summed and applied to the spin’s base
                  win.
                </p>
              </>
            )}
            {isOlympus && (
              <>
                <p>• 6 columns × 5 rows, also using a scatter‑pays‑anywhere model.</p>
                <p>
                  • Each symbol has three pay tiers at{" "}
                  <span className="font-semibold text-emerald-700">8–9 / 10–11 / 12+</span>{" "}
                  occurrences (see the Paytable tab for exact multipliers).
                </p>
                <p>
                  • When a tumble sequence ends, all multiplier orbs on screen are summed and the spin’s
                  total win is multiplied by that sum.
                </p>
              </>
            )}
            {isFortune && (
              <>
                <p>• 7 × 7 grid with a cluster‑pays mechanic.</p>
                <p>
                  • A cluster is a group of{" "}
                  <span className="font-semibold text-emerald-700">5 or more horizontally/vertically
                  adjacent</span>{" "}
                  matching symbols; payout depends on cluster size.
                </p>
                <p>
                  • All cluster wins for a spin are summed, then multiplied by the total multiplier value
                  on screen; in Free Spins, a running total multiplier can carry across spins.
                </p>
              </>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              When multiple wins or clusters occur on the same spin, the engine{" "}
              <span className="font-semibold">adds all win amounts together</span> and credits the sum;
              there is no “pay only the highest line” rule in these games.
            </p>
          </div>
        </section>

        {/* Free spins & extra features */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            Free spins, ante bets & buy features
          </h4>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs space-y-1">
            {isSweet && (
              <>
                <p>
                  • 4 / 5 / 6 scatters trigger 10 Free Spins and pay 2.4x / 4x / 80x base bet
                  respectively.
                </p>
                <p>• During Free Spins, 3 or more scatters retrigger the feature for +5 spins.</p>
                <p>• Ante Bet mode increases base bet by 25% and boosts scatter frequency.</p>
                <p>
                  • Buy Free Spins / Buy Super FS purchase a Free Spins round at a fixed price; the math
                  is equivalent to sampling only from spins that naturally trigger the bonus.
                </p>
              </>
            )}
            {isOlympus && (
              <>
                <p>
                  • 4 / 5 / 6 Zeus scatters trigger 15 Free Spins and award 3x / 5x / 100x total bet on
                  the triggering spin.
                </p>
                <p>• In Free Spins, 3 or more scatters add +5 extra spins.</p>
                <p>
                  • Ante Bet or Buy Free Spins modes increase bonus frequency or jump directly into Free
                  Spins while keeping RTP aligned with the target setting.
                </p>
              </>
            )}
            {isFortune && (
              <>
                <p>
                  • 4–7 scatters anywhere trigger Free Spins with 15 / 20 / 25 / 30 initial spins
                  respectively.
                </p>
                <p>
                  • Additional 4–7 scatters during the feature retrigger the same number of spins for
                  that tier.
                </p>
                <p>
                  • Ante1 / Ante2 / Super1 / Super2 change Free Spins trigger frequency and minimum
                  multiplier values; in this project, RTP is still controlled by the global scaling
                  factor.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Important notes */}
        <section className="space-y-1">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Important notes
          </h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-[11px] text-yellow-800 space-y-1">
            <p>
              • This project is a local math and visualization tool and{" "}
              <span className="font-semibold">does not connect to real accounts or funds</span>.
            </p>
            <p>
              • All results are driven by pseudorandom number generation and{" "}
              <span className="font-semibold">are not adjusted based on player history</span> or past
              wins/losses.
            </p>
            <p>
              • Maximum advertised win multipliers are shown in the header; actual hit probabilities are
              extremely low and are not fully detailed in this demo UI.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

