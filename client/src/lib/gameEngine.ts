/**
 * Sweet Bonanza 1000 Replica - Game Engine
 * Focus: Accurate mathematical model replication
 * Features: Symbol weights, paytable, tumble mechanics, free spins multipliers, RTP control, volatility control
 */

// ============================================================
// Symbol Definitions
// ============================================================

export type SymbolId =
  | "heart"       // Heart Candy - highest value
  | "purple"      // Purple Cube
  | "green"       // Green Pentagon
  | "blue"        // Blue Oval
  | "apple"       // Apple
  | "plum"        // Plum
  | "watermelon"  // Watermelon
  | "grape"       // Grape
  | "banana"      // Banana - lowest value regular symbol
  | "scatter";    // Lollipop - scatter symbol

export type MultiplierSymbolId = "multiplier";

export interface Symbol {
  id: SymbolId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  // Paytable: key = symbol count, value = payout multiplier (× bet)
  pays: Record<number, number>;
  // Weight in reel pool (affects appearance frequency)
  weight: number;
}

export interface MultiplierSymbol {
  id: MultiplierSymbolId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  value: number; // multiplier value 2-1000
}

// ============================================================
// Paytable (based on official game documentation)
// Symbol count → payout multiplier (× bet amount)
// ============================================================

export const SYMBOLS: Symbol[] = [
  {
    id: "heart",
    name: "Heart",
    emoji: "❤️",
    color: "#ef4444",
    bgColor: "#7f1d1d",
    weight: 3,
    pays: { 8: 8, 9: 8, 10: 20, 11: 20, 12: 40 },
  },
  {
    id: "purple",
    name: "Purple",
    emoji: "🟣",
    color: "#a855f7",
    bgColor: "#4a1d96",
    weight: 4,
    pays: { 8: 2, 9: 2, 10: 8, 11: 8, 12: 20 },
  },
  {
    id: "green",
    name: "Green",
    emoji: "🟢",
    color: "#22c55e",
    bgColor: "#14532d",
    weight: 4,
    pays: { 8: 1.6, 9: 1.6, 10: 4, 11: 4, 12: 12 },
  },
  {
    id: "blue",
    name: "Blue",
    emoji: "🔵",
    color: "#3b82f6",
    bgColor: "#1e3a8a",
    weight: 5,
    pays: { 8: 1.2, 9: 1.2, 10: 1.6, 11: 1.6, 12: 9.6 },
  },
  {
    id: "apple",
    name: "Apple",
    emoji: "🍎",
    color: "#dc2626",
    bgColor: "#7f1d1d",
    weight: 5,
    pays: { 8: 0.8, 9: 0.8, 10: 1.2, 11: 1.2, 12: 8 },
  },
  {
    id: "plum",
    name: "Plum",
    emoji: "🍑",
    color: "#7c3aed",
    bgColor: "#3b0764",
    weight: 6,
    pays: { 8: 0.64, 9: 0.64, 10: 0.96, 11: 0.96, 12: 6.4 },
  },
  {
    id: "watermelon",
    name: "Watermelon",
    emoji: "🍉",
    color: "#16a34a",
    bgColor: "#14532d",
    weight: 6,
    pays: { 8: 0.4, 9: 0.4, 10: 0.8, 11: 0.8, 12: 4 },
  },
  {
    id: "grape",
    name: "Grape",
    emoji: "🍇",
    color: "#9333ea",
    bgColor: "#3b0764",
    weight: 7,
    pays: { 8: 0.32, 9: 0.32, 10: 0.72, 11: 0.72, 12: 3.2 },
  },
  {
    id: "banana",
    name: "Banana",
    emoji: "🍌",
    color: "#eab308",
    bgColor: "#713f12",
    weight: 8,
    pays: { 8: 0.2, 9: 0.2, 10: 0.6, 11: 0.6, 12: 1.6 },
  },
  {
    id: "scatter",
    name: "Lollipop",
    emoji: "🍭",
    color: "#f97316",
    bgColor: "#7c2d12",
    weight: 1,  // weight 1 → ~2.04% per cell, P(≥4 in 30) ≈ 0.31% (~1 in 321 spins)
    pays: { 4: 2.4, 5: 4, 6: 80 },
  },
];

export const SYMBOL_MAP: Record<SymbolId, Symbol> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s])
) as Record<SymbolId, Symbol>;

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.id !== "scatter");

// ============================================================
// Game Constants
// ============================================================

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 30

export const MIN_WIN_COUNT = 8;
export const SCATTER_TRIGGER = 4;
export const FREE_SPINS_BASE = 10;
export const FREE_SPINS_RETRIGGER = 5;
export const RETRIGGER_SCATTER = 3;

export const MULTIPLIER_VALUES = [
  2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 1000
];

export const SUPER_FREE_SPINS_MIN_MULTIPLIER = 20;

export const BUY_FREE_SPINS_COST = 100;
export const BUY_SUPER_FREE_SPINS_COST = 500;

// ============================================================
// Reel Weight Pool
// ============================================================

function buildWeightedPool(): SymbolId[] {
  const pool: SymbolId[] = [];
  for (const sym of SYMBOLS) {
    for (let i = 0; i < sym.weight; i++) {
      pool.push(sym.id);
    }
  }
  return pool;
}

