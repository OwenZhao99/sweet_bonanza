/**
 * Sweet Bonanza 1000 复刻版 - 游戏控制面板（紧凑版）
 * 设计风格：教学型数学可视化
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AnteBetMode, GamePhase } from "@/hooks/useSlotGame";
import {
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
} from "@/lib/gameEngine";

const BET_OPTIONS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const AUTO_SPIN_PRESETS = [10, 50, 100, 500];

interface GameControlsProps {
  balance: number;
  bet: number;
  phase: GamePhase;
  anteBetMode: AnteBetMode;
  isFreeSpins: boolean;
  freeSpinsRemaining: number;
  autoSpinRemaining: number;
  autoSpinTotal: number;
  animationsEnabled: boolean;
  currentTargetRtp: number;
  onSpin: () => void;
  onStartAutoSpin: (count: number) => void;
  onStopAutoSpin: () => void;
  onToggleAnimations: () => void;
  onBetChange: (bet: number) => void;
  onAnteBetChange: (mode: AnteBetMode) => void;
  onBuyFreeSpins: (superFreeSpins: boolean) => void;
  onAddBalance: (amount: number) => void;
  onReset: () => void;
  onSetTargetRtp: (rtp: number) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  balance,
  bet,
  phase,
  anteBetMode,
  isFreeSpins,
  freeSpinsRemaining,
  autoSpinRemaining,
  autoSpinTotal,
  animationsEnabled,
  currentTargetRtp,
  onSpin,
  onStartAutoSpin,
  onStopAutoSpin,
  onToggleAnimations,
  onBetChange,
  onAnteBetChange,
  onBuyFreeSpins,
  onAddBalance,
  onReset,
  onSetTargetRtp,
}) => {
  const [autoSpinInput, setAutoSpinInput] = useState<string>("100");
  const [rtpInput, setRtpInput] = useState<string>(String(currentTargetRtp.toFixed(1)));

  const isActive = phase === "spinning" || phase === "tumbling" || phase === "bonus_trigger";
  const isAutoSpinning = autoSpinRemaining > 0;
  const effectiveBet = anteBetMode !== "none" ? bet * 1.25 : bet;
  const canSpin = !isActive && !isAutoSpinning && balance >= effectiveBet;
  const canAutoSpin = !isActive && !isFreeSpins && !isAutoSpinning && balance >= effectiveBet;

  const buyFSCost = BUY_FREE_SPINS_COST * bet;
  const buySFSCost = BUY_SUPER_FREE_SPINS_COST * bet;
  const canBuyFS = !isActive && !isFreeSpins && !isAutoSpinning && anteBetMode === "none" && balance >= buyFSCost;
  const canBuySFS = !isActive && !isFreeSpins && !isAutoSpinning && anteBetMode === "none" && balance >= buySFSCost;

  const handleAutoSpinStart = () => {
    const count = parseInt(autoSpinInput, 10);
    if (!isNaN(count) && count > 0) {
      onStartAutoSpin(count);
    }
  };

  const autoSpinProgress = autoSpinTotal > 0
    ? ((autoSpinTotal - autoSpinRemaining) / autoSpinTotal) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* 余额显示 */}
      <div className="bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/40">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-[9px] text-slate-500 uppercase">余额</div>
            <div className="text-base font-bold font-mono text-white">
              {balance.toFixed(2)}<span className="text-xs text-slate-400 ml-0.5">元</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-500 uppercase">有效下注</div>
            <div className="text-base font-bold font-mono text-amber-400">
              {effectiveBet.toFixed(2)}<span className="text-xs text-slate-400 ml-0.5">元</span>
            </div>
          </div>
        </div>
      </div>

      {/* 下注选择 */}
      <div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">下注额</div>
        <div className="grid grid-cols-3 gap-1">
          {BET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => onBetChange(b)}
              disabled={isActive || isFreeSpins || isAutoSpinning}
              className={cn(
                "py-1 rounded text-xs font-mono font-medium transition-all",
                bet === b
                  ? "bg-amber-500 text-black shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                  : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/60",
                (isActive || isFreeSpins || isAutoSpinning) && "opacity-50 cursor-not-allowed"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* 前注选项 */}
      <div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">前注 (Ante Bet)</div>
        <div className="space-y-1">
          {([
            { mode: "none" as AnteBetMode, label: "关闭" },
            { mode: "x20" as AnteBetMode, label: "+25% 可购买FS" },
            { mode: "x25" as AnteBetMode, label: "+25% 散落×2" },
          ]).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onAnteBetChange(mode)}
              disabled={isActive || isFreeSpins || isAutoSpinning}
              className={cn(
                "w-full py-1 rounded text-xs font-medium transition-all text-left px-2",
                anteBetMode === mode
                  ? "bg-blue-600/80 text-white"
                  : "bg-slate-700/40 text-slate-400 hover:bg-slate-600/40",
                (isActive || isFreeSpins || isAutoSpinning) && "opacity-50 cursor-not-allowed"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 旋转按钮 */}
      <button
        onClick={onSpin}
        disabled={!canSpin}
        className={cn(
          "w-full py-3 rounded-xl text-base font-bold tracking-wider transition-all duration-200",
          isFreeSpins
            ? "bg-gradient-to-r from-yellow-600 to-amber-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            : canSpin
            ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]"
            : "bg-slate-700/50 text-slate-500 cursor-not-allowed",
          isActive && "animate-pulse"
        )}
      >
        {isActive
          ? "旋转中..."
          : isFreeSpins
          ? `⭐ 免费旋转中... (${freeSpinsRemaining})`
          : "▶ 旋转"}
      </button>

      {/* 自动旋转区域 */}
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30 space-y-2">
        <div className="text-[9px] text-slate-500 uppercase tracking-wide">自动旋转</div>

        {/* 快捷次数 */}
        <div className="grid grid-cols-4 gap-1">
          {AUTO_SPIN_PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => setAutoSpinInput(String(n))}
              disabled={isAutoSpinning}
              className={cn(
                "py-1 rounded text-xs font-mono font-medium transition-all",
                autoSpinInput === String(n) && !isAutoSpinning
                  ? "bg-cyan-600/80 text-white"
                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50",
                isAutoSpinning && "opacity-40 cursor-not-allowed"
              )}
            >
              {n}
            </button>
          ))}
        </div>

        {/* 自定义次数输入 + 开始/停止按钮 */}
        <div className="flex gap-1.5">
          <input
            type="number"
            min={1}
            max={9999}
            value={autoSpinInput}
            onChange={(e) => setAutoSpinInput(e.target.value)}
            disabled={isAutoSpinning}
            className={cn(
              "flex-1 min-w-0 bg-slate-900/60 border border-slate-600/50 rounded px-2 py-1.5",
              "text-xs font-mono text-white text-center",
              "focus:outline-none focus:border-cyan-500/70",
              isAutoSpinning && "opacity-50 cursor-not-allowed"
            )}
            placeholder="次数"
          />
          {isAutoSpinning ? (
            <button
              onClick={onStopAutoSpin}
              className="flex-1 py-1.5 rounded text-xs font-bold bg-red-600/80 text-white hover:bg-red-500/80 transition-colors border border-red-500/50"
            >
              ⏹ 停止
            </button>
          ) : (
            <button
              onClick={handleAutoSpinStart}
              disabled={!canAutoSpin || isFreeSpins}
              className={cn(
                "flex-1 py-1.5 rounded text-xs font-bold transition-all border",
                canAutoSpin && !isFreeSpins
                  ? "bg-cyan-700/70 text-cyan-100 hover:bg-cyan-600/70 border-cyan-600/50"
                  : "bg-slate-700/40 text-slate-600 cursor-not-allowed border-slate-700/30"
              )}
            >
              ▶▶ 开始
            </button>
          )}
        </div>

        {/* 自动旋转进度条 */}
        {isAutoSpinning && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>进度</span>
              <span className="font-mono text-cyan-400">
                {autoSpinTotal - autoSpinRemaining} / {autoSpinTotal}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${autoSpinProgress}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-500 text-center">
              剩余 <span className="font-mono text-cyan-400">{autoSpinRemaining}</span> 次
            </div>
          </div>
        )}
      </div>

      {/* 动画开关 */}
      <button
        onClick={onToggleAnimations}
        className={cn(
          "w-full py-2 rounded-lg text-xs font-medium transition-all border",
          animationsEnabled
            ? "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
            : "bg-emerald-900/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/40"
        )}
      >
        {animationsEnabled ? "🎬 动画：开启（点击关闭加速）" : "⚡ 动画：关闭（极速模式）"}
      </button>

      {/* 购买功能 */}
      {!isFreeSpins && anteBetMode !== "x25" && (
        <div className="space-y-1">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">购买功能</div>
          <button
            onClick={() => onBuyFreeSpins(false)}
            disabled={!canBuyFS}
            className={cn(
              "w-full py-1.5 rounded text-xs font-medium transition-all border",
              canBuyFS
                ? "bg-purple-900/40 border-purple-600/50 text-purple-300 hover:bg-purple-800/40"
                : "bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed"
            )}
          >
            购买免费旋转 <span className="font-mono text-purple-400">{buyFSCost.toFixed(0)}x</span>
          </button>
          <button
            onClick={() => onBuyFreeSpins(true)}
            disabled={!canBuySFS}
            className={cn(
              "w-full py-1.5 rounded text-xs font-medium transition-all border",
              canBuySFS
                ? "bg-yellow-900/40 border-yellow-600/50 text-yellow-300 hover:bg-yellow-800/40"
                : "bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed"
            )}
          >
            购买超级FS <span className="font-mono text-yellow-400">{buySFSCost.toFixed(0)}x</span>
          </button>
        </div>
      )}

      {/* 充值和重置 */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onAddBalance(1000)}
          className="flex-1 py-1.5 rounded text-xs text-slate-400 bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40 transition-colors"
        >
          +1000
        </button>
        <button
          onClick={onReset}
          disabled={isActive || isAutoSpinning}
          className="flex-1 py-1.5 rounded text-xs text-slate-400 bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40 transition-colors disabled:opacity-50"
        >
          重置
        </button>
      </div>

      {/* RTP 设置 */}
      <div className="space-y-1">
        <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-between">
          <span>目标 RTP 设置</span>
          <span className="font-mono text-orange-400">当前: {currentTargetRtp.toFixed(1)}%</span>
        </div>
        <div className="flex gap-1.5">
          <input
            type="number"
            min={10}
            max={200}
            step={0.1}
            value={rtpInput}
            onChange={(e) => setRtpInput(e.target.value)}
            className={cn(
              "flex-1 min-w-0 bg-slate-900/60 border border-slate-600/50 rounded px-2 py-1.5",
              "text-xs font-mono text-white text-center",
              "focus:outline-none focus:border-orange-500/70"
            )}
            placeholder="RTP %"
          />
          <button
            onClick={() => {
              const v = parseFloat(rtpInput);
              if (!isNaN(v)) onSetTargetRtp(v);
            }}
            className="px-3 py-1.5 rounded text-xs font-bold bg-orange-700/60 border border-orange-600/50 text-orange-100 hover:bg-orange-600/60 transition-colors"
          >
            设置
          </button>
        </div>
        <div className="flex gap-1">
          {[50, 80, 96.53, 110, 150].map((v) => (
            <button
              key={v}
              onClick={() => { setRtpInput(String(v)); onSetTargetRtp(v); }}
              className={cn(
                "flex-1 py-0.5 rounded text-[9px] font-mono transition-all border",
                Math.abs(currentTargetRtp - v) < 0.1
                  ? "bg-orange-700/60 border-orange-500/60 text-orange-100"
                  : "bg-slate-800/40 border-slate-700/30 text-slate-500 hover:text-slate-300"
              )}
            >
              {v === 96.53 ? "96.5" : v}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-slate-600 leading-tight">
          调整赔率系数模拟不同 RTP。理论值 96.53%
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="text-[9px] text-slate-700 text-center">
        空格键 / 回车键 快速旋转
      </div>
    </div>
  );
};
