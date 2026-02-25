/**
 * Gates of Olympus 1000 - Paytable & Rules
 * 只用于展示官方规则，不改变当前模拟引擎的数学模型。
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "paytable" | "rules" | "math";

interface OlympusSymbol {
  id: string;
  name: string;
  shape: string;
  color: string;
  pays: {
    "12+": number;
    "10-11": number;
    "8-9": number;
  };
}

// 数值基于 Pragmatic 公开说明与实机截图，单位为倍数（× 总投注）
const OLYMPUS_SYMBOLS: OlympusSymbol[] = [
  {
    id: "crown",
    name: "Crown",
    shape: "👑",
    color: "#facc15",
    pays: { "12+": 50, "10-11": 25, "8-9": 10 },
  },
  {
    id: "hourglass",
    name: "Hourglass",
    shape: "⌛",
    color: "#f97316",
    pays: { "12+": 25, "10-11": 10, "8-9": 2.5 },
  },
  {
    id: "ring",
    name: "Ring",
    shape: "💍",
    color: "#eab308",
    pays: { "12+": 15, "10-11": 5, "8-9": 2 },
  },
  {
    id: "chalice",
    name: "Chalice",
    shape: "🏆",
    color: "#22c55e",
    pays: { "12+": 12, "10-11": 2, "8-9": 1.5 },
  },
  {
    id: "red-gem",
    name: "Red Gem",
    shape: "♦",
    color: "#ef4444",
    pays: { "12+": 10, "10-11": 1.5, "8-9": 1 },
  },
  {
    id: "purple-gem",
    name: "Purple Gem",
    shape: "⬢",
    color: "#a855f7",
    pays: { "12+": 8, "10-11": 1.2, "8-9": 0.8 },
  },
  {
    id: "yellow-gem",
    name: "Yellow Gem",
    shape: "⬡",
    color: "#facc15",
    pays: { "12+": 5, "10-11": 1, "8-9": 0.5 },
  },
  {
    id: "green-gem",
    name: "Green Gem",
    shape: "⬢",
    color: "#22c55e",
    pays: { "12+": 4, "10-11": 0.9, "8-9": 0.4 },
  },
  {
    id: "blue-gem",
    name: "Blue Gem",
    shape: "⬢",
    color: "#3b82f6",
    pays: { "12+": 2, "10-11": 0.75, "8-9": 0.25 },
  },
];

export const PaytableOlympus: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("paytable");

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
        {/* Paytable */}
        {activeTab === "paytable" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              符号采用“任意位置支付 / Scatter Pays”机制：
              <span className="font-semibold text-slate-700"> 同一符号在 6×5 网格上出现 8 个或以上即中奖</span>，
              赔付为表中倍数乘以总下注。
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 border border-slate-200">Symbol</th>
                    <th className="text-center p-2 border border-slate-200">12 – 30</th>
                    <th className="text-center p-2 border border-slate-200">10 – 11</th>
                    <th className="text-center p-2 border border-slate-200">8 – 9</th>
                  </tr>
                </thead>
                <tbody>
                  {OLYMPUS_SYMBOLS.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center bg-white">
                            <span className="text-lg" style={{ color: s.color }}>
                              {s.shape}
                            </span>
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{s.name}</span>
                        </div>
                      </td>
                      {["12+", "10-11", "8-9"].map((tier) => (
                        <td
                          key={tier}
                          className="p-2 border border-slate-200 text-center font-mono"
                        >
                          <span
                            className={cn(
                              "text-xs font-bold",
                              s.pays[tier as keyof OlympusSymbol["pays"]] >= 25
                                ? "text-amber-600"
                                : s.pays[tier as keyof OlympusSymbol["pays"]] >= 10
                                ? "text-orange-500"
                                : s.pays[tier as keyof OlympusSymbol["pays"]] >= 2
                                ? "text-green-600"
                                : "text-slate-600",
                            )}
                          >
                            {s.pays[tier as keyof OlympusSymbol["pays"]]}x
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Scatter row */}
                  <tr className="bg-purple-50">
                    <td className="p-2 border border-slate-200 font-medium text-purple-700">
                      🧙 Zeus Scatter
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      6 = 100x
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      5 = 5x
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">
                      4 = 3x
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
              以上数值来自 Pragmatic Play 官方规则，仅用于展示真实游戏的赔付结构。
              当前本地模拟仍沿用 Sweet Bonanza 1000 的数学模型，用于教学和可视化用途。
            </div>
          </div>
        )}

        {/* Rules */}
        {activeTab === "rules" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">基本规则</h4>
              <p>• 6 列 × 5 行，共 30 个格子。</p>
              <p>• 无赔付线，符号 “任意位置支付”（Scatter Pays）。</p>
              <p>• 同一符号出现 <span className="font-semibold text-emerald-700">8 个或以上</span> 即中奖。</p>
              <p>• 赔付 = 表格倍数 × 总下注。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">Tumble（滚落）功能</h4>
              <p>• 每次结算中奖后，中奖符号会消失。</p>
              <p>• 其上方符号下落填补空位，顶部再生成新符号。</p>
              <p>• 只要新的中奖组合出现，就会继续滚落。</p>
              <p>• 单次旋转中的滚落次数没有上限。</p>
              <p>• 单轮所有滚落结束后，再将本轮总赢分加入余额。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-amber-600 font-bold text-sm">倍数符号（Multiplier Symbols）</h4>
              <p>• 倍数球可在基础游戏和免费旋转中随机出现。</p>
              <p>• 每个倍数球随机取值 <span className="font-semibold text-amber-700">2x – 1000x</span>。</p>
              <p>• 一次滚落序列结束时，画面上所有倍数球的数值会相加。</p>
              <p>• 本轮总赢将乘以这个合计倍数。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-purple-600 font-bold text-sm">免费旋转规则（Free Spins）</h4>
              <p>• 任意位置出现 4/5/6 个 Zeus Scatter 触发免费旋转功能。</p>
              <p>• 触发时立即支付 3x / 5x / 100x 总下注。</p>
              <p>• 免费局起始给予 <span className="font-semibold text-purple-700">15 次免费旋转</span>。</p>
              <p>• 免费局中再次出现 ≥3 个 Scatter，追加 <span className="font-semibold">+5 次</span> 免费旋转。</p>
              <p>• 免费局有一个“累积总倍数”，每当有倍数球参与中奖，其数值会加入总倍数。</p>
              <p>• 之后任意一次中奖 + 倍数球时，都会先把该轮倍数球值与累积总倍数相加，再乘以本轮中奖金额。</p>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-green-600 font-bold text-sm">Ante Bet / Buy Free Spins</h4>
              <p>• <span className="font-semibold">Ante Bet（前注）</span>：下注额 +25%，Scatter 出现频率提高；免费购买功能关闭。</p>
              <p>• <span className="font-semibold">Buy Free Spins</span>：支付 <span className="font-semibold text-emerald-700">100x 总下注</span>，直接触发免费旋转（至少 4 个 Scatter）。</p>
            </div>
          </div>
        )}

        {/* Math notes */}
        {activeTab === "math" && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-emerald-600 font-bold text-sm">核心参数（官方说明）</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  理论 RTP：
                  <span className="font-semibold text-green-700"> 96.50% </span>
                  （基础游戏 & Ante Bet）
                </li>
                <li>
                  使用 Buy Free Spins 功能时的 RTP：
                  <span className="font-semibold text-green-700"> 96.49%</span>
                </li>
                <li>
                  波动率：<span className="font-semibold text-red-600">高波动（High）</span>
                </li>
                <li>
                  最大单次赢取：
                  <span className="font-semibold text-amber-600"> 15,000x 总下注</span>
                </li>
                <li>官方表中 Hit Frequency 约为 28.57%（约每 3.5 转中一次任意赢分）。</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
              <h4 className="text-blue-600 font-bold text-sm">与本项目模拟的关系</h4>
              <p className="text-xs text-slate-600">
                当前代码层面的数学引擎仍以 Sweet Bonanza 1000 为基础，只在 UI 与规则文案上适配 Gates of
                Olympus 1000。
                如果你后续需要<strong>完全 1:1 复刻</strong> Gates of Olympus 1000 的数学模型，可以在此基础上：
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs mt-1">
                <li>为 Gates of Olympus 1000 单独实现符号权重与赔付表（SYMBOLS / pays）。</li>
                <li>复用现有 tumble / multiplier / free spins 框架，只替换常量与分布。</li>
                <li>使用现有 Monte Carlo 模拟工具跑长距离模拟（≥ 1,000,000 spins）校验实际 RTP。</li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded p-2 space-y-1 border border-emerald-200">
              <h4 className="text-emerald-700 font-bold text-sm">期望值直觉</h4>
              <p className="text-xs text-slate-600">
                以官方默认 RTP 96.50% 为例，长期来看每下注 100 单位，期望返还 96.5 单位，期望损失 3.5 单位。
                高波动意味着实际结果会在短期内大幅偏离这一平均值，更多依赖于免费旋转与高倍数球的叠加。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

