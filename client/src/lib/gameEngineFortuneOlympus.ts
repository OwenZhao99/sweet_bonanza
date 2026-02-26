/**
 * Fortune of Olympus - Game Engine (simulation-first)
 *
 * Rules (from in-game help screenshots):
 * - 7×7 grid (49 cells)
 * - Cluster pays: minimum 5 symbols connected horizontally/vertically
 * - Tumble: winning clusters disappear, symbols fall down, new symbols fill from above
 * - Multiplier symbols can appear in base game and free spins, on spins and tumbles
 * - Base game: when tumble sequence ends, sum all multipliers on screen and multiply total win by the sum
 * - Free spins: multiplier symbols add to a running total (meter) used by UI settlement
 * - Free spins trigger: 4/5/6/7 scatters → 15/20/25/30 spins; retrigger uses the same mapping
 * - Max win cap: 10,000× bet (cap total FS cycle and base spins)
 * - Buy features: Buy FS (100× total bet), Buy Super FS (500× total bet, min multiplier value 5× during feature)
 * - Special bets:
 *   - Normal: 20× bet multiplier
 *   - Ante 1: 40× bet multiplier, FS chance ×5
 *   - Ante 2: 140× bet multiplier, FS chance ×5, min multiplier value 5× during feature
 *   - Super 1: 200× bet multiplier, guarantees ≥1 multiplier each spin, FS cannot trigger
 *   - Super 2: 5000× bet multiplier, guarantees ≥1 multiplier each spin with min 50×, FS cannot trigger
 */

// ============================================================
// Types
// ============================================================

export type FortuneSymbolId =
  | "lightning"
  | "ring"
  | "helmet"
  | "chalice"
  | "red"
  | "purple"
  | "green"
  | "scatter";

export interface FortuneSymbol {
  id: FortuneSymbolId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  /**
   * Cluster size → payout multiplier (× bet)
   * Keys are tier minimums. Tier 15 represents 15+.
   */
  pays: Record<number, number>;
  /**
   * Appearance weight. No official PAR is available in this repo;
   * these are tuned defaults and can be adjusted.
   */
  weight: number;
}

export type GridCell = FortuneSymbolId | null;
export type MultiplierCell = { value: number } | null;

export interface WinResult {
  symbolId: FortuneSymbolId;
  count: number;
  positions: number[];
  payout: number; // (× bet) BEFORE multiplier application
}

export interface SpinResult {
  wins: WinResult[];
  totalPayout: number; // (× bet) BEFORE multiplier application
  scatterCount: number;
  scatterPositions: number[];
  scatterPayout: number; // (× bet) Fortune has no scatter paytable; keep for compatibility
  triggersBonus: boolean;
}

export interface TumbleStep {
  grid: GridCell[];
  multipliers: MultiplierCell[];
  wins: WinResult[];
  payout: number; // (× bet) BEFORE multiplier application
  newPositions: number[];
}

export interface FullSpinResult {
  initialGrid: GridCell[];
  initialMultipliers: MultiplierCell[];
  tumbleSteps: TumbleStep[];
  totalPayout: number; // (× bet) BEFORE multiplier application
  scatterCount: number;
  triggersBonus: boolean;
  scatterPayout: number; // (× bet) always 0
  isFreeSpins: boolean;
  finalGrid: GridCell[];
  finalMultipliers: MultiplierCell[];
  finalMultiplierSum: number;
}

export type FortuneBetMode = "normal" | "ante1" | "ante2" | "super1" | "super2";
export type BuyType = "none" | "buy_fs" | "buy_super_fs";

export interface FortuneSpinOptions {
  betMode?: FortuneBetMode;
  buyType?: BuyType;
  /**
   * Minimum multiplier value allowed for spawned multipliers.
   * Used for Ante2 and Buy Super FS features.
   */
  minMultiplierValue?: number;
}

// ============================================================
// Constants (rules)
// ============================================================

export const GRID_COLS = 7;
export const GRID_ROWS = 7;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 49

export const MIN_CLUSTER_WIN = 5;

export const SCATTER_TRIGGER_BASE = 4;
export const MAX_SCATTER_COUNT = 7;

export const MAX_WIN_MULTIPLIER = 10000;

