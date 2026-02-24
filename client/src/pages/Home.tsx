/**
 * Sweet Bonanza 1000 Replica - Main Game Page
 * Layout: Header | Left Controls | Center Grid | Right Panel (Stats / Paytable / History)
 * Light theme: white/light-gray background, orange accents
 */

import React, { useEffect, useState, useCallback } from "react";
import { useSlotGame, SpinRecord } from "@/hooks/useSlotGame";
import { GameGrid } from "@/components/GameGrid";
import { StatsPanel } from "@/components/StatsPanel";
import { Paytable } from "@/components/Paytable";
import { SpinInfo } from "@/components/SpinInfo";
import { MathModelModal } from "@/components/MathModelModal";
import { MathDocModal } from "@/components/MathDocModal";
import { GameSidebar } from "@/components/GameSidebar";
import { cn } from "@/lib/utils";
import {
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  VolatilityLevel,
} from "@/lib/gameEngine";

type RightPanel = "stats" | "paytable" | "history";


const BET_OPTIONS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const AUTO_SPIN_PRESETS = [10, 50, 100, 500];

const VOLATILITY_OPTIONS: { value: VolatilityLevel; label: string; color: string; desc: string }[] = [
  { value: "low",     label: "Low",     color: "text-green-600",  desc: "Min 6 symbols, low bombs" },
  { value: "medium",  label: "Medium",  color: "text-blue-600",   desc: "Min 8 symbols (default)" },
  { value: "high",    label: "High",    color: "text-orange-500", desc: "Min 9 symbols, more bombs" },
  { value: "extreme", label: "Extreme", color: "text-red-600",    desc: "Min 10 symbols, max bombs" },
];

