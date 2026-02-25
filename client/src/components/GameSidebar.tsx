/**
 * Game Sidebar - Left navigation for multiple games
 * Light theme, collapsible, with search and category filter
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface GameEntry {
  id: string;
  name: string;
  provider: string;
  icon: string;
  rtp: number;
  volatility: "Low" | "Medium" | "High" | "Very High";
  status: "active" | "coming_soon" | "dev";
  category: string;
}

const GAME_LIST: GameEntry[] = [
  {
    id: "sweet-bonanza-1000",
    name: "Sweet Bonanza 1000",
    provider: "Pragmatic Play",
    icon: "🍬",
    rtp: 96.53,
    volatility: "Very High",
    status: "active",
    category: "Cluster Pays",
  },
  {
    id: "gates-of-olympus-1000",
    name: "Gates of Olympus 1000",
    provider: "Pragmatic Play",
    icon: "⚡",
    rtp: 96.5,
    volatility: "Very High",
    status: "active",
    category: "Cluster Pays",
  },
];

const CATEGORIES = ["All", "Cluster Pays", "Paylines"];

const VOLATILITY_COLOR: Record<string, string> = {
  Low: "text-green-500",
  Medium: "text-blue-500",
  High: "text-orange-500",
  "Very High": "text-red-500",
};

interface GameSidebarProps {
  activeGameId: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelectGame: (id: string) => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  activeGameId,
  collapsed,
  onToggle,
  onSelectGame,
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = GAME_LIST.filter((g) => {
    const matchSearch =
      search === "" ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.provider.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || g.category === category;
    return matchSearch && matchCategory;
  });

  const activeCount = GAME_LIST.filter((g) => g.status === "active").length;
  const totalCount = GAME_LIST.length;

  /* ---- Collapsed mode ---- */
  if (collapsed) {
    return (
      <div className="w-14 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-2 shadow-sm">
        {/* Expand button */}
        <button
          onClick={onToggle}
          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-base"
          title="Expand game list"
        >
          ☰
        </button>

        <div className="w-8 border-t border-slate-200 my-1" />

        {/* Collapsed game icons */}
        <div className="flex-1 overflow-y-auto space-y-1.5 w-full px-2">
          {GAME_LIST.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                if (game.status === "active") onSelectGame(game.id);
              }}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all mx-auto",
                game.id === activeGameId
                  ? "bg-orange-500 shadow-md ring-2 ring-orange-300"
                  : game.status === "active"
                  ? "bg-slate-100 hover:bg-orange-50 cursor-pointer"
                  : "bg-slate-50 opacity-40 cursor-not-allowed"
              )}
              title={`${game.name} (${game.provider})`}
            >
              {game.icon}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="text-[10px] text-slate-400 font-mono">
          {activeCount}/{totalCount}
        </div>
      </div>
    );
  }

  /* ---- Expanded mode ---- */
  return (
    <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎰</span>
            <span className="text-sm font-bold text-slate-800 tracking-wide">Games</span>
          </div>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-400 flex items-center justify-center transition-colors text-xs"
            title="Collapse"
          >
            ◀
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games..."
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
        />

        {/* Category filter */}
        <div className="flex gap-1 mt-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                category === cat
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((game) => {
          const isActive = game.id === activeGameId;
          const isLive = game.status === "active";

          return (
            <button
              key={game.id}
              onClick={() => {
                if (isLive) onSelectGame(game.id);
              }}
              className={cn(
                "w-full text-left rounded-lg p-2.5 transition-all group border",
                isActive
                  ? "bg-orange-50 border-orange-300 shadow-sm"
                  : isLive
                  ? "hover:bg-slate-50 border-transparent cursor-pointer"
                  : "opacity-50 border-transparent cursor-not-allowed"
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Icon */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 border",
                    isActive
                      ? "bg-orange-100 border-orange-300"
                      : "bg-slate-100 border-slate-200 group-hover:bg-orange-50 group-hover:border-orange-200"
                  )}
                >
                  {game.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "text-xs font-semibold truncate",
                        isActive ? "text-orange-600" : "text-slate-700"
                      )}
                    >
                      {game.name}
                    </span>
                    {/* Status badge */}
                    {isLive ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 shrink-0">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                        SOON
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {game.provider}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-500">
                      {game.rtp}%
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        VOLATILITY_COLOR[game.volatility]
                      )}
                    >
                      {game.volatility}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-slate-400 text-xs py-8">
            No games found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>
            <span className="text-green-500 font-bold">{activeCount}</span> live /{" "}
            <span className="text-slate-500">{totalCount}</span> total
          </span>
          <span className="text-slate-300">v0.1.0</span>
        </div>
      </div>
    </div>
  );
};
