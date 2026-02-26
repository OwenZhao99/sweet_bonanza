/**
 * Sugar Rush 1000 - Game Engine (simulation-first)
 *
 * Rules summary (from in‑game help / Pragmatic Play page):
 * - 7×7 grid (49 cells)
 * - Cluster pays: minimum 5 symbols connected horizontally or vertically
 * - Tumble: winning clusters explode, symbols fall down, new symbols drop from above
 * - Multiplier Spots:
 *   - Each time a symbol in a cell is part of a winning cluster, that cell is "marked".
 *   - Marks persist for the whole tumble sequence; in Free Spins they persist for the whole FS round.
 *   - For each cell we track how many times a win has occurred on that spot:
 *       hits = 0 → no multiplier
 *       hits >= 1 → visual multiplier 2^hits (capped at x1024)
 *   - For math purposes, a cluster's payout is multiplied by the sum of multipliers
 *     on its cells (if none, multiplier = 1).
 * - Free Spins:
 *   - 3 / 4 / 5 / 6 / 7 scatters → 10 / 12 / 15 / 20 / 30 free spins.
 *   - During Free Spins, marked spots and their multipliers persist between spins.
 * - Buy Feature:
 *   - Buy Free Spins: 100× total bet.
 *   - Buy Super Free Spins: 500× total bet; all grid positions start at x2.
 * - Max win: 25,000× bet (base game and free spins).
 */

// ============================================================
// Types
// ============================================================

export type SugarSymbolId =
  | "pink_ball"
  | "orange_bean"
  | "purple_bean"
  | "green_star"
  | "red_bear"
  | "purple_bear"
  | "orange_bear"
  | "scatter";

export interface SugarSymbol {
  id: SugarSymbolId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  /**
   * Cluster size → payout multiplier (× bet).
   * Keys are tier minimums. Tier 15 represents 15+.
   */
  pays: Record<number, number>;
  /** Appearance weight in the reel pool. */
  weight: number;
}

export type GridCell = SugarSymbolId | null;

export interface MultiplierSpotCell {
  /** Visual multiplier value for this spot (2^hits, capped at 1024). */
  value: number;
  /** Number of historical wins that have occurred on this cell in this cycle. */
  hitCount: number;
}

export type MultiplierGrid = (MultiplierSpotCell | null)[];

export interface WinResult {
  symbolId: SugarSymbolId;
  count: number;
  positions: number[];
  /** Payout in units of × bet for this cluster (after multipliers, before bet). */
  payout: number;
}

export interface SpinResult {
  wins: WinResult[];
  /** Total payout for this tumble step (× bet). */
  totalPayout: number;
  scatterCount: number;
  scatterPositions: number[];
  scatterPayout: number;
  triggersBonus: boolean;
}

export interface TumbleStep {
  grid: GridCell[];
  multipliers: MultiplierGrid;
  wins: WinResult[];
  /** Payout for this tumble step (× bet). */
  payout: number;
  /** Positions that received newly dropped symbols as a result of this tumble. */
  newPositions: number[];
}

export interface FullSpinResult {
  initialGrid: GridCell[];
  initialMultipliers: MultiplierGrid;
  tumbleSteps: TumbleStep[];
  /** Total payout for this spin (× bet). */
  totalPayout: number;
  scatterCount: number;
  triggersBonus: boolean;
  scatterPayout: number;
  isFreeSpins: boolean;
  superFreeSpins: boolean;
  finalGrid: GridCell[];
  finalMultipliers: MultiplierGrid;
  /** Final sum of all multiplier values on the grid (for UI / stats only). */
  finalMultiplierSum: number;
  /** Raw hit-counts per cell after all tumbles (for FS carry-over). */
  finalHitCounts: number[];
}

// ============================================================
// Constants (rules)
// ============================================================

export const GRID_COLS = 7;
export const GRID_ROWS = 7;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 49

export const MIN_CLUSTER_WIN = 5;

export const SCATTER_TRIGGER_BASE = 3;
export const MAX_SCATTER_COUNT = 7;

export const MAX_WIN_MULTIPLIER = 25000;