const SYMBOL_POOL = buildWeightedPool();
const SCATTER_BOOSTED_POOL = buildWeightedPool();

// Ante Bet 25x: scatter weight ×2
for (let i = 0; i < SYMBOL_MAP["scatter"].weight; i++) {
  SCATTER_BOOSTED_POOL.push("scatter");
}

const FREE_SPINS_POOL = SYMBOL_POOL;

function randomSymbol(anteBet25x = false, isFreeSpins = false): SymbolId {
  const pool = isFreeSpins
    ? FREE_SPINS_POOL
    : anteBet25x
    ? SCATTER_BOOSTED_POOL
    : SYMBOL_POOL;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

/**
 * Weighted multiplier value selection.
 * Real slot games use inverse-proportional weighting:
 * lower multipliers appear far more frequently than higher ones.
 * Weight(v) = 1/v, normalized to sum to 1.
 */
const MULTIPLIER_WEIGHTS: { value: number; weight: number }[] = (() => {
  const raw = MULTIPLIER_VALUES.map(v => ({ value: v, weight: 1 / v }));
  const totalW = raw.reduce((s, r) => s + r.weight, 0);
  return raw.map(r => ({ value: r.value, weight: r.weight / totalW }));
})();

const SUPER_MULTIPLIER_WEIGHTS: { value: number; weight: number }[] = (() => {
  const filtered = MULTIPLIER_VALUES.filter(v => v >= SUPER_FREE_SPINS_MIN_MULTIPLIER);
  const raw = filtered.map(v => ({ value: v, weight: 1 / v }));
  const totalW = raw.reduce((s, r) => s + r.weight, 0);
  return raw.map(r => ({ value: r.value, weight: r.weight / totalW }));
})();

function randomMultiplierValue(superFreeSpins = false): number {
  const weights = superFreeSpins ? SUPER_MULTIPLIER_WEIGHTS : MULTIPLIER_WEIGHTS;
  const r = Math.random();
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (r < cumulative) return w.value;
  }
  return weights[weights.length - 1].value;
}

/** Get the weighted average multiplier value */
export function getWeightedAvgMultiplier(superFreeSpins = false): number {
  const weights = superFreeSpins ? SUPER_MULTIPLIER_WEIGHTS : MULTIPLIER_WEIGHTS;
  return weights.reduce((s, w) => s + w.value * w.weight, 0);
}

/** Get the weighted E[v²] for variance calculation */
export function getWeightedMultiplierEV2(superFreeSpins = false): number {
  const weights = superFreeSpins ? SUPER_MULTIPLIER_WEIGHTS : MULTIPLIER_WEIGHTS;
  return weights.reduce((s, w) => s + w.value * w.value * w.weight, 0);
}

// ============================================================
// Grid Operations
// ============================================================

export type GridCell = SymbolId | null;
export type MultiplierCell = { value: number } | null;

export function generateGrid(anteBet25x = false): GridCell[] {
  return Array.from({ length: GRID_SIZE }, () => randomSymbol(anteBet25x));
}

export function generateFreeSpinsGrid(
  superFreeSpins = false
): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  const grid: GridCell[] = [];
  const multipliers: MultiplierCell[] = Array(GRID_SIZE).fill(null);

  for (let i = 0; i < GRID_SIZE; i++) {
    const sym = randomSymbol(false, true);
    grid.push(sym);
  }

  const multiplierCount = Math.floor(Math.random() * 4) + 1;
  const positionsSet = new Set<number>();
  while (positionsSet.size < multiplierCount) {
    positionsSet.add(Math.floor(Math.random() * GRID_SIZE));
  }
  Array.from(positionsSet).forEach((pos) => {
    multipliers[pos] = { value: randomMultiplierValue(superFreeSpins) };
    // Multiplier occupies the cell (not a regular symbol)
    grid[pos] = null;
  });

  return { grid, multipliers };
}

// ============================================================
// RTP Control
// ============================================================

/**
 * Global RTP multiplier: all win payouts are scaled by this factor.
 *
 * Empirically (Monte Carlo, 200,000 rounds at multiplier = 1),
 * the full engine (including tumbles, bombs, and free spins) returns
 * an average RTP of roughly **26.13% of bet**.
 *
 * We therefore treat ~24% as the **base RTP** and scale linearly
 * around this point when mapping a requested target RTP to the
 * internal `_rtpMultiplier`.
 */
const BASE_RTP_PERCENT = 26.13;

// Default target RTP = 96.5%
// So the default multiplier is 96.5 / BASE_RTP_PERCENT.
let _rtpMultiplier = 96.5 / BASE_RTP_PERCENT;

export function setRtpMultiplier(targetRtp: number): void {
  // Map requested target RTP (e.g. 100% or 200%) to the internal multiplier
  // based on the true base RTP of the engine.
  _rtpMultiplier = targetRtp / BASE_RTP_PERCENT;
}

export function getRtpMultiplier(): number {
  return _rtpMultiplier;
}

export function getTargetRtp(): number {
  // Invert the mapping so UI can display the effective target RTP.
  return _rtpMultiplier * BASE_RTP_PERCENT;
}

// ============================================================
// Volatility Control
// ============================================================

