"use client";

import { useState } from "react";
import { Award, Crown, Medal, Trophy } from "lucide-react";
import { motion } from "framer-motion";

type LeaderboardMember = {
  id: string;
  username: string | null;
  level: number;
  xp: number;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
  badges: string[];
  isPremium: boolean;
};

type Benefactor = {
  id: string;
  username: string | null;
  badges: string[];
  total: number;
};

const roleLabels: Record<LeaderboardMember["role"], string> = {
  MEMBER: "Member",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

const rankIcons = [Trophy, Medal, Award] as const;
const royaltyIcons = [Crown, Medal, Award] as const;

// Icon sizes for top-3 — progressively smaller
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

  return (
    <main className="page-shell leaderboard-page">
      <header className="leaderboard-heading">
        <p className="section-kicker">KOMPETISI GUILD</p>
        <h1>Guild <span>Leaderboard</span></h1>
        <p className="muted-copy">Peringkat petualang aktif dan benefactor berdasarkan dukungan terverifikasi.</p>
      </header>

      <div className="leaderboard-tabs" role="tablist" aria-label="Papan peringkat">
        <button type="button" role="tab" aria-selected={activeTab === "adventurers"} className={activeTab === "adventurers" ? "active" : ""} onClick={() => setActiveTab("adventurers")}>⚔️ Petualang Teraktif</button>
        <button type="button" role="tab" aria-selected={activeTab === "benefactors"} className={activeTab === "benefactors" ? "active" : ""} onClick={() => setActiveTab("benefactors")}>💎 Donatur Guild</button>
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
                {members.map((member, index) => {
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
                        {member.username ?? "Gamer"}
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
                {members.length === 0 && (
                  <tr><td className="leaderboard-empty" colSpan={5}>Belum ada data peringkat. XP akan tercatat setelah anggota mulai beraktivitas.</td></tr>
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
                {benefactors.map((member, index) => {
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
                      <td className="leaderboard-player">{member.username ?? "Gamer"}</td>
                      <td className="numeric-cell">{currency.format(member.total)}</td>
                      <td className="badge-cell">
                        <span className="leaderboard-badge donor-tier">{benefactorTier(member.badges)}</span>
                      </td>
                    </motion.tr>
                  );
                })}
                {benefactors.length === 0 && (
                  <tr><td className="leaderboard-empty" colSpan={4}>Belum ada kontribusi terverifikasi yang tercatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </main>
  );
}
