/**
 * Sweet Bonanza 1000 Replica - Statistics Panel
 * Real-time RTP, profit/loss, win history, tumble distribution
 */

import React from "react";
import { GameStats } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
  stats: GameStats;
  currentMultiplierTotal: number;
  isFreeSpins: boolean;
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  freeSpinsTotalWin: number;
  bet: number;
  targetRtp: number;
}

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
}> = ({ label, value, sub, color = "text-slate-800" }) => (
  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
    <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
    <div className={cn("text-base font-bold font-mono", color)}>{value}</div>
    {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
  </div>
);

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  currentMultiplierTotal,
  isFreeSpins,
  freeSpinsRemaining,
  freeSpinsTotal,
  freeSpinsTotalWin,
  bet,
  targetRtp,
}) => {
  const rtpColor =
    stats.realRTP >= 96
      ? "text-green-600"
      : stats.realRTP >= 90
      ? "text-amber-600"
      : stats.realRTP >= 80
      ? "text-orange-500"
      : "text-red-500";

  const netResult = stats.totalWin - stats.totalBet;
  const netColor = netResult >= 0 ? "text-green-600" : "text-red-500";

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Free Spins status */}
      {isFreeSpins && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3">
          <div className="text-amber-700 font-bold text-sm mb-2 flex items-center gap-1">
            <span>⭐</span> Free Spins Active
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-amber-600 font-bold text-xl font-mono">{freeSpinsRemaining}</div>
              <div className="text-xs text-amber-500">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-amber-600 font-bold text-xl font-mono">{freeSpinsTotal}</div>
              <div className="text-xs text-amber-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-green-600 font-bold text-xl font-mono">{freeSpinsTotalWin.toFixed(1)}</div>
              <div className="text-xs text-amber-500">Win So Far</div>
            </div>
          </div>
          {currentMultiplierTotal > 0 && (
            <div className="mt-2 bg-amber-100 rounded p-1.5 text-center border border-amber-200">
              <span className="text-amber-700 font-bold text-base">
                Current Multiplier Total: {currentMultiplierTotal}x
              </span>
            </div>
          )}
        </div>
      )}

      {/* Core stats */}
      <div>
        <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Live Statistics</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            label="Actual RTP"
            value={stats.totalSpins > 0 ? `${stats.realRTP.toFixed(2)}%` : "—"}
            sub={`Target: ${targetRtp.toFixed(1)}%`}
            color={stats.totalSpins > 0 ? rtpColor : "text-slate-400"}
          />
          <StatCard
            label="Net P&L"
            value={stats.totalSpins > 0 ? `${netResult >= 0 ? "+" : ""}${netResult.toFixed(2)}` : "—"}
            sub={`${stats.totalSpins} spins`}
            color={stats.totalSpins > 0 ? netColor : "text-slate-400"}
          />
          <StatCard
            label="Total Bet"
            value={stats.totalBet.toFixed(2)}
            color="text-slate-700"
          />
          <StatCard
            label="Total Win"
            value={stats.totalWin.toFixed(2)}
            color="text-green-600"
          />
          <StatCard
            label="Biggest Win"
            value={stats.biggestWinMultiplier > 0 ? `${stats.biggestWinMultiplier.toFixed(1)}x` : "—"}
            sub={stats.biggestWin > 0 ? `${stats.biggestWin.toFixed(2)}` : undefined}
            color="text-amber-600"
          />
          <StatCard
            label="FS Triggered"
            value={`${stats.freeSpinsTriggered}`}
            sub={stats.totalSpins > 0 ? `Rate: ${(stats.freeSpinsTriggered / stats.totalSpins * 100).toFixed(1)}%` : undefined}
            color="text-purple-600"
          />
        </div>
      </div>

      {/* Win history chart */}
      {stats.winHistory.length > 0 && (
        <div className={stats.tumbleHistory.length === 0 ? "flex-1 flex flex-col" : ""}>
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            Win History (last {stats.winHistory.length})
          </h3>
          <div className={cn("bg-slate-50 rounded-lg p-2 border border-slate-200", stats.tumbleHistory.length === 0 ? "flex-1" : "")}>
            <WinHistoryChart history={stats.winHistory} />
          </div>
        </div>
      )}

      {/* Tumble distribution */}
      {stats.tumbleHistory.length > 0 && (
        <div className="flex-1 flex flex-col">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            Tumble Distribution
          </h3>
          <div className="flex-1 bg-slate-50 rounded-lg p-2 border border-slate-200">
            <TumbleDistribution history={stats.tumbleHistory} />
          </div>
        </div>
      )}

      {stats.tumbleHistory.length === 0 && <div className="flex-1" />}
    </div>
  );
};

const WinHistoryChart: React.FC<{ history: number[] }> = ({ history }) => {
  const maxVal = Math.max(...history, 1);
  const barWidth = Math.max(4, Math.floor(240 / history.length));

  return (
    <div className="flex items-end gap-0.5 h-16">
      {history.map((val, i) => {
        const height = val === 0 ? 2 : Math.max(4, (val / maxVal) * 60);
        const color =
          val === 0
            ? "bg-slate-200"
            : val >= 10
            ? "bg-amber-400"
            : val >= 1
            ? "bg-green-500"
            : "bg-green-300";

        return (
          <div
            key={i}
            className={cn("rounded-t transition-all", color)}
            style={{ width: `${barWidth}px`, height: `${height}px`, minWidth: "3px" }}
            title={`${val.toFixed(2)}x`}
          />
        );
      })}
    </div>
  );
};

const TumbleDistribution: React.FC<{ history: number[] }> = ({ history }) => {
  const counts: Record<number, number> = {};
  for (const t of history) {
    counts[t] = (counts[t] || 0) + 1;
  }

  const maxCount = Math.max(...Object.values(counts), 1);
  const entries = Object.entries(counts)
    .map(([k, v]) => ({ tumbles: Number(k), count: v }))
    .sort((a, b) => a.tumbles - b.tumbles);

  return (
    <div className="space-y-1">
      {entries.map(({ tumbles, count }) => (
        <div key={tumbles} className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-10 text-right font-mono">
            {tumbles}×
          </span>
          <div className="flex-1 bg-slate-200 rounded-full h-2.5">
            <div
              className="h-full rounded-full bg-blue-400"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-8 font-mono">{count}</span>
        </div>
      ))}
    </div>
  );
};