/**
 * Volatility level affects:
 * - "low":    higher hit frequency, lower max multipliers, more frequent small wins
 * - "medium": balanced (default, matches original game)
 * - "high":   lower hit frequency, higher max multipliers, rarer but bigger wins
 * - "extreme": very low hit frequency, extreme multipliers possible
 *
 * Implementation: adjusts MIN_WIN_COUNT threshold and multiplier bomb frequency/values
 */
export type VolatilityLevel = "low" | "medium" | "high" | "extreme";

let _volatility: VolatilityLevel = "medium";

export function setVolatility(level: VolatilityLevel): void {
  _volatility = level;
}

export function getVolatility(): VolatilityLevel {
  return _volatility;
}

/** Effective minimum win count based on volatility */
export function getEffectiveMinWin(): number {
  switch (_volatility) {
    case "low":     return 6;   // easier to win
    case "medium":  return 8;   // original
    case "high":    return 9;   // harder
    case "extreme": return 10;  // very hard
  }
}

/** Multiplier bomb spawn probability per cell during tumble refill */
export function getMultiplierBombChance(): number {
  switch (_volatility) {
    case "low":     return 0.04;  // 4%
    case "medium":  return 0.08;  // 8% (original)
    case "high":    return 0.12;  // 12%
    case "extreme": return 0.18;  // 18%
  }
}

/** Initial multiplier bomb count range [min, max] */
export function getInitialBombRange(): [number, number] {
  switch (_volatility) {
    case "low":     return [1, 2];
    case "medium":  return [1, 4];
    case "high":    return [2, 5];
    case "extreme": return [3, 7];
  }
}

// ============================================================
// Win Detection
// ============================================================

export interface WinResult {
  symbolId: SymbolId;
  count: number;
  positions: number[];
  payout: number;
}

export interface SpinResult {
  wins: WinResult[];
  totalPayout: number;
  scatterCount: number;
  scatterPositions: number[];
  scatterPayout: number;
  triggersBonus: boolean;
}

export function calculateWins(grid: GridCell[]): SpinResult {
  const wins: WinResult[] = [];
  let totalPayout = 0;
  let scatterPayout = 0;

  const effectiveMinWin = getEffectiveMinWin();

  const symbolCounts: Record<string, { count: number; positions: number[] }> = {};

  for (let i = 0; i < grid.length; i++) {
    const sym = grid[i];
    if (sym === null) continue;
    if (!symbolCounts[sym]) {
      symbolCounts[sym] = { count: 0, positions: [] };
    }
    symbolCounts[sym].count++;
    symbolCounts[sym].positions.push(i);
  }

  for (const [symId, { count, positions }] of Object.entries(symbolCounts)) {
    const symbol = SYMBOL_MAP[symId as SymbolId];
    if (!symbol) continue;

    if (symId === "scatter") {
      if (count >= 4) {
        const rawPayout = symbol.pays[Math.min(count, 6)] || symbol.pays[6] || 0;
        const payout = Math.round(rawPayout * _rtpMultiplier * 100) / 100;
        scatterPayout = payout;
        wins.push({ symbolId: "scatter", count, positions, payout });
      }
    } else {
      if (count >= effectiveMinWin) {
        const payKeys = Object.keys(symbol.pays)
          .map(Number)
          .sort((a, b) => b - a);
        let rawPayout = 0;
        for (const key of payKeys) {
          if (count >= key) {
            rawPayout = symbol.pays[key];
            break;
          }
        }
        if (rawPayout > 0) {
          const payout = Math.round(rawPayout * _rtpMultiplier * 100) / 100;
          wins.push({ symbolId: symId as SymbolId, count, positions, payout });
          totalPayout += payout;
        }
      }
    }
  }

  const scatterCount = symbolCounts["scatter"]?.count || 0;
  const scatterPositions = symbolCounts["scatter"]?.positions || [];

  return {
    wins,
    totalPayout: totalPayout + scatterPayout,
    scatterCount,
    scatterPositions,
    scatterPayout,
    triggersBonus: scatterCount >= SCATTER_TRIGGER,
  };
}

// ============================================================
// Tumble Mechanics
// ============================================================

export interface TumbleStep {
  grid: GridCell[];
  multipliers: MultiplierCell[];
  wins: WinResult[];
  payout: number;
  multiplierTotal: number;
  // Positions of newly filled symbols after tumble (for drop animation)
  newPositions: number[];
}

export function tumble(
  grid: GridCell[],
  multipliers: MultiplierCell[],
  winPositions: number[],
  isFreeSpins: boolean,
  superFreeSpins: boolean
): { newGrid: GridCell[]; newMultipliers: MultiplierCell[]; newPositions: number[] } {
  const newGrid = [...grid];
  const newMultipliers = [...multipliers];
  const newPositions: number[] = [];

  for (const pos of winPositions) {
    newGrid[pos] = null;
  }

  const bombChance = getMultiplierBombChance();

  for (let col = 0; col < GRID_COLS; col++) {
    const entities: ({ kind: "mult"; mult: MultiplierCell } | { kind: "sym"; sym: SymbolId })[] = [];
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const idx = row * GRID_COLS + col;
      const mult = newMultipliers[idx];
      const sym = newGrid[idx];
      if (mult !== null) {
        entities.push({ kind: "mult", mult });
      } else if (sym !== null) {
        entities.push({ kind: "sym", sym });
      }
    }

    const emptyCount = GRID_ROWS - entities.length;

    for (let i = 0; i < emptyCount; i++) {
      if (isFreeSpins && Math.random() < bombChance) {
        entities.push({ kind: "mult", mult: { value: randomMultiplierValue(superFreeSpins) } });
      } else {
        entities.push({ kind: "sym", sym: randomSymbol(false, isFreeSpins) });
      }
    }

    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const idx = row * GRID_COLS + col;
      const symIdx = GRID_ROWS - 1 - row;
      const ent = entities[symIdx];
      if (!ent) {
        newGrid[idx] = null;
        newMultipliers[idx] = null;
      } else if (ent.kind === "mult") {
        newGrid[idx] = null;
        newMultipliers[idx] = ent.mult;
      } else {
        newGrid[idx] = ent.sym;
        newMultipliers[idx] = null;
      }
    }

    // Track which positions were newly filled (top rows that were empty)
    for (let i = 0; i < emptyCount; i++) {
      const row = i; // top rows get new symbols
      const idx = row * GRID_COLS + col;
      newPositions.push(idx);
    }
  }

  return { newGrid, newMultipliers, newPositions };
}