export const BUY_FREE_SPINS_COST = 100;
export const BUY_SUPER_FREE_SPINS_COST = 500;

export const BET_MULTIPLIERS: Record<FortuneBetMode, number> = {
  normal: 20,
  ante1: 40,
  ante2: 140,
  super1: 200,
  super2: 5000,
};

export const MULTIPLIER_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500] as const;

export function freeSpinsForScatterCount(scatterCount: number): number {
  if (scatterCount >= 7) return 30;
  if (scatterCount === 6) return 25;
  if (scatterCount === 5) return 20;
  if (scatterCount === 4) return 15;
  return 0;
}

// ============================================================
// RTP control (optional)
// ============================================================

const THEORETICAL_RTP = 96.55;

let _rtpMultiplier = 1.0;

/**
 * Paytable values are taken from the help screen (coin wins). In practice, the game has
 * an internal coin denomination / base bet unit. This scalar maps the displayed values
 * into our simulator's "× bet" payout space.
 *
 * Default is calibrated via Monte Carlo so NORMAL mode RTP ≈ 96.55% with current knobs.
 */
let _paytableValueScale = 0.000994247;

export function setPaytableValueScale(s: number): void {
  _paytableValueScale = Math.max(0.000001, Math.min(100, s));
}

export function getPaytableValueScale(): number {
  return _paytableValueScale;
}

export function setRtpMultiplier(targetRtp: number): void {
  _rtpMultiplier = targetRtp / THEORETICAL_RTP;
}

export function getTargetRtp(): number {
  return _rtpMultiplier * THEORETICAL_RTP;
}

export function getRtpMultiplier(): number {
  return _rtpMultiplier;
}

/** Dev helper: set internal payout multiplier directly (for Monte Carlo calibration). */
export function setInternalPayoutMultiplier(m: number): void {
  _rtpMultiplier = Math.max(0, Math.min(1000, m));
}

// ============================================================
// Bet-mode compensation (keep RTP stable across special bets)
// ============================================================

const DEFAULT_MODE_PAYOUT_SCALE: Record<FortuneBetMode, number> = {
  normal: 1,
  ante1: 0.168516,
  ante2: 0.076057,
  super1: 304.734,
  super2: 32.939,
};

let _modePayoutScale: Record<FortuneBetMode, number> = { ...DEFAULT_MODE_PAYOUT_SCALE };

export function setModePayoutScale(mode: FortuneBetMode, scale: number): void {
  _modePayoutScale = { ..._modePayoutScale, [mode]: Math.max(0.000001, Math.min(1000, scale)) };
}

export function getModePayoutScale(mode: FortuneBetMode): number {
  return _modePayoutScale[mode] ?? 1;
}

// ============================================================
// Symbols & Paytable (× bet)
// ============================================================

