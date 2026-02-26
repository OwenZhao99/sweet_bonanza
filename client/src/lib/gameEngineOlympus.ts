/**
 * Gates of Olympus 1000 - Game Engine (simulation-first)
 *
 * Notes:
 * - 6×5 grid (30 cells), symbols pay anywhere by total count.
 * - Regular wins: 8+ of a symbol, tiered by 8-9 / 10-11 / 12+.
 * - Tumble: winning symbols disappear, others fall, new symbols fill.
 * - Multiplier orbs (2x–1000x) can appear in base game and free spins.
 * - Base game: when tumble sequence ends, sum multipliers on screen and multiply total win by that sum.
 * - Free spins: when a multiplier hits AND the spin results in a win, add it to a running meter;
 *   use the (updated) meter to multiply that spin's win.
 *
 * Because no official PAR sheet is available, weights/probabilities are tuned via Monte Carlo fitting.
 */

// ============================================================
// Types
// ============================================================

export type OlympusSymbolId =
  | "crown"
  | "hourglass"
  | "ring"
  | "chalice"
  | "red"
  | "purple"
  | "yellow"
  | "green"
  | "blue"
  | "scatter";

export interface OlympusSymbol {
  id: OlympusSymbolId;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  pays: { tier8: number; tier10: number; tier12: number };
  weight: number;
}

export type GridCell = OlympusSymbolId | null;
export type MultiplierCell = { value: number } | null;

export interface WinResult {
  symbolId: OlympusSymbolId;
  count: number;
  positions: number[];
  payout: number; // (× bet) BEFORE multiplier application
}

export interface SpinResult {
  wins: WinResult[];
  totalPayout: number; // (× bet) BEFORE multiplier application
  scatterCount: number;
  scatterPositions: number[];
  scatterPayout: number; // (× bet)
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
  scatterPayout: number; // (× bet)
  isFreeSpins: boolean;
  finalGrid: GridCell[];
  finalMultipliers: MultiplierCell[];
  finalMultiplierSum: number;
}

// ============================================================
// Constants (rules)
// ============================================================

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 30

export const MIN_WIN_COUNT = 8;
export const SCATTER_TRIGGER_BASE = 4;
export const SCATTER_RETRIGGER_FS = 3;

export const FREE_SPINS_BASE = 15;
export const FREE_SPINS_RETRIGGER = 5;

export const BUY_FREE_SPINS_COST = 100;

// Multiplier tiers from your rules screenshot (page 2/7)
export const MULTIPLIER_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000] as const;

// ============================================================
// RTP control (optional)
// ============================================================

let _rtpMultiplier = 1.0;

export function setRtpMultiplier(targetRtp: number): void {
  const THEORETICAL_RTP = 96.5;
  _rtpMultiplier = targetRtp / THEORETICAL_RTP;
}

export function getTargetRtp(): number {
  return _rtpMultiplier * 96.5;
}

export function getRtpMultiplier(): number {
  return _rtpMultiplier;
}

// ============================================================
// Ante mode compensation (fit knobs)
// Pragmatic reports same RTP under Ante Bet, but different feature frequency.
// We model this by allowing a separate payout scale when ante is enabled.
// ============================================================

let _antePayoutScale = 0.95;

export function setAntePayoutScale(s: number): void {
  _antePayoutScale = Math.max(0.5, Math.min(1.0, s));
}

export function getAntePayoutScale(): number {
  return _antePayoutScale;
}

// ============================================================
// Symbols (paytable from your screenshot, expressed as ×bet)
// Weights are initial guesses; tuned by Monte Carlo fitting.
// ============================================================

export const SYMBOLS: OlympusSymbol[] = [
  { id: "crown",     name: "Crown",     emoji: "👑", color: "#facc15", bgColor: "#713f12", pays: { tier8: 10,  tier10: 25, tier12: 50 }, weight: 2  },
  { id: "hourglass", name: "Hourglass", emoji: "⌛", color: "#f97316", bgColor: "#7c2d12", pays: { tier8: 2.5, tier10: 10, tier12: 25 }, weight: 3  },
  { id: "ring",      name: "Ring",      emoji: "💍", color: "#eab308", bgColor: "#713f12", pays: { tier8: 2,   tier10: 5,  tier12: 15 }, weight: 4  },
  { id: "chalice",   name: "Chalice",   emoji: "🏆", color: "#22c55e", bgColor: "#14532d", pays: { tier8: 1.5, tier10: 2,  tier12: 12 }, weight: 5  },
  { id: "red",       name: "Red Gem",   emoji: "🔴", color: "#ef4444", bgColor: "#7f1d1d", pays: { tier8: 1,   tier10: 1.5,tier12: 10 }, weight: 6  },
  { id: "purple",    name: "Purple Gem",emoji: "🟣", color: "#a855f7", bgColor: "#3b0764", pays: { tier8: 0.8, tier10: 1.2,tier12: 8  }, weight: 7  },
  { id: "yellow",    name: "Yellow Gem",emoji: "🟡", color: "#facc15", bgColor: "#713f12", pays: { tier8: 0.5, tier10: 1,  tier12: 5  }, weight: 8  },
  { id: "green",     name: "Green Gem", emoji: "🟢", color: "#22c55e", bgColor: "#14532d", pays: { tier8: 0.4, tier10: 0.9,tier12: 4  }, weight: 9  },
  { id: "blue",      name: "Blue Gem",  emoji: "🔵", color: "#3b82f6", bgColor: "#1e3a8a", pays: { tier8: 0.25,tier10: 0.75,tier12: 2 }, weight: 10 },
  { id: "scatter",   name: "Zeus",      emoji: "⚡", color: "#60a5fa", bgColor: "#1e3a8a", pays: { tier8: 0,   tier10: 0,  tier12: 0  }, weight: 1  },
];