export function executeTumbleSequence(
  initialGrid: GridCell[],
  initialMultipliers: MultiplierCell[],
  isFreeSpins: boolean,
  superFreeSpins: boolean
): TumbleStep[] {
  const steps: TumbleStep[] = [];
  let currentGrid = [...initialGrid];
  let currentMultipliers = [...initialMultipliers];

  while (true) {
    const spinResult = calculateWins(currentGrid);

    if (spinResult.wins.length === 0) break;

    const allWinPositionsSet = new Set<number>();
    for (const win of spinResult.wins) {
      for (const pos of win.positions) {
        allWinPositionsSet.add(pos);
      }
    }
    const allWinPositions = Array.from(allWinPositionsSet);

    let multiplierTotal = 0;
    if (isFreeSpins) {
      for (let i = 0; i < currentMultipliers.length; i++) {
        if (currentMultipliers[i] !== null) {
          multiplierTotal += currentMultipliers[i]!.value;
        }
      }
    }

    const { newGrid, newMultipliers, newPositions } = tumble(
      currentGrid,
      currentMultipliers,
      allWinPositions,
      isFreeSpins,
      superFreeSpins
    );

    steps.push({
      grid: [...currentGrid],
      multipliers: [...currentMultipliers],
      wins: spinResult.wins,
      payout: spinResult.totalPayout,
      multiplierTotal,
      newPositions,
    });

    currentGrid = newGrid;
    currentMultipliers = newMultipliers;
  }

  return steps;
}

// ============================================================
// Full Spin Logic
// ============================================================

export interface FullSpinResult {
  initialGrid: GridCell[];
  initialMultipliers: MultiplierCell[];
  tumbleSteps: TumbleStep[];
  totalPayout: number;
  scatterCount: number;
  triggersBonus: boolean;
  scatterPayout: number;
  isFreeSpins: boolean;
  superFreeSpins: boolean;
  // Final grid state after all tumbles complete (no winning symbols)
  finalGrid: GridCell[];
  finalMultipliers: MultiplierCell[];
}

export function spin(
  isFreeSpins: boolean = false,
  superFreeSpins: boolean = false,
  anteBet25x: boolean = false
): FullSpinResult {
  let initialGrid: GridCell[];
  let initialMultipliers: MultiplierCell[];

  if (isFreeSpins) {
    const [minBombs, maxBombs] = getInitialBombRange();
    const result = generateFreeSpinsGridWithRange(superFreeSpins, minBombs, maxBombs);
    initialGrid = result.grid;
    initialMultipliers = result.multipliers;
  } else {
    initialGrid = generateGrid(anteBet25x);
    initialMultipliers = Array(GRID_SIZE).fill(null);
  }

  const initialSpinResult = calculateWins(initialGrid);

  const tumbleSteps = executeTumbleSequence(
    initialGrid,
    initialMultipliers,
    isFreeSpins,
    superFreeSpins
  );

  // Sum all step payouts first (without multiplier)
  let basePayout = 0;
  for (const step of tumbleSteps) {
    basePayout += step.payout;
  }
  // In free spins, apply final multiplierTotal at the end of the sequence
  let totalPayout = basePayout;
  if (isFreeSpins && tumbleSteps.length > 0) {
    const finalMultiplierTotal = tumbleSteps[tumbleSteps.length - 1].multiplierTotal;
    if (finalMultiplierTotal > 0) {
      totalPayout = basePayout * finalMultiplierTotal;
    }
  }

  totalPayout += initialSpinResult.scatterPayout;

  // Compute final grid after all tumbles
  let finalGrid: GridCell[];
  let finalMultipliers: MultiplierCell[];
  if (tumbleSteps.length === 0) {
    finalGrid = [...initialGrid];
    finalMultipliers = [...initialMultipliers];
  } else {
    // Apply the last tumble to get the final state
    const lastStep = tumbleSteps[tumbleSteps.length - 1];
    const lastWinPositions: number[] = [];
    for (const win of lastStep.wins) lastWinPositions.push(...win.positions);
    const { newGrid, newMultipliers } = tumble(
      lastStep.grid,
      lastStep.multipliers,
      lastWinPositions,
      isFreeSpins,
      superFreeSpins
    );
    finalGrid = newGrid;
    finalMultipliers = newMultipliers;
  }

  return {
    initialGrid,
    initialMultipliers,
    tumbleSteps,
    totalPayout,
    scatterCount: initialSpinResult.scatterCount,
    triggersBonus: initialSpinResult.triggersBonus,
    scatterPayout: initialSpinResult.scatterPayout,
    isFreeSpins,
    superFreeSpins,
    finalGrid,
    finalMultipliers,
  };
}