export const BUY_FREE_SPINS_COST = 100;
export const BUY_SUPER_FREE_SPINS_COST = 500;

export function freeSpinsForScatterCount(scatterCount: number): number {
  if (scatterCount >= 7) return 30;
  if (scatterCount === 6) return 20;
  if (scatterCount === 5) return 15;
  if (scatterCount === 4) return 12;
  if (scatterCount === 3) return 10;
  return 0;
}

// ============================================================
// RTP control
// ============================================================

const THEORETICAL_RTP = 96.53;

// Global payout scaler for Sugar Rush paytable (help-screen values are in
// “coins”, not direct ×bet multipliers). This value is tuned via Monte Carlo
// so that, after tumbles + Free Spins, the long-term RTP is in a sensible
// 90%–100% range.
const PAYTABLE_VALUE_SCALE = 1.4;

let _rtpMultiplier = 1.0;

export function setRtpMultiplier(targetRtp: number): void {
  _rtpMultiplier = targetRtp / THEORETICAL_RTP;
}

export function getTargetRtp(): number {
  return _rtpMultiplier * THEORETICAL_RTP;
}

export function getRtpMultiplier(): number {
  return _rtpMultiplier;
}

// ============================================================
// Symbols & Paytable (× bet)
// Numbers copied from Sugar Rush 1000 / Fortune-style help screen.
// ============================================================

export const SYMBOLS: SugarSymbol[] = [
  {
    id: "pink_ball",
    name: "Pink Candy",
    emoji: "🍬",
    color: "#fb7185",
    bgColor: "#4b0f25",
    // 15+:300, 14:140, 13:70, 12:30, 11:15, 10:10, 9:4, 8:3, 7:3, 6:2, 5:2
    pays: { 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 10, 11: 15, 12: 30, 13: 70, 14: 140, 15: 300 },
    weight: 4,
  },
  {
    id: "orange_bean",
    name: "Orange Candy",
    emoji: "🍊",
    color: "#fb923c",
    bgColor: "#451a03",
    // 15+:200, 14:120, 13:60, 12:25, 11:12, 10:8, 9:4, 8:3, 7:2.5, 6:2, 5:1.5
    pays: { 5: 1.5, 6: 2, 7: 2.5, 8: 3, 9: 4, 10: 8, 11: 12, 12: 25, 13: 60, 14: 120, 15: 200 },
    weight: 4,
  },
  {
    id: "purple_bean",
    name: "Purple Candy",
    emoji: "🍇",
    color: "#a855f7",
    bgColor: "#2e1065",
    // 15+:120, 14:80, 13:40, 12:20, 11:16, 10:9, 9:4, 8:3, 7:2.5, 6:1.5, 5:1
    pays: { 5: 1, 6: 1.5, 7: 2.5, 8: 3, 9: 4, 10: 9, 11: 16, 12: 20, 13: 40, 14: 80, 15: 120 },
    weight: 4,
  },
  {
    id: "green_star",
    name: "Green Star",
    emoji: "⭐",
    color: "#22c55e",
    bgColor: "#052e16",
    // 15+:80, 14:40, 13:20, 12:10, 11:8, 10:6, 9:3, 8:2.5, 7:2, 6:1.5, 5:0.8
    pays: { 5: 0.8, 6: 1.5, 7: 2, 8: 2.5, 9: 3, 10: 6, 11: 8, 12: 10, 13: 20, 14: 40, 15: 80 },
    weight: 5,
  },
  {
    id: "red_bear",
    name: "Red Gummy",
    emoji: "🧸",
    color: "#ef4444",
    bgColor: "#450a0a",
    // 15+:60, 14:30, 13:16, 12:7, 11:5, 10:3, 9:2, 8:1.5, 7:1, 6:0.8, 5:0.6
    pays: { 5: 0.6, 6: 0.8, 7: 1, 8: 1.5, 9: 2, 10: 3, 11: 5, 12: 7, 13: 16, 14: 30, 15: 60 },
    weight: 3,
  },
  {
    id: "purple_bear",
    name: "Purple Gummy",
    emoji: "🐻‍❄️",
    color: "#c084fc",
    bgColor: "#1e1030",
    // 15+:50, 14:24, 13:12, 12:6, 11:4, 10:2.5, 9:1.5, 8:1, 7:0.8, 6:0.6, 5:0.5
    pays: { 5: 0.5, 6: 0.6, 7: 0.8, 8: 1, 9: 1.5, 10: 2.5, 11: 4, 12: 6, 13: 12, 14: 24, 15: 50 },
    weight: 3,
  },
  {
    id: "orange_bear",
    name: "Orange Gummy",
    emoji: "🧃",
    color: "#f97316",
    bgColor: "#431407",
    // 15+:40, 14:20, 13:10, 12:5, 11:3, 10:2, 9:1, 8:0.8, 7:0.8, 6:0.6, 5:0.4
    pays: { 5: 0.4, 6: 0.6, 7: 0.8, 8: 0.8, 9: 1, 10: 2, 11: 3, 12: 5, 13: 10, 14: 20, 15: 40 },
    weight: 3,
  },
  {
    id: "scatter",
    name: "Scatter",
    emoji: "🥚",
    color: "#fbbf24",
    bgColor: "#2b2010",
    pays: {},
    // Much lower weight to keep Free Spins trigger frequency reasonable.
    weight: 0.2,
  },
];

