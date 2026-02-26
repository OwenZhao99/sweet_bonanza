import {
  spin,
  calculateWins,
  getTargetRtp,
  getVolatility,
  setRtpMultiplier,
  setVolatility,
  GRID_ROWS,
  GRID_COLS,
  type FullSpinResult,
  type TumbleStep,
  type GridCell,
  type MultiplierCell,
  type VolatilityLevel,
} from "../client/src/lib/gameEngine";

export interface SpinMode {
  isFreeSpins?: boolean;
  superFreeSpins?: boolean;
  anteBet25x?: boolean;
}

export interface SpinConfigOverride {
  targetRtp?: number;
  volatility?: VolatilityLevel;
}

export interface SpinRequestPayload {
  gameId?: string;
  bet?: number;
  mode?: SpinMode;
  configOverride?: SpinConfigOverride;
  seed?: string;
}

export interface SpinWinDto {
  symbolId: string;
  count: number;
  positions: number[];
  payout: number;
}

export interface SpinTumbleStepDto {
  stepIndex: number;
  grid: GridCell[];
  multipliers: MultiplierCell[];
  wins: SpinWinDto[];
  payout: number;
  multiplierTotal: number;
  newPositions: number[];
}

export interface SpinScatterDto {
  count: number;
  positions: number[];
  payout: number;
  triggersBonus: boolean;
}

export interface SpinTotalsDto {
  basePayout: number;
  multipliedPayout: number;
  scatterPayout: number;
  totalPayoutMultiplier: number;
  totalWinAmount: number;
}

export type SpinEvent =
  | { type: "spin_start"; at: number }
  | {
      type: "tumble_win";
      at: number;
      stepIndex: number;
      wins: SpinWinDto[];
      payout: number;
    }
  | {
      type: "tumble_clear";
      at: number;
      stepIndex: number;
    }
  | {
      type: "tumble_drop";
      at: number;
      stepIndex: number;
      newPositions: number[];
    }
  | {
      type: "free_spins_trigger";
      at: number;
      scatterCount: number;
    }
  | { type: "spin_end"; at: number };

export interface SpinResponseDto {
  meta: {
    spinId: string;
    gameId: string;
    bet: number;
    mode: {
      isFreeSpins: boolean;
      superFreeSpins: boolean;
      anteBet25x: boolean;
    };
    rtp: number;
    volatility: VolatilityLevel;
    gridSize: {
      rows: number;
      cols: number;
    };
  };
  state: {
    initialGrid: GridCell[];
    initialMultipliers: MultiplierCell[];
    finalGrid: GridCell[];
    finalMultipliers: MultiplierCell[];
  };
  sequence: {
    tumbleSteps: SpinTumbleStepDto[];
    scatter: SpinScatterDto;
  };
  totals: SpinTotalsDto;
  events: SpinEvent[];
}

const HIGHLIGHT_DURATION_MS = 500;
const CLEAR_DURATION_MS = 350;
const DROP_DURATION_MS = 700;
const STEP_GAP_MS = 100;

function buildEventsTimeline(params: {
  tumbleSteps: SpinTumbleStepDto[];
  triggersBonus: boolean;
  scatterCount: number;
}): SpinEvent[] {
  const events: SpinEvent[] = [];
  let t = 0;

  events.push({ type: "spin_start", at: t });

  for (const step of params.tumbleSteps) {
    t += STEP_GAP_MS;
    events.push({
      type: "tumble_win",
      at: t,
      stepIndex: step.stepIndex,
      wins: step.wins,
      payout: step.payout,
    });

    t += HIGHLIGHT_DURATION_MS;
    events.push({
      type: "tumble_clear",
      at: t,
      stepIndex: step.stepIndex,
    });

    t += CLEAR_DURATION_MS;
    events.push({
      type: "tumble_drop",
      at: t,
      stepIndex: step.stepIndex,
      newPositions: step.newPositions,
    });

    t += DROP_DURATION_MS;
  }

  if (params.triggersBonus) {
    t += STEP_GAP_MS;
    events.push({
      type: "free_spins_trigger",
      at: t,
      scatterCount: params.scatterCount,
    });
  }

  t += STEP_GAP_MS;
  events.push({ type: "spin_end", at: t });

  return events;
}

