import { computePARSheet, getTargetRtp, getRtpMultiplier } from "../client/src/lib/gameEngine";

const par = computePARSheet();
const base = par.baseGameRTP;
const fs = par.freeSpinsAnalysis.estimatedFreeSpinsRTP;
const total = base + fs;

console.log("Base game RTP (× bet):", base.toFixed(6));
console.log("Free-spins RTP (× bet):", fs.toFixed(6));
console.log("Total theoretical RTP (× bet):", total.toFixed(6));
console.log("Total theoretical RTP (% of bet):", (total * 100).toFixed(4));
console.log("Current RTP multiplier:", getRtpMultiplier().toFixed(4));
console.log("Reported target RTP via multiplier:", getTargetRtp().toFixed(4));

