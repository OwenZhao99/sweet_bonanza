import {
  spin,
  createInitialStats,
  updateStats,
  type GameStats,
  FREE_SPINS_BASE,
  FREE_SPINS_RETRIGGER,
  RETRIGGER_SCATTER,
  getTargetRtp,
  getRtpMultiplier,
  setRtpMultiplier,
} from "../client/src/lib/gameEngine";

function simulateRound(betAmount: number, stats: GameStats): GameStats {
  const anteBet25x = false;
  const isFreeSpins = false;
  const isSuperFreeSpins = false;
  const effectiveBet = betAmount;

  const spinResult = spin(isFreeSpins, isSuperFreeSpins, anteBet25x);
  const steps = spinResult.tumbleSteps;

  // Base game spin that does NOT trigger free spins
  if (!spinResult.triggersBonus) {
    let cumulativeWin = 0;
    for (const step of steps) {
      cumulativeWin += step.payout;
    }
    return updateStats(
      stats,
      effectiveBet,
      cumulativeWin,
      steps.length,
      false,
      false,
      betAmount,
    );
  }

  // Base game spin that triggers free spins (include scatter in stats to match UI)
  let initialTumbleWin = 0;
  for (const step of steps) {
    initialTumbleWin += step.payout;
  }
  const winMultiplierForStats = initialTumbleWin + spinResult.scatterPayout;

  let newStats = updateStats(
    stats,
    effectiveBet,
    winMultiplierForStats,
    steps.length,
    true,
    false,
  );

  const scatterPayoutAmount = spinResult.scatterPayout * effectiveBet;
  let totalFreeSpinsWin = scatterPayoutAmount + initialTumbleWin * effectiveBet;

  let remainingFreeSpins = FREE_SPINS_BASE;
  const superFreeSpins = false;

  while (remainingFreeSpins > 0) {
    const fsResult = spin(true, superFreeSpins, false);
    const fsSteps = fsResult.tumbleSteps;

    if (fsSteps.length === 0) {
      newStats = updateStats(newStats, 0, 0, 0, false, true, betAmount);
      remainingFreeSpins -= 1;
      continue;
    }

    let cumulativeWinFs = 0;
    for (const step of fsSteps) {
      cumulativeWinFs += step.payout;
    }

    const finalMultiplierTotal = fsSteps[fsSteps.length - 1].multiplierTotal;
    let totalWinFsMultiplier = cumulativeWinFs;
    if (finalMultiplierTotal > 0) {
      totalWinFsMultiplier = cumulativeWinFs * finalMultiplierTotal;
    }

    const totalWinFsAmount = totalWinFsMultiplier * betAmount;

    newStats = updateStats(
      newStats,
      0,
      totalWinFsMultiplier,
      fsSteps.length,
      fsResult.triggersBonus,
      true,
      betAmount,
    );

    totalFreeSpinsWin += totalWinFsAmount;
    remainingFreeSpins -= 1;

    if (fsResult.scatterCount >= RETRIGGER_SCATTER) {
      remainingFreeSpins += FREE_SPINS_RETRIGGER;
    }

    const MAX_WIN_CAP = 25000;
    const totalWinMultiplier = totalFreeSpinsWin / betAmount;
    if (totalWinMultiplier >= MAX_WIN_CAP) {
      totalFreeSpinsWin = MAX_WIN_CAP * betAmount;
      remainingFreeSpins = 0;
    }
  }

  return newStats;
}

async function main() {
  const ROUNDS = process.env.ROUNDS ? Math.max(1, parseInt(process.env.ROUNDS, 10) || 200000) : 200000;
  const BET = 1;

  // Optional: allow overriding target RTP via env
  const targetEnv = process.env.TARGET_RTP;
  if (targetEnv) {
    const parsed = Number(targetEnv);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setRtpMultiplier(parsed);
    }
  }

  let stats = createInitialStats();

  for (let i = 0; i < ROUNDS; i++) {
    stats = simulateRound(BET, stats);
  }

  const realRtp = stats.realRTP;
  const targetRtp = getTargetRtp();

  // #region agent log
  fetch("http://127.0.0.1:7491/ingest/1ac776a0-99df-4f99-9de6-75896fb8fe70", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a04187",
    },
    body: JSON.stringify({
      sessionId: "a04187",
      runId: "rtp-validate-96.5",
      hypothesisId: "A",
      location: "server/simulateRtp.ts:main_end",
      message: "RTP summary after simulation",
      data: {
        rounds: ROUNDS,
        bet: BET,
        totalBet: stats.totalBet,
        totalWin: stats.totalWin,
        realRtp,
        targetRtp,
        rtpMultiplier: getRtpMultiplier(),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  console.log("Simulation completed.");
  console.log(`Rounds:        ${ROUNDS}`);
  console.log(`Bet per round: ${BET}`);
  console.log(`Total bet:     ${stats.totalBet.toFixed(2)}`);
  console.log(`Total win:     ${stats.totalWin.toFixed(2)}`);
  console.log(`Real RTP:      ${realRtp.toFixed(2)}%`);
  console.log(`Target RTP:    ${targetRtp.toFixed(2)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

