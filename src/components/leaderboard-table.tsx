import { Award, Medal, Trophy } from "lucide-react";

type LeaderboardMember = {
  id: string;
  username: string | null;
  level: number;
  xp: number;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
  badges: string[];
};

const roleLabels: Record<LeaderboardMember["role"], string> = {
  MEMBER: "Member",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

const rankIcons = [Trophy, Medal, Award];

export function LeaderboardTable({ members }: { members: LeaderboardMember[] }) {
  return (
    <main className="page-shell leaderboard-page">
      <header className="leaderboard-heading">
        <p className="section-kicker">KOMPETISI GUILD</p>
        <h1>Guild <span>Leaderboard</span></h1>
        <p className="muted-copy">Peringkat anggota berdasarkan level dan XP.</p>
      </header>

      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col" className="numeric-cell">Level</th>
              <th scope="col" className="numeric-cell">XP</th>
              <th scope="col" className="badge-cell">Reputation</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => {
              const RankIcon = rankIcons[index];
              return (
                <tr key={member.id}>
                  <td className="leaderboard-rank">
                    {RankIcon ? <RankIcon aria-label={`Peringkat ${index + 1}`} size={18} /> : `#${index + 1}`}
                  </td>
                  <td className="leaderboard-player">{member.username ?? "Gamer"}</td>
                  <td className="numeric-cell">{member.level}</td>
                  <td className="numeric-cell">{member.xp.toLocaleString("id-ID")}</td>
                  <td className="badge-cell">
                    <div className="leaderboard-badges">
                      {(member.badges.length ? member.badges.slice(0, 2) : [roleLabels[member.role]]).map((badge) => <span className="leaderboard-badge" key={badge}>{badge}</span>)}
                    </div>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr><td className="leaderboard-empty" colSpan={5}>Belum ada data peringkat. XP akan tercatat setelah anggota mulai beraktivitas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