export const SYMBOLS: FortuneSymbol[] = [
  {
    id: "lightning",
    name: "Lightning",
    emoji: "⚡",
    color: "#60a5fa",
    bgColor: "#0b2545",
    // 15–49: 300, 14: 140, 13: 70, 12: 30, 11: 15, 10: 10, 9: 5, 8: 4, 7: 3.5, 6: 3, 5: 2
    pays: { 5: 2, 6: 3, 7: 3.5, 8: 4, 9: 5, 10: 10, 11: 15, 12: 30, 13: 70, 14: 140, 15: 300 },
    weight: 2,
  },
  {
    id: "ring",
    name: "Ring",
    emoji: "💍",
    color: "#fbbf24",
    bgColor: "#3a2a00",
    // 15–49: 200, 14: 120, 13: 60, 12: 25, 11: 12, 10: 8, 9: 4, 8: 3, 7: 2.5, 6: 2, 5: 1.5
    pays: { 5: 1.5, 6: 2, 7: 2.5, 8: 3, 9: 4, 10: 8, 11: 12, 12: 25, 13: 60, 14: 120, 15: 200 },
    weight: 3,
  },
  {
    id: "helmet",
    name: "Helmet",
    emoji: "🪖",
    color: "#fb923c",
    bgColor: "#3b1f0f",
    // 15–49: 120, 14: 80, 13: 40, 12: 20, 11: 9, 10: 6, 9: 3, 8: 2.5, 7: 2, 6: 1.5, 5: 1
    pays: { 5: 1, 6: 1.5, 7: 2, 8: 2.5, 9: 3, 10: 6, 11: 9, 12: 20, 13: 40, 14: 80, 15: 120 },
    weight: 4,
  },
  {
    id: "chalice",
    name: "Chalice",
    emoji: "🏆",
    color: "#f87171",
    bgColor: "#3a0a0a",
    // 15–49: 80, 14: 40, 13: 20, 12: 10, 11: 6, 10: 4, 9: 2.5, 8: 2, 7: 1.5, 6: 1, 5: 0.8
    pays: { 5: 0.8, 6: 1, 7: 1.5, 8: 2, 9: 2.5, 10: 4, 11: 6, 12: 10, 13: 20, 14: 40, 15: 80 },
    weight: 5,
  },
  {
    id: "red",
    name: "Red Gem",
    emoji: "♦",
    color: "#ef4444",
    bgColor: "#2a0a0a",
    // 15–49: 60, 14: 30, 13: 16, 12: 7, 11: 5, 10: 3, 9: 2, 8: 1.5, 7: 1, 6: 0.8, 5: 0.6
    pays: { 5: 0.6, 6: 0.8, 7: 1, 8: 1.5, 9: 2, 10: 3, 11: 5, 12: 7, 13: 16, 14: 30, 15: 60 },
    weight: 6,
  },
  {
    id: "purple",
    name: "Purple Gem",
    emoji: "🟣",
    color: "#a855f7",
    bgColor: "#1a0930",
    // 15–49: 50, 14: 24, 13: 12, 12: 6, 11: 4, 10: 2.5, 9: 1.5, 8: 1, 7: 0.8, 6: 0.6, 5: 0.5
    pays: { 5: 0.5, 6: 0.6, 7: 0.8, 8: 1, 9: 1.5, 10: 2.5, 11: 4, 12: 6, 13: 12, 14: 24, 15: 50 },
    weight: 7,
  },
  {
    id: "green",
    name: "Green Gem",
    emoji: "💚",
    color: "#22c55e",
    bgColor: "#06250f",
    // 15–49: 40, 14: 20, 13: 10, 12: 5, 11: 3, 10: 2, 9: 1, 8: 0.8, 7: 0.6, 6: 0.5, 5: 0.4
    pays: { 5: 0.4, 6: 0.5, 7: 0.6, 8: 0.8, 9: 1, 10: 2, 11: 3, 12: 5, 13: 10, 14: 20, 15: 40 },
    weight: 8,
  },
  {
    id: "scatter",
    name: "Scatter",
    emoji: "🧙",
    color: "#fbbf24",
    bgColor: "#2a2000",
    pays: {},
    weight: 1,
  },
];

export const SYMBOL_MAP: Record<FortuneSymbolId, FortuneSymbol> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s]),
) as Record<FortuneSymbolId, FortuneSymbol>;

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.id !== "scatter");

// ============================================================
// Weighted sampling (bet modes)
// ============================================================

// Choose a boost that yields ~5× trigger probability (P(scatter>=4)) vs normal.
// For weights sum=36, n=49, baseline P≈4.69% → target ≈23.47% → boost≈1.864.
let _scatterBoostAnte = 1.8641634476;

export function setAnteScatterBoost(f: number): void {
  _scatterBoostAnte = Math.max(1, Math.min(10, f));
}

export function getAnteScatterBoost(): number {
  return _scatterBoostAnte;
}

function randomSymbol(betMode: FortuneBetMode, isFreeSpins: boolean): FortuneSymbolId {
  const superMode = betMode === "super1" || betMode === "super2";
  // Super spins cannot trigger FS, but scatters may still appear visually.
  // Ante bets boost scatters in base game only.
  const scatterBoost = !isFreeSpins && (betMode === "ante1" || betMode === "ante2") ? _scatterBoostAnte : 1;

  let total = 0;
  for (const sym of SYMBOLS) {
    if (sym.id === "scatter") {
      total += sym.weight * scatterBoost;
    } else {
      total += sym.weight;
    }
  }
  const r = Math.random() * total;
  let cum = 0;
  for (const sym of SYMBOLS) {
    cum += sym.id === "scatter" ? sym.weight * scatterBoost : sym.weight;
    if (r <= cum) return sym.id;
  }

  // Avoid returning undefined; fall back.
  // (superMode currently unused but kept for future adjustments)
  void superMode;
  return SYMBOLS[SYMBOLS.length - 1].id;
}

