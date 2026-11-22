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
        if (Array.isArray(data.topXpMembers)) {
          setCurrentMembers((prev) => (JSON.stringify(prev) === JSON.stringify(data.topXpMembers) ? prev : data.topXpMembers));
        }
        if (Array.isArray(data.topBenefactors)) {
          setCurrentBenefactors((prev) => (JSON.stringify(prev) === JSON.stringify(data.topBenefactors) ? prev : data.topBenefactors));
        }
      }
    } catch {
      // Background revalidation silently skips
    }
  }, { intervalMs: 15000, revalidateOnFocus: true });

  const isHuman = (name?: string | null) => {
    const n = (name ?? "").toLowerCase();
    return n !== "satpam-horizon" && n !== "satpam horizon" && !n.includes("satpam");
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = currentMembers
    .filter((m) => isHuman(m.username))
    .filter((m) => (m.username ?? "Gamer").toLowerCase().includes(normalizedSearch));
  const filteredBenefactors = currentBenefactors
    .filter((b) => isHuman(b.username))
    .filter((b) => (b.username ?? "Gamer").toLowerCase().includes(normalizedSearch));

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <header className="leaderboard-heading mb-6 text-left border-b border-slate-200 dark:border-[#2E1E45] pb-6">
        <p className="section-kicker text-xs font-mono font-bold text-slate-600 dark:text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
          KOMPETISI GUILD // LEADERBOARD
        </p>
        <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] break-words">
          GUILD <span className="text-purple-600 dark:text-[#A78BFA]">LEADERBOARD</span>
        </h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-slate-600 dark:text-[#A78BFA] mt-1.5 leading-relaxed font-sans">
          Peringkat petualang aktif dan benefactor berdasarkan level, XP, dan kontribusi kas guild.
        </p>
      </header>

      {/* DAILY CHECK-IN WIDGET */}
      <DailyCheckInWidget />

      <div className="flex items-center gap-3 px-3.5 h-11 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] focus-within:border-[#7C3AED] transition-colors mb-4">
        <Search size={16} className="shrink-0 text-slate-500 dark:text-[#A78BFA] pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari petualang atau donatur…"
          aria-label="Cari petualang atau donatur"
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 p-0 font-sans"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="shrink-0 text-slate-500 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] font-mono text-xs uppercase"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-none bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] overflow-x-auto scrollbar-none mb-6" role="tablist" aria-label="Papan peringkat">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "adventurers"}
          className={`px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
            activeTab === "adventurers"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
              : "bg-white dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
          }`}
          onClick={() => setActiveTab("adventurers")}
        >
          <span>⚔️ TOP PETUALANG (XP)</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "benefactors"}
          className={`px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-2 border ${
            activeTab === "benefactors"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
              : "bg-white dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
          }`}
          onClick={() => setActiveTab("benefactors")}
        >
          <span>💎 DONATUR GUILD (KAS)</span>
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
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] ${
                      index < 3 ? "border-l-4 border-l-[#7C3AED]" : ""
                    }`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 9) * 0.035 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-none flex items-center justify-center shrink-0 bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-purple-600 dark:text-[#A78BFA] font-mono font-bold text-xs">
                        {RankIcon ? <RankIcon size={iconSize} /> : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/u/${member.username ?? "user"}`}
                            className={`block font-bold text-sm truncate hover:text-purple-600 dark:hover:text-[#A78BFA] text-slate-900 dark:text-[#F8FAFC] ${
                              isUserPremium ? "premium-username text-[#A78BFA]" : ""
                            }`}
                          >
                            {member.username ?? "Gamer"}
                          </Link>
                          {member.partyTag && (
                            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              [{member.partyTag}]
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-[#A78BFA] truncate">
                          Lv. <strong className="text-slate-900 dark:text-[#F8FAFC]">{member.level}</strong> • {member.xp.toLocaleString("id-ID")} XP
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="whitespace-nowrap px-2.5 py-1 text-[10px] font-mono font-bold rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30">
                        {badge}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-xs font-mono text-slate-500 dark:text-[#A78BFA] bg-white dark:bg-[#130921] rounded-none border border-slate-200 dark:border-[#2E1E45]">
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
              <div className="leaderboard-table-wrap w-full min-w-[620px] rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                <table className="leaderboard-table w-full text-left">
                <thead className="bg-slate-100 dark:bg-[#1A0E2E] border-b border-slate-200 dark:border-[#2E1E45] font-mono text-xs text-slate-700 dark:text-[#A78BFA] uppercase">
                  <tr>
                    <th scope="col" className="p-3">Rank</th>
                    <th scope="col" className="p-3">Player</th>
                    <th scope="col" className="p-3 text-right">Level</th>
                    <th scope="col" className="p-3 text-right">XP Total</th>
                    <th scope="col" className="p-3 text-right">Kasta / Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2E1E45] font-mono text-xs">
                  {filteredMembers.map((member, index) => {
                    const RankIcon = rankIcons[index];
                    const iconSize = topIconSizes[index] ?? 16;
                    const isOwner = member.username?.toLowerCase() === ".odyssia" || member.username?.toLowerCase() === "odyssia";
                    const isUserPremium = member.isPremium || isOwner || member.role === "ADMIN";
                    return (
                      <motion.tr
                        key={member.id}
                        className={`hover:bg-slate-50 dark:hover:bg-[#1A0E2E]/50 transition-colors ${index < 3 ? "bg-purple-500/5 dark:bg-[#7C3AED]/5" : ""}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index, 9) * 0.035 }}
                      >
                        <td className="p-3 font-bold text-slate-600 dark:text-[#A78BFA]">
                          {RankIcon ? <RankIcon aria-label={`Peringkat ${index + 1}`} size={iconSize} className="inline text-[#F59E0B]" /> : `#${index + 1}`}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/u/${member.username ?? "user"}`} className={`hover:text-purple-600 dark:hover:text-[#A78BFA] font-bold ${isUserPremium ? "premium-username" : "text-slate-900 dark:text-[#F8FAFC]"}`}>
                              {member.username ?? "Gamer"}
                            </Link>
                            {member.partyTag && (
                              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                [{member.partyTag}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">{member.level}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-[#A78BFA]">{member.xp.toLocaleString("id-ID")}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isOwner ? (
                              <>
                                <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">👑 Emperor</span>
                                <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30">💎 Noble Patron</span>
                              </>
                            ) : member.role === "ADMIN" ? (
                              <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30">✨ Prince / Princess</span>
                            ) : member.role === "MODERATOR" ? (
                              <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">⚔️ Lord Commander</span>
                            ) : (
                              (member.badges.length ? member.badges.slice(0, 2) : [roleLabels[member.role]])
                                .map((b) => b.replace("👑 Emperor", "✨ Prince / Princess"))
                                .map((badge) => (
                                  <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-slate-100 dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]" key={badge}>{badge}</span>
                                ))
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr><td className="p-8 text-center text-xs font-mono text-slate-500 dark:text-[#A78BFA]" colSpan={5}>{search ? `Tidak ada petualang yang cocok dengan "${search}".` : "Belum ada data peringkat. XP akan tercatat setelah anggota mulai beraktivitas."}</td></tr>
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
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] ${
                      index < 3 ? "border-l-4 border-l-[#7C3AED]" : ""
                    }`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 9) * 0.035 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-none flex items-center justify-center shrink-0 bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-purple-600 dark:text-[#A78BFA] font-mono font-bold text-xs">
                        {RoyaltyIcon ? <RoyaltyIcon size={iconSize} /> : `#${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/u/${member.username ?? "user"}`}
                          className="block font-bold text-sm truncate hover:text-purple-600 dark:hover:text-[#A78BFA] text-slate-900 dark:text-[#F8FAFC]"
                        >
                          {member.username ?? "Gamer"}
                        </Link>
                        <p className="text-[11px] font-mono font-bold text-[#10B981] truncate">
                          {currency.format(member.total)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="whitespace-nowrap px-2.5 py-1 text-[10px] font-mono font-bold rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30">
                        {tier}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {filteredBenefactors.length === 0 && (
                <div className="p-8 text-center text-xs font-mono text-slate-500 dark:text-[#A78BFA] bg-white dark:bg-[#130921] rounded-none border border-slate-200 dark:border-[#2E1E45]">
                  {search ? `Tidak ada donatur yang cocok dengan "${search}".` : "Belum ada riwayat donasi terverifikasi."}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE FOR BENEFACTORS (>= md) */}
            <DragScrollContainer
              buttonPosition="top"
              label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat detail kolom"
              className="hidden md:block desktop-table w-full"
            >
              <div className="leaderboard-table-wrap w-full min-w-[620px] rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                <table className="leaderboard-table w-full text-left">
                  <thead className="bg-slate-100 dark:bg-[#1A0E2E] border-b border-slate-200 dark:border-[#2E1E45] font-mono text-xs text-slate-700 dark:text-[#A78BFA] uppercase">
                    <tr>
                      <th scope="col" className="p-3">Rank</th>
                      <th scope="col" className="p-3">Player</th>
                      <th scope="col" className="p-3 text-right">Total Donasi</th>
                      <th scope="col" className="p-3 text-right">Gelar / Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2E1E45] font-mono text-xs">
                    {filteredBenefactors.map((member, index) => {
                      const RoyaltyIcon = royaltyIcons[index];
                      const iconSize = topIconSizes[index] ?? 16;
                      const tier = benefactorTier(member.badges);
                      return (
                        <motion.tr
                          key={member.id}
                          className={`hover:bg-slate-50 dark:hover:bg-[#1A0E2E]/50 transition-colors ${index < 3 ? "bg-purple-500/5 dark:bg-[#7C3AED]/5" : ""}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(index, 9) * 0.035 }}
                        >
                          <td className="p-3 font-bold text-slate-600 dark:text-[#A78BFA]">
                            {RoyaltyIcon ? <RoyaltyIcon aria-label={`Peringkat ${index + 1}`} size={iconSize} className="inline text-[#F59E0B]" /> : `#${index + 1}`}
                          </td>
                          <td className="p-3">
                            <Link href={`/u/${member.username ?? "user"}`} className="hover:text-purple-600 dark:hover:text-[#A78BFA] font-bold text-slate-900 dark:text-[#F8FAFC]">
                              {member.username ?? "Gamer"}
                            </Link>
                          </td>
                          <td className="p-3 text-right font-bold text-[#10B981]">{currency.format(member.total)}</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded-none font-mono text-[10px] font-bold bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30">
                              {tier}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {filteredBenefactors.length === 0 && (
                      <tr><td className="p-8 text-center text-xs font-mono text-slate-500 dark:text-[#A78BFA]" colSpan={4}>{search ? `Tidak ada donatur yang cocok dengan "${search}".` : "Belum ada donatur terverifikasi."}</td></tr>
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