export const SYMBOL_MAP: Record<SugarSymbolId, SugarSymbol> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s]),
) as Record<SugarSymbolId, SugarSymbol>;

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.id !== "scatter");

// ============================================================
// Weighted sampling
// ============================================================

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, sym) => sum + sym.weight, 0);

function randomSymbol(): SugarSymbolId {
  const r = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const sym of SYMBOLS) {
    acc += sym.weight;
    if (r < acc) return sym.id;
  }
  return SYMBOLS[SYMBOLS.length - 1].id;
}

export function generateGrid(): GridCell[] {
  return Array.from({ length: GRID_SIZE }, () => randomSymbol());
}

// ============================================================
// Multiplier helpers
// ============================================================

const MAX_HIT_COUNT = 10; // 2^10 = 1024

function cloneHitCounts(hitCounts: number[]): number[] {
  return hitCounts.slice();
}

export function buildMultiplierGrid(hitCounts: number[]): MultiplierGrid {
  const cells: MultiplierGrid = Array(GRID_SIZE).fill(null);
  for (let i = 0; i < GRID_SIZE; i++) {
    const hits = hitCounts[i] || 0;
    // First hit only "marks" the spot; multiplier starts from the
    // second hit: x2, then doubles up to x1024.
    if (hits <= 1) continue;
    const value = Math.min(1024, 2 ** (hits - 1));
    cells[i] = { value, hitCount: hits };
  }
  return cells;
}

function sumMultiplierCells(cells: MultiplierGrid): number {
  return cells.reduce((sum, cell) => (cell ? sum + cell.value : sum), 0);
}

// ============================================================
// Cluster detection (4‑way adjacency)
// ============================================================

function neighbors(idx: number): number[] {
  const r = Math.floor(idx / GRID_COLS);
  const c = idx % GRID_COLS;
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * GRID_COLS + c);
  if (r < GRID_ROWS - 1) out.push((r + 1) * GRID_COLS + c);
  if (c > 0) out.push(r * GRID_COLS + (c - 1));
  if (c < GRID_COLS - 1) out.push(r * GRID_COLS + (c + 1));
  return out;
}

function findClusters(grid: GridCell[]): { symbolId: SugarSymbolId; positions: number[] }[] {
  const visited = Array<boolean>(GRID_SIZE).fill(false);
  const clusters: { symbolId: SugarSymbolId; positions: number[] }[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    if (visited[i]) continue;
    const sym = grid[i];
    if (sym === null || sym === "scatter") {
      visited[i] = true;
      continue;
    }

    const q: number[] = [i];
    visited[i] = true;
    const pos: number[] = [];

    while (q.length) {
      const cur = q.pop()!;
      pos.push(cur);
      for (const nb of neighbors(cur)) {
        if (visited[nb]) continue;
        if (grid[nb] === sym) {
          visited[nb] = true;
          q.push(nb);
        }
      }
    }

    clusters.push({ symbolId: sym, positions: pos });
  }

  return clusters;
}