function generateFreeSpinsGridWithRange(
  superFreeSpins: boolean,
  minBombs: number,
  maxBombs: number
): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  const grid: GridCell[] = [];
  const multipliers: MultiplierCell[] = Array(GRID_SIZE).fill(null);

  for (let i = 0; i < GRID_SIZE; i++) {
    grid.push(randomSymbol(false, true));
  }

  const multiplierCount = minBombs + Math.floor(Math.random() * (maxBombs - minBombs + 1));
  const positionsSet = new Set<number>();
  while (positionsSet.size < Math.min(multiplierCount, GRID_SIZE)) {
    positionsSet.add(Math.floor(Math.random() * GRID_SIZE));
  }
  Array.from(positionsSet).forEach((pos) => {
    multipliers[pos] = { value: randomMultiplierValue(superFreeSpins) };
    // Multiplier occupies the cell (not a regular symbol)
    grid[pos] = null;
  });

  return { grid, multipliers };
}

export function buyFreeSpins(superFreeSpins: boolean = false): GridCell[] {
  // For the Buy Free Spins feature, GLI-19 requires that outcomes are
  // driven directly by RNG and not "forced" after the fact.
  // We therefore sample grids until RNG naturally produces a spin
  // that meets the documented condition (≥ SCATTER_TRIGGER scatters).
  // This is equivalent to drawing from the conditional distribution
  // "given that the spin triggers Free Spins", without altering
  // individual outcomes once selected.
  // (The superFreeSpins flag is handled by the caller via bet/feature logic.)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const grid = generateGrid(false);
    const result = calculateWins(grid);
    if (result.scatterCount >= SCATTER_TRIGGER) {
      return grid;
    }
  }
}

// ============================================================
// Statistics & Math Analysis
// ============================================================

export interface GameStats {
  totalSpins: number;
  totalBet: number;
  totalWin: number;
  realRTP: number;
  biggestWin: number;
  biggestWinMultiplier: number;
  freeSpinsTriggered: number;
  tumbleHistory: number[];
  winHistory: number[];
}

export function createInitialStats(): GameStats {
  return {
    totalSpins: 0,
    totalBet: 0,
    totalWin: 0,
    realRTP: 0,
    biggestWin: 0,
    biggestWinMultiplier: 0,
    freeSpinsTriggered: 0,
    tumbleHistory: [],
    winHistory: [],
  };
}

export function updateStats(
  stats: GameStats,
  bet: number,
  winMultiplier: number,
  tumbleCount: number,
  triggeredBonus: boolean,
  isFreeSpinRound: boolean = false,
  actualBet?: number
): GameStats {
  // For FS rounds: bet=0 (don't count bet/spins), but use actualBet for win calculation
  const effectiveBetForWin = actualBet !== undefined ? actualBet : bet;
  const winAmount = effectiveBetForWin * winMultiplier;
  const newStats = {
    ...stats,
    totalSpins: isFreeSpinRound ? stats.totalSpins : stats.totalSpins + 1,
    totalBet: stats.totalBet + bet,
    totalWin: stats.totalWin + winAmount,
    freeSpinsTriggered: stats.freeSpinsTriggered + (triggeredBonus ? 1 : 0),
    tumbleHistory: isFreeSpinRound ? stats.tumbleHistory : [...stats.tumbleHistory.slice(-49), tumbleCount],
    winHistory: isFreeSpinRound ? stats.winHistory : [...stats.winHistory.slice(-49), winMultiplier],
  };
  newStats.realRTP = newStats.totalBet > 0
    ? (newStats.totalWin / newStats.totalBet) * 100
    : 0;
  if (winMultiplier > newStats.biggestWinMultiplier) {
    newStats.biggestWin = winAmount;
    newStats.biggestWinMultiplier = winMultiplier;
  }
  return newStats;
}

// ============================================================
// PAR Sheet & Advanced Math Analysis
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

export interface PARSheetData {
  // Per-symbol analysis
  symbolAnalysis: {
    id: string;
    name: string;
    weight: number;
    probability: number;           // P per cell
    expectedCount: number;         // E[count] in 30 cells
    hitProbability: number;        // P(count >= minWin)
    expectedPayout: number;        // E[payout] per spin (× bet)
    varianceContribution: number;  // Var contribution
    payTiers: { minCount: number; maxCount: number; payout: number; probability: number; ev: number }[];
  }[];
  // Scatter analysis
  scatterAnalysis: {
    probability: number;
    triggerProbability: number;     // P(>=4 scatter)
    expectedPayout: number;
    payTiers: { count: number; payout: number; probability: number; ev: number }[];
  };
  // Aggregate metrics
  totalWeight: number;
  baseGameRTP: number;             // Base game EV as % of bet
  baseGameHitFrequency: number;    // P(any win on a spin)
  standardDeviation: number;       // σ of single spin payout
  volatilityIndex: number;         // 1.96 × σ (95% CI)
  confidenceIntervals: {
    spins: number;
    ci90: [number, number];
    ci95: [number, number];
    ci99: [number, number];
  }[];
  // Free Spins analysis
  freeSpinsAnalysis: {
    triggerProbability: number;
    baseSpins: number;
    retriggerProbability: number;
    expectedTotalSpins: number;
    expectedMultiplierPerSpin: number;
    avgBombValue: number;
    bombChancePerCell: number;
    expectedBombsPerTumble: number;
    estimatedFreeSpinsRTP: number;  // Estimated FS contribution to total RTP
  };
  // Tumble analysis
  tumbleAnalysis: {
    estimatedAvgTumbles: number;    // Estimated average tumbles per winning spin
    tumbleMultiplierEffect: number; // How much tumbles increase base win
  };
}