// ============================================================
// Multiplier distribution (fit knobs)
// ============================================================

let _multiplierWeightPower = 1.25; // weight(v) ∝ 1 / v^p
let _baseMultiplierChance = 0.01;
let _fsMultiplierChance = 0.04;

export function setMultiplierWeightPower(p: number): void {
  _multiplierWeightPower = Math.max(0.1, Math.min(4, p));
}
export function setBaseMultiplierChance(p: number): void {
  _baseMultiplierChance = Math.max(0, Math.min(0.25, p));
}
export function setFreeSpinsMultiplierChance(p: number): void {
  _fsMultiplierChance = Math.max(0, Math.min(0.5, p));
}
export function getMultiplierWeightPower(): number {
  return _multiplierWeightPower;
}
export function getBaseMultiplierChance(): number {
  return _baseMultiplierChance;
}
export function getFreeSpinsMultiplierChance(): number {
  return _fsMultiplierChance;
}

function randomMultiplierValue(minValue: number = 2): number {
  const values = (MULTIPLIER_VALUES as unknown as number[]).filter((v) => v >= minValue);
  const raw = values.map((v) => ({ v, w: 1 / Math.pow(v, _multiplierWeightPower) }));
  const total = raw.reduce((s, x) => s + x.w, 0);
  const r = Math.random() * total;
  let cum = 0;
  for (const it of raw) {
    cum += it.w;
    if (r <= cum) return it.v;
  }
  return raw[raw.length - 1].v;
}

function maybeSpawnMultiplier(isFreeSpins: boolean, minValue: number): MultiplierCell {
  const p = isFreeSpins ? _fsMultiplierChance : _baseMultiplierChance;
  return Math.random() < p ? { value: randomMultiplierValue(minValue) } : null;
}

function ensureAtLeastOneMultiplier(multipliers: MultiplierCell[], minValue: number): MultiplierCell[] {
  if (multipliers.some((m) => m !== null)) return multipliers;
  const idx = Math.floor(Math.random() * GRID_SIZE);
  const next = [...multipliers];
  next[idx] = { value: randomMultiplierValue(minValue) };
  return next;
}

function applyMultiplierOccupancy(grid: GridCell[], multipliers: MultiplierCell[]): GridCell[] {
  const next = [...grid];
  for (let i = 0; i < GRID_SIZE; i++) {
    if (multipliers[i] !== null) next[i] = null;
  }
  return next;
}

// ============================================================
// Grid generation
// ============================================================

export function generateGrid(betMode: FortuneBetMode): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  let grid: GridCell[] = [];
  let multipliers: MultiplierCell[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const mult = maybeSpawnMultiplier(false, 2);
    if (mult !== null) {
      grid.push(null);
      multipliers.push(mult);
    } else {
      grid.push(randomSymbol(betMode, false));
      multipliers.push(null);
    }
  }

  if (betMode === "super1") {
    multipliers = ensureAtLeastOneMultiplier(multipliers, 2);
  }
  if (betMode === "super2") {
    multipliers = ensureAtLeastOneMultiplier(multipliers, 50);
  }

  grid = applyMultiplierOccupancy(grid, multipliers);
  return { grid, multipliers };
}

export function generateFreeSpinsGrid(minMultiplierValue: number): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  const grid: GridCell[] = [];
  const multipliers: MultiplierCell[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const mult = maybeSpawnMultiplier(true, minMultiplierValue);
    if (mult !== null) {
      grid.push(null);
      multipliers.push(mult);
    } else {
      grid.push(randomSymbol("normal", true));
      multipliers.push(null);
    }
  }
  return { grid, multipliers };
}

// ============================================================
// Win detection (cluster pays)
// ============================================================

function countToPayout(sym: FortuneSymbol, count: number): number {
  const keys = Object.keys(sym.pays)
    .map(Number)
    .sort((a, b) => a - b);
  let chosen = 0;
  for (const k of keys) {
    if (count >= k) chosen = k;
  }
  return chosen > 0 ? sym.pays[chosen] : 0;
}

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

