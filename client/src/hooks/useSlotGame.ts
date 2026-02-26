/**
 * Sweet Bonanza 1000 Replica - Game State Management Hook
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GridCell as SweetGridCell,
  MultiplierCell as SweetMultiplierCell,
  FullSpinResult as SweetFullSpinResult,
  GameStats,
  TumbleStep as SweetTumbleStep,
  VolatilityLevel,
  spin,
  createInitialStats,
  updateStats,
  GRID_SIZE as SWEET_GRID_SIZE,
  FREE_SPINS_BASE,
  FREE_SPINS_RETRIGGER,
  RETRIGGER_SCATTER,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  setRtpMultiplier,
  getTargetRtp,
  getRtpMultiplier,
  setVolatility,
  getVolatility,
} from "@/lib/gameEngine";
import * as Olympus from "@/lib/gameEngineOlympus";
import type {
  GridCell as OlympusGridCell,
  MultiplierCell as OlympusMultiplierCell,
  FullSpinResult as OlympusFullSpinResult,
  TumbleStep as OlympusTumbleStep,
} from "@/lib/gameEngineOlympus";
import * as Fortune from "@/lib/gameEngineFortuneOlympus";
import type {
  GridCell as FortuneGridCell,
  MultiplierCell as FortuneMultiplierCell,
  FullSpinResult as FortuneFullSpinResult,
  TumbleStep as FortuneTumbleStep,
  FortuneBetMode,
} from "@/lib/gameEngineFortuneOlympus";

export type GamePhase =
  | "idle"
  | "spinning"
  | "tumbling"
  | "bonus_trigger"
  | "free_spins"
  | "free_spins_spinning"
  | "free_spins_end"
  | "result";

export type AnteBetMode = "none" | "x20" | "x25";

export type GameId = "sweet-bonanza-1000" | "gates-of-olympus-1000" | "fortune-of-olympus";

// ============================================================
// Spin History Record
// ============================================================

export interface SpinRecord {
  id: number;
  spinNumber: number;
  bet: number;
  win: number;
  multiplier: number;
  tumbles: number;
  triggeredFS: boolean;
  isFreeSpins: boolean;
  timestamp: number;
}

export interface GameState {
  balance: number;
  bet: number;
  gameId: GameId;
  grid: (SweetGridCell | OlympusGridCell | FortuneGridCell)[];
  multipliers: (SweetMultiplierCell | OlympusMultiplierCell | FortuneMultiplierCell)[];
  winPositions: number[];
  currentWinSymbol: string | null;
  phase: GamePhase;
  currentSpinResult: (SweetFullSpinResult | OlympusFullSpinResult | FortuneFullSpinResult) | null;
  currentTumbleIndex: number;
  currentTumbleStep: (SweetTumbleStep | OlympusTumbleStep | FortuneTumbleStep) | null;
  spinWin: number;
  spinWinMultiplier: number;
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  isFreeSpins: boolean;
  isSuperFreeSpins: boolean;
  freeSpinsTotalWin: number;
  anteBetMode: AnteBetMode;
  fortuneBetMode: FortuneBetMode;
  fortuneFeatureMinMultiplierValue: number;
  stats: GameStats;
  lastScatterCount: number;
  lastScatterPayout: number;
  currentMultiplierTotal: number;
  featureMultiplierMeter: number; // Olympus FS running total multiplier
  lastFinalMultiplierSum: number; // Olympus final multiplier sum (per sequence)
  freeSpinsMeterMode: "none" | "per_spin" | "across_spins";
  savedOlympusFsMultiplierChance: number | null;
  message: string;
  autoSpin: boolean;
  autoSpinCount: number;
  autoSpinRemaining: number;
  autoSpinTotal: number;
  animationsEnabled: boolean;
  // Auto spin bet amount (preserved across free spins)
  autoSpinBetAmount: number;
  // Spin history
  spinHistory: SpinRecord[];
  totalSpinCounter: number;
  // Positions of newly dropped symbols (for drop animation)
  droppingPositions: number[];
}

const DEFAULT_BET = 1;
const DEFAULT_BALANCE = 100000;

function getGridSize(gameId: GameId): number {
  if (gameId === "gates-of-olympus-1000") return Olympus.GRID_SIZE;
  if (gameId === "fortune-of-olympus") return Fortune.GRID_SIZE;
  return SWEET_GRID_SIZE;
}

function createInitialState(gameId: GameId): GameState {
  const size = getGridSize(gameId);
  return {
    balance: DEFAULT_BALANCE,
    bet: DEFAULT_BET,
    gameId,
    grid: Array(size).fill(null),
    multipliers: Array(size).fill(null),
    winPositions: [],
    currentWinSymbol: null,
    phase: "idle",
    currentSpinResult: null,
    currentTumbleIndex: -1,
    currentTumbleStep: null,
    spinWin: 0,
    spinWinMultiplier: 0,
    freeSpinsRemaining: 0,
    freeSpinsTotal: 0,
    isFreeSpins: false,
    isSuperFreeSpins: false,
    freeSpinsTotalWin: 0,
    anteBetMode: "none",
    fortuneBetMode: "normal",
    fortuneFeatureMinMultiplierValue: 2,
    stats: createInitialStats(),
    lastScatterCount: 0,
    lastScatterPayout: 0,
    currentMultiplierTotal: 0,
    featureMultiplierMeter: 0,
    lastFinalMultiplierSum: 0,
    freeSpinsMeterMode: "none",
    savedOlympusFsMultiplierChance: null,
    message:
      gameId === "gates-of-olympus-1000"
        ? "Press SPIN to start (Olympus)"
        : gameId === "fortune-of-olympus"
        ? "Press SPIN to start (Fortune)"
        : "Press SPIN to start",
    autoSpin: false,
    autoSpinCount: 0,
    autoSpinRemaining: 0,
    autoSpinTotal: 0,
    animationsEnabled: true,
    autoSpinBetAmount: 0,
    spinHistory: [],
    totalSpinCounter: 0,
    droppingPositions: [],
  };
}

function getEffectiveBet(s: GameState): number {
  if (s.gameId === "fortune-of-olympus") {
    return s.bet * Fortune.BET_MULTIPLIERS[s.fortuneBetMode];
  }
  return s.anteBetMode !== "none" ? s.bet * 1.25 : s.bet;
}

export function useSlotGame(gameId: GameId = "sweet-bonanza-1000") {
  const [state, setState] = useState<GameState>(() => createInitialState(gameId));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<GameState>(createInitialState(gameId));
  const autoSpinStopRef = useRef<boolean>(false);

  // Reset on game switch (avoid mixing timers / engine state)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    autoSpinStopRef.current = false;
    const fresh: GameState = createInitialState(gameId);
    stateRef.current = fresh;
    setState(fresh);
  }, [gameId]);

  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const getDelay = useCallback((normalDelay: number) => {
    return stateRef.current.animationsEnabled ? normalDelay : 0;
  }, []);

  // ============================================================
  // Tumble Sequence
  // ============================================================

  const runTumbleSequence = useCallback(
    (
      spinResult: SweetFullSpinResult | OlympusFullSpinResult | FortuneFullSpinResult,
      betAmount: number,
      isFreeSpins: boolean,
      currentFreeSpinsRemaining: number,
      currentFreeSpinsTotalWin: number,
      currentStats: GameStats
    ) => {
      const steps = spinResult.tumbleSteps;
      const anim = stateRef.current.animationsEnabled;
      const activeIsOlympus = stateRef.current.gameId === "gates-of-olympus-1000";
      const activeIsFortune = stateRef.current.gameId === "fortune-of-olympus";

      if (steps.length === 0) {
        // In free spins, don't count bet or spins (already counted in the triggering spin)
        const statsBet = isFreeSpins ? 0 : betAmount;
        const newStats = updateStats(currentStats, statsBet, 0, 0, false, isFreeSpins, betAmount);
        let newPhase: GamePhase = "idle";
        let message = "No win — try again!";

        if (isFreeSpins) {
          let newRemaining = currentFreeSpinsRemaining - 1;
          if (activeIsFortune) {
            const award = Fortune.freeSpinsForScatterCount(spinResult.scatterCount);
            if (award > 0) newRemaining += award;
          } else if (activeIsOlympus) {
            if (spinResult.scatterCount >= Olympus.SCATTER_RETRIGGER_FS) newRemaining += Olympus.FREE_SPINS_RETRIGGER;
          } else {
            if (spinResult.scatterCount >= RETRIGGER_SCATTER) newRemaining += FREE_SPINS_RETRIGGER;
          }
          if (newRemaining <= 0) {
            newPhase = "free_spins_end";
            message = `Free Spins ended! Total win: ${currentFreeSpinsTotalWin.toFixed(2)}`;
            updateState((prev) => ({
              ...prev,
              phase: newPhase,
              winPositions: [],
              currentWinSymbol: null,
              freeSpinsRemaining: 0,
              stats: newStats,
              message,
            }));
          } else {
            message = `${newRemaining} free spins remaining`;
            updateState((prev) => ({
              ...prev,
              phase: "free_spins_spinning",
              winPositions: [],
              currentWinSymbol: null,
              freeSpinsRemaining: newRemaining,
              stats: newStats,
              message,
            }));
            timerRef.current = setTimeout(() => {
              const fsState = stateRef.current;
              const fsResult = activeIsOlympus
                ? Olympus.spin(true, false, false)
                : activeIsFortune
                ? Fortune.spin(true, {
                    betMode: fsState.fortuneBetMode,
                    minMultiplierValue: fsState.fortuneFeatureMinMultiplierValue,
                  })
                : spin(true, fsState.isSuperFreeSpins, false);
              updateState((prev) => ({
                ...prev,
                grid: fsResult.initialGrid,
                multipliers: fsResult.initialMultipliers,
                winPositions: [],
                currentSpinResult: fsResult,
                lastScatterCount: fsResult.scatterCount,
                message: `Free spinning... ${newRemaining} left`,
              }));
              runTumbleSequence(
                fsResult,
                betAmount,
                true,
                newRemaining,
                currentFreeSpinsTotalWin,
                newStats
              );
            }, anim ? 800 : 0);
          }
        } else {
          updateState((prev) => ({
            ...prev,
            phase: "idle",
            winPositions: [],
            currentWinSymbol: null,
            spinWin: 0,
            spinWinMultiplier: 0,
            stats: newStats,
            message,
          }));
          scheduleNextAutoSpin(betAmount);
        }
        return;
      }

      let stepIndex = 0;
      let cumulativeWin = 0;

      const playNextStep = () => {
        if (stepIndex >= steps.length) {
          if (activeIsOlympus) {
            const olympusSpin = spinResult as OlympusFullSpinResult;
            const finalMultiplierSum = olympusSpin.finalMultiplierSum || 0;

            const meterMode = stateRef.current.freeSpinsMeterMode;
            const meterBefore = stateRef.current.featureMultiplierMeter || 0;
            const hasWin = cumulativeWin > 0;

            let nextMeter = meterBefore;
            let finalWinMultiplier = cumulativeWin;

            if (!isFreeSpins) {
              finalWinMultiplier = cumulativeWin * (finalMultiplierSum > 0 ? finalMultiplierSum : 1);
              nextMeter = 0;
            } else if (meterMode === "across_spins") {
              if (hasWin) nextMeter = meterBefore + finalMultiplierSum;
              const effective = nextMeter > 0 ? nextMeter : 1;
              finalWinMultiplier = hasWin ? cumulativeWin * effective : cumulativeWin;
            } else {
              // per_spin (reset each spin)
              const spinMult = finalMultiplierSum > 0 ? finalMultiplierSum : 1;
              finalWinMultiplier = hasWin ? cumulativeWin * spinMult : cumulativeWin;
              nextMeter = 0;
            }

            // Max win cap (Olympus): 15,000x
            const OLYMPUS_MAX_WIN = 15000;
            if (!isFreeSpins && finalWinMultiplier > OLYMPUS_MAX_WIN) {
              finalWinMultiplier = OLYMPUS_MAX_WIN;
            }

            const totalWin = finalWinMultiplier * betAmount;
            const statsBet = isFreeSpins ? 0 : betAmount;
            const newStats = updateStats(
              currentStats,
              statsBet,
              finalWinMultiplier,
              steps.length,
              spinResult.triggersBonus,
              isFreeSpins,
              betAmount,
            );

            if (isFreeSpins) {
              let newTotalWin = currentFreeSpinsTotalWin + totalWin;
              let newRemaining = currentFreeSpinsRemaining - 1;
              const retriggered = spinResult.scatterCount >= Olympus.SCATTER_RETRIGGER_FS;
              if (retriggered) newRemaining += Olympus.FREE_SPINS_RETRIGGER;

              // Cap for FS cycle as well
              const totalWinMultiplier = newTotalWin / betAmount;
              if (totalWinMultiplier >= OLYMPUS_MAX_WIN) {
                newTotalWin = OLYMPUS_MAX_WIN * betAmount;
                newRemaining = 0;
              }

              if (newRemaining <= 0) {
                updateState((prev) => ({
                  ...prev,
                  phase: "free_spins_end",
                  // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                  grid: (spinResult as OlympusFullSpinResult).finalGrid,
                  multipliers: (spinResult as OlympusFullSpinResult).finalMultipliers,
                  winPositions: [],
                  currentWinSymbol: null,
                  // Olympus credits FS at round end
                  balance: prev.balance,
                  freeSpinsRemaining: 0,
                  freeSpinsTotalWin: newTotalWin,
                  spinWin: totalWin,
                  spinWinMultiplier: finalWinMultiplier,
                  stats: newStats,
                  featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                  currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : finalMultiplierSum,
                  lastFinalMultiplierSum: finalMultiplierSum,
                  message: `Free Spins ended! Total win: ${newTotalWin.toFixed(2)}`,
                }));
              } else {
                const retriggerMsg = retriggered
                  ? `Retriggered! +${Olympus.FREE_SPINS_RETRIGGER} spins! ${newRemaining} remaining`
                  : `${newRemaining} free spins remaining`;
                updateState((prev) => ({
                  ...prev,
                  phase: "free_spins_spinning",
                  // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                  grid: (spinResult as OlympusFullSpinResult).finalGrid,
                  multipliers: (spinResult as OlympusFullSpinResult).finalMultipliers,
                  winPositions: [],
                  currentWinSymbol: null,
                  balance: prev.balance,
                  freeSpinsRemaining: newRemaining,
                  freeSpinsTotalWin: newTotalWin,
                  spinWin: totalWin,
                  spinWinMultiplier: finalWinMultiplier,
                  stats: newStats,
                  featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                  currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : finalMultiplierSum,
                  lastFinalMultiplierSum: finalMultiplierSum,
                  message: retriggerMsg,
                }));
                timerRef.current = setTimeout(() => {
                  const fsResult = Olympus.spin(true, false, false);
                  updateState((prev) => ({
                    ...prev,
                    grid: fsResult.initialGrid,
                    multipliers: fsResult.initialMultipliers,
                    winPositions: [],
                    currentSpinResult: fsResult,
                    lastScatterCount: fsResult.scatterCount,
                    message: `Free spinning... ${newRemaining} left`,
                  }));
                  runTumbleSequence(
                    fsResult,
                    betAmount,
                    true,
                    newRemaining,
                    newTotalWin,
                    newStats,
                  );
                }, anim ? 800 : 0);
              }
            } else {
              const spinNum = stateRef.current.totalSpinCounter;
              const record: SpinRecord = {
                id: Date.now() + Math.random(),
                spinNumber: spinNum,
                bet: betAmount,
                win: totalWin,
                multiplier: finalWinMultiplier,
                tumbles: steps.length,
                triggeredFS: spinResult.triggersBonus,
                isFreeSpins: false,
                timestamp: Date.now(),
              };

              updateState((prev) => ({
                ...prev,
                phase: "idle",
                // Ensure the UI shows the true post-tumble final state (important in turbo mode)
                grid: (spinResult as OlympusFullSpinResult).finalGrid,
                multipliers: (spinResult as OlympusFullSpinResult).finalMultipliers,
                winPositions: [],
                currentWinSymbol: null,
                droppingPositions: [],
                balance: prev.balance + totalWin,
                spinWin: totalWin,
                spinWinMultiplier: finalWinMultiplier,
                stats: newStats,
                lastFinalMultiplierSum: finalMultiplierSum,
                message: totalWin > 0
                  ? `Win: ${totalWin.toFixed(2)} (${finalWinMultiplier.toFixed(2)}x${finalMultiplierSum > 0 ? `, ×${finalMultiplierSum}` : ""})`
                  : "No win — try again!",
                spinHistory: [record, ...prev.spinHistory].slice(0, 1000),
              }));
              scheduleNextAutoSpin(betAmount);
            }
            return;
          }

          if (activeIsFortune) {
            const fortuneSpin = spinResult as FortuneFullSpinResult;
            const finalMultiplierSum = fortuneSpin.finalMultiplierSum || 0;

            const meterMode = stateRef.current.freeSpinsMeterMode;
            const meterBefore = stateRef.current.featureMultiplierMeter || 0;
            const hasWin = cumulativeWin > 0;

            let nextMeter = meterBefore;
            let finalWinMultiplier = cumulativeWin;

            if (!isFreeSpins) {
              finalWinMultiplier = cumulativeWin * (finalMultiplierSum > 0 ? finalMultiplierSum : 1);
              nextMeter = 0;
            } else if (meterMode === "across_spins") {
              if (hasWin) nextMeter = meterBefore + finalMultiplierSum;
              const effective = nextMeter > 0 ? nextMeter : 1;
              finalWinMultiplier = hasWin ? cumulativeWin * effective : cumulativeWin;
            } else {
              const spinMult = finalMultiplierSum > 0 ? finalMultiplierSum : 1;
              finalWinMultiplier = hasWin ? cumulativeWin * spinMult : cumulativeWin;
              nextMeter = 0;
            }

            if (!isFreeSpins && finalWinMultiplier > Fortune.MAX_WIN_MULTIPLIER) {
              finalWinMultiplier = Fortune.MAX_WIN_MULTIPLIER;
            }

            const totalWin = finalWinMultiplier * betAmount;
            const statsBet = isFreeSpins ? 0 : betAmount;
            const newStats = updateStats(
              currentStats,
              statsBet,
              finalWinMultiplier,
              steps.length,
              spinResult.triggersBonus,
              isFreeSpins,
              betAmount,
            );

            if (isFreeSpins) {
              let newTotalWin = currentFreeSpinsTotalWin + totalWin;
              let newRemaining = currentFreeSpinsRemaining - 1;

              const retriggerAward = Fortune.freeSpinsForScatterCount(spinResult.scatterCount);
              const retriggered = retriggerAward > 0;
              if (retriggered) newRemaining += retriggerAward;

              const totalWinMultiplier = newTotalWin / betAmount;
              if (totalWinMultiplier >= Fortune.MAX_WIN_MULTIPLIER) {
                newTotalWin = Fortune.MAX_WIN_MULTIPLIER * betAmount;
                newRemaining = 0;
              }

              if (newRemaining <= 0) {
                updateState((prev) => ({
                  ...prev,
                  phase: "free_spins_end",
                  // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                  grid: fortuneSpin.finalGrid,
                  multipliers: fortuneSpin.finalMultipliers,
                  winPositions: [],
                  currentWinSymbol: null,
                  balance: prev.balance,
                  freeSpinsRemaining: 0,
                  freeSpinsTotalWin: newTotalWin,
                  spinWin: totalWin,
                  spinWinMultiplier: finalWinMultiplier,
                  stats: newStats,
                  featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                  currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : finalMultiplierSum,
                  lastFinalMultiplierSum: finalMultiplierSum,
                  message: `Free Spins ended! Total win: ${newTotalWin.toFixed(2)}`,
                }));
              } else {
                const retriggerMsg = retriggered
                  ? `Retriggered! +${retriggerAward} spins! ${newRemaining} remaining`
                  : `${newRemaining} free spins remaining`;
                updateState((prev) => ({
                  ...prev,
                  phase: "free_spins_spinning",
                  // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                  grid: fortuneSpin.finalGrid,
                  multipliers: fortuneSpin.finalMultipliers,
                  winPositions: [],
                  currentWinSymbol: null,
                  balance: prev.balance,
                  freeSpinsRemaining: newRemaining,
                  freeSpinsTotalWin: newTotalWin,
                  spinWin: totalWin,
                  spinWinMultiplier: finalWinMultiplier,
                  stats: newStats,
                  featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                  currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : finalMultiplierSum,
                  lastFinalMultiplierSum: finalMultiplierSum,
                  message: retriggerMsg,
                }));
                timerRef.current = setTimeout(() => {
                  const fsState = stateRef.current;
                  const fsResult = Fortune.spin(true, {
                    betMode: fsState.fortuneBetMode,
                    minMultiplierValue: fsState.fortuneFeatureMinMultiplierValue,
                  });
                  updateState((prev) => ({
                    ...prev,
                    grid: fsResult.initialGrid,
                    multipliers: fsResult.initialMultipliers,
                    winPositions: [],
                    currentSpinResult: fsResult,
                    lastScatterCount: fsResult.scatterCount,
                    message: `Free spinning... ${newRemaining} left`,
                  }));
                  runTumbleSequence(
                    fsResult,
                    betAmount,
                    true,
                    newRemaining,
                    newTotalWin,
                    newStats,
                  );
                }, anim ? 800 : 0);
              }
            } else {
              const spinNum = stateRef.current.totalSpinCounter;
              const record: SpinRecord = {
                id: Date.now() + Math.random(),
                spinNumber: spinNum,
                bet: betAmount,
                win: totalWin,
                multiplier: finalWinMultiplier,
                tumbles: steps.length,
                triggeredFS: spinResult.triggersBonus,
                isFreeSpins: false,
                timestamp: Date.now(),
              };

              updateState((prev) => ({
                ...prev,
                phase: "idle",
                // Ensure the UI shows the true post-tumble final state (important in turbo mode)
                grid: fortuneSpin.finalGrid,
                multipliers: fortuneSpin.finalMultipliers,
                winPositions: [],
                currentWinSymbol: null,
                droppingPositions: [],
                balance: prev.balance + totalWin,
                spinWin: totalWin,
                spinWinMultiplier: finalWinMultiplier,
                stats: newStats,
                lastFinalMultiplierSum: finalMultiplierSum,
                message:
                  totalWin > 0
                    ? `Win: ${totalWin.toFixed(2)} (${finalWinMultiplier.toFixed(2)}x${finalMultiplierSum > 0 ? `, ×${finalMultiplierSum}` : ""})`
                    : "No win — try again!",
                spinHistory: [record, ...prev.spinHistory].slice(0, 1000),
              }));
              scheduleNextAutoSpin(betAmount);
            }
            return;
          }

          // === Sweet settlement ===
          const meterMode = stateRef.current.freeSpinsMeterMode;
          const meterBefore = stateRef.current.featureMultiplierMeter || 0;
          const hasWin = cumulativeWin > 0;
          let nextMeter = meterBefore;
          let displayMultiplierTotal = 0;

          // In free spins, apply multiplier at end of tumble sequence.
          // - per_spin: use this spin's multiplier sum, then reset
          // - across_spins (Buy FS): accumulate across spins and use meter even if this spin has no new multipliers
          if (isFreeSpins && steps.length > 0 && hasWin) {
            const spinMultiplierSum = (steps[steps.length - 1] as SweetTumbleStep).multiplierTotal || 0;
            if (meterMode === "across_spins") {
              nextMeter = meterBefore + spinMultiplierSum;
              const effective = nextMeter > 0 ? nextMeter : 1;
              cumulativeWin *= effective;
              displayMultiplierTotal = nextMeter;
            } else {
              const effective = spinMultiplierSum > 0 ? spinMultiplierSum : 1;
              cumulativeWin *= effective;
              nextMeter = 0;
              displayMultiplierTotal = spinMultiplierSum;
            }
          } else if (isFreeSpins) {
            // No win on this spin: meter persists only for across_spins mode
            nextMeter = meterMode === "across_spins" ? meterBefore : 0;
            displayMultiplierTotal = meterMode === "across_spins" ? meterBefore : 0;
          }
          const totalWin = cumulativeWin * betAmount;
          // In free spins, don't count bet or spins (already counted in the triggering spin)
          const statsBet = isFreeSpins ? 0 : betAmount;
          const newStats = updateStats(
            currentStats,
            statsBet,
            cumulativeWin,
            steps.length,
            spinResult.triggersBonus,
            isFreeSpins,
            betAmount
          );

          // In animation mode, balance was already added step-by-step (base payout only).
          // In turbo mode, add full totalWin at once.
          // For FS with multiplier: animation mode already added base payouts step-by-step,
          // so we need to add the multiplier bonus (totalWin - basePayout*betAmount).
          const basePayout = steps.reduce((sum, s) => sum + s.payout, 0);
          const baseWinAmount = basePayout * betAmount;
          const multiplierBonus = totalWin - baseWinAmount; // extra from multiplier
          const shouldAddBalance = !anim;
          const animMultiplierBonus = anim && isFreeSpins && multiplierBonus > 0 ? multiplierBonus : 0;

          if (isFreeSpins) {
            const MAX_WIN_CAP = 25000; // 25,000x bet max win
            let newTotalWin = currentFreeSpinsTotalWin + totalWin;
            let newRemaining = currentFreeSpinsRemaining - 1;

            const retriggered = spinResult.scatterCount >= RETRIGGER_SCATTER;
            if (retriggered) {
              newRemaining += FREE_SPINS_RETRIGGER;
            }

            // Max win cap: if total FS win reaches 25,000x bet, end immediately
            const totalWinMultiplier = newTotalWin / betAmount;
            if (totalWinMultiplier >= MAX_WIN_CAP) {
              newTotalWin = MAX_WIN_CAP * betAmount;
              newRemaining = 0; // force end
            }

            if (newRemaining <= 0) {
              updateState((prev) => ({
                ...prev,
                phase: "free_spins_end",
                // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                grid: spinResult.finalGrid,
                multipliers: spinResult.finalMultipliers,
                winPositions: [],
                currentWinSymbol: null,
                balance: shouldAddBalance ? prev.balance + totalWin : prev.balance + animMultiplierBonus,
                freeSpinsRemaining: 0,
                freeSpinsTotalWin: newTotalWin,
                spinWin: totalWin,
                spinWinMultiplier: cumulativeWin,
                stats: newStats,
                featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : displayMultiplierTotal,
                message: `Free Spins ended! Total win: ${newTotalWin.toFixed(2)}`,
              }));
            } else {
              const retriggerMsg = retriggered
                ? `Retriggered! +${FREE_SPINS_RETRIGGER} spins! ${newRemaining} remaining`
                : `${newRemaining} free spins remaining`;
              updateState((prev) => ({
                ...prev,
                phase: "free_spins_spinning",
                // Ensure UI reflects final post-tumble state for this spin (important in turbo mode)
                grid: spinResult.finalGrid,
                multipliers: spinResult.finalMultipliers,
                winPositions: [],
                currentWinSymbol: null,
                balance: shouldAddBalance ? prev.balance + totalWin : prev.balance + animMultiplierBonus,
                freeSpinsRemaining: newRemaining,
                freeSpinsTotalWin: newTotalWin,
                spinWin: totalWin,
                spinWinMultiplier: cumulativeWin,
                stats: newStats,
                featureMultiplierMeter: meterMode === "across_spins" ? nextMeter : 0,
                currentMultiplierTotal: meterMode === "across_spins" ? nextMeter : displayMultiplierTotal,
                message: retriggerMsg,
              }));
              timerRef.current = setTimeout(() => {
                const fsState = stateRef.current;
                const fsResult = spin(true, fsState.isSuperFreeSpins, false);
                updateState((prev) => ({
                  ...prev,
                  grid: fsResult.initialGrid,
                  multipliers: fsResult.initialMultipliers,
                  winPositions: [],
                  currentSpinResult: fsResult,
                  lastScatterCount: fsResult.scatterCount,
                  message: `Free spinning... ${newRemaining} left`,
                }));
                runTumbleSequence(
                  fsResult,
                  betAmount,
                  true,
                  newRemaining,
                  newTotalWin,
                  newStats
                );
              }, anim ? 800 : 0);
            }
          } else {
            // Record spin history
            const spinNum = stateRef.current.totalSpinCounter;
            const record: SpinRecord = {
              id: Date.now() + Math.random(),
              spinNumber: spinNum,
              bet: betAmount,
              win: totalWin,
              multiplier: cumulativeWin,
              tumbles: steps.length,
              triggeredFS: spinResult.triggersBonus,
              isFreeSpins: false,
              timestamp: Date.now(),
            };

            // #region agent log
            const n = newStats.totalSpins;
            if (n === 1 || n % 100 === 0 || n === 1000) {
              fetch("http://127.0.0.1:7491/ingest/1ac776a0-99df-4f99-9de6-75896fb8fe70", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a04187" },
                body: JSON.stringify({
                  sessionId: "a04187",
                  runId: "ui-rtp",
                  hypothesisId: n === 1 ? "H2" : "H3",
                  location: "useSlotGame.ts:runTumbleSequence",
                  message: n === 1 ? "First spin RTP config" : `After ${n} spins`,
                  data: {
                    totalSpins: newStats.totalSpins,
                    totalBet: newStats.totalBet,
                    totalWin: newStats.totalWin,
                    realRtp: newStats.realRTP,
                    targetRtp: getTargetRtp(),
                    rtpMultiplier: getRtpMultiplier(),
                  },
                  timestamp: Date.now(),
                }),
              }).catch(() => {});
            }
            // #endregion

            updateState((prev) => ({
              ...prev,
              phase: "idle",
              // Ensure the UI shows the true post-tumble final state (important in turbo mode)
              grid: spinResult.finalGrid,
              multipliers: spinResult.finalMultipliers,
              winPositions: [],
              currentWinSymbol: null,
              droppingPositions: [],
              balance: shouldAddBalance ? prev.balance + totalWin : prev.balance,
              spinWin: totalWin,
              spinWinMultiplier: cumulativeWin,
              stats: newStats,
              message: totalWin > 0
                ? `Win: ${totalWin.toFixed(2)} (${cumulativeWin.toFixed(2)}x)`
                : "No win — try again!",
              spinHistory: [record, ...prev.spinHistory].slice(0, 1000),
            }));
            scheduleNextAutoSpin(betAmount);
          }
          return;
        }

        const step = steps[stepIndex];
        const winPositions: number[] = [];
        for (const win of step.wins) {
          winPositions.push(...win.positions);
        }

        // In FS, don't multiply per-step; multiplier is applied at end of sequence
        let stepWin = step.payout;
        cumulativeWin += stepWin;
        const stepWinAmount = stepWin * betAmount;

        const mainWin = step.wins.reduce(
          (best, w) => (w.payout > best.payout ? w : best),
          step.wins[0]
        );

        // Phase 1: Show winning symbols highlighted (500ms)
        const activeIsSweet = !activeIsOlympus && !activeIsFortune;
        const sweetMultiplierTotal = activeIsSweet ? (step as SweetTumbleStep).multiplierTotal : 0;
        updateState((prev) => ({
          ...prev,
          phase: "tumbling",
          grid: step.grid,
          multipliers: step.multipliers,
          winPositions,
          droppingPositions: [],
          currentWinSymbol: mainWin?.symbolId || null,
          currentTumbleIndex: stepIndex,
          currentTumbleStep: step,
          currentMultiplierTotal: activeIsOlympus || activeIsFortune ? (prev.featureMultiplierMeter || 0) : sweetMultiplierTotal,
          message: activeIsSweet && isFreeSpins && sweetMultiplierTotal > 0
            ? `Tumble #${stepIndex}: +${step.payout.toFixed(2)}x (Multipliers on screen: ${sweetMultiplierTotal}x)`
            : `Tumble #${stepIndex}: +${step.payout.toFixed(2)}x`,
        }));

        stepIndex++;

        if (!anim) {
          playNextStep();
          return;
        }

        // Phase 2: Remove winning symbols (show empty cells) after 500ms
        timerRef.current = setTimeout(() => {
          const clearedGrid = [...step.grid];
          for (const pos of winPositions) {
            clearedGrid[pos] = null;
          }
          updateState((prev) => ({
            ...prev,
            grid: clearedGrid,
            winPositions: [],
            droppingPositions: [],
          }));

          // Phase 3: Drop new symbols in after 350ms (show next step grid with drop animation)
          timerRef.current = setTimeout(() => {
            // Use newPositions from the current step for drop animation
            const currentStep = steps[stepIndex - 1]; // already incremented
            const dropPositions = currentStep.newPositions || [];

            // Get the actual next grid (after tumble) from the next step or final state
            const isLastStep = stepIndex >= steps.length;
            const actualNextGrid = isLastStep
              ? spinResult.finalGrid
              : steps[stepIndex].grid;
            const actualNextMultipliers = isLastStep
              ? spinResult.finalMultipliers
              : steps[stepIndex].multipliers;

            updateState((prev) => ({
              ...prev,
              grid: actualNextGrid,
              multipliers: actualNextMultipliers,
              droppingPositions: dropPositions,
              balance: activeIsOlympus || activeIsFortune ? prev.balance : prev.balance + stepWinAmount,
              spinWin: prev.spinWin + stepWinAmount,
            }));

            // Clear drop animation after it completes, then play next step
            timerRef.current = setTimeout(() => {
              updateState((prev) => ({ ...prev, droppingPositions: [] }));
              timerRef.current = setTimeout(playNextStep, 100);
            }, 700);
          }, 350);
        }, 500);
      };

      timerRef.current = setTimeout(playNextStep, anim ? 400 : 0);
    },
    [updateState]
  );

  // ============================================================
  // Auto Spin Scheduler
  // ============================================================

  const scheduleNextAutoSpin = useCallback((betAmount: number) => {
    const current = stateRef.current;
    if (autoSpinStopRef.current || current.autoSpinRemaining <= 0) {
      if (current.autoSpinRemaining > 0 || autoSpinStopRef.current) {
        updateState((prev) => ({
          ...prev,
          autoSpinRemaining: 0,
          autoSpinTotal: 0,
          message: autoSpinStopRef.current ? "Auto spin stopped" : "Auto spin complete!",
        }));
      }
      autoSpinStopRef.current = false;
      return;
    }

    const newRemaining = current.autoSpinRemaining - 1;
    updateState((prev) => ({ ...prev, autoSpinRemaining: newRemaining }));

    const anim = stateRef.current.animationsEnabled;
    timerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (autoSpinStopRef.current) {
        updateState((prev) => ({ ...prev, autoSpinRemaining: 0, autoSpinTotal: 0, message: "Auto spin stopped" }));
        autoSpinStopRef.current = false;
        return;
      }
      if (s.balance < getEffectiveBet(s)) {
        updateState((prev) => ({ ...prev, autoSpinRemaining: 0, autoSpinTotal: 0, message: "Insufficient balance — auto spin stopped" }));
        return;
      }
      doSpin(false, false);
    }, anim ? 300 : 0);
  }, [updateState]);

  // ============================================================
  // Core Spin Function
  // ============================================================

  const doSpin = useCallback(
    (isFreeSpins: boolean, isSuperFreeSpins: boolean) => {
      clearTimer();

      const currentState = stateRef.current;
      const activeIsOlympus = currentState.gameId === "gates-of-olympus-1000";
      const activeIsFortune = currentState.gameId === "fortune-of-olympus";
      const anteBet25x = currentState.anteBetMode === "x25";
      const effectiveBet = getEffectiveBet(currentState);
      const anim = currentState.animationsEnabled;

      if (!isFreeSpins && currentState.balance < effectiveBet) {
        updateState((prev) => ({
          ...prev,
          autoSpinRemaining: 0,
          autoSpinTotal: 0,
          message: "Insufficient balance!",
        }));
        return;
      }

      const newBalance = isFreeSpins
        ? currentState.balance
        : currentState.balance - effectiveBet;

      const spinResult = activeIsOlympus
        ? Olympus.spin(isFreeSpins, false, anteBet25x)
        : activeIsFortune
        ? Fortune.spin(isFreeSpins, {
            betMode: currentState.fortuneBetMode,
            minMultiplierValue: currentState.fortuneFeatureMinMultiplierValue,
          })
        : spin(isFreeSpins, isSuperFreeSpins, anteBet25x);

      // Increment spin counter
      const newSpinCounter = currentState.totalSpinCounter + 1;

      updateState((prev) => ({
        ...prev,
        balance: newBalance,
        phase: "spinning",
        grid: spinResult.initialGrid,
        multipliers: spinResult.initialMultipliers,
        winPositions: [],
        currentWinSymbol: null,
        currentTumbleIndex: -1,
        currentTumbleStep: null,
        currentMultiplierTotal: 0,
        featureMultiplierMeter: activeIsOlympus ? prev.featureMultiplierMeter : prev.featureMultiplierMeter,
        spinWin: 0,
        spinWinMultiplier: 0,
        currentSpinResult: spinResult,
        lastScatterCount: spinResult.scatterCount,
        lastScatterPayout: spinResult.scatterPayout,
        lastFinalMultiplierSum: activeIsOlympus ? (spinResult as OlympusFullSpinResult).finalMultiplierSum : prev.lastFinalMultiplierSum,
        totalSpinCounter: newSpinCounter,
        message: "Spinning...",
      }));

      if (!isFreeSpins && spinResult.triggersBonus) {
        if (activeIsOlympus) {
          // Olympus: settle triggering spin immediately, then start FS (FS wins credited at round end)
          const steps = spinResult.tumbleSteps;
          let baseWinMultiplier = 0;
          for (const st of steps) baseWinMultiplier += st.payout;
          const finalMultiplierSum = (spinResult as OlympusFullSpinResult).finalMultiplierSum || 0;
          const finalWinMultiplier = baseWinMultiplier * (finalMultiplierSum > 0 ? finalMultiplierSum : 1);
          const triggerWinAmount = finalWinMultiplier * effectiveBet;

          const bonusStats = updateStats(
            currentState.stats,
            effectiveBet,
            finalWinMultiplier,
            steps.length,
            true,
          );

          if (triggerWinAmount > 0) {
            updateState((prev) => ({
              ...prev,
              balance: prev.balance + triggerWinAmount,
              stats: bonusStats,
            }));
          } else {
            updateState((prev) => ({ ...prev, stats: bonusStats }));
          }

          timerRef.current = setTimeout(() => {
            updateState((prev) => ({
              ...prev,
              phase: "bonus_trigger",
              message: `⚡ × ${spinResult.scatterCount} — Free Spins triggered!`,
            }));

            timerRef.current = setTimeout(() => {
              updateState((prev) => ({
                ...prev,
                phase: "free_spins",
                isFreeSpins: true,
                isSuperFreeSpins: false,
                freeSpinsRemaining: Olympus.FREE_SPINS_BASE,
                freeSpinsTotal: Olympus.FREE_SPINS_BASE,
                freeSpinsTotalWin: 0,
                featureMultiplierMeter: 0,
                currentMultiplierTotal: 0,
                freeSpinsMeterMode: "per_spin",
                message: `Free Spins started! ${Olympus.FREE_SPINS_BASE} spins`,
              }));

              timerRef.current = setTimeout(() => {
                const fsResult = Olympus.spin(true, false, false);
                updateState((prev) => ({
                  ...prev,
                  grid: fsResult.initialGrid,
                  multipliers: fsResult.initialMultipliers,
                  winPositions: [],
                  currentSpinResult: fsResult,
                  lastScatterCount: fsResult.scatterCount,
                  message: "Free spinning...",
                }));
                runTumbleSequence(
                  fsResult,
                  effectiveBet,
                  true,
                  Olympus.FREE_SPINS_BASE,
                  0,
                  stateRef.current.stats,
                );
              }, anim ? 500 : 0);
            }, anim ? 2000 : 0);
          }, anim ? 600 : 0);
          return;
        }

        if (activeIsFortune) {
          // Fortune: settle triggering spin, then start FS (FS wins credited at round end)
          const steps = spinResult.tumbleSteps;
          let baseWinMultiplier = 0;
          for (const st of steps) baseWinMultiplier += st.payout;
          const finalMultiplierSum = (spinResult as FortuneFullSpinResult).finalMultiplierSum || 0;
          let finalWinMultiplier = baseWinMultiplier * (finalMultiplierSum > 0 ? finalMultiplierSum : 1);
          if (finalWinMultiplier > Fortune.MAX_WIN_MULTIPLIER) finalWinMultiplier = Fortune.MAX_WIN_MULTIPLIER;
          const triggerWinAmount = finalWinMultiplier * effectiveBet;

          const bonusStats = updateStats(
            currentState.stats,
            effectiveBet,
            finalWinMultiplier,
            steps.length,
            true,
          );

          if (triggerWinAmount > 0) {
            updateState((prev) => ({
              ...prev,
              balance: prev.balance + triggerWinAmount,
              stats: bonusStats,
            }));
          } else {
            updateState((prev) => ({ ...prev, stats: bonusStats }));
          }

          const fsBase = Fortune.freeSpinsForScatterCount(spinResult.scatterCount);
          const featureMin = currentState.fortuneBetMode === "ante2" ? 5 : 2;

          timerRef.current = setTimeout(() => {
            updateState((prev) => ({
              ...prev,
              phase: "bonus_trigger",
              message: `🧙 × ${spinResult.scatterCount} — Free Spins triggered!`,
            }));

            timerRef.current = setTimeout(() => {
              updateState((prev) => ({
                ...prev,
                phase: "free_spins",
                isFreeSpins: true,
                isSuperFreeSpins: false,
                freeSpinsRemaining: fsBase,
                freeSpinsTotal: fsBase,
                freeSpinsTotalWin: 0,
                featureMultiplierMeter: 0,
                currentMultiplierTotal: 0,
                freeSpinsMeterMode: "per_spin",
                fortuneFeatureMinMultiplierValue: featureMin,
                message: `Free Spins started! ${fsBase} spins`,
              }));

              timerRef.current = setTimeout(() => {
                const fsResult = Fortune.spin(true, {
                  betMode: currentState.fortuneBetMode,
                  minMultiplierValue: featureMin,
                });
                updateState((prev) => ({
                  ...prev,
                  grid: fsResult.initialGrid,
                  multipliers: fsResult.initialMultipliers,
                  winPositions: [],
                  currentSpinResult: fsResult,
                  lastScatterCount: fsResult.scatterCount,
                  message: "Free spinning...",
                }));
                runTumbleSequence(
                  fsResult,
                  effectiveBet,
                  true,
                  fsBase,
                  0,
                  stateRef.current.stats,
                );
              }, anim ? 500 : 0);
            }, anim ? 2000 : 0);
          }, anim ? 600 : 0);
          return;
        }

        // Save the current bet amount and auto spin context for restoration after free spins
        updateState((prev) => ({
          ...prev,
          autoSpinBetAmount: effectiveBet,
        }));

        // --- FIX: Record the bonus trigger in stats and compute initial tumble win ---
        const initialTumbleSteps = spinResult.tumbleSteps;
        let initialTumbleWin = 0;
        for (const step of initialTumbleSteps) {
          initialTumbleWin += step.payout;
        }
        const initialTumbleWinAmount = initialTumbleWin * effectiveBet;
        // Include scatter payout in stats so totalWin/realRTP reflect full win (H1 fix)
        const winMultiplierForStats = initialTumbleWin + spinResult.scatterPayout;

        // Update stats: record this spin's bet, tumble + scatter win, and bonus trigger
        const bonusStats = updateStats(
          currentState.stats,
          effectiveBet,
          winMultiplierForStats,
          initialTumbleSteps.length,
          true // triggersBonus = true
        );

        // Add initial tumble win to balance
        if (initialTumbleWinAmount > 0) {
          updateState((prev) => ({
            ...prev,
            balance: prev.balance + initialTumbleWinAmount,
            stats: bonusStats,
          }));
        } else {
          updateState((prev) => ({
            ...prev,
            stats: bonusStats,
          }));
        }

        timerRef.current = setTimeout(() => {
          updateState((prev) => ({
            ...prev,
            phase: "bonus_trigger",
            message: `🍭 × ${spinResult.scatterCount} — Free Spins triggered!`,
          }));

          timerRef.current = setTimeout(() => {
            const scatterPayout = spinResult.scatterPayout * effectiveBet;
            updateState((prev) => ({
              ...prev,
              phase: "free_spins",
              isFreeSpins: true,
              isSuperFreeSpins: false,
              freeSpinsRemaining: FREE_SPINS_BASE,
              freeSpinsTotal: FREE_SPINS_BASE,
              freeSpinsTotalWin: scatterPayout + initialTumbleWinAmount,
              balance: prev.balance + scatterPayout,
              featureMultiplierMeter: 0,
              currentMultiplierTotal: 0,
              freeSpinsMeterMode: "per_spin",
              message: `Free Spins started! ${FREE_SPINS_BASE} spins`,
            }));

            timerRef.current = setTimeout(() => {
              const fsState = stateRef.current;
              const fsResult = spin(true, false, false);

              updateState((prev) => ({
                ...prev,
                grid: fsResult.initialGrid,
                multipliers: fsResult.initialMultipliers,
                winPositions: [],
                currentSpinResult: fsResult,
                lastScatterCount: fsResult.scatterCount,
                message: "Free spinning...",
              }));

              runTumbleSequence(
                fsResult,
                effectiveBet,
                true,
                FREE_SPINS_BASE,
                scatterPayout + initialTumbleWinAmount,
                fsState.stats
              );
            }, anim ? 500 : 0);
          }, anim ? 2000 : 0);
        }, anim ? 600 : 0);
        return;
      }

      timerRef.current = setTimeout(() => {
        runTumbleSequence(
          spinResult,
          effectiveBet,
          isFreeSpins,
          currentState.freeSpinsRemaining,
          currentState.freeSpinsTotalWin,
          currentState.stats
        );
      }, anim ? 300 : 0);
    },
    [clearTimer, updateState, runTumbleSequence]
  );

  // ============================================================
  // Public Actions
  // ============================================================

  const startSpin = useCallback(() => {
    const current = stateRef.current;
    if (
      current.phase === "free_spins" ||
      current.phase === "free_spins_spinning" ||
      current.phase === "spinning" ||
      current.phase === "tumbling" ||
      current.phase === "bonus_trigger"
    ) return;
    if (current.phase !== "idle" && current.phase !== "result") return;

    autoSpinStopRef.current = false;
    updateState((prev) => ({ ...prev, autoSpinRemaining: 0, autoSpinTotal: 0 }));
    doSpin(false, false);
  }, [doSpin, updateState]);

  const startAutoSpin = useCallback((count: number) => {
    const current = stateRef.current;
    if (
      current.phase === "free_spins" ||
      current.phase === "free_spins_spinning" ||
      current.phase === "spinning" ||
      current.phase === "tumbling" ||
      current.phase === "bonus_trigger"
    ) return;
    if (current.phase !== "idle" && current.phase !== "result") return;

    const effectiveBet = current.anteBetMode !== "none" ? current.bet * 1.25 : current.bet;
    if (current.balance < effectiveBet) {
      updateState((prev) => ({ ...prev, message: "Insufficient balance!" }));
      return;
    }

    autoSpinStopRef.current = false;
    updateState((prev) => ({
      ...prev,
      autoSpinRemaining: count - 1,
      autoSpinTotal: count,
      message: `Auto spin: ${count} spins`,
    }));
    doSpin(false, false);
  }, [doSpin, updateState]);

  const stopAutoSpin = useCallback(() => {
    autoSpinStopRef.current = true;
    updateState((prev) => ({
      ...prev,
      autoSpinRemaining: 0,
      autoSpinTotal: 0,
      message: "Auto spin stopped",
    }));
    clearTimer();
  }, [updateState, clearTimer]);

  const toggleAnimations = useCallback(() => {
    updateState((prev) => ({ ...prev, animationsEnabled: !prev.animationsEnabled }));
  }, [updateState]);

  const continueFreeSpins = useCallback(() => {
    const current = stateRef.current;
    if (current.freeSpinsRemaining > 0) {
      doSpin(
        true,
        current.gameId === "gates-of-olympus-1000" || current.gameId === "fortune-of-olympus"
          ? false
          : current.isSuperFreeSpins,
      );
    }
  }, [doSpin]);

  const startFreeSpins = useCallback(
    (scatterCount: number, scatterPayout: number, superFreeSpins: boolean = false) => {
      const current = stateRef.current;
      const activeIsOlympus = current.gameId === "gates-of-olympus-1000";
      const activeIsFortune = current.gameId === "fortune-of-olympus";
      const effectiveBet = getEffectiveBet(current);
      const scatterPayoutAmount = scatterPayout * effectiveBet;

      updateState((prev) => ({
        ...prev,
        phase: "free_spins",
        isFreeSpins: true,
        isSuperFreeSpins: activeIsOlympus ? false : superFreeSpins,
        freeSpinsRemaining: activeIsOlympus
          ? Olympus.FREE_SPINS_BASE
          : activeIsFortune
          ? Fortune.freeSpinsForScatterCount(scatterCount)
          : FREE_SPINS_BASE,
        freeSpinsTotal: activeIsOlympus
          ? Olympus.FREE_SPINS_BASE
          : activeIsFortune
          ? Fortune.freeSpinsForScatterCount(scatterCount)
          : FREE_SPINS_BASE,
        freeSpinsTotalWin: activeIsOlympus || activeIsFortune ? 0 : scatterPayoutAmount,
        // Olympus/Fortune credit FS at round end; Sweet credits immediately.
        balance: activeIsOlympus || activeIsFortune ? prev.balance : prev.balance + scatterPayoutAmount,
        featureMultiplierMeter: 0,
        currentMultiplierTotal: 0,
        freeSpinsMeterMode: "per_spin",
        message: `Free Spins started! ${
          activeIsOlympus
            ? Olympus.FREE_SPINS_BASE
            : activeIsFortune
            ? Fortune.freeSpinsForScatterCount(scatterCount)
            : FREE_SPINS_BASE
        } spins`,
      }));

      timerRef.current = setTimeout(() => {
        doSpin(true, activeIsOlympus || activeIsFortune ? false : superFreeSpins);
      }, 300);
    },
    [updateState, doSpin]
  );

  const handleBuyFreeSpins = useCallback(
    (superFreeSpins: boolean = false) => {
      const current = stateRef.current;
      const activeIsOlympus = current.gameId === "gates-of-olympus-1000";
      const activeIsFortune = current.gameId === "fortune-of-olympus";
      const effectiveBet = getEffectiveBet(current);

      if (activeIsFortune && (current.fortuneBetMode === "super1" || current.fortuneBetMode === "super2")) {
        updateState((prev) => ({ ...prev, message: "Buy Feature is disabled in Super Spin modes" }));
        return;
      }
      const cost = activeIsOlympus
        ? Olympus.BUY_FREE_SPINS_COST * current.bet
        : activeIsFortune
        ? (superFreeSpins ? Fortune.BUY_SUPER_FREE_SPINS_COST : Fortune.BUY_FREE_SPINS_COST) * effectiveBet
        : (superFreeSpins ? BUY_SUPER_FREE_SPINS_COST : BUY_FREE_SPINS_COST) * current.bet;

      if (current.balance < cost) {
        updateState((prev) => ({ ...prev, message: "Insufficient balance to buy!" }));
        return;
      }

      const fortuneBuyScatterCount = activeIsFortune ? Fortune.buyFreeSpinsTriggerGrid(current.fortuneBetMode).scatterCount : 0;
      const fortuneFsBase = activeIsFortune ? Fortune.freeSpinsForScatterCount(fortuneBuyScatterCount) : 0;
      const fortuneFeatureMin = activeIsFortune
        ? superFreeSpins || current.fortuneBetMode === "ante2"
          ? 5
          : 2
        : 2;

      updateState((prev) => ({
        ...prev,
        balance: prev.balance - cost,
        phase: "free_spins",
        isFreeSpins: true,
        isSuperFreeSpins: activeIsOlympus ? false : superFreeSpins,
        freeSpinsRemaining: activeIsOlympus
          ? Olympus.FREE_SPINS_BASE
          : activeIsFortune
          ? fortuneFsBase
          : FREE_SPINS_BASE,
        freeSpinsTotal: activeIsOlympus
          ? Olympus.FREE_SPINS_BASE
          : activeIsFortune
          ? fortuneFsBase
          : FREE_SPINS_BASE,
        // Olympus buy feature guarantees 4 scatters (3x payout) on trigger; credit at round end.
        freeSpinsTotalWin: activeIsOlympus ? 3 * current.bet : 0,
        featureMultiplierMeter: 0,
        currentMultiplierTotal: 0,
        freeSpinsMeterMode: "across_spins",
        fortuneFeatureMinMultiplierValue: activeIsFortune ? fortuneFeatureMin : prev.fortuneFeatureMinMultiplierValue,
        message: activeIsOlympus
          ? "Bought Free Spins!"
          : activeIsFortune
          ? `Bought ${superFreeSpins ? "Super " : ""}Free Spins! (🧙×${fortuneBuyScatterCount})`
          : `Bought ${superFreeSpins ? "Super " : ""}Free Spins!`,
      }));

      timerRef.current = setTimeout(() => {
        doSpin(true, activeIsOlympus ? false : superFreeSpins);
      }, 300);
    },
    [updateState, doSpin]
  );

  const endFreeSpins = useCallback(() => {
    updateState((prev) => {
      const activeIsOlympus = prev.gameId === "gates-of-olympus-1000";
      const activeIsFortune = prev.gameId === "fortune-of-olympus";
      const creditedBalance = activeIsOlympus || activeIsFortune ? prev.balance + prev.freeSpinsTotalWin : prev.balance;
      if (activeIsOlympus && prev.savedOlympusFsMultiplierChance !== null) {
        Olympus.setFreeSpinsMultiplierChance(prev.savedOlympusFsMultiplierChance);
      }
      return {
        ...prev,
        balance: creditedBalance,
        phase: "idle",
        isFreeSpins: false,
        isSuperFreeSpins: false,
        freeSpinsRemaining: 0,
        freeSpinsTotal: 0,
        featureMultiplierMeter: 0,
        currentMultiplierTotal: 0,
        freeSpinsMeterMode: "none",
        savedOlympusFsMultiplierChance: activeIsOlympus ? null : prev.savedOlympusFsMultiplierChance,
        message: `Free Spins ended! Total win: ${prev.freeSpinsTotalWin.toFixed(2)}`,
      };
    });
    // Resume auto spin if there are remaining spins
    const current = stateRef.current;
    if (!autoSpinStopRef.current && current.autoSpinRemaining > 0) {
      const savedBet = current.autoSpinBetAmount || current.bet;
      const anim = current.animationsEnabled;
      timerRef.current = setTimeout(() => {
        scheduleNextAutoSpin(savedBet);
      }, anim ? 500 : 0);
    }
  }, [updateState, scheduleNextAutoSpin]);

  const setBet = useCallback((newBet: number) => {
    updateState((prev) => {
      if (prev.phase !== "idle" && prev.phase !== "result") return prev;
      return { ...prev, bet: Math.max(0.2, Math.min(240, newBet)) };
    });
  }, [updateState]);

  const setAnteBetMode = useCallback((mode: AnteBetMode) => {
    updateState((prev) => {
      if (prev.phase !== "idle" && prev.phase !== "result") return prev;
      return { ...prev, anteBetMode: mode };
    });
  }, [updateState]);

  const setFortuneBetMode = useCallback((mode: FortuneBetMode) => {
    updateState((prev) => {
      if (prev.phase !== "idle" && prev.phase !== "result") return prev;
      return { ...prev, fortuneBetMode: mode };
    });
  }, [updateState]);

  const addBalance = useCallback((amount: number) => {
    updateState((prev) => ({ ...prev, balance: prev.balance + amount }));
  }, [updateState]);

  const resetGame = useCallback(() => {
    clearTimer();
    autoSpinStopRef.current = false;
    const current = stateRef.current;
    const freshState = createInitialState(current.gameId);
    stateRef.current = freshState;
    setState(freshState);
  }, [clearTimer]);

  const setTargetRtp = useCallback((targetRtp: number) => {
    // GLI-19: theoretical RTP for house-banked games must be ≥ 75%.
    const MIN_RTP = 75;
    const MAX_RTP = 200;
    const clamped = Math.max(MIN_RTP, Math.min(MAX_RTP, targetRtp));
    const activeIsOlympus = stateRef.current.gameId === "gates-of-olympus-1000";
    const activeIsFortune = stateRef.current.gameId === "fortune-of-olympus";
    if (activeIsOlympus) {
      Olympus.setRtpMultiplier(clamped);
      updateState((prev) => ({
        ...prev,
        message: `Target RTP set to ${clamped.toFixed(2)}% (Olympus)`,
      }));
    } else if (activeIsFortune) {
      Fortune.setRtpMultiplier(clamped);
      updateState((prev) => ({
        ...prev,
        message: `Target RTP set to ${clamped.toFixed(2)}% (Fortune)`,
      }));
    } else {
      setRtpMultiplier(clamped);
      updateState((prev) => ({
        ...prev,
        // BASE_RTP_PERCENT must match the value in gameEngine.ts
        message: `Target RTP set to ${clamped.toFixed(1)}% (multiplier: ${(clamped / 26.13).toFixed(3)}x)`,
      }));
    }
  }, [updateState]);

  const setVolatilityLevel = useCallback((level: VolatilityLevel) => {
    const activeIsOlympus = stateRef.current.gameId === "gates-of-olympus-1000";
    if (activeIsOlympus) {
      updateState((prev) => ({
        ...prev,
        message: "Volatility is fixed for Olympus (not configurable yet)",
      }));
      return;
    }
    setVolatility(level);
    updateState((prev) => ({
      ...prev,
      message: `Volatility set to ${level.toUpperCase()}`,
    }));
  }, [updateState]);

  const getTargetRtpLocal = useCallback(() => {
    if (stateRef.current.gameId === "gates-of-olympus-1000") return Olympus.getTargetRtp();
    if (stateRef.current.gameId === "fortune-of-olympus") return Fortune.getTargetRtp();
    return getTargetRtp();
  }, []);

  const getVolatilityLocal = useCallback(() => {
    return getVolatility();
  }, []);

  const clearHistory = useCallback(() => {
    updateState((prev) => ({ ...prev, spinHistory: [] }));
  }, [updateState]);

  return {
    state,
    startSpin,
    startAutoSpin,
    stopAutoSpin,
    toggleAnimations,
    continueFreeSpins,
    startFreeSpins,
    handleBuyFreeSpins,
    endFreeSpins,
    setBet,
    setAnteBetMode,
    setFortuneBetMode,
    addBalance,
    resetGame,
    setTargetRtp,
    getTargetRtp: getTargetRtpLocal,
    setVolatilityLevel,
    getVolatility: getVolatilityLocal,
    clearHistory,
  };
}