function countToPayout(sym: SugarSymbol, count: number): number {
  const keys = Object.keys(sym.pays)
    .map(Number)
    .sort((a, b) => a - b);
  let chosen = 0;
  for (const k of keys) {
    if (count >= k) {
      chosen = sym.pays[k];
    }
  }
  return chosen;
}

// ============================================================
// Win detection (single tumble step)
// ============================================================

interface CalculateWinsResult extends SpinResult {
  allWinPositions: number[];
}

export function calculateWins(
  grid: GridCell[],
  multipliers: MultiplierGrid,
  isFreeSpins: boolean,
): CalculateWinsResult {
  void isFreeSpins; // reserved for future FS-specific tweaks

  const clusters = findClusters(grid);
  const wins: WinResult[] = [];
  let totalPayout = 0;
  const allWinPositionsSet = new Set<number>();

  let scatterCount = 0;
  const scatterPositions: number[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i] === "scatter") {
      scatterCount++;
      scatterPositions.push(i);
    }
  }

  for (const cl of clusters) {
    const count = cl.positions.length;
    if (count < MIN_CLUSTER_WIN) continue;
    const sym = SYMBOL_MAP[cl.symbolId];
    const base = countToPayout(sym, count) * PAYTABLE_VALUE_SCALE;
    if (base <= 0) continue;

    // Sum all multipliers on cells involved in this cluster.
    let multSum = 0;
    for (const idx of cl.positions) {
      const cell = multipliers[idx];
      if (cell && cell.value > 0) {
        multSum += cell.value;
      }
    }

    const effectiveMultiplier = multSum > 0 ? multSum : 1;
    const rawPayout = base * effectiveMultiplier * _rtpMultiplier;
    const payout = Math.round(rawPayout * 100) / 100;

    wins.push({
      symbolId: cl.symbolId,
      count,
      positions: cl.positions,
      payout,
    });
    totalPayout += payout;
    cl.positions.forEach((p) => allWinPositionsSet.add(p));
  }

  const allWinPositions = Array.from(allWinPositionsSet);

  const triggersBonus = scatterCount >= SCATTER_TRIGGER_BASE;
  const scatterPayout = 0; // official help does not list scatter pays; use 0 for now.

  return {
    wins,
    totalPayout,
    scatterCount,
    scatterPositions,
    scatterPayout,
    triggersBonus,
    allWinPositions,
  };
}

// ============================================================
// Tumble mechanics
// ============================================================

export function tumble(
  grid: GridCell[],
  winPositions: number[],
): { newGrid: GridCell[]; newPositions: number[] } {
  const newGrid = [...grid];
  const newPositions: number[] = [];

  // Clear winning symbols (multiplier spots themselves are attached to positions, not symbols)
  for (const pos of winPositions) {
    newGrid[pos] = null;
  }

  // For each column: compact symbols downwards and refill from top.
  for (let col = 0; col < GRID_COLS; col++) {
    const colSymbols: GridCell[] = [];
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const idx = row * GRID_COLS + col;
      const sym = newGrid[idx];
      if (sym !== null) {
        colSymbols.push(sym);
      }
    }

    const emptyCount = GRID_ROWS - colSymbols.length;

    // Fill from bottom to top.
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const idx = row * GRID_COLS + col;
      const relative = GRID_ROWS - 1 - row;
      if (relative < colSymbols.length) {
        newGrid[idx] = colSymbols[relative];
      } else {
        newGrid[idx] = randomSymbol();
      }
    }

    // Mark the top `emptyCount` cells as newly filled positions for animation.
    for (let i = 0; i < emptyCount; i++) {
      const row = i;
      const idx = row * GRID_COLS + col;
      newPositions.push(idx);
    }
  }

  return { newGrid, newPositions };
}