export const SYMBOL_MAP: Record<OlympusSymbolId, OlympusSymbol> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s]),
) as Record<OlympusSymbolId, OlympusSymbol>;

export const PAY_SYMBOLS = SYMBOLS.filter((s) => s.id !== "scatter");

// ============================================================
// Weighted sampling (Ante Bet scatter boost is a fit knob)
// ============================================================

let _anteScatterBoost = 1.25; // initial: aims for ~2x bonus trigger odds (fit knob)

export function setAnteScatterBoost(f: number): void {
  _anteScatterBoost = Math.max(1, Math.min(3, f));
}

export function getAnteScatterBoost(): number {
  return _anteScatterBoost;
}

function randomSymbol(anteBet25x: boolean): OlympusSymbolId {
  const scatterBoost = anteBet25x ? _anteScatterBoost : 1;
  let total = 0;
  for (const sym of SYMBOLS) {
    total += sym.id === "scatter" ? sym.weight * scatterBoost : sym.weight;
  }
  const r = Math.random() * total;
  let cum = 0;
  for (const sym of SYMBOLS) {
    cum += sym.id === "scatter" ? sym.weight * scatterBoost : sym.weight;
    if (r <= cum) return sym.id;
  }
  return SYMBOLS[SYMBOLS.length - 1].id;
}

// ============================================================
// Multiplier distribution (fit knobs)
// ============================================================

let _multiplierWeightPower = 1.28; // weight(v) ∝ 1 / v^p (fit knob)
let _baseMultiplierChance = 0.0085;
let _fsMultiplierChance = 0.033;

export function setMultiplierWeightPower(p: number): void {
  _multiplierWeightPower = Math.max(0.1, Math.min(4, p));
}
export function setBaseMultiplierChance(p: number): void {
  _baseMultiplierChance = Math.max(0, Math.min(0.25, p));
}
export function setFreeSpinsMultiplierChance(p: number): void {
  _fsMultiplierChance = Math.max(0, Math.min(0.5, p));
}
export function getBaseMultiplierChance(): number {
  return _baseMultiplierChance;
}
export function getFreeSpinsMultiplierChance(): number {
  return _fsMultiplierChance;
}
export function getMultiplierWeightPower(): number {
  return _multiplierWeightPower;
}

function randomMultiplierValue(): number {
  const values = MULTIPLIER_VALUES as unknown as number[];
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

function maybeSpawnMultiplier(isFreeSpins: boolean): MultiplierCell {
  const p = isFreeSpins ? _fsMultiplierChance : _baseMultiplierChance;
  return Math.random() < p ? { value: randomMultiplierValue() } : null;
}

// ============================================================
// Grid generation
// ============================================================

export function generateGrid(anteBet25x = false): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  const grid: GridCell[] = [];
  const multipliers: MultiplierCell[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const mult = maybeSpawnMultiplier(false);
    if (mult !== null) {
      grid.push(null);
      multipliers.push(mult);
    } else {
      grid.push(randomSymbol(anteBet25x));
      multipliers.push(null);
    }
  }
  return { grid, multipliers };
}

export function generateFreeSpinsGrid(): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  const grid: GridCell[] = [];
  const multipliers: MultiplierCell[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const mult = maybeSpawnMultiplier(true);
    if (mult !== null) {
      grid.push(null);
      multipliers.push(mult);
    } else {
      grid.push(randomSymbol(false));
      multipliers.push(null);
    }
  }
  return { grid, multipliers };
}

// ============================================================
// Win detection
// ============================================================

function regularPayoutForCount(sym: OlympusSymbol, count: number): number {
  if (count >= 12) return sym.pays.tier12;
  if (count >= 10) return sym.pays.tier10;
  if (count >= 8) return sym.pays.tier8;
  return 0;
}

function scatterPayoutForCount(count: number): number {
  if (count >= 6) return 100;
  if (count === 5) return 5;
  if (count === 4) return 3;
  return 0;
}

