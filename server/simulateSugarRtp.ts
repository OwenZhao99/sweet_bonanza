import {
  createInitialStats,
  updateStats,
  type GameStats,
  getTargetRtp as getSweetTargetRtp,
  getRtpMultiplier as getSweetRtpMultiplier,
} from "../client/src/lib/gameEngine";
import {
  spin as sugarSpin,
  freeSpinsForScatterCount,
  MAX_WIN_MULTIPLIER,
} from "../client/src/lib/gameEngineSugarRush";

function simulateSugarRound(
  betAmount: number,
  stats: GameStats,
  agg: { fsCycles: number; fsSpins: number },
): GameStats {
  const baseResult = sugarSpin(false, false);
  const steps = baseResult.tumbleSteps;

  // Base game contribution
  let newStats = updateStats(
    stats,
    betAmount,
    baseResult.totalPayout,
    steps.length,
    baseResult.triggersBonus,
    false,
    betAmount,
  );

  // No bonus trigger → done
  if (!baseResult.triggersBonus) {
    return newStats;
  }

  // Free spins cycle
  let remainingFreeSpins = freeSpinsForScatterCount(baseResult.scatterCount);
  if (remainingFreeSpins > 0) {
    agg.fsCycles += 1;
    agg.fsSpins += remainingFreeSpins;
  }

  let hitCounts = baseResult.finalHitCounts;

  while (remainingFreeSpins > 0) {
    const fsResult = sugarSpin(true, false, hitCounts);
    const fsSteps = fsResult.tumbleSteps;

    const winMultiplier = fsResult.totalPayout;
    newStats = updateStats(
      newStats,
      0,
      winMultiplier,
      fsSteps.length,
      fsResult.triggersBonus,
      true,
      betAmount,
    );

    remainingFreeSpins -= 1;
    const retriggerAward = freeSpinsForScatterCount(fsResult.scatterCount);
    if (retriggerAward > 0) {
      remainingFreeSpins += retriggerAward;
      agg.fsSpins += retriggerAward;
    }

    hitCounts = fsResult.finalHitCounts;

    // Hard cap per spin sequence (defensive; engine also clamps per spin)
    const totalWinMultiplier = newStats.totalWin / (newStats.totalBet || betAmount);
    if (totalWinMultiplier >= MAX_WIN_MULTIPLIER) {
      break;
    }
  }

  return newStats;
}

async function main() {
  const ROUNDS = process.env.ROUNDS ? Math.max(1, parseInt(process.env.ROUNDS, 10) || 200000) : 200000;
  const BET = 1;

  let stats = createInitialStats();
  const agg = { fsCycles: 0, fsSpins: 0 };

  for (let i = 0; i < ROUNDS; i++) {
    stats = simulateSugarRound(BET, stats, agg);
  }

  const realRtp = stats.realRTP;
  const targetRtp = getSweetTargetRtp();

  console.log("Sugar Rush 1000 simulation completed.");
  console.log(`Rounds:        ${ROUNDS}`);
  console.log(`Bet per round: ${BET}`);
  console.log(`Total bet:     ${stats.totalBet.toFixed(2)}`);
  console.log(`Total win:     ${stats.totalWin.toFixed(2)}`);
  console.log(`Real RTP:      ${realRtp.toFixed(2)}%`);
  console.log(`Target RTP:    ${targetRtp.toFixed(2)}%`);
  console.log(`Scaling factor: ${getSweetRtpMultiplier().toFixed(4)}`);
  console.log(`FS cycles:     ${agg.fsCycles}`);
  console.log(`FS spins:      ${agg.fsSpins}`);
  if (agg.fsCycles > 0) {
    console.log(`Avg FS per cycle: ${(agg.fsSpins / agg.fsCycles).toFixed(2)}`);
    console.log(`FS cycles per 1000 base spins: ${(agg.fsCycles / (stats.totalSpins || ROUNDS) * 1000).toFixed(2)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