// CSV download helper
function downloadCSV(records: SpinRecord[]) {
  const headers = ["#", "Spin", "Bet", "Win", "Multiplier", "Tumbles", "Free Spins Triggered", "Timestamp"];
  const rows = records.map(r => [
    r.id,
    r.spinNumber,
    r.bet.toFixed(2),
    r.win.toFixed(2),
    r.multiplier.toFixed(2),
    r.tumbles,
    r.triggeredFS ? "Yes" : "No",
    new Date(r.timestamp).toISOString(),
  ]);
  const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sweet_bonanza_history_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const {
    state,
    startSpin,
    startAutoSpin,
    stopAutoSpin,
    toggleAnimations,
    endFreeSpins,
    setBet,
    setAnteBetMode,
    handleBuyFreeSpins,
    addBalance,
    resetGame,
    setTargetRtp,
    getTargetRtp,
    setVolatilityLevel,
    getVolatility,
    clearHistory,
  } = useSlotGame();

  const [rightPanel, setRightPanel] = useState<RightPanel>("stats");
  const [autoSpinInput, setAutoSpinInput] = useState<string>("100");
  const [rtpInput, setRtpInput] = useState<string>("96.53");
  const [showMathModel, setShowMathModel] = useState(false);
  const [showMathDoc, setShowMathDoc] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeGameId, setActiveGameId] = useState("sweet-bonanza-1000");
  const currentTargetRtp = getTargetRtp();
  const currentVolatility = getVolatility();

  const {
    balance,
    bet,
    grid,
    multipliers,
    winPositions,
    currentWinSymbol,
    phase,
    currentTumbleStep,
    currentTumbleIndex,
    spinWin,
    spinWinMultiplier,
    freeSpinsRemaining,
    freeSpinsTotal,
    isFreeSpins,
    freeSpinsTotalWin,
    anteBetMode,
    stats,
    lastScatterCount,
    currentMultiplierTotal,
    message,
    autoSpinRemaining,
    autoSpinTotal,
    animationsEnabled,
    spinHistory,
    droppingPositions,
  } = state;

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (phase === "idle" || phase === "result") startSpin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startSpin]);

  // Auto-close free spins end screen
  useEffect(() => {
    if (phase === "free_spins_end") {
      const delay = animationsEnabled ? 5000 : 1500;
      const timer = setTimeout(() => endFreeSpins(), delay);
      return () => clearTimeout(timer);
    }
  }, [phase, endFreeSpins, animationsEnabled]);

  const isActive = phase === "spinning" || phase === "tumbling" || phase === "bonus_trigger"
    || phase === "free_spins" || phase === "free_spins_spinning";
  const isAutoSpinning = autoSpinRemaining > 0;
  const effectiveBet = anteBetMode !== "none" ? bet * 1.25 : bet;
  const canSpin = !isActive && !isFreeSpins && !isAutoSpinning && balance >= effectiveBet;
  const canAutoSpin = !isActive && !isFreeSpins && !isAutoSpinning && balance >= effectiveBet;
  const buyFSCost = BUY_FREE_SPINS_COST * bet;
  const buySFSCost = BUY_SUPER_FREE_SPINS_COST * bet;

  const autoSpinProgress = autoSpinTotal > 0
    ? ((autoSpinTotal - autoSpinRemaining) / autoSpinTotal) * 100
    : 0;

  const handleAutoSpinStart = () => {
    const count = parseInt(autoSpinInput, 10);
    if (!isNaN(count) && count > 0) startAutoSpin(count);
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-800 overflow-hidden flex flex-col select-none">
      {/* ===== Original Game Link ===== */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-center">
        <a
          href="https://www.pragmaticplay.com/en/games/sweet-bonanza-1000/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-xs font-semibold hover:underline inline-flex items-center gap-1.5"
        >
          <span>Play Original Sweet Bonanza 1000 by Pragmatic Play</span>
          <span>→</span>
        </a>
      </div>

      {/* ===== Header ===== */}
      <header className="flex items-center justify-between px-4 py-1.5 border-b border-slate-200 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-orange-600 tracking-tight">Sweet Bonanza 1000</h1>
          {isFreeSpins && (
            <span className="bg-yellow-100 border border-yellow-400 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              ⭐ Free Spins ×{freeSpinsRemaining}
            </span>
          )}
          {isAutoSpinning && (
            <span className="bg-sky-100 border border-sky-400 text-sky-700 text-xs font-bold px-2 py-0.5 rounded-full">
              ▶▶ Auto {autoSpinTotal - autoSpinRemaining}/{autoSpinTotal}
            </span>
          )}
          {!animationsEnabled && (
            <span className="bg-emerald-100 border border-emerald-400 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
              ⚡ Turbo
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-right">
          {/* Math Model button */}
          <button
            onClick={() => setShowMathModel(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors border border-slate-600 shadow-sm"
          >
            <span className="text-base leading-none">📐</span>
            <span>Math Model</span>
          </button>
          {/* Math Doc button */}
          <button
            onClick={() => setShowMathDoc(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-colors border border-indigo-500 shadow-sm"
          >
            <span className="text-base leading-none">📖</span>
            <span>Math Doc</span>
          </button>
          {[
            { label: "Target RTP", value: `${currentTargetRtp.toFixed(2)}%`, color: "text-green-600" },
            { label: "Max Win", value: "25,000x", color: "text-amber-600" },
            { label: "Volatility", value: currentVolatility.toUpperCase(), color: VOLATILITY_OPTIONS.find(o => o.value === currentVolatility)?.color || "text-slate-500" },
            {
              label: "Actual RTP",
              value: stats.totalSpins > 0 ? `${stats.realRTP.toFixed(1)}%` : "—",
              color: stats.totalSpins === 0 ? "text-slate-400" :
                stats.realRTP >= 96 ? "text-green-600" :
                stats.realRTP >= 80 ? "text-amber-600" : "text-red-500"
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-[9px] text-slate-400">{label}</div>
              <div className={cn("text-xs font-bold font-mono", color)}>{value}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ===== Main Area ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- Game Sidebar ---- */}
        <GameSidebar
          activeGameId={activeGameId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectGame={(id) => setActiveGameId(id)}
        />

        {/* ---- Left Control Panel ---- */}
        <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto bg-white p-3 space-y-3 shadow-sm">
          {/* Balance / Bet */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <div>
                <div className="text-xs text-slate-400">Balance</div>
                <div className="text-base font-bold font-mono text-slate-800">{balance.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Effective Bet</div>
                <div className="text-base font-bold font-mono text-orange-600">{effectiveBet.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Bet selection */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Bet Amount</div>
            <div className="grid grid-cols-3 gap-1.5">
              {BET_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  disabled={isActive || isFreeSpins || isAutoSpinning}
                  className={cn(
                    "py-1 rounded text-xs font-mono font-medium transition-all",
                    bet === b
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200",
                    (isActive || isFreeSpins || isAutoSpinning) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Ante Bet */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Ante Bet</div>
            <div className="space-y-0.5">
              {([
                { mode: "none" as const, label: "Off" },
                { mode: "x20" as const, label: "+25% Buy FS" },
                { mode: "x25" as const, label: "+25% Scatter ×2" },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setAnteBetMode(mode)}
                  disabled={isActive || isFreeSpins || isAutoSpinning}
                  className={cn(
                    "w-full py-1 px-2.5 rounded text-xs font-medium transition-all text-left border",
                    anteBetMode === mode
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200",
                    (isActive || isFreeSpins || isAutoSpinning) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Spin button */}
          <button
            onClick={startSpin}
            disabled={!canSpin}
            className={cn(
              "w-full py-3 rounded-lg text-base font-bold tracking-wider transition-all",
              isFreeSpins
                ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-black"
                : canSpin
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 active:scale-95 shadow-md"
                : "bg-slate-200 text-slate-400 cursor-not-allowed",
              isActive && "animate-pulse"
            )}
          >
            {isActive
              ? (isFreeSpins ? `⭐ Free Spinning... (${freeSpinsRemaining})` : "Spinning...")
              : isAutoSpinning
              ? `▶▶ Auto Spinning...`
              : "▶ SPIN"
            }
          </button>

          {/* Auto Spin */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2.5">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Auto Spin</div>

            <div className="grid grid-cols-4 gap-1.5">
              {AUTO_SPIN_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setAutoSpinInput(String(n))}
                  disabled={isAutoSpinning}
                  className={cn(
                    "py-1 rounded text-xs font-mono font-medium transition-all border",
                    autoSpinInput === String(n) && !isAutoSpinning
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-white text-slate-500 hover:bg-slate-100 border-slate-200",
                    isAutoSpinning && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              <input
                type="number"
                min={1}
                max={9999}
                value={autoSpinInput}
                onChange={(e) => setAutoSpinInput(e.target.value)}
                disabled={isAutoSpinning}
                className={cn(
                  "w-20 shrink-0 px-2 py-1.5 rounded border border-slate-200 bg-white",
                  "text-xs font-mono text-slate-700 text-center",
                  "focus:outline-none focus:border-sky-400",
                  isAutoSpinning && "opacity-50 cursor-not-allowed"
                )}
                placeholder="Count"
              />
              {isAutoSpinning ? (
                <button
                  onClick={stopAutoSpin}
                  className="flex-1 py-1.5 rounded text-xs font-bold bg-red-500 text-white hover:bg-red-400 transition-colors border border-red-400"
                >
                  ⏹ Stop
                </button>
              ) : (
                <button
                  onClick={handleAutoSpinStart}
                  disabled={!canAutoSpin || isFreeSpins}
                  className={cn(
                    "flex-1 py-1.5 rounded text-xs font-bold transition-all border",
                    canAutoSpin && !isFreeSpins
                      ? "bg-sky-500 text-white hover:bg-sky-400 border-sky-400 shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                  )}
                >
                  ▶▶ Start
                </button>
              )}
            </div>

            {isAutoSpinning && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progress</span>
                  <span className="font-mono text-sky-600">
                    {autoSpinTotal - autoSpinRemaining}/{autoSpinTotal}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-300"
                    style={{ width: `${autoSpinProgress}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 text-center">
                  <span className="font-mono text-sky-600">{autoSpinRemaining}</span> remaining
                </div>
              </div>
            )}
          </div>

          {/* Animation toggle */}
          <button
            onClick={toggleAnimations}
            className={cn(
              "w-full py-2 rounded-lg text-xs font-medium transition-all border",
              animationsEnabled
                ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            {animationsEnabled ? "🎬 Animation: ON (click to turbo)" : "⚡ Animation: OFF (turbo mode)"}
          </button>

          {/* Buy Feature */}
          {!isFreeSpins && anteBetMode !== "x25" && (
            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Buy Feature</div>
              <button
                onClick={() => handleBuyFreeSpins(false)}
                disabled={isActive || isFreeSpins || isAutoSpinning || balance < buyFSCost}
                className={cn(
                  "w-full py-1.5 rounded text-xs font-medium border transition-all",
                  !isActive && !isAutoSpinning && balance >= buyFSCost
                    ? "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                Buy Free Spins <span className="font-mono">{buyFSCost.toFixed(0)}×</span>
              </button>
              <button
                onClick={() => handleBuyFreeSpins(true)}
                disabled={isActive || isFreeSpins || isAutoSpinning || balance < buySFSCost}
                className={cn(
                  "w-full py-1.5 rounded text-xs font-medium border transition-all",
                  !isActive && !isAutoSpinning && balance >= buySFSCost
                    ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                Buy Super FS <span className="font-mono">{buySFSCost.toFixed(0)}×</span>
              </button>
            </div>
          )}

          {/* Top-up / Reset */}
          <div className="flex gap-1">
            <button
              onClick={() => addBalance(1000)}
              className="flex-1 py-1.5 rounded text-xs text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              +1000
            </button>
            <button
              onClick={resetGame}
              disabled={isActive || isAutoSpinning}
              className="flex-1 py-1.5 rounded text-xs text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          {/* ===== RTP Setting ===== */}
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 space-y-2">
            <div className="text-xs text-orange-500 uppercase tracking-wide flex items-center justify-between">
              <span>Target RTP</span>
              <span className="font-mono font-bold text-orange-600">{currentTargetRtp.toFixed(1)}%</span>
            </div>
            <div className="flex gap-1">
              <input
                type="number"
                min={10}
                max={200}
                step={0.1}
                value={rtpInput}
                onChange={(e) => setRtpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseFloat(rtpInput);
                    if (!isNaN(v)) setTargetRtp(v);
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-orange-200 bg-white text-xs font-mono text-slate-700 text-center focus:outline-none focus:border-orange-400"
                placeholder="96.53"
              />
              <button
                onClick={() => {
                  const v = parseFloat(rtpInput);
                  if (!isNaN(v)) setTargetRtp(v);
                }}
                className="px-3 py-1.5 rounded text-xs font-bold bg-orange-500 text-white hover:bg-orange-400 transition-colors border border-orange-400"
              >
                Set
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[50, 80, 96.53, 110, 150].map((v) => (
                <button
                  key={v}
                  onClick={() => { setRtpInput(String(v)); setTargetRtp(v); }}
                  className={cn(
                    "py-1 rounded text-xs font-mono transition-all border",
                    Math.abs(currentTargetRtp - v) < 0.1
                      ? "bg-orange-500 border-orange-400 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600"
                  )}
                >
                  {v === 96.53 ? "96.5" : v}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 leading-tight">
              Scales all payouts. Original theoretical: 96.53%
            </div>
          </div>

          {/* ===== Volatility Setting ===== */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 space-y-2">
            <div className="text-xs text-purple-500 uppercase tracking-wide flex items-center justify-between">
              <span>Volatility</span>
              <span className={cn("font-mono font-bold text-xs",
                VOLATILITY_OPTIONS.find(o => o.value === currentVolatility)?.color
              )}>
                {currentVolatility.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {VOLATILITY_OPTIONS.map(({ value, label, color, desc }) => (
                <button
                  key={value}
                  onClick={() => setVolatilityLevel(value)}
                  className={cn(
                    "py-1.5 px-2 rounded text-xs font-medium transition-all border text-left",
                    currentVolatility === value
                      ? "bg-purple-500 border-purple-400 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:border-purple-300"
                  )}
                  title={desc}
                >
                  <div className={cn("font-bold", currentVolatility === value ? "text-white" : color)}>
                    {label}
                  </div>
                  <div className={cn("text-[10px] leading-tight", currentVolatility === value ? "text-purple-100" : "text-slate-400")}>
                    {desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 text-center">Space / Enter to spin</div>
        </div>

        {/* ---- Center Game Area ---- */}
        <div className="flex-1 flex flex-col overflow-hidden p-2 gap-1.5 bg-slate-100">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="max-w-md w-full" style={{ aspectRatio: '6/5', maxHeight: '100%' }}>
              <GameGrid
                grid={grid}
                multipliers={multipliers}
                winPositions={winPositions}
                currentWinSymbol={currentWinSymbol}
                isSpinning={phase === "spinning" || phase === "tumbling"}
                isFreeSpins={isFreeSpins}
                droppingPositions={droppingPositions}
              />
            </div>
          </div>

          <div className="shrink-0 h-[120px]">
            <SpinInfo
              phase={phase}
              message={message}
              currentTumbleStep={currentTumbleStep}
              currentTumbleIndex={currentTumbleIndex}
              spinWin={spinWin}
              spinWinMultiplier={spinWinMultiplier}
              bet={bet}
              isFreeSpins={isFreeSpins}
              lastScatterCount={lastScatterCount}
              lastScatterPayout={state.lastScatterPayout}
            />
          </div>
        </div>

        {/* ---- Right Panel ---- */}
        <div className="w-96 shrink-0 border-l border-slate-200 flex flex-col bg-white shadow-sm">
          {/* Panel tabs */}
          <div className="flex border-b border-slate-200 shrink-0">
            {([
              { key: "stats" as const, label: "📊 Stats" },
              { key: "paytable" as const, label: "📋 Paytable" },
              { key: "history" as const, label: "📜 History" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRightPanel(key)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  rightPanel === key
                    ? "bg-orange-50 text-orange-600 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col">
            <div className="flex-1">
              {rightPanel === "stats" ? (
                <StatsPanel
                  stats={stats}
                  currentMultiplierTotal={currentMultiplierTotal}
                  isFreeSpins={isFreeSpins}
                  freeSpinsRemaining={freeSpinsRemaining}
                  freeSpinsTotal={freeSpinsTotal}
                  freeSpinsTotalWin={freeSpinsTotalWin}
                  bet={bet}
                  targetRtp={currentTargetRtp}
                />
              ) : rightPanel === "paytable" ? (
                <Paytable />
              ) : (
                <HistoryPanel
                  records={spinHistory}
                  onClear={clearHistory}
                  onDownload={() => downloadCSV(spinHistory)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Free Spins End Modal ===== */}
      {phase === "free_spins_end" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-yellow-300 rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-amber-600 mb-1">Free Spins Ended!</h2>
            <div className="text-slate-400 text-sm mb-4">{freeSpinsTotal} free spins completed</div>
            <div className="text-4xl font-bold font-mono text-green-600 mb-2">
              +{freeSpinsTotalWin.toFixed(2)}
            </div>
            <div className="text-slate-400 text-sm mb-6">
              = {(freeSpinsTotalWin / (bet || 1)).toFixed(2)}× bet
            </div>
            <button
              onClick={endFreeSpins}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-lg shadow-md transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ===== Bonus Trigger Overlay ===== */}
      {phase === "bonus_trigger" && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white border border-orange-300 rounded-2xl p-8 text-center max-w-xs mx-4 shadow-2xl">
            <div className="text-5xl mb-3">🍭</div>
            <h2 className="text-xl font-bold text-orange-600 mb-2">Free Spins Triggered!</h2>
            <div className="text-3xl font-bold text-amber-600">×{lastScatterCount} Scatters</div>
            <div className="text-slate-400 text-sm mt-2">Starting 10 free spins...</div>
          </div>
        </div>
      )}

      {/* ===== Math Model Modal ===== */}
      <MathModelModal
        isOpen={showMathModel}
        onClose={() => setShowMathModel(false)}
        targetRtp={currentTargetRtp}
      />

      {/* ===== Math Documentation Modal ===== */}
      <MathDocModal
        isOpen={showMathDoc}
        onClose={() => setShowMathDoc(false)}
      />
    </div>
  );
}

// ============================================================
// History Panel Component
// ============================================================

interface HistoryPanelProps {
  records: SpinRecord[];
  onClear: () => void;
  onDownload: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ records, onClear, onDownload }) => {
  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="text-[10px] text-slate-500 font-medium">
          {records.length} spins recorded
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onDownload}
            disabled={records.length === 0}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-medium border transition-all",
              records.length > 0
                ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            ⬇ CSV
          </button>
          <button
            onClick={onClear}
            disabled={records.length === 0}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-medium border transition-all",
              records.length > 0
                ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Summary row */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-1 shrink-0">
          {[
            {
              label: "Total Bet",
              value: records.reduce((s, r) => s + r.bet, 0).toFixed(1),
              color: "text-slate-700",
            },
            {
              label: "Total Win",
              value: records.reduce((s, r) => s + r.win, 0).toFixed(1),
              color: "text-green-600",
            },
            {
              label: "Best Win",
              value: `${Math.max(...records.map(r => r.multiplier), 0).toFixed(1)}x`,
              color: "text-amber-600",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded p-1.5 border border-slate-200 text-center">
              <div className="text-[8px] text-slate-400">{label}</div>
              <div className={cn("text-xs font-bold font-mono", color)}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="text-2xl mb-2">📜</div>
            <div className="text-xs">No spins recorded yet</div>
            <div className="text-[10px] mt-1">Spin to start tracking history</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {/* Header row */}
          <div className="grid grid-cols-5 gap-1.5 px-2 py-1.5 text-xs text-slate-400 uppercase tracking-wide sticky top-0 bg-white border-b border-slate-100">
            <span>#</span>
            <span className="text-right">Bet</span>
            <span className="text-right">Win</span>
            <span className="text-right">Mult</span>
            <span className="text-right">Tumbles</span>
          </div>
          {records.map((r) => (
            <div
              key={r.id}
              className={cn(
                "grid grid-cols-5 gap-1.5 px-2 py-1.5 rounded text-xs transition-colors",
                r.triggeredFS
                  ? "bg-yellow-50 border border-yellow-200"
                  : r.win > 0
                  ? "bg-green-50 border border-green-100"
                  : "bg-slate-50 border border-slate-100"
              )}
            >
              <span className="font-mono text-slate-400">{r.spinNumber}</span>
              <span className="text-right font-mono text-slate-600">{r.bet.toFixed(1)}</span>
              <span className={cn(
                "text-right font-mono font-bold",
                r.win > r.bet ? "text-green-600" : r.win > 0 ? "text-green-500" : "text-slate-400"
              )}>
                {r.win > 0 ? r.win.toFixed(2) : "—"}
              </span>
              <span className={cn(
                "text-right font-mono",
                r.multiplier >= 10 ? "text-amber-600 font-bold" :
                r.multiplier > 0 ? "text-green-600" : "text-slate-400"
              )}>
                {r.multiplier > 0 ? `${r.multiplier.toFixed(1)}x` : "—"}
              </span>
              <span className="text-right font-mono text-slate-500">
                {r.tumbles > 0 ? r.tumbles : "—"}
                {r.triggeredFS && <span className="ml-0.5 text-yellow-600">⭐</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
