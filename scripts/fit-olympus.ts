/**
 * Monte Carlo fitting / validation script for Gates of Olympus 1000 engine.
 *
 * Run:
 *   pnpm tsx scripts/fit-olympus.ts
 */

import * as Olympus from "../client/src/lib/gameEngineOlympus";

type AnteMode = "none" | "x25";

function simulateBaseGame(opts: {
  spins: number;
  bet: number;
  anteMode: AnteMode;
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
  const { spins, bet, anteMode } = opts;
  const originalFsChance = Olympus.getFreeSpinsMultiplierChance();
  const anteFsFactor = Number(process.env.ANTE_FS_MULT_FACTOR || 0.75);
  if (anteMode === "x25") {
    Olympus.setFreeSpinsMultiplierChance(originalFsChance * anteFsFactor);
  }
  let totalBet = 0;
  let totalWin = 0;
  let hits = 0;
  let fsTriggers = 0;
  let maxWin = 0;
  let sumMultSum = 0;
  let multSumSamples = 0;

  for (let i = 0; i < spins; i++) {
    const anteBet25x = anteMode === "x25";
    const effectiveBet = anteBet25x ? bet * 1.25 : bet;

    // base spin cost
    totalBet += effectiveBet;

    // base spin
    const baseRes = Olympus.spin(false, false, anteBet25x);
    const baseWinX = baseRes.totalPayout * (baseRes.finalMultiplierSum > 0 ? baseRes.finalMultiplierSum : 1);
    const baseWin = baseWinX * effectiveBet;
    totalWin += baseWin;
    if (baseWin > 0) hits++;
    if (baseWin > maxWin) maxWin = baseWin;
    if (baseWin > 0) {
      sumMultSum += baseRes.finalMultiplierSum;
      multSumSamples++;
    }

    const triggerBonus = baseRes.triggersBonus;

    if (triggerBonus) {
      fsTriggers++;

      // free spins cycle (include scatter payout from trigger spin; already included in baseRes.totalPayout)
      let meter = 0;
      let remaining = Olympus.FREE_SPINS_BASE;
      let fsWin = 0;

      while (remaining > 0) {
        const fsRes = Olympus.spin(true, false, false);
        const baseX = fsRes.totalPayout;
        const multSum = fsRes.finalMultiplierSum;
        const shouldApply = baseX > 0 && multSum > 0;
        if (shouldApply) meter += multSum;
        const fsSpinX = shouldApply ? baseX * meter : baseX;
        fsWin += fsSpinX * effectiveBet;

        const retrigger = fsRes.scatterCount >= Olympus.SCATTER_RETRIGGER_FS;
        remaining -= 1;
        if (retrigger) remaining += Olympus.FREE_SPINS_RETRIGGER;
      }

      totalWin += fsWin;
      if (fsWin > maxWin) maxWin = fsWin;
    }
  }

  // restore global chance
  Olympus.setFreeSpinsMultiplierChance(originalFsChance);

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

function simulateBuyFreeSpins(opts: { buys: number; bet: number }): {
  buys: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  avgTotalSpins: number;
  maxWin: number;
} {
  const { buys, bet } = opts;
  const cost = Olympus.BUY_FREE_SPINS_COST * bet;

  let totalBet = 0;
  let totalWin = 0;
  let maxWin = 0;
  let totalSpinsInBonus = 0;

  for (let i = 0; i < buys; i++) {
    totalBet += cost;

    // buy guarantees 4 scatters → immediate 3x payout (× total bet)
    let win = 3 * bet;
    let meter = 0;
    let remaining = Olympus.FREE_SPINS_BASE;

    while (remaining > 0) {
      totalSpinsInBonus++;
      const fsRes = Olympus.spin(true, false, false);
      const baseX = fsRes.totalPayout;
      const multSum = fsRes.finalMultiplierSum;
      const shouldApply = baseX > 0 && multSum > 0;
      if (shouldApply) meter += multSum;
      const fsSpinX = shouldApply ? baseX * meter : baseX;
      win += fsSpinX * bet;

      const retrigger = fsRes.scatterCount >= Olympus.SCATTER_RETRIGGER_FS;
      remaining -= 1;
      if (retrigger) remaining += Olympus.FREE_SPINS_RETRIGGER;
    }

    totalWin += win;
    if (win > maxWin) maxWin = win;
  }

  return {
    buys,
    totalBet,
    totalWin,
    rtp: totalBet > 0 ? (totalWin / totalBet) * 100 : 0,
    avgTotalSpins: buys > 0 ? totalSpinsInBonus / buys : 0,
    maxWin,
  };
}

function main() {
  const spins = Number(process.env.SPINS || 200000);

  // Initial parameters (can be adjusted via env for quick iterations)
  const baseMultChance = Number(process.env.BASE_MULT_CHANCE || 0.018);
  const fsMultChance = Number(process.env.FS_MULT_CHANCE || 0.028);
  const power = Number(process.env.MULT_POWER || 1.0);
  const anteScatterBoost = Number(process.env.ANTE_SCATTER_BOOST || 1.35);
  const antePayoutScale = Number(process.env.ANTE_PAYOUT_SCALE || 0.95);

  Olympus.setBaseMultiplierChance(baseMultChance);
  Olympus.setFreeSpinsMultiplierChance(fsMultChance);
  Olympus.setMultiplierWeightPower(power);
  Olympus.setAnteScatterBoost(anteScatterBoost);
  Olympus.setAntePayoutScale(antePayoutScale);
  Olympus.setRtpMultiplier(96.5);

  const base = simulateBaseGame({ spins, bet: 1, anteMode: "none" });
  const ante = simulateBaseGame({ spins, bet: 1, anteMode: "x25" });
  const buy = simulateBuyFreeSpins({ buys: Math.floor(spins / 2), bet: 1 });

  const fmt = (n: number) => n.toFixed(3);
  console.log("=== Gates of Olympus 1000 Monte Carlo ===");
  console.log(`SPINS=${spins}`);
  console.log(`baseMultChance=${baseMultChance}, fsMultChance=${fsMultChance}, multPower=${power}`);
  console.log(`anteScatterBoost=${anteScatterBoost}`);
  console.log(`antePayoutScale=${antePayoutScale}`);
  console.log(`anteFsMultFactor=${process.env.ANTE_FS_MULT_FACTOR || 0.75}`);
  console.log("");
  console.log("[Base] RTP%", fmt(base.rtp), "Hit%", fmt(base.hitRate), "FS_triggers", base.fsTriggers, "avgFinalMultSum(win)", fmt(base.avgFinalMultSumWhenWin), "maxWin", fmt(base.maxWin));
  console.log("[Ante] RTP%", fmt(ante.rtp), "Hit%", fmt(ante.hitRate), "FS_triggers", ante.fsTriggers, "avgFinalMultSum(win)", fmt(ante.avgFinalMultSumWhenWin), "maxWin", fmt(ante.maxWin));
  console.log("[Buy ] RTP%", fmt(buy.rtp), "avgBonusSpins", fmt(buy.avgTotalSpins), "maxWin", fmt(buy.maxWin));
}

main();

