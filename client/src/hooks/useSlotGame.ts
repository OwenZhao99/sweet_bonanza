/**
 * Sweet Bonanza 1000 Replica - Game State Management Hook
 */

import { useState, useCallback, useRef } from "react";
import {
  GridCell,
  MultiplierCell,
  FullSpinResult,
  GameStats,
  TumbleStep,
  VolatilityLevel,
  spin,
  createInitialStats,
  updateStats,
  GRID_SIZE,
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
  grid: GridCell[];
  multipliers: MultiplierCell[];
  winPositions: number[];
  currentWinSymbol: string | null;
  phase: GamePhase;
  currentSpinResult: FullSpinResult | null;
  currentTumbleIndex: number;
  currentTumbleStep: TumbleStep | null;
  spinWin: number;
  spinWinMultiplier: number;
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  isFreeSpins: boolean;
  isSuperFreeSpins: boolean;
  freeSpinsTotalWin: number;
  anteBetMode: AnteBetMode;
  stats: GameStats;
  lastScatterCount: number;
  lastScatterPayout: number;
  currentMultiplierTotal: number;
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

function createInitialGrid(): GridCell[] {
  return Array(GRID_SIZE).fill(null);
}

const INITIAL_STATE: GameState = {
  balance: DEFAULT_BALANCE,
  bet: DEFAULT_BET,
  grid: createInitialGrid(),
  multipliers: Array(GRID_SIZE).fill(null),
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
  stats: createInitialStats(),
  lastScatterCount: 0,
  lastScatterPayout: 0,
  currentMultiplierTotal: 0,
  message: "Press SPIN to start",
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

export function useSlotGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<GameState>(INITIAL_STATE);
  const autoSpinStopRef = useRef<boolean>(false);

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
      spinResult: FullSpinResult,
      betAmount: number,
      isFreeSpins: boolean,
      currentFreeSpinsRemaining: number,
      currentFreeSpinsTotalWin: number,
      currentStats: GameStats
    ) => {
      const steps = spinResult.tumbleSteps;
      const anim = stateRef.current.animationsEnabled;

      if (steps.length === 0) {
        // In free spins, don't count bet or spins (already counted in the triggering spin)
        const statsBet = isFreeSpins ? 0 : betAmount;
        const newStats = updateStats(currentStats, statsBet, 0, 0, false, isFreeSpins, betAmount);
        let newPhase: GamePhase = "idle";
        let message = "No win — try again!";

        if (isFreeSpins) {
          const newRemaining = currentFreeSpinsRemaining - 1;
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
          // In free spins, apply final multiplier at end of tumble sequence
          if (isFreeSpins && steps.length > 0) {
            const finalMultiplierTotal = steps[steps.length - 1].multiplierTotal;
            if (finalMultiplierTotal > 0) {
              cumulativeWin *= finalMultiplierTotal;
            }
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
                winPositions: [],
                currentWinSymbol: null,
                balance: shouldAddBalance ? prev.balance + totalWin : prev.balance + animMultiplierBonus,
                freeSpinsRemaining: 0,
                freeSpinsTotalWin: newTotalWin,
                spinWin: totalWin,
                spinWinMultiplier: cumulativeWin,
                stats: newStats,
                message: `Free Spins ended! Total win: ${newTotalWin.toFixed(2)}`,
              }));
            } else {
              const retriggerMsg = retriggered
                ? `Retriggered! +${FREE_SPINS_RETRIGGER} spins! ${newRemaining} remaining`
                : `${newRemaining} free spins remaining`;
              updateState((prev) => ({
                ...prev,
                phase: "free_spins_spinning",
                winPositions: [],
                currentWinSymbol: null,
                balance: shouldAddBalance ? prev.balance + totalWin : prev.balance + animMultiplierBonus,
                freeSpinsRemaining: newRemaining,
                freeSpinsTotalWin: newTotalWin,
                spinWin: totalWin,
                spinWinMultiplier: cumulativeWin,
                stats: newStats,
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
          currentMultiplierTotal: step.multiplierTotal,
          message: isFreeSpins && step.multiplierTotal > 0
            ? `Tumble #${stepIndex}: +${step.payout.toFixed(2)}x (Multipliers on screen: ${step.multiplierTotal}x)`
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
              balance: prev.balance + stepWinAmount,
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
      if (s.balance < (s.anteBetMode !== "none" ? s.bet * 1.25 : s.bet)) {
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
      const anteBet25x = currentState.anteBetMode === "x25";
      const effectiveBet = currentState.anteBetMode !== "none"
        ? currentState.bet * 1.25
        : currentState.bet;
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

      const spinResult = spin(isFreeSpins, isSuperFreeSpins, anteBet25x);

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
        spinWin: 0,
        spinWinMultiplier: 0,
        currentSpinResult: spinResult,
        lastScatterCount: spinResult.scatterCount,
        lastScatterPayout: spinResult.scatterPayout,
        totalSpinCounter: newSpinCounter,
        message: "Spinning...",
      }));

      if (!isFreeSpins && spinResult.triggersBonus) {
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
      doSpin(true, current.isSuperFreeSpins);
    }
  }, [doSpin]);

  const startFreeSpins = useCallback(
    (scatterCount: number, scatterPayout: number, superFreeSpins: boolean = false) => {
      const current = stateRef.current;
      const effectiveBet = current.anteBetMode !== "none" ? current.bet * 1.25 : current.bet;
      const scatterPayoutAmount = scatterPayout * effectiveBet;

      updateState((prev) => ({
        ...prev,
        phase: "free_spins",
        isFreeSpins: true,
        isSuperFreeSpins: superFreeSpins,
        freeSpinsRemaining: FREE_SPINS_BASE,
        freeSpinsTotal: FREE_SPINS_BASE,
        freeSpinsTotalWin: scatterPayoutAmount,
        balance: prev.balance + scatterPayoutAmount,
        message: `Free Spins started! ${FREE_SPINS_BASE} spins`,
      }));

      timerRef.current = setTimeout(() => {
        doSpin(true, superFreeSpins);
      }, 300);
    },
    [updateState, doSpin]
  );

  const handleBuyFreeSpins = useCallback(
    (superFreeSpins: boolean = false) => {
      const current = stateRef.current;
      const cost = (superFreeSpins ? BUY_SUPER_FREE_SPINS_COST : BUY_FREE_SPINS_COST) * current.bet;

      if (current.balance < cost) {
        updateState((prev) => ({ ...prev, message: "Insufficient balance to buy!" }));
        return;
      }

      updateState((prev) => ({
        ...prev,
        balance: prev.balance - cost,
        phase: "free_spins",
        isFreeSpins: true,
        isSuperFreeSpins: superFreeSpins,
        freeSpinsRemaining: FREE_SPINS_BASE,
        freeSpinsTotal: FREE_SPINS_BASE,
        freeSpinsTotalWin: 0,
        message: `Bought ${superFreeSpins ? "Super " : ""}Free Spins!`,
      }));

      timerRef.current = setTimeout(() => {
        doSpin(true, superFreeSpins);
      }, 300);
    },
    [updateState, doSpin]
  );

  const endFreeSpins = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      phase: "idle",
      isFreeSpins: false,
      isSuperFreeSpins: false,
      freeSpinsRemaining: 0,
      freeSpinsTotal: 0,
      message: `Free Spins ended! Total win: ${prev.freeSpinsTotalWin.toFixed(2)}`,
    }));
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

  const addBalance = useCallback((amount: number) => {
    updateState((prev) => ({ ...prev, balance: prev.balance + amount }));
  }, [updateState]);

  const resetGame = useCallback(() => {
    clearTimer();
    autoSpinStopRef.current = false;
    const freshState = { ...INITIAL_STATE, stats: createInitialStats() };
    stateRef.current = freshState;
    setState(freshState);
  }, [clearTimer]);

  const setTargetRtp = useCallback((targetRtp: number) => {
    const clamped = Math.max(10, Math.min(200, targetRtp));
    setRtpMultiplier(clamped);
    updateState((prev) => ({
      ...prev,
      // BASE_RTP_PERCENT must match the value in gameEngine.ts
      message: `Target RTP set to ${clamped.toFixed(1)}% (multiplier: ${(clamped / 26.13).toFixed(3)}x)`,
    }));
  }, [updateState]);

  const setVolatilityLevel = useCallback((level: VolatilityLevel) => {
    setVolatility(level);
    updateState((prev) => ({
      ...prev,
      message: `Volatility set to ${level.toUpperCase()}`,
    }));
  }, [updateState]);

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
    addBalance,
    resetGame,
    setTargetRtp,
    getTargetRtp,
    setVolatilityLevel,
    getVolatility,
    clearHistory,
  };
}