function findClusters(grid: GridCell[]): { symbolId: FortuneSymbolId; positions: number[] }[] {
  const visited = Array<boolean>(GRID_SIZE).fill(false);
  const clusters: { symbolId: FortuneSymbolId; positions: number[] }[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    if (visited[i]) continue;
    const sym = grid[i];
    if (sym === null) continue;
    if (sym === "scatter") {
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

export function calculateWins(
  grid: GridCell[],
  opts: { betMode: FortuneBetMode; isFreeSpins: boolean },
): SpinResult {
  const { betMode, isFreeSpins } = opts;
  const wins: WinResult[] = [];
  let totalPayout = 0;

  let scatterCount = 0;
  const scatterPositions: number[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[i] === "scatter") {
      scatterCount++;
      scatterPositions.push(i);
    }
  }

  const clusters = findClusters(grid);
  for (const cl of clusters) {
    const count = cl.positions.length;
    if (count < MIN_CLUSTER_WIN) continue;
    const sym = SYMBOL_MAP[cl.symbolId];
    const raw = countToPayout(sym, count);
    if (raw <= 0) continue;
    const payout = raw * _paytableValueScale * _rtpMultiplier * getModePayoutScale(betMode);
    wins.push({
      symbolId: cl.symbolId,
      count,
      positions: cl.positions,
      payout,
    });
    totalPayout += payout;
  }

  const superMode = betMode === "super1" || betMode === "super2";
  const triggersBonus = !superMode && !isFreeSpins && scatterCount >= SCATTER_TRIGGER_BASE;

  return {
    wins,
    totalPayout,
    scatterCount,
    scatterPositions,
    scatterPayout: 0,
    triggersBonus,
  };
}

// ============================================================
// Tumble mechanics
// ============================================================

export function tumble(
  grid: GridCell[],
  multipliers: MultiplierCell[],
  winPositions: number[],
  isFreeSpins: boolean,
  minMultiplierValue: number,
): { newGrid: GridCell[]; newMultipliers: MultiplierCell[]; newPositions: number[] } {
  const newGrid = [...grid];
  const newMultipliers = [...multipliers];
  const newPositions: number[] = [];

  for (const pos of winPositions) {
    newGrid[pos] = null;
  }

  for (let col = 0; col < GRID_COLS; col++) {
    const entities: ({ kind: "mult"; mult: MultiplierCell } | { kind: "sym"; sym: FortuneSymbolId })[] = [];

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
      const mult = maybeSpawnMultiplier(isFreeSpins, minMultiplierValue);
      if (mult !== null) {
        entities.push({ kind: "mult", mult });
      } else {
        entities.push({ kind: "sym", sym: randomSymbol("normal", isFreeSpins) });
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

    for (let i = 0; i < emptyCount; i++) {
      const row = i;
      newPositions.push(row * GRID_COLS + col);
    }
  }

  return { newGrid, newMultipliers, newPositions };
}

export function executeTumbleSequence(
  initialGrid: GridCell[],
  initialMultipliers: MultiplierCell[],
  opts: { betMode: FortuneBetMode; isFreeSpins: boolean; minMultiplierValue: number },
): TumbleStep[] {
  const { betMode, isFreeSpins, minMultiplierValue } = opts;
  const steps: TumbleStep[] = [];
  let grid = [...initialGrid];
  let multipliers = [...initialMultipliers];

  while (true) {
    const res = calculateWins(grid, { betMode, isFreeSpins });
    if (res.wins.length === 0) break;

    const winPosSet = new Set<number>();
    for (const w of res.wins) for (const p of w.positions) winPosSet.add(p);
    const winPositions = Array.from(winPosSet);

    const { newGrid, newMultipliers, newPositions } = tumble(
      grid,
      multipliers,
      winPositions,
      isFreeSpins,
      minMultiplierValue,
    );

    steps.push({
      grid: [...grid],
      multipliers: [...multipliers],
      wins: res.wins,
      payout: res.totalPayout,
      newPositions,
    });

    grid = newGrid;
    multipliers = newMultipliers;
  }

  return steps;
}

function sumMultiplierCells(multipliers: MultiplierCell[]): number {
  let s = 0;
  for (const m of multipliers) if (m) s += m.value;
  return s;
}

// ============================================================
// Full spin
// ============================================================

export function spin(
  isFreeSpins: boolean = false,
  options: FortuneSpinOptions = {},
): FullSpinResult {
  const betMode: FortuneBetMode = options.betMode ?? "normal";
  const buyType: BuyType = options.buyType ?? "none";

  const minMultiplierValue =
    options.minMultiplierValue ??
    (buyType === "buy_super_fs" ? 5 : betMode === "ante2" ? 5 : 2);

  const { grid: initialGrid, multipliers: initialMultipliers } = isFreeSpins
    ? generateFreeSpinsGrid(minMultiplierValue)
    : generateGrid(betMode);

  const initialSpinRes = calculateWins(initialGrid, { betMode, isFreeSpins });
  const tumbleSteps = executeTumbleSequence(initialGrid, initialMultipliers, {
    betMode,
    isFreeSpins,
    minMultiplierValue,
  });

  const totalPayout = tumbleSteps.reduce((s, st) => s + st.payout, 0);

  // Final state: apply last removal/drop once
  let finalGrid: GridCell[] = [...initialGrid];
  let finalMultipliers: MultiplierCell[] = [...initialMultipliers];

  if (tumbleSteps.length > 0) {
    const last = tumbleSteps[tumbleSteps.length - 1];
    const lastWinPositions: number[] = [];
    for (const w of last.wins) lastWinPositions.push(...w.positions);
    const { newGrid, newMultipliers } = tumble(
      last.grid,
      last.multipliers,
      lastWinPositions,
      isFreeSpins,
      minMultiplierValue,
    );
    finalGrid = newGrid;
    finalMultipliers = newMultipliers;
  }

  // Super spin guarantees: ensure at least one multiplier exists on final screen too.
  if (!isFreeSpins && betMode === "super1") {
    finalMultipliers = ensureAtLeastOneMultiplier(finalMultipliers, 2);
  }
  if (!isFreeSpins && betMode === "super2") {
    finalMultipliers = ensureAtLeastOneMultiplier(finalMultipliers, 50);
  }
  finalGrid = applyMultiplierOccupancy(finalGrid, finalMultipliers);

  // Buy trigger spins should never directly start FS from this function; UI/hook handles it.
  // But we keep triggersBonus consistent with normal base play rules.
  const triggersBonus = buyType === "none" ? initialSpinRes.triggersBonus : initialSpinRes.triggersBonus;

  return {
    initialGrid,
    initialMultipliers,
    tumbleSteps,
    totalPayout,
    scatterCount: initialSpinRes.scatterCount,
    triggersBonus,
    scatterPayout: 0,
    isFreeSpins,
    finalGrid,
    finalMultipliers,
    finalMultiplierSum: sumMultiplierCells(finalMultipliers),
  };
}

// ============================================================
// Buy feature helpers (guarantee 4–7 scatters on triggering spin)
// ============================================================

function clampScatterCount(n: number): number {
  return Math.max(SCATTER_TRIGGER_BASE, Math.min(MAX_SCATTER_COUNT, n));
}

export function buyFreeSpinsTriggerGrid(
  betMode: FortuneBetMode = "normal",
): { grid: GridCell[]; multipliers: MultiplierCell[]; scatterCount: number } {
  let attempts = 0;
  while (true) {
    const { grid, multipliers } = generateGrid(betMode);
    const res = calculateWins(grid, { betMode, isFreeSpins: false });
    if (res.scatterCount >= SCATTER_TRIGGER_BASE && res.scatterCount <= MAX_SCATTER_COUNT) {
      return { grid, multipliers, scatterCount: res.scatterCount };
    }
    attempts++;
    if (attempts > 500) {
      const forcedCount = clampScatterCount(SCATTER_TRIGGER_BASE + Math.floor(Math.random() * 4)); // 4–7
      const forced = new Set<number>();
      while (forced.size < forcedCount) forced.add(Math.floor(Math.random() * GRID_SIZE));
      Array.from(forced).forEach((pos) => {
        grid[pos] = "scatter";
        multipliers[pos] = null;
      });
      return { grid, multipliers, scatterCount: forcedCount };
    }
  }
}

