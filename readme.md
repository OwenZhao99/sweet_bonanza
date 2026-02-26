## Sweet Bonanza Math API – Guide for Cocos Designers

This document explains how to use the **math engine HTTP API** to drive **Cocos** animations and effects.  
You do **not** need to understand the math; you only consume the JSON and turn it into visuals.

---

### 1. What you get from the API

Main endpoint (already implemented on the backend):

- **`POST /api/v1/spin`**  
  Returns the full “script” of a single game round:
  - Initial board layout
  - Each cascade/tumble: which cells win, which are cleared, where new symbols drop
  - Whether Free Spins are triggered
  - A time-ordered list of events for animating the round

Helper endpoints (optional for you):

- `GET /api/v1/paytable` – current symbol paytable (for help / info screens)
- `GET /api/v1/config` – current RTP & volatility
- `POST /api/v1/config` – adjust RTP & volatility (math tuning; not usually needed for animation)

---

### 2. Board & coordinates

The board is always **5 rows × 6 columns** = **30 cells**.

- Cells are indexed as a **1‑D array**:
  - `index = row * 6 + col`
  - `row`: `0..4` (top to bottom)
  - `col`: `0..5` (left to right)
- Example:
  - Top-left cell → `index = 0`
  - Same column, one row below → `index = 6`
  - Bottom-right cell → `index = 4 * 6 + 5 = 29`

You can map index → Cocos position however you like, as long as you are consistent.

---

### 3. Calling `POST /api/v1/spin`

#### 3.1 Request shape

Backend URL (local dev): `http://localhost:3000/api/v1/spin`

Request JSON:

```json
{
  "gameId": "sweet-bonanza-1000",
  "bet": 1.0,
  "mode": {
    "isFreeSpins": false,
    "superFreeSpins": false,
    "anteBet25x": false
  }
}
```

Fields you might care about:

- `bet`: bet amount. The engine will multiply all multipliers by this to get final money.
- `mode.isFreeSpins`: if `true`, spin is evaluated as a Free Spin (different math).
- Other fields are mostly for math tuning and can be ignored for animation.

#### 3.2 Typical usage from Cocos (pseudo-code)

TypeScript example (Cocos Creator style):

```ts
async function playSpinRound() {
  const res = await fetch("/api/v1/spin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameId: "sweet-bonanza-1000",
      bet: 1,
      mode: { isFreeSpins: false, superFreeSpins: false, anteBet25x: false },
    }),
  });
  const spin = await res.json();
  await this.animateSpin(spin);
}
```

---

### 4. Key fields in the response

Assume you have:

```ts
type SpinResponse = any; // for brevity; see backend types for full detail
```

#### 4.1 Initial and final boards

```ts
spin.state.initialGrid: string[];      // length 30, symbol IDs, e.g. "banana", "grape"
spin.state.initialMultipliers: ({ value: number } | null)[];
spin.state.finalGrid: string[];        // after all tumbles are done
spin.state.finalMultipliers: ({ value: number } | null)[];
```

- **Use `initialGrid`** to render the starting 5×6 board.
- **Use `finalGrid`** to show the final state when all cascades are finished.

#### 4.2 Tumble steps (per-cascade animation)

```ts
spin.sequence.tumbleSteps: Array<{
  stepIndex: number;
  grid: string[];                 // board *before* this step is resolved
  multipliers: ({ value: number } | null)[];
  wins: Array<{
    symbolId: string;
    count: number;
    positions: number[];          // winning cell indices
    payout: number;               // multiplier, not yet × bet
  }>;
  payout: number;                 // total multiplier for this step
  multiplierTotal: number;        // sum of multiplier symbols (FS mode)
  newPositions: number[];         // indices where new symbols drop in
}>;
```

For each tumble step:

1. **Highlight winning cells**  
   - Use `wins[].positions` to find which indices to flash / scale up / glow.
2. **Play destroy / explode animation**  
   - On the same positions.
3. **Drop new symbols**  
   - Use `newPositions` to know which cells receive new symbols from above.
   - Animate new symbols falling into those cells.