export function calculateWins(grid: GridCell[], anteBet25x: boolean = false): SpinResult {
  const wins: WinResult[] = [];
  let totalPayout = 0;
  let scatterPayout = 0;

  const counts: Record<string, { count: number; positions: number[] }> = {};
  for (let i = 0; i < grid.length; i++) {
    const sym = grid[i];
    if (sym === null) continue;
    if (!counts[sym]) counts[sym] = { count: 0, positions: [] };
    counts[sym].count++;
    counts[sym].positions.push(i);
  }

  const scatterCount = counts["scatter"]?.count || 0;
  const scatterPositions = counts["scatter"]?.positions || [];

  for (const sym of PAY_SYMBOLS) {
    const c = counts[sym.id]?.count || 0;
    if (c >= MIN_WIN_COUNT) {
      const raw = regularPayoutForCount(sym, c);
      if (raw > 0) {
        const scale = anteBet25x ? _antePayoutScale : 1;
        const payout = Math.round(raw * _rtpMultiplier * scale * 100) / 100;
        wins.push({
          symbolId: sym.id,
          count: c,
          positions: counts[sym.id]!.positions,
          payout,
        });
        totalPayout += payout;
      }
    }
  }

  if (scatterCount >= SCATTER_TRIGGER_BASE) {
    const raw = scatterPayoutForCount(scatterCount);
    if (raw > 0) {
      const scale = anteBet25x ? _antePayoutScale : 1;
      const payout = Math.round(raw * _rtpMultiplier * scale * 100) / 100;
      scatterPayout = payout;
      wins.push({
        symbolId: "scatter",
        count: scatterCount,
        positions: scatterPositions,
        payout,
      });
      totalPayout += payout;
    }
  }

  return {
    wins,
    totalPayout,
    scatterCount,
    scatterPositions,
    scatterPayout,
    triggersBonus: scatterCount >= SCATTER_TRIGGER_BASE,
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
  anteBet25x: boolean,
): { newGrid: GridCell[]; newMultipliers: MultiplierCell[]; newPositions: number[] } {
  const newGrid = [...grid];
  const newMultipliers = [...multipliers];
  const newPositions: number[] = [];

  for (const pos of winPositions) {
    newGrid[pos] = null;
  }

  for (let col = 0; col < GRID_COLS; col++) {
    const entities: ({ kind: "mult"; mult: MultiplierCell } | { kind: "sym"; sym: OlympusSymbolId })[] = [];

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
      const mult = maybeSpawnMultiplier(isFreeSpins);
      if (mult !== null) {
        entities.push({ kind: "mult", mult });
      } else {
        entities.push({ kind: "sym", sym: randomSymbol(anteBet25x) });
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
  isFreeSpins: boolean,
  anteBet25x: boolean,
): TumbleStep[] {
  const steps: TumbleStep[] = [];
  let grid = [...initialGrid];
  let multipliers = [...initialMultipliers];

  while (true) {
    const res = calculateWins(grid, anteBet25x);
    if (res.wins.length === 0) break;

    const winPosSet = new Set<number>();
    for (const w of res.wins) for (const p of w.positions) winPosSet.add(p);
    const winPositions = Array.from(winPosSet);

    const { newGrid, newMultipliers, newPositions } = tumble(
      grid,
      multipliers,
      winPositions,
      isFreeSpins,
      anteBet25x,
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
  _superFreeSpins: boolean = false, // compatibility with Sweet hook signature
  anteBet25x: boolean = false,
): FullSpinResult {
  const { grid: initialGrid, multipliers: initialMultipliers } = isFreeSpins
    ? generateFreeSpinsGrid()
    : generateGrid(anteBet25x);

  const initialSpinRes = calculateWins(initialGrid, anteBet25x);
  const tumbleSteps = executeTumbleSequence(initialGrid, initialMultipliers, isFreeSpins, anteBet25x);

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
      anteBet25x,
    );
    finalGrid = newGrid;
    finalMultipliers = newMultipliers;
  }

  return {
    initialGrid,
    initialMultipliers,
    tumbleSteps,
    totalPayout,
    scatterCount: initialSpinRes.scatterCount,
    triggersBonus: initialSpinRes.triggersBonus,
    scatterPayout: initialSpinRes.scatterPayout,
    isFreeSpins,
    finalGrid,
    finalMultipliers,
    finalMultiplierSum: sumMultiplierCells(finalMultipliers),
  };
}

// ============================================================
// Buy feature helper (guarantee 4 scatters on triggering spin)
// ============================================================

export function buyFreeSpinsTriggerGrid(anteBet25x = false): { grid: GridCell[]; multipliers: MultiplierCell[] } {
  let attempts = 0;
  while (true) {
    const { grid, multipliers } = generateGrid(anteBet25x);
    const res = calculateWins(grid, anteBet25x);
    if (res.scatterCount >= SCATTER_TRIGGER_BASE) return { grid, multipliers };
    attempts++;
    if (attempts > 200) {
      // force 4 scatters if unlucky
      const forced = new Set<number>();
      while (forced.size < 4) forced.add(Math.floor(Math.random() * GRID_SIZE));
      Array.from(forced).forEach((pos) => {
        grid[pos] = "scatter";
        multipliers[pos] = null;
      });
      return { grid, multipliers };
    }
  }
}