function mapTumbleSteps(result: FullSpinResult): SpinTumbleStepDto[] {
  return result.tumbleSteps.map((step: TumbleStep, index: number) => ({
    stepIndex: index,
    grid: step.grid,
    multipliers: step.multipliers,
    wins: step.wins.map((w) => ({
      symbolId: w.symbolId,
      count: w.count,
      positions: w.positions,
      payout: w.payout,
    })),
    payout: step.payout,
    multiplierTotal: step.multiplierTotal,
    newPositions: step.newPositions,
  }));
}

export function handleSpinRequest(payload: SpinRequestPayload): SpinResponseDto {
  const gameId = payload.gameId ?? "sweet-bonanza-1000";
  if (gameId !== "sweet-bonanza-1000") {
    throw new Error(`Unsupported gameId: ${gameId}`);
  }

  const rawBet = typeof payload.bet === "number" && Number.isFinite(payload.bet) ? payload.bet : 1;
  const bet = rawBet > 0 ? rawBet : 1;

  const mode: SpinMode = payload.mode ?? {};
  const isFreeSpins = Boolean(mode.isFreeSpins);
  const superFreeSpins = Boolean(mode.superFreeSpins);
  const anteBet25x = Boolean(mode.anteBet25x);

  const beforeRtp = getTargetRtp();
  const beforeVolatility = getVolatility();

  // Apply optional per-call overrides
  if (payload.configOverride) {
    const { targetRtp, volatility } = payload.configOverride;
    if (typeof targetRtp === "number" && Number.isFinite(targetRtp) && targetRtp > 0) {
      // GLI-19: house-banked games must have theoretical RTP ≥ 75%.
      // Clamp any runtime override into a compliant range.
      const MIN_RTP = 75;
      const MAX_RTP = 200;
      const clampedRtp = Math.max(MIN_RTP, Math.min(MAX_RTP, targetRtp));
      setRtpMultiplier(clampedRtp);
    }
    if (volatility) {
      setVolatility(volatility);
    }
  }

  const effectiveRtp = getTargetRtp();
  const effectiveVolatility = getVolatility();

  let result: FullSpinResult;
  try {
    // NOTE: current engine uses Math.random(), seed is reserved for future deterministic RNG
    void payload.seed;
    result = spin(isFreeSpins, superFreeSpins, anteBet25x);
  } finally {
    // Restore global configuration after this spin
    setRtpMultiplier(beforeRtp);
    setVolatility(beforeVolatility);
  }

  // Recompute scatter positions on the initial grid to expose them in the API
  const initialSpin = calculateWins(result.initialGrid);

  const tumbleSteps = mapTumbleSteps(result);
  const basePayout = tumbleSteps.reduce((sum, s) => sum + s.payout, 0);

  let multipliedPayout = basePayout;
  if (isFreeSpins && tumbleSteps.length > 0) {
    const finalMultiplierTotal = tumbleSteps[tumbleSteps.length - 1].multiplierTotal;
    if (finalMultiplierTotal > 0) {
      multipliedPayout = basePayout * finalMultiplierTotal;
    }
  }

  const scatterPayout = initialSpin.scatterPayout;
  const totalPayoutMultiplier = multipliedPayout + scatterPayout;
  const totalWinAmount = totalPayoutMultiplier * bet;

  const scatter: SpinScatterDto = {
    count: initialSpin.scatterCount,
    positions: initialSpin.scatterPositions,
    payout: scatterPayout,
    triggersBonus: result.triggersBonus,
  };

  const totals: SpinTotalsDto = {
    basePayout,
    multipliedPayout,
    scatterPayout,
    totalPayoutMultiplier,
    totalWinAmount,
  };

  const events = buildEventsTimeline({
    tumbleSteps,
    triggersBonus: result.triggersBonus,
    scatterCount: initialSpin.scatterCount,
  });

  const spinId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    meta: {
      spinId,
      gameId,
      bet,
      mode: {
        isFreeSpins,
        superFreeSpins,
        anteBet25x,
      },
      rtp: effectiveRtp,
      volatility: effectiveVolatility,
      gridSize: {
        rows: GRID_ROWS,
        cols: GRID_COLS,
      },
    },
    state: {
      initialGrid: result.initialGrid,
      initialMultipliers: result.initialMultipliers,
      finalGrid: result.finalGrid,
      finalMultipliers: result.finalMultipliers,
    },
    sequence: {
      tumbleSteps,
      scatter,
    },
    totals,
    events,
  };
}

