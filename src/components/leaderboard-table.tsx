"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Crown, Medal, Search, Trophy, X } from "lucide-react";
import { motion } from "framer-motion";
import type { LeaderboardAdventurer, LeaderboardBenefactor } from "@/types/community";
import { TacticalEmptyState } from "@/components/ui-feedback";

type LeaderboardMember = LeaderboardAdventurer;
type Benefactor = LeaderboardBenefactor;

const roleLabels: Record<LeaderboardMember["role"], string> = {
  MEMBER: "Member",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

const rankIcons = [Trophy, Medal, Award] as const;
const royaltyIcons = [Crown, Medal, Award] as const;

// Icon sizes for top 3: progressively smaller
const topIconSizes = [22, 19, 17] as const;

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function benefactorTier(badges: string[]) {
  if (badges.includes("Noble Patron") || badges.includes("Guild Benefactor")) return "💎 Noble Patron";
  if (badges.includes("High Merchant")) return "👑 High Merchant";
  if (badges.includes("Knight") || badges.includes("Guild Supporter")) return "🛡️ Knight";
  return "Guild Supporter";
}

export function LeaderboardTable({ members, benefactors }: { members: LeaderboardMember[]; benefactors: Benefactor[] }) {
  const [activeTab, setActiveTab] = useState<"adventurers" | "benefactors">("adventurers");
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = members.filter((m) =>
    (m.username ?? "Gamer").toLowerCase().includes(normalizedSearch)
  );
  const filteredBenefactors = benefactors.filter((b) =>
    (b.username ?? "Gamer").toLowerCase().includes(normalizedSearch)
  );

  return (
    <main className="page-shell leaderboard-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <header className="leaderboard-heading mb-6">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">KOMPETISI GUILD</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">Guild <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Leaderboard</span></h1>
        <p className="muted-copy text-base md:text-lg text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">Peringkat petualang aktif dan benefactor berdasarkan dukungan terverifikasi.</p>
      </header>

      <div className="relative flex items-center my-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari petualang atau donatur…"
          aria-label="Cari petualang atau donatur"
          className="w-full pl-11 pr-10 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#9D4EDD]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="leaderboard-tabs relative flex overflow-x-auto scrollbar-none gap-2 border-b border-gray-200 dark:border-[#211C2B] pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Papan peringkat">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "adventurers"}
          className={`relative ${activeTab === "adventurers" ? "active" : ""}`}
          onClick={() => setActiveTab("adventurers")}
        >
          <span>⚔️ Petualang Teraktif</span>
          {activeTab === "adventurers" && (
            <motion.div
              layoutId="activeLeaderboardIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D4EDD]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "benefactors"}
          className={`relative ${activeTab === "benefactors" ? "active" : ""}`}
          onClick={() => setActiveTab("benefactors")}
        >
          <span>💎 Donatur Guild</span>
          {activeTab === "benefactors" && (
            <motion.div
              layoutId="activeLeaderboardIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D4EDD]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      <motion.div key={activeTab} className="leaderboard-panel" role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {activeTab === "adventurers" ? (
          <div className="leaderboard-table-wrap w-full overflow-x-auto scrollbar-none">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Player</th>
                  <th scope="col" className="numeric-cell">Level</th>
                  <th scope="col" className="numeric-cell hidden md:table-cell">XP total</th>
                  <th scope="col" className="badge-cell">Kasta / Badge</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, index) => {
                  const RankIcon = rankIcons[index];
                  const iconSize = topIconSizes[index] ?? 16;
                  return (
                    <motion.tr
                      key={member.id}
                      className={index < 3 ? `adventurer-rank rank-${index + 1}` : ""}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index, 9) * 0.035 }}
                    >
                      <td className="leaderboard-rank">
                        {RankIcon ? <RankIcon aria-label={`Peringkat ${index + 1}`} size={iconSize} /> : `#${index + 1}`}
                      </td>
                      <td className={`leaderboard-player${member.isPremium ? " premium-username" : ""}`}>
                        <Link href={`/u/${member.username ?? "user"}`} className="hover:text-[#9D4EDD] hover:underline font-bold">
                          {member.username ?? "Gamer"}
                        </Link>
                      </td>
                      <td className="numeric-cell">{member.level}</td>
                      <td className="numeric-cell hidden md:table-cell">{member.xp.toLocaleString("id-ID")}</td>
                      <td className="badge-cell">
                        <div className="leaderboard-badges">
                          {(member.badges.length ? member.badges.slice(0, 2) : [roleLabels[member.role]]).map((badge) => (
                            <span className="leaderboard-badge" key={badge}>{badge}</span>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr><td className="leaderboard-empty" colSpan={5}>{search ? `Tidak ada petualang yang cocok dengan "${search}".` : "Belum ada data peringkat. XP akan tercatat setelah anggota mulai beraktivitas."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leaderboard-table-wrap w-full overflow-x-auto scrollbar-none">
            <table className="leaderboard-table benefactor-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Benefactor</th>
                  <th scope="col" className="numeric-cell">Kontribusi</th>
                  <th scope="col" className="badge-cell">Kasta</th>
                </tr>
              </thead>
              <tbody>
                {filteredBenefactors.map((member, index) => {
                  const RoyaltyIcon = royaltyIcons[index];
                  const iconSize = topIconSizes[index] ?? 16;
                  return (
                    <motion.tr
                      key={member.id}
                      className={`benefactor-rank rank-${index + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index, 9) * 0.035 }}
                    >
                      <td className="leaderboard-rank">
                        {RoyaltyIcon ? <RoyaltyIcon aria-label={`Peringkat ${index + 1}`} size={iconSize} /> : `#${index + 1}`}
                      </td>
                      <td className="leaderboard-player font-bold">
                        <Link href={`/u/${member.username ?? "user"}`} className="hover:text-[#9D4EDD] hover:underline">
                          {member.username ?? "Gamer"}
                        </Link>
                      </td>
                      <td className="numeric-cell">{currency.format(member.total)}</td>
                      <td className="badge-cell">
                        <span className="leaderboard-badge donor-tier">{benefactorTier(member.badges)}</span>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredBenefactors.length === 0 && (
                  <tr><td className="leaderboard-empty" colSpan={4}>{search ? `Tidak ada donatur yang cocok dengan "${search}".` : "Belum ada kontribusi terverifikasi yang tercatat."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </main>
  );
}
