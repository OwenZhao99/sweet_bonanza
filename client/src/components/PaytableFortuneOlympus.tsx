/**
 * Fortune of Olympus - Paytable & Rules
 * 展示官方规则参数（按规则图口径：payout = 表值 × bet）。
 */

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SYMBOLS,
  MULTIPLIER_VALUES,
  BUY_FREE_SPINS_COST,
  BUY_SUPER_FREE_SPINS_COST,
  MAX_WIN_MULTIPLIER,
  freeSpinsForScatterCount,
} from "@/lib/gameEngineFortuneOlympus";

type Tab = "paytable" | "rules" | "math";

const PAY_TIERS = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5] as const;
const tierLabel = (t: number) => (t === 15 ? "15-49" : String(t));

export const PaytableFortuneOlympus: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("paytable");

  const paySymbols = useMemo(() => SYMBOLS.filter((s) => s.id !== "scatter"), []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-slate-200">
        {(["paytable", "rules", "math"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab === "paytable" ? "Paytable" : tab === "rules" ? "Rules" : "Math Notes"}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === "paytable" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              符号采用「连块支付」：同一符号 <span className="font-semibold text-slate-700">横/竖相连 ≥ 5</span>{" "}
              即中奖。规则页数值以 <span className="font-semibold">coin win</span> 展示，实际赢分会再乘以{" "}
              <span className="font-semibold">Base Bet</span>（总下注 = Base Bet × Bet Multiplier）。
            </p>

            <div className="grid grid-cols-1 gap-2">
              {paySymbols.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                      <span className="text-xl" style={{ color: s.color }}>
                        {s.emoji}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700">{s.name}</div>
                      <div className="text-[10px] text-slate-400">Cluster pays (min 5)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {PAY_TIERS.map((t) => {
                      const v = s.pays[t] ?? 0;
                      return (
                        <div
                          key={t}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <span className="text-[10px] text-slate-400 font-mono">{tierLabel(t)}</span>
                          <span
                            className={cn(
                              "text-[10px] font-mono font-bold",
                              v >= 100 ? "text-amber-700" : v >= 10 ? "text-orange-600" : v >= 2 ? "text-green-600" : "text-slate-600",
                            )}
                          >
                            {v}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <span className="font-bold">🧙 Scatter：</span> 任意位置出现 4–7 个 Scatter 触发免费旋转（规则图未给 Scatter 固定赔付表）。
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">基本规则</h4>
              <p>• 7 × 7 网格。</p>
              <p>• 连块支付：横/竖相连 ≥ 5 即中奖。</p>
              <p>• 每次结算后进入 tumble：中奖符号消失，上方下落并补新符号，直到没有新连块。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">倍数符号（Multiplier）</h4>
              <p>• 倍数符号可在基础与免费旋转中随机出现，并可在 tumbles 中出现。</p>
              <p>• 序列结束时，屏幕上所有倍数值相加，整轮赢分 × 该合计倍数。</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {MULTIPLIER_VALUES.map((v) => (
                  <span
                    key={v}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                      v >= 250 ? "bg-amber-100 text-amber-800 border-amber-300" :
                      v >= 50  ? "bg-orange-50 text-orange-700 border-orange-200" :
                                 "bg-slate-100 text-slate-600 border-slate-200",
                    )}
                  >
                    {v}×
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">免费旋转（Free Spins）</h4>
              <p>• 触发：4/5/6/7 Scatter → {freeSpinsForScatterCount(4)}/{freeSpinsForScatterCount(5)}/{freeSpinsForScatterCount(6)}/{freeSpinsForScatterCount(7)} 次免费旋转。</p>
              <p>• 免费局中再次出现 4–7 Scatter 可再次追加相同档位的免费旋转。</p>
              <p>• 免费局倍数为“累计总倍数”，新倍数命中会加入累计值并用于乘当前与后续赢分。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Special Bets & Buy Feature</h4>
              <p>• Normal：bet multiplier 20×。</p>
              <p>• Ante 1：40×，免费旋转触发概率 ×5。</p>
              <p>• Ante 2：140×，免费旋转触发概率 ×5；免费局倍数最小 5×。</p>
              <p>• Super 1：200×，每转至少 1 个倍数；禁止触发免费旋转。</p>
              <p>• Super 2：5000×，每转至少 1 个倍数且最小 50×；禁止触发免费旋转。</p>
              <div className="mt-2 text-[11px] text-slate-500">
                Buy Free Spins：{BUY_FREE_SPINS_COST}× total bet；Buy Super FS：{BUY_SUPER_FREE_SPINS_COST}× total bet（免费局最小倍数 5×）。
              </div>
            </div>
          </div>
        )}

        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">核心参数（规则图）</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>理论 RTP：96.55%</li>
                <li>波动率：高（High）</li>
                <li>
                  最大赢分：
                  <span className="font-semibold text-amber-600"> {MAX_WIN_MULTIPLIER.toLocaleString()}× bet</span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded p-2 space-y-1 border border-emerald-200">
              <h4 className="text-emerald-700 font-bold text-sm">关于本项目的数学模型</h4>
              <p className="text-xs text-slate-600">
                该版本沿用当前仓库的 simulation-first 风格（权重 + 概率旋钮 + RTP 缩放）。由于缺少官方 PAR sheet，
                触发频率与分布可能与实机存在偏差，但规则与参数口径保持一致，便于后续继续拟合校准。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