4. Move on to the next `stepIndex` until all steps are done.

You can either:

- Use `step.grid` as the visual state before animations for that step, or
- Derive it from your own Cocos board state (they should match).

#### 4.3 Free Spins trigger (bonus)

```ts
spin.sequence.scatter = {
  count: number;
  positions: number[];
  payout: number;
  triggersBonus: boolean;
};
```

- If `triggersBonus === true`:
  - Use `positions` to play a special “Free Spins triggered” effect on those cells.
  - Afterwards, you can make additional calls to `/api/v1/spin` with `mode.isFreeSpins = true`
    to animate individual Free Spins rounds in exactly the same way.

#### 4.4 Totals (for win popups)

```ts
spin.totals = {
  basePayout: number;             // sum of all step.payout, before multipliers
  multipliedPayout: number;       // after FS multiplier is applied (if any)
  scatterPayout: number;          // from scatters
  totalPayoutMultiplier: number;  // final multiplier including scatters
  totalWinAmount: number;         // final money = totalPayoutMultiplier × bet
};
```

- **For end-of-spin popups**, use:
  - `totalWinAmount` – display the actual money won.
  - `totalPayoutMultiplier` – e.g. show `"72.8x"` for big-win animations.

---

### 5. Event timeline – driving Cocos animations by time

```ts
spin.events: Array<
  | { type: "spin_start"; at: number }
  | { type: "tumble_win"; at: number; stepIndex: number; wins: any[]; payout: number }
  | { type: "tumble_clear"; at: number; stepIndex: number }
  | { type: "tumble_drop"; at: number; stepIndex: number; newPositions: number[] }
  | { type: "free_spins_trigger"; at: number; scatterCount: number }
  | { type: "spin_end"; at: number }
>;
```

- `at` is a **relative time in milliseconds** from the start of the spin.
- Recommended usage in Cocos:

```ts
async animateSpin(spin: SpinResponse) {
  const startTime = performance.now();

  for (const event of spin.events) {
    const target = startTime + event.at;
    const now = performance.now();
    const delay = target - now;
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }

    this.handleEvent(event, spin);
  }
}
```

And inside `handleEvent`:

- `spin_start`: show initial board (`state.initialGrid`).
- `tumble_win`: highlight wins for `stepIndex`.
- `tumble_clear`: play clear/explode animation.
- `tumble_drop`: animate new symbols falling into `newPositions`.
- `free_spins_trigger`: play Free Spins entrance animation.
- `spin_end`: stop and show final board (`state.finalGrid`), then show total win popup.

You are free to:

- Scale all `at` values (e.g. divide by 2 for “turbo mode”),
- Or ignore them and base timing on your own animation durations – the math does not depend on time.

---

### 6. Suggested workflow for Cocos implementation

1. **Integration phase**
   - Have a small Cocos scene that:
     - Calls `POST /api/v1/spin`.
     - Logs the JSON to the console.
   - Hardcode 1–2 sample spins (copy JSON into test files) so you can iterate without a running server.

2. **Rendering phase**
   - Build a 5×6 grid of `cc.Node` (or prefabs) representing board cells.
   - Implement helper functions:
     - `indexToPosition(index: number): cc.Vec2`
     - `setBoardFromGrid(grid: string[]): void`
     - `highlightCells(indices: number[]): void`
     - `explodeCells(indices: number[]): Promise<void>`
     - `dropNewSymbols(indices: number[]): Promise<void>`

3. **Animation phase**
   - Implement `animateSpin(spin)` using:
     - `spin.state.initialGrid` to set the starting state.
     - `spin.sequence.tumbleSteps` + `spin.events` to control cascades.
   - Tune easing, particle effects, and timings to achieve the desired game feel.

4. **Bonus phase**
   - When `spin.sequence.scatter.triggersBonus` is true:
     - Show Free Spins trigger animation.
     - For Free Spins rounds, call `/api/v1/spin` with `mode.isFreeSpins = true`
       and reuse exactly the same animation code.

Once this is wired up, the math engine can change internally (probabilities, RTP, volatility),
while your Cocos animations remain stable and continue to read the same API contract.