export function executeTumbleSequence(
  initialGrid: GridCell[],
  initialHitCounts: number[],
  isFreeSpins: boolean,
): { steps: TumbleStep[]; finalGrid: GridCell[]; finalHitCounts: number[] } {
  let grid = [...initialGrid];
  let hitCounts = cloneHitCounts(initialHitCounts);
  const steps: TumbleStep[] = [];

  while (true) {
    const multipliers = buildMultiplierGrid(hitCounts);
    const stepResult = calculateWins(grid, multipliers, isFreeSpins);

    if (stepResult.wins.length === 0) break;

    // Update hit counts for all winning positions (marks persist on positions).
    for (const pos of stepResult.allWinPositions) {
      const current = hitCounts[pos] || 0;
      hitCounts[pos] = Math.min(MAX_HIT_COUNT, current + 1);
    }

    const { newGrid, newPositions } = tumble(grid, stepResult.allWinPositions);

    steps.push({
      grid,
      multipliers,
      wins: stepResult.wins,
      payout: stepResult.totalPayout,
      newPositions,
    });

    grid = newGrid;
  }

  return {
    steps,
    finalGrid: grid,
    finalHitCounts: hitCounts,
  };
}

// ============================================================
// Full spin logic
// ============================================================

export function spin(
  isFreeSpins: boolean = false,
  superFreeSpins: boolean = false,
  incomingHitCounts?: number[],
): FullSpinResult {
  // In base game, multipliers last only for the tumble sequence.
  // In free spins, caller can pass in hitCounts from previous spin.
  const baseHitCounts = isFreeSpins && incomingHitCounts
    ? cloneHitCounts(incomingHitCounts)
    : Array(GRID_SIZE).fill(0);

  // Super Free Spins: all spots start at x2 (hitCount=2 → 2^(2-1)=2).
  if (isFreeSpins && superFreeSpins) {
    for (let i = 0; i < baseHitCounts.length; i++) {
      baseHitCounts[i] = Math.max(baseHitCounts[i], 2);
    }
  }

  const initialGrid = generateGrid();
  const initialMultipliers = buildMultiplierGrid(baseHitCounts);

  // Scatter evaluation is always based on the initial grid before tumbles.
  const initialSpin = calculateWins(initialGrid, initialMultipliers, isFreeSpins);

  const { steps, finalGrid, finalHitCounts } = executeTumbleSequence(initialGrid, baseHitCounts, isFreeSpins);

  const finalMultipliers = buildMultiplierGrid(finalHitCounts);

  // Aggregate payouts across all tumble steps.
  let basePayout = 0;
  for (const s of steps) {
    basePayout += s.payout;
  }

  const scatterCount = initialSpin.scatterCount;
  const scatterPayout = initialSpin.scatterPayout;
  const triggersBonus = initialSpin.triggersBonus;

  let totalPayout = basePayout + scatterPayout;

  // Max win cap (25,000× bet) – applied uniformly in base and free spins.
  if (totalPayout > MAX_WIN_MULTIPLIER) {
    totalPayout = MAX_WIN_MULTIPLIER;
  }

  return {
    initialGrid,
    initialMultipliers,
    tumbleSteps: steps,
    totalPayout,
    scatterCount,
    triggersBonus,
    scatterPayout,
    isFreeSpins,
    superFreeSpins,
    finalGrid,
    finalMultipliers,
    finalMultiplierSum: sumMultiplierCells(finalMultipliers),
    finalHitCounts,
  };
}

// ============================================================
// Buy feature helper (guarantee 3–7 scatters on triggering spin)
// ============================================================

export function buyFreeSpinsTriggerGrid(): {
  grid: GridCell[];
  multipliers: MultiplierGrid;
  scatterCount: number;
} {
  // GLI-19: buy features must still be RNG-driven. We therefore sample
  // full grids until we naturally obtain a triggering outcome, which is
  // equivalent to sampling from the conditional distribution
  // "given that the spin triggers Free Spins".
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const grid = generateGrid();
    const hitCounts = Array(GRID_SIZE).fill(0);
    const multipliers = buildMultiplierGrid(hitCounts);
    const res = calculateWins(grid, multipliers, false);
    if (res.scatterCount >= SCATTER_TRIGGER_BASE && res.scatterCount <= MAX_SCATTER_COUNT) {
      return { grid, multipliers, scatterCount: res.scatterCount };
    }
  }
}