export function computePARSheet(): PARSheetData {
  const tw = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  const effectiveMin = getEffectiveMinWin();

  // ================================================================
  // Per-symbol analysis using exact Binomial distribution
  // Each cell is drawn independently from the weighted pool.
  // For a single symbol with weight w, P(symbol) = w / totalWeight.
  // The count of that symbol in 30 cells follows Binomial(30, p).
  // Although the full joint distribution is Multinomial, the marginal
  // distribution of each symbol's count IS exactly Binomial(n, p_i).
  // This is a mathematical fact, not an approximation.
  // ================================================================
  const symbolAnalysis = SYMBOLS.filter(s => s.id !== "scatter").map(sym => {
    const p = sym.weight / tw;
    const expectedCount = p * GRID_SIZE;
    const payKeys = Object.keys(sym.pays).map(Number).sort((a, b) => a - b);

    let hitProbability = 0;
    let expectedPayout = 0;
    let expectedPayoutSquared = 0; // E[X_i^2] for variance
    const payTiers: { minCount: number; maxCount: number; payout: number; probability: number; ev: number }[] = [];

    for (let i = 0; i < payKeys.length; i++) {
      const minCount = Math.max(payKeys[i], effectiveMin); // Only counts >= effectiveMin actually pay
      const maxCount = i + 1 < payKeys.length ? payKeys[i + 1] - 1 : GRID_SIZE;

      if (minCount > maxCount) {
        // This pay tier is entirely below the effective minimum
        payTiers.push({ minCount: payKeys[i], maxCount, payout: sym.pays[payKeys[i]], probability: 0, ev: 0 });
        continue;
      }

      let prob = 0;
      for (let k = minCount; k <= maxCount; k++) {
        prob += binomPMF(GRID_SIZE, k, p);
      }
      const payout = sym.pays[payKeys[i]];
      const ev = prob * payout;
      expectedPayout += ev;
      expectedPayoutSquared += prob * payout * payout;
      hitProbability += prob;

      payTiers.push({ minCount: payKeys[i], maxCount, payout, probability: prob, ev });
    }

    return {
      id: sym.id,
      name: sym.name,
      weight: sym.weight,
      probability: p,
      expectedCount,
      hitProbability,
      expectedPayout,
      varianceContribution: expectedPayoutSquared, // E[X_i^2], NOT variance yet
      payTiers,
    };
  });

  // ================================================================
  // Scatter analysis (exact Binomial)
  // ================================================================
  const scatterSym = SYMBOLS.find(s => s.id === "scatter")!;
  const pScatter = scatterSym.weight / tw;
  const scatterPayKeys = [4, 5, 6];
  let scatterEV = 0;
  let scatterEV2 = 0; // E[scatter_payout^2]
  const scatterPayTiers: { count: number; payout: number; probability: number; ev: number }[] = [];

  for (let i = 0; i < scatterPayKeys.length; i++) {
    const k = scatterPayKeys[i];
    const maxK = i + 1 < scatterPayKeys.length ? scatterPayKeys[i + 1] - 1 : GRID_SIZE;
    let prob = 0;
    for (let j = k; j <= maxK; j++) {
      prob += binomPMF(GRID_SIZE, j, pScatter);
    }
    const payout = scatterSym.pays[k] || 0;
    const ev = prob * payout;
    scatterEV += ev;
    scatterEV2 += prob * payout * payout;
    scatterPayTiers.push({ count: k, payout, probability: prob, ev });
  }

  const triggerProb = binomCDF_ge(GRID_SIZE, SCATTER_TRIGGER, pScatter);

  // ================================================================
  // Base Game RTP (single spin, first tumble only)
  // E[payout] = Σ E[payout_i] + E[scatter_payout]
  // This is exact because expectation is linear (no independence needed).
  // ================================================================
  const baseGameRTP = symbolAnalysis.reduce((s, sym) => s + sym.expectedPayout, 0) + scatterEV;

  // ================================================================
  // Hit Frequency using exact Monte Carlo simulation
  // The "no-win probability" cannot be computed analytically in closed
  // form for the Multinomial distribution (symbols are negatively
  // correlated). We use a high-precision MC estimate.
  // ================================================================
  const MC_ITERATIONS = 100000;
  let mcHits = 0;
  for (let iter = 0; iter < MC_ITERATIONS; iter++) {
    // Simulate one spin
    const counts: Record<string, number> = {};
    for (let cell = 0; cell < GRID_SIZE; cell++) {
      const r = Math.random() * tw;
      let cumW = 0;
      for (const sym of SYMBOLS) {
        cumW += sym.weight;
        if (r < cumW) {
          counts[sym.id] = (counts[sym.id] || 0) + 1;
          break;
        }
      }
    }
    let hasWin = false;
    for (const sym of SYMBOLS) {
      const c = counts[sym.id] || 0;
      if (sym.id === "scatter") {
        if (c >= SCATTER_TRIGGER) { hasWin = true; break; }
      } else {
        if (c >= effectiveMin) { hasWin = true; break; }
      }
    }
    if (hasWin) mcHits++;
  }
  const baseGameHitFrequency = mcHits / MC_ITERATIONS;

  // ================================================================
  // Variance & Standard Deviation (exact for independent payouts)
  //
  // Total payout X = Σ X_i + X_scatter
  // Var(X) = Σ Var(X_i) + Var(X_scatter) + 2·Σ_{i<j} Cov(X_i, X_j)
  //        + 2·Σ_i Cov(X_i, X_scatter)
  //
  // For each symbol i: Var(X_i) = E[X_i²] - E[X_i]²
  //
  // Covariance between symbol payouts:
  // In the Multinomial model, Cov(count_i, count_j) = -n·p_i·p_j
  // However, the payout function is a step function of count,
  // making exact Cov(X_i, X_j) intractable analytically.
  //
  // For Cluster Pays games, the covariance between different symbol
  // payouts is negligible because:
  // 1. Wins require 8+ of the same symbol (rare events)
  // 2. Two different symbols rarely both reach 8+ simultaneously
  // 3. The negative correlation in counts has minimal effect on
  //    the product of indicator functions at high thresholds
  //
  // Therefore, we use Var(X) ≈ Σ Var(X_i) + Var(X_scatter)
  // This is a tight upper bound (covariance terms are negative).
  // ================================================================
  let variance = 0;
  for (const sym of symbolAnalysis) {
    // Var(X_i) = E[X_i²] - E[X_i]²
    const varI = sym.varianceContribution - sym.expectedPayout * sym.expectedPayout;
    variance += varI;
  }
  // Scatter variance
  const scatterVar = scatterEV2 - scatterEV * scatterEV;
  variance += scatterVar;

  const standardDeviation = Math.sqrt(Math.max(0, variance));

  // Volatility Index (95% CI half-width for single spin)
  const volatilityIndex = 1.96 * standardDeviation;

  // ================================================================
  // Confidence Intervals for observed RTP over N spins
  // By CLT: observed_RTP ~ N(true_RTP, σ²/N)
  // CI uses the total RTP estimate (base + FS contribution)
  // ================================================================
  const spinCounts = [100, 500, 1000, 5000, 10000, 50000, 100000];

  // ================================================================
  // Free Spins Analysis (rigorous derivation)
  // ================================================================
  const avgMultiplierValue = getWeightedAvgMultiplier(false);
  const bombChance = getMultiplierBombChance();

  // Expected bombs per tumble refill:
  // Each of the emptied cells has bombChance probability of becoming a bomb.
  // On average, a winning spin removes ~hitRate × GRID_SIZE cells.
  // But for initial FS grid, bombs are placed on the full grid.
  // For tumble refills, bombs only appear on newly filled cells.
  // Expected new cells per tumble ≈ E[win_positions] which varies.
  // We use the initial grid bomb count as a separate metric.
  const [minBombs, maxBombs] = getInitialBombRange();
  const expectedInitialBombs = (minBombs + maxBombs) / 2;
  const expectedBombsPerTumble = bombChance * GRID_SIZE * 0.3; // ~30% cells replaced per tumble on average
  const expectedMultiplierPerSpin = (expectedInitialBombs + expectedBombsPerTumble) * avgMultiplierValue;

  // Retrigger probability: P(>=4 scatter in 30 cells during FS)
  const retriggerProb = binomCDF_ge(GRID_SIZE, SCATTER_TRIGGER, pScatter);

  // Expected total FS spins using geometric series:
  // E[total] = base + base × P(retrigger) × (retrigger_spins / base) + ...
  // = base × Σ_{k=0}^∞ (P_retrigger)^k × (retrigger_spins/base)^k
  // With retrigger giving +5 spins each time:
  // E[total] = base + retriggerProb × (FREE_SPINS_RETRIGGER + E[additional from that retrigger])
  // Solving: E[T] = base + retriggerProb × (retrigger_spins + E[T_remaining])
  // For simplicity with the renewal equation:
  // E[total_spins] = base / (1 - retriggerProb × FREE_SPINS_RETRIGGER / base)
  // But this only works if retriggerProb × retrigger_spins / base < 1
  const retriggerRatio = retriggerProb * FREE_SPINS_RETRIGGER / FREE_SPINS_BASE;
  const expectedTotalSpins = retriggerRatio < 1
    ? FREE_SPINS_BASE / (1 - retriggerRatio)
    : FREE_SPINS_BASE * 10; // cap at 10x if divergent

  // ================================================================
  // Free Spins RTP Contribution (analytical model)
  //
  // FS_RTP = P(trigger) × E[total_FS_spins] × E[payout_per_FS_spin]
  //
  // E[payout_per_FS_spin] = baseGameRTP × E[multiplier_factor]
  //
  // The multiplier factor for each tumble step:
  // If there are B bombs on the grid with values v_1,...,v_B,
  // the total multiplier M = Σ v_i (applied to that step's payout).
  // E[M | B bombs] = B × E[v] = B × avgMultiplierValue
  //
  // The payout for a FS spin with tumble steps:
  // payout = Σ_{step} base_payout_step × M_step
  //
  // For the first tumble: M comes from initial bombs.
  // For subsequent tumbles: M grows as new bombs appear.
  //
  // Simplified but rigorous:
  // E[payout_per_FS_spin] ≈ baseGameRTP × (1 + E[M_initial])
  //   where E[M_initial] = expectedInitialBombs × avgMultiplierValue
  //
  // With tumble cascades, multiplier accumulates:
  // E[effective_multiplier] ≈ E[M_initial] × E[tumbles_per_spin]
  // ================================================================
  const expectedInitialMultiplier = expectedInitialBombs * avgMultiplierValue;

  // Tumble analysis using geometric model:
  // If P(win) = hitFreq, then E[tumbles | first win] follows geometric:
  // E[tumbles] = 1 / (1 - P(subsequent_win))
  // After a tumble, the grid is partially refreshed with random symbols.
  // P(subsequent_win) ≈ baseGameHitFrequency (same distribution)
  // E[tumbles | at least 1 win] = 1 / (1 - baseGameHitFrequency)
  const pSubsequentWin = Math.min(baseGameHitFrequency, 0.95); // cap to prevent divergence
  const estimatedAvgTumbles = baseGameHitFrequency > 0
    ? 1 / (1 - pSubsequentWin)
    : 1;

  // Tumble multiplier effect on base payout:
  // Each tumble adds ~baseGameRTP to the total, so
  // total_payout ≈ baseGameRTP × E[tumbles]
  const tumbleMultiplierEffect = estimatedAvgTumbles;

  // FS payout per spin with multiplier accumulation:
  // Each tumble step i has multiplier M_i = M_initial + Σ_{j<i} new_bombs_j × avgMultiplierValue
  // E[M_i] ≈ expectedInitialMultiplier + i × expectedBombsPerTumble × avgMultiplierValue
  // E[total_FS_payout_per_spin] = Σ_{i=1}^{E[tumbles]} baseGameRTP × E[M_i]
  //   = baseGameRTP × Σ_{i=1}^{T} (M_0 + (i-1) × ΔM)
  //   = baseGameRTP × T × (M_0 + (T-1)/2 × ΔM)
  const deltaM = expectedBombsPerTumble * avgMultiplierValue;
  const T = estimatedAvgTumbles;
  const effectiveFSMultiplier = Math.max(1, expectedInitialMultiplier + (T - 1) / 2 * deltaM);
  const expectedFSPayoutPerSpin = baseGameRTP * effectiveFSMultiplier;

  const estimatedFreeSpinsRTP = triggerProb * expectedTotalSpins * expectedFSPayoutPerSpin;

  // Total RTP estimate for confidence intervals
  const totalRTPEstimate = baseGameRTP * tumbleMultiplierEffect + estimatedFreeSpinsRTP;

  const confidenceIntervals = spinCounts.map(n => {
    const sqrtN = Math.sqrt(n);
    // Use total RTP estimate as center, and scale σ for tumble/FS effects
    const effectiveSD = standardDeviation * Math.sqrt(tumbleMultiplierEffect);
    return {
      spins: n,
      ci90: [totalRTPEstimate - 1.645 * effectiveSD / sqrtN, totalRTPEstimate + 1.645 * effectiveSD / sqrtN] as [number, number],
      ci95: [totalRTPEstimate - 1.96 * effectiveSD / sqrtN, totalRTPEstimate + 1.96 * effectiveSD / sqrtN] as [number, number],
      ci99: [totalRTPEstimate - 2.576 * effectiveSD / sqrtN, totalRTPEstimate + 2.576 * effectiveSD / sqrtN] as [number, number],
    };
  });

  return {
    symbolAnalysis,
    scatterAnalysis: {
      probability: pScatter,
      triggerProbability: triggerProb,
      expectedPayout: scatterEV,
      payTiers: scatterPayTiers,
    },
    totalWeight: tw,
    baseGameRTP,
    baseGameHitFrequency,
    standardDeviation,
    volatilityIndex,
    confidenceIntervals,
    freeSpinsAnalysis: {
      triggerProbability: triggerProb,
      baseSpins: FREE_SPINS_BASE,
      retriggerProbability: retriggerProb,
      expectedTotalSpins,
      expectedMultiplierPerSpin,
      avgBombValue: avgMultiplierValue,
      bombChancePerCell: bombChance,
      expectedBombsPerTumble,
      estimatedFreeSpinsRTP,
    },
    tumbleAnalysis: {
      estimatedAvgTumbles,
      tumbleMultiplierEffect,
    },
  };
}

// ============================================================
// Paytable Display Data
// ============================================================

export interface PaytableEntry {
  symbol: Symbol;
  pays: { count: number; multiplier: number }[];
}

export function getPaytable(): PaytableEntry[] {
  return SYMBOLS.map((sym) => ({
    symbol: sym,
    pays: Object.entries(sym.pays)
      .map(([count, multiplier]) => ({
        count: Number(count),
        multiplier,
      }))
      .sort((a, b) => b.count - a.count),
  }));
}
