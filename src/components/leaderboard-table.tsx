"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Crown, Medal, Search, Trophy, X } from "lucide-react";
import { motion } from "framer-motion";
import type { LeaderboardAdventurer, LeaderboardBenefactor } from "@/types/community";
import { TacticalEmptyState } from "@/components/ui-feedback";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { DailyCheckInWidget } from "@/components/daily-check-in-widget";
import { useLiveSync } from "@/hooks/use-live-sync";

type LeaderboardMember = LeaderboardAdventurer;
type Benefactor = LeaderboardBenefactor;

const roleLabels: Record<LeaderboardMember["role"], string> = {
  MEMBER: "Adventurer",
  MODERATOR: "⚔️ Lord Commander",
  ADMIN: "✨ Prince / Princess",
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
  const [currentMembers, setCurrentMembers] = useState<LeaderboardMember[]>(members);
  const [currentBenefactors, setCurrentBenefactors] = useState<Benefactor[]>(benefactors);

  useLiveSync(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.topXpMembers)) setCurrentMembers(data.topXpMembers);
        if (Array.isArray(data.topBenefactors)) setCurrentBenefactors(data.topBenefactors);
      }
    } catch {
      // Background revalidation silently skips
    }
  }, { intervalMs: 15000, revalidateOnFocus: true });

  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = currentMembers.filter((m) =>
    (m.username ?? "Gamer").toLowerCase().includes(normalizedSearch)
  );
  const filteredBenefactors = currentBenefactors.filter((b) =>
    (b.username ?? "Gamer").toLowerCase().includes(normalizedSearch)
  );

  return (
    <main className="leaderboard-page py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full overflow-x-hidden">
      <header className="leaderboard-heading mb-6 text-left">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">KOMPETISI GUILD</p>
        <h1 className="page-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">Guild <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Leaderboard</span></h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Peringkat petualang aktif dan benefactor berdasarkan dukungan terverifikasi.</p>
      </header>

      {/* DAILY CHECK-IN WIDGET */}
      <DailyCheckInWidget />

      <div className="flex items-center gap-3 px-3.5 h-11 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] focus-within:border-[#9D4EDD] transition-colors mb-4">
        <Search size={16} className="shrink-0 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari petualang atau donatur…"
          aria-label="Cari petualang atau donatur"
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#120F17] border border-gray-200 dark:border-white/5 overflow-x-auto scrollbar-none mb-4" role="tablist" aria-label="Papan peringkat">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "adventurers"}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "adventurers"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("adventurers")}
        >
          <span>⚔️ Top 5 Petualang (XP)</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "benefactors"}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "benefactors"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("benefactors")}
        >
          <span>💎 Donatur Guild</span>
        </button>
      </div>

      <motion.div key={activeTab} className="leaderboard-panel w-full" role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {activeTab === "adventurers" ? (
          <div>
            {/* MOBILE LIST CARDS (< md) */}
            <div className="md:hidden mobile-card-list space-y-2.5">
              {filteredMembers.map((member, index) => {
                const RankIcon = rankIcons[index];
                const iconSize = topIconSizes[index] ?? 16;
                const isOwner = member.username?.toLowerCase() === ".odyssia" || member.username?.toLowerCase() === "odyssia";
                const isUserPremium = member.isPremium || isOwner;
                const badge = isOwner
                  ? "👑 Emperor"
                  : member.role === "ADMIN"
                    ? "✨ Prince / Princess"
                    : member.role === "MODERATOR"
                      ? "⚔️ Lord Commander"
                      : member.badges.length
                        ? member.badges[0].replace("👑 Emperor", "✨ Prince / Princess")
                        : roleLabels[member.role];
                return (
                  <motion.div
                    key={member.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] ${
                      index < 3 ? "border-[#9D4EDD]/40 bg-[#9D4EDD]/5" : ""
                    }`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 9) * 0.035 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-black text-xs">
                        {RankIcon ? <RankIcon size={iconSize} /> : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/u/${member.username ?? "user"}`}
                          className={`block font-bold text-sm truncate hover:text-[#9D4EDD] text-gray-900 dark:text-white ${
                            isUserPremium ? "premium-username text-[#9D4EDD]" : ""
                          }`}
                        >
                          {member.username ?? "Gamer"}
                        </Link>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          Lv. <strong className="text-gray-900 dark:text-gray-200">{member.level}</strong> • {member.xp.toLocaleString("id-ID")} XP
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        {badge}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400 bg-white dark:bg-[#120F17] rounded-lg border border-gray-200 dark:border-[#211C2B]">
                  {search ? `Tidak ada petualang yang cocok dengan "${search}".` : "Belum ada data peringkat petualang."}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE (>= md) */}
            <DragScrollContainer
              buttonPosition="top"
              label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat detail kolom"
              className="hidden md:block desktop-table w-full"
            >
              <div className="leaderboard-table-wrap w-full min-w-[620px]">
                <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col" className="numeric-cell">Level</th>
                    <th scope="col" className="numeric-cell">XP total</th>
                    <th scope="col" className="badge-cell">Kasta / Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => {
                    const RankIcon = rankIcons[index];
                    const iconSize = topIconSizes[index] ?? 16;
                    const isOwner = member.username?.toLowerCase() === ".odyssia" || member.username?.toLowerCase() === "odyssia";
                    const isUserPremium = member.isPremium || isOwner || member.role === "ADMIN";
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
                        <td className={`leaderboard-player${isUserPremium ? " premium-username" : ""}`}>
                          <Link href={`/u/${member.username ?? "user"}`} className="hover:text-[#9D4EDD] hover:underline font-bold">
                            {member.username ?? "Gamer"}
                          </Link>
                        </td>
                        <td className="numeric-cell">{member.level}</td>
                        <td className="numeric-cell">{member.xp.toLocaleString("id-ID")}</td>
                        <td className="badge-cell">
                          <div className="leaderboard-badges">
                            {isOwner ? (
                              <>
                                <span className="leaderboard-badge">👑 Emperor</span>
                                <span className="leaderboard-badge">💎 Noble Patron</span>
                              </>
                            ) : member.role === "ADMIN" ? (
                              <span className="leaderboard-badge">✨ Prince / Princess</span>
                            ) : member.role === "MODERATOR" ? (
                              <span className="leaderboard-badge">⚔️ Lord Commander</span>
                            ) : (
                              (member.badges.length ? member.badges.slice(0, 2) : [roleLabels[member.role]])
                                .map((b) => b.replace("👑 Emperor", "✨ Prince / Princess"))
                                .map((badge) => (
                                  <span className="leaderboard-badge" key={badge}>{badge}</span>
                                ))
                            )}
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
            </DragScrollContainer>
          </div>
        ) : (
          <div>
            {/* MOBILE LIST CARDS FOR BENEFACTORS (< md) */}
            <div className="md:hidden mobile-card-list space-y-2.5">
              {filteredBenefactors.map((member, index) => {
                const RoyaltyIcon = royaltyIcons[index];
                const iconSize = topIconSizes[index] ?? 16;
                const tier = benefactorTier(member.badges);
                return (
                  <motion.div
                    key={member.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] ${
                      index < 3 ? "border-[#9D4EDD]/40 bg-[#9D4EDD]/5" : ""
                    }`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 9) * 0.035 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-black text-xs">
                        {RoyaltyIcon ? <RoyaltyIcon size={iconSize} /> : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/u/${member.username ?? "user"}`}
                          className="block font-bold text-sm truncate hover:text-[#9D4EDD] text-gray-900 dark:text-white"
                        >
                          {member.username ?? "Gamer"}
                        </Link>
                        <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-300 truncate">
                          {currency.format(member.total)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        {tier}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {filteredBenefactors.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400 bg-white dark:bg-[#120F17] rounded-lg border border-gray-200 dark:border-[#211C2B]">
                  {search ? `Tidak ada donatur yang cocok dengan "${search}".` : "Belum ada kontribusi terverifikasi yang tercatat."}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE FOR BENEFACTORS (>= md) */}
            <DragScrollContainer
              buttonPosition="top"
              label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat detail donatur"
              className="hidden md:block desktop-table w-full"
            >
              <div className="leaderboard-table-wrap w-full min-w-[580px]">
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
            </DragScrollContainer>
          </div>
        )}
      </motion.div>
    </main>
  );
}
