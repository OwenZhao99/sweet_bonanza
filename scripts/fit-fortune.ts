/**
 * Monte Carlo validation / scaling script for Fortune of Olympus engine.
 *
 * Run:
 *   npm -s exec tsx scripts/fit-fortune.ts
 *
 * Env:
 *   SPINS=200000
 *   BASE_MULT_CHANCE=0.01
 *   FS_MULT_CHANCE=0.04
 *   MULT_POWER=1.25
 *   ANTE_SCATTER_BOOST=1.8641634476
 *   RAW_INTERNAL=1  (set internal payout multiplier=1)
 */

import * as Fortune from "../client/src/lib/gameEngineFortuneOlympus";

type Mode = Fortune.FortuneBetMode;

function simulateFullGame(opts: {
  spins: number;
  baseBet: number;
  betMode: Mode;
  minMultiplierValue?: number;
}): {
  spins: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  hitRate: number;
  fsTriggers: number;
  avgFinalMultSumWhenWin: number;
  maxWin: number;
} {
  const { spins, baseBet, betMode } = opts;
  const effectiveBet = baseBet * Fortune.BET_MULTIPLIERS[betMode];

  let totalBet = 0;
  let totalWin = 0;
  let hits = 0;
  let fsTriggers = 0;
  let maxWin = 0;
  let sumMultSum = 0;
  let multSumSamples = 0;

  for (let i = 0; i < spins; i++) {
    totalBet += effectiveBet;

    const baseRes = Fortune.spin(false, { betMode });
    const baseWinX = baseRes.totalPayout * (baseRes.finalMultiplierSum > 0 ? baseRes.finalMultiplierSum : 1);
    let baseWinMult = baseWinX;
    if (baseWinMult > Fortune.MAX_WIN_MULTIPLIER) baseWinMult = Fortune.MAX_WIN_MULTIPLIER;
    const baseWin = baseWinMult * effectiveBet;
    totalWin += baseWin;
    if (baseWin > 0) hits++;
    if (baseWin > maxWin) maxWin = baseWin;
    if (baseWin > 0) {
      sumMultSum += baseRes.finalMultiplierSum;
      multSumSamples++;
    }

    if (baseRes.triggersBonus) {
      fsTriggers++;
      let meter = 0;
      let remaining = Fortune.freeSpinsForScatterCount(baseRes.scatterCount);
      let fsWinMult = 0;

      // Feature min multiplier value rules
      const featureMin =
        betMode === "ante2" ? 5 : 2;

      while (remaining > 0) {
        const fsRes = Fortune.spin(true, { betMode, minMultiplierValue: featureMin });
        const baseX = fsRes.totalPayout;
        const multSum = fsRes.finalMultiplierSum;
        const shouldApply = baseX > 0 && multSum > 0;
        if (shouldApply) meter += multSum;
        const fsSpinX = shouldApply ? baseX * meter : baseX;
        fsWinMult += fsSpinX;

        remaining -= 1;
        const award = Fortune.freeSpinsForScatterCount(fsRes.scatterCount);
        if (award > 0) remaining += award;

        if (fsWinMult >= Fortune.MAX_WIN_MULTIPLIER) {
          fsWinMult = Fortune.MAX_WIN_MULTIPLIER;
          remaining = 0;
        }
      }

      const fsWin = fsWinMult * effectiveBet;
      totalWin += fsWin;
      if (fsWin > maxWin) maxWin = fsWin;
    }
  }

  return {
    spins,
    totalBet,
    totalWin,
    rtp: totalBet > 0 ? (totalWin / totalBet) * 100 : 0,
    hitRate: (hits / spins) * 100,
    fsTriggers,
    avgFinalMultSumWhenWin: multSumSamples > 0 ? sumMultSum / multSumSamples : 0,
    maxWin,
  };
}

function main() {
  const spins = Number(process.env.SPINS || 200000);
  const baseMultChance = Number(process.env.BASE_MULT_CHANCE || 0.01);
  const fsMultChance = Number(process.env.FS_MULT_CHANCE || 0.04);
  const power = Number(process.env.MULT_POWER || 1.25);
  const anteScatterBoost = Number(process.env.ANTE_SCATTER_BOOST || 1.8641634476);

  Fortune.setBaseMultiplierChance(baseMultChance);
  Fortune.setFreeSpinsMultiplierChance(fsMultChance);
  Fortune.setMultiplierWeightPower(power);
  Fortune.setAnteScatterBoost(anteScatterBoost);

  const rawInternal = String(process.env.RAW_INTERNAL || "") === "1";
  if (rawInternal) Fortune.setInternalPayoutMultiplier(1);
  else Fortune.setRtpMultiplier(96.55);

  const fmt = (n: number) => n.toFixed(3);
  console.log("=== Fortune of Olympus Monte Carlo ===");
  console.log(`SPINS=${spins}`);
  console.log(`baseMultChance=${baseMultChance}, fsMultChance=${fsMultChance}, multPower=${power}`);
  console.log(`anteScatterBoost=${anteScatterBoost}`);
  console.log(`paytableValueScale=${(Fortune as any).getPaytableValueScale?.() ?? "n/a"}`);
  console.log(
    rawInternal
      ? `mode=RAW_INTERNAL (internal=${Fortune.getRtpMultiplier().toFixed(6)})`
      : `targetRtp=${Fortune.getTargetRtp().toFixed(3)} (internal=${Fortune.getRtpMultiplier().toFixed(6)})`,
  );
  console.log("");

  for (const mode of ["normal", "ante1", "ante2", "super1", "super2"] as const) {
    const res = simulateFullGame({ spins, baseBet: 1, betMode: mode });
    console.log(
      `[${mode}] RTP%`,
      fmt(res.rtp),
      "Hit%",
      fmt(res.hitRate),
      "FS_triggers",
      res.fsTriggers,
      "avgFinalMultSum(win)",
      fmt(res.avgFinalMultSumWhenWin),
      "maxWin",
      fmt(res.maxWin),
    );
  }
}

main();

