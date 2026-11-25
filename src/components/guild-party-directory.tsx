"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { openLoginModal } from "@/components/login-modal";
import {
  Users,
  Shield,
  Crown,
  Plus,
  Search,
  MessageSquare,
  Share2,
  Copy,
  Check,
  ChevronRight,
  UserPlus,
  LogOut,
  Trash2,
  Edit3,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";
import { getCustomTitleBadge } from "@/lib/armory-catalog";

export type PartyMember = {
  id: string;
  userId: string;
  role: "LEADER" | "CO_LEADER" | "MEMBER";
  inGameNickname?: string | null;
  inGameId?: string | null;
  joinedAt: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    level: number;
    xp: number;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
  };
};

export type PartyJoinRequest = {
  id: string;
  userId: string;
  message?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    level: number;
    xp: number;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
  };
};

export type GuildParty = {
  id: string;
  name: string;
  tag: string;
  description?: string | null;
  primaryGame: string;
  emblemColor: string;
  maxMembers: number;
  totalPartyXp: number;
  leaderId?: string;
  conversationId?: string | null;
  createdAt: string;
  leader?: {
    id: string;
    username: string | null;
    avatar: string | null;
    level: number;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
  };
  membersCount?: number;
  members?: PartyMember[];
  joinRequests?: PartyJoinRequest[];
  rank?: number;
};

const COMMON_GAMES = [
  "ALL",
  "Valorant",
  "Mobile Legends",
  "Counter-Strike 2",
  "Dota 2",
  "PUBG Mobile",
  "Genshin Impact",
  "Apex Legends",
];

const PRESET_EMBLEM_COLORS = [
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#06B6D4", // Cyan
];

export function GuildPartyDirectory() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitePartyId = searchParams?.get("invite") ?? null;

  const [parties, setParties] = useState<GuildParty[]>([]);
  const [myPartyData, setMyPartyData] = useState<{
    inParty: boolean;
    membership: PartyMember | null;
    party: GuildParty | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"directory" | "leaderboard">("directory");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState<GuildParty | null>(null);
  const [joinMessage, setJoinMessage] = useState("");

  // Create Form State
  const [partyName, setPartyName] = useState("");
  const [partyTag, setPartyTag] = useState("");
  const [primaryGame, setPrimaryGame] = useState("Valorant");
  const [customGame, setCustomGame] = useState("");
  const [description, setDescription] = useState("");
  const [emblemColor, setEmblemColor] = useState("#8B5CF6");
  const [creating, setCreating] = useState(false);

  // Edit My IGN Modal State
  const [editingNickMemberId, setEditingNickMemberId] = useState<string | null>(null);
  const [editNickInput, setEditNickInput] = useState("");
  const [editIdInput, setEditIdInput] = useState("");

  // Copy Feedback
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch Parties & User's My Party
  async function loadData() {
    try {
      const [partiesRes, myPartyRes] = await Promise.all([
        fetch(`/api/parties?game=${selectedGame}&search=${encodeURIComponent(search)}`),
        fetch("/api/parties/my-party"),
      ]);

      const partiesJson = await readApiResponse<{ parties: GuildParty[] }>(partiesRes, "Gagal memuat party");
      setParties(partiesJson.parties || []);

      if (myPartyRes.ok) {
        const myPartyJson = await myPartyRes.json();
        setMyPartyData(myPartyJson);
      }
    } catch (err) {
      console.error("Gagal memuat data guild party:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [selectedGame, search]);

  // Handle direct invite link
  useEffect(() => {
    if (invitePartyId && parties.length > 0) {
      const targetParty = parties.find((p) => p.id === invitePartyId);
      if (targetParty && !myPartyData?.inParty) {
        setShowJoinModal(targetParty);
      }
    }
  }, [invitePartyId, parties, myPartyData]);

  async function handleCreateParty(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setActionFeedback(null);

    const finalGame = primaryGame === "Lainnya" ? customGame.trim() : primaryGame;

    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partyName.trim(),
          tag: partyTag.trim().toUpperCase(),
          primaryGame: finalGame,
          description: description.trim(),
          emblemColor,
        }),
      });

      const data = await readApiResponse<{ party: GuildParty; message: string }>(res, "Gagal membuat party");
      setShowCreateModal(false);
      setActionFeedback({ message: data.message, type: "success" });
      void loadData();
    } catch (err) {
      setActionFeedback({
        message: err instanceof Error ? err.message : "Gagal membuat party.",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleApplyJoin(partyId: string) {
    if (!session?.user) {
      openLoginModal();
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: joinMessage }),
      });
      const data = await readApiResponse<{ message: string }>(res, "Gagal mengajukan bergabung");
      setShowJoinModal(null);
      setJoinMessage("");
      setActionFeedback({ message: data.message, type: "success" });
    } catch (err) {
      setActionFeedback({
        message: err instanceof Error ? err.message : "Gagal mengajukan bergabung.",
        type: "error",
      });
    }
  }

  async function handlePartyAction(action: string, payload: Record<string, unknown> = {}) {
    if (!myPartyData?.party?.id) return;

    try {
      const res = await fetch(`/api/parties/${myPartyData.party.id}/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await readApiResponse<{ message: string }>(res, "Gagal memproses aksi");
      setActionFeedback({ message: data.message, type: "success" });
      setEditingNickMemberId(null);
      void loadData();
    } catch (err) {
      setActionFeedback({
        message: err instanceof Error ? err.message : "Gagal memproses aksi.",
        type: "error",
      });
    }
  }

  async function handleOpenPartyChat(partyId: string) {
    try {
      const res = await fetch(`/api/parties/${partyId}/chat`);
      const data = await readApiResponse<{ conversationId: string }>(res, "Gagal membuka chat party");
      if (data.conversationId) {
        router.push(`/messages?conversationId=${data.conversationId}`);
      }
    } catch (err) {
      setActionFeedback({
        message: err instanceof Error ? err.message : "Gagal membuka chat party.",
        type: "error",
      });
    }
  }

  function copyInviteLink(partyId: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://loghorizon.vercel.app";
    const link = `${origin}/events?view=party&invite=${partyId}`;
    void navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  }

  const isLeader = myPartyData?.membership?.role === "LEADER";
  const isCoLeader = myPartyData?.membership?.role === "CO_LEADER";
  const isOfficer = isLeader || isCoLeader;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1E0D36] via-[#130724] to-[#0A0413] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> GUILD PARTIES &amp; SQUADS
              </span>
              <span className="text-xs text-gray-400 font-mono">Kelompok Kecil Permanen Guild</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Bangun Identitas &amp; Roster Skuadmu
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Bentuk party permanen, kumpulkan Party XP, nikmati ruang obrolan grup eksklusif terintegrasi di Pesan, pasang Tag party di forum &amp; profil, serta daftarkan turnamen dengan 1-klik autofill!
            </p>
          </div>

          {/* Action Button: Create Party or My Party */}
          <div className="shrink-0 flex items-center gap-3">
            {!myPartyData?.inParty ? (
              <button
                type="button"
                onClick={() => {
                  if (!session?.user) {
                    openLoginModal();
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Plus size={16} />
                <span>Bentuk Party Baru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <Shield size={16} />
                <span>Kelola Party Saya</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            actionFeedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          {actionFeedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* MY ACTIVE PARTY CARD (if user belongs to a party) */}
      {myPartyData?.inParty && myPartyData.party && (
        <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/40 bg-[#140A24] shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2A1B42]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0"
                style={{ backgroundColor: myPartyData.party.emblemColor }}
              >
                {myPartyData.party.tag}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white">{myPartyData.party.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono font-bold border border-purple-500/30">
                    [{myPartyData.party.tag}]
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-gray-300 text-xs font-mono">
                    🎮 {myPartyData.party.primaryGame}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20">
                    Peran: {myPartyData.membership?.role}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {myPartyData.party.description || "Markas petualang resmi guild LogHorizon."}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenPartyChat(myPartyData.party!.id)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
              >
                <MessageSquare size={14} />
                <span>Buka Chat Party</span>
              </button>

              <button
                type="button"
                onClick={() => copyInviteLink(myPartyData.party!.id)}
                className="px-3 py-2 rounded-xl border border-[#2A1B42] bg-[#1A0E2E] hover:bg-[#23133D] text-gray-300 text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                {copiedInvite ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedInvite ? "Tersalin!" : "Link Undangan"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="px-3 py-2 rounded-xl border border-[#2A1B42] bg-[#1A0E2E] hover:bg-[#23133D] text-gray-300 text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                <Edit3 size={14} />
                <span>Roster &amp; Pengaturan</span>
              </button>
            </div>
          </div>

          {/* Members Showcase */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-2">
              <span>
                Anggota ({myPartyData.party.members?.length || 0}/{myPartyData.party.maxMembers})
              </span>
              <span className="text-purple-300 font-bold">
                Total Party XP: {myPartyData.party.totalPartyXp.toLocaleString("id-ID")} XP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {myPartyData.party.members?.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl border border-[#2A1B42] bg-[#11071F] flex items-center gap-2 text-xs"
                >
                  <DiscordAvatar
                    src={m.user?.avatar}
                    username={m.user?.username ?? "Member"}
                    size={28}
                    frameId={m.user?.equippedAvatarFrame}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${m.user?.username ?? ""}`} className="font-bold text-gray-200 hover:text-purple-400 hover:underline truncate block">
                      {m.user?.username ?? "Member"}
                    </Link>
                    <p className="text-[10px] text-purple-400 font-mono truncate">
                      {m.inGameNickname || "IGN Belum diisi"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Direktori vs Leaderboard XP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A1B42] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "directory"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Direktori Seluruh Party ({parties.length})
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "leaderboard"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Crown size={14} className="text-amber-400" />
            <span>Top Party XP</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, tag, atau game..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[#2A1B42] bg-[#120822] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-[#2A1B42] bg-[#120822] text-xs text-gray-300 font-mono focus:outline-none"
          >
            {COMMON_GAMES.map((g) => (
              <option key={g} value={g}>
                {g === "ALL" ? "Semua Game" : g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW: DIRECTORY */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parties.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-gray-400 font-mono border border-dashed border-[#2A1B42] rounded-xl">
              Belum ada party yang terdaftar atau cocok dengan pencarian.
            </div>
          ) : (
            parties.map((party) => {
              const isMemberOfThisParty = myPartyData?.party?.id === party.id;
              const isFull = (party.membersCount ?? 0) >= party.maxMembers;

              return (
                <div
                  key={party.id}
                  className="p-5 rounded-2xl border border-[#2A1B42] bg-[#120822] hover:border-purple-500/50 transition-all flex flex-col justify-between gap-4 shadow-lg relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0"
                          style={{ backgroundColor: party.emblemColor }}
                        >
                          {party.tag}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-base leading-snug truncate">
                            {party.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                            <span className="text-purple-400 font-bold">[{party.tag}]</span>
                            <span>•</span>
                            <span className="truncate">{party.primaryGame}</span>
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300">
                        {party.membersCount || 0}/{party.maxMembers}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {party.description || "Tidak ada deskripsi party."}
                    </p>

                    {/* Leader info */}
                    {party.leader && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#2A1B42]/60 text-xs">
                        <span className="text-gray-500 font-mono text-[11px]">Ketua:</span>
                        <DiscordAvatar
                          src={party.leader.avatar}
                          username={party.leader.username}
                          size={18}
                          frameId={party.leader.equippedAvatarFrame}
                        />
                        <Link href={`/u/${party.leader.username}`} className="font-semibold text-gray-300 hover:text-purple-400 hover:underline truncate">
                          {party.leader.username}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#2A1B42] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-purple-300 font-bold">
                      {party.totalPartyXp.toLocaleString("id-ID")} XP
                    </span>

                    {isMemberOfThisParty ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                        Party Kamu
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isFull || myPartyData?.inParty}
                        onClick={() => setShowJoinModal(party)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isFull
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : myPartyData?.inParty
                            ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                            : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                        }`}
                      >
                        {isFull ? "Penuh" : myPartyData?.inParty ? "Sudah Berparty" : "Ajukan Bergabung"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW: LEADERBOARD TOP PARTY XP */}
      {activeTab === "leaderboard" && (
        <div className="p-4 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120822] shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#2A1B42] text-gray-400 font-mono text-[11px] uppercase">
                <th className="pb-3 pl-2">Rank</th>
                <th className="pb-3">Party &amp; Tag</th>
                <th className="pb-3">Game Utama</th>
                <th className="pb-3">Ketua Party</th>
                <th className="pb-3">Anggota</th>
                <th className="pb-3 pr-2 text-right">Total Party XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1B42]/50">
              {parties.map((p, idx) => (
                <tr key={p.id} className="hover:bg-purple-950/20 transition-colors">
                  <td className="py-3.5 pl-2 font-mono font-bold">
                    {idx === 0 ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Crown size={15} /> #1
                      </span>
                    ) : idx === 1 ? (
                      <span className="text-slate-300">#2</span>
                    ) : idx === 2 ? (
                      <span className="text-amber-600">#3</span>
                    ) : (
                      <span className="text-gray-500">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: p.emblemColor }}
                      >
                        {p.tag}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] font-mono text-purple-400">[{p.tag}]</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-gray-300 font-mono text-xs">{p.primaryGame}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <DiscordAvatar
                        src={p.leader?.avatar ?? null}
                        username={p.leader?.username ?? "Leader"}
                        size={20}
                        frameId={p.leader?.equippedAvatarFrame}
                      />
                      {p.leader?.username ? (
                        <Link href={`/u/${p.leader.username}`} className="text-gray-300 hover:text-purple-400 hover:underline">
                          {p.leader.username}
                        </Link>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 text-gray-400 font-mono text-xs">
                    {p.membersCount ?? 0}/{p.maxMembers}
                  </td>
                  <td className="py-3.5 pr-2 text-right font-mono font-bold text-purple-300">
                    {p.totalPartyXp.toLocaleString("id-ID")} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: BUAT PARTY BARU */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-purple-500/40 bg-[#140A24] shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1B42]">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                <span>Bentuk Party Resmi Guild</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-3.5 text-xs">
              <label className="block space-y-1">
                <span className="font-mono text-gray-300 uppercase">Nama Party</span>
                <input
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Contoh: Nightfall Vanguard"
                  maxLength={30}
                  className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white focus:outline-none focus:border-purple-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-mono text-gray-300 uppercase">Tag Party (2–5 Huruf)</span>
                  <input
                    required
                    value={partyTag}
                    onChange={(e) => setPartyTag(e.target.value.toUpperCase())}
                    placeholder="NVG"
                    maxLength={5}
                    className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-gray-300 uppercase">Game Utama</span>
                  <select
                    value={primaryGame}
                    onChange={(e) => setPrimaryGame(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white focus:outline-none"
                  >
                    {COMMON_GAMES.filter((g) => g !== "ALL").map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </label>
              </div>

              {primaryGame === "Lainnya" && (
                <label className="block space-y-1">
                  <span className="font-mono text-gray-300 uppercase">Nama Game Lainnya</span>
                  <input
                    required
                    value={customGame}
                    onChange={(e) => setCustomGame(e.target.value)}
                    placeholder="Ketik nama game..."
                    maxLength={40}
                    className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white focus:outline-none"
                  />
                </label>
              )}

              {/* Color Emblem Picker */}
              <div className="space-y-1">
                <span className="font-mono text-gray-300 uppercase block">Warna Lambang Party</span>
                <div className="flex items-center gap-2">
                  {PRESET_EMBLEM_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEmblemColor(col)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        emblemColor === col ? "scale-110 ring-2 ring-white" : ""
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="font-mono text-gray-300 uppercase">Deskripsi / Visi Party (Opsional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan tujuan, gaya bermain, atau jadwal mabar partymu..."
                  rows={3}
                  maxLength={250}
                  className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/30"
              >
                {creating ? "Membentuk..." : "Resmikan Party Sekarang"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUKAN BERGABUNG PARTY */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowJoinModal(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-purple-500/40 bg-[#140A24] shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1B42]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                  style={{ backgroundColor: showJoinModal.emblemColor }}
                >
                  {showJoinModal.tag}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{showJoinModal.name}</h3>
                  <p className="text-[11px] font-mono text-purple-400">[{showJoinModal.tag}]</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">
                Kamu akan mengirimkan permohonan bergabung kepada Ketua Party{" "}
                <strong className="text-white">{showJoinModal.name}</strong>.
              </p>

              <label className="block space-y-1">
                <span className="font-mono text-gray-400 uppercase">Pesan Pengantar (Opsional)</span>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Contoh: Halo ketua, saya pemain Duelist rank Diamond siap aktif turnamen!"
                  rows={3}
                  maxLength={200}
                  className="w-full p-2.5 rounded-xl border border-[#2A1B42] bg-[#1D0F33] text-white focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => handleApplyJoin(showJoinModal.id)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
              >
                Kirim Permohonan Bergabung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA PARTY SAYA (ROSTER, JOIN REQUESTS, IGN) */}
      {showManageModal && myPartyData?.party && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowManageModal(false)}
        >
          <div
            className="w-full max-w-2xl p-6 rounded-2xl border border-purple-500/40 bg-[#140A24] shadow-2xl relative space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1B42]">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Shield size={18} className="text-purple-400" />
                  <span>Pengaturan &amp; Roster Party</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  [{myPartyData.party.tag}] {myPartyData.party.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pending Requests Section (for Leader / Co-Leader) */}
            {isOfficer && (myPartyData.party.joinRequests?.length ?? 0) > 0 && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <UserPlus size={14} />
                  <span>Permohonan Bergabung Tertunda ({myPartyData.party.joinRequests?.length})</span>
                </h4>

                <div className="space-y-2">
                  {myPartyData.party.joinRequests?.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-[#2A1B42] bg-[#120822] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <DiscordAvatar
                          src={req.user?.avatar}
                          username={req.user?.username ?? "Member"}
                          size={30}
                          frameId={req.user?.equippedAvatarFrame}
                        />
                        <div>
                          <p className="font-bold text-white">{req.user?.username ?? "Member"}</p>
                          <p className="text-[11px] text-gray-400">{req.message || "Ingin bergabung"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePartyAction("APPROVE_REQUEST", { requestId: req.id })}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Terima
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePartyAction("REJECT_REQUEST", { requestId: req.id })}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-bold text-xs"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members Roster Management */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-gray-400">
                Daftar Roster Pemain &amp; ID Game
              </h4>

              <div className="space-y-2">
                {myPartyData.party.members?.map((m) => {
                  const isViewer = m.userId === session?.user?.id;
                  const isEditingThis = editingNickMemberId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-[#2A1B42] bg-[#120822] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <DiscordAvatar
                          src={m.user?.avatar}
                          username={m.user?.username ?? "Member"}
                          size={36}
                          frameId={m.user?.equippedAvatarFrame}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/u/${m.user?.username ?? ""}`} className="font-bold text-white hover:text-purple-400 hover:underline text-sm">
                              {m.user?.username ?? "Member"}
                            </Link>
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                              {m.role}
                            </span>
                            {isViewer && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                                (Kamu)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Nickname Game:{" "}
                            <span className="text-purple-300 font-bold">
                              {m.inGameNickname || "Belum diisi"}
                            </span>{" "}
                            {m.inGameId && <span>(ID: {m.inGameId})</span>}
                          </p>
                        </div>
                      </div>

                      {/* Edit or Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(isViewer || isOfficer) && !isEditingThis && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNickMemberId(m.id);
                              setEditNickInput(m.inGameNickname || "");
                              setEditIdInput(m.inGameId || "");
                            }}
                            className="px-2.5 py-1 rounded border border-[#2A1B42] bg-[#1A0E2E] text-gray-300 hover:text-white text-xs"
                          >
                            Edit IGN
                          </button>
                        )}

                        {isLeader && m.userId !== session?.user?.id && (
                          <>
                            {m.role !== "CO_LEADER" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePartyAction("PROMOTE_CO_LEADER", { targetUserId: m.userId })
                                }
                                className="px-2 py-1 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 text-[11px]"
                              >
                                Jadi Wakil
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePartyAction("DEMOTE_MEMBER", { targetUserId: m.userId })
                                }
                                className="px-2 py-1 rounded bg-zinc-800 text-gray-400 hover:text-white text-[11px]"
                              >
                                Jadi Anggota
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handlePartyAction("KICK_MEMBER", { targetUserId: m.userId })
                              }
                              className="px-2 py-1 rounded bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 text-[11px]"
                            >
                              Keluarkan
                            </button>
                          </>
                        )}
                      </div>

                      {/* Inline Edit Form */}
                      {isEditingThis && (
                        <div className="w-full pt-2 border-t border-[#2A1B42] flex items-center gap-2 flex-wrap">
                          <input
                            value={editNickInput}
                            onChange={(e) => setEditNickInput(e.target.value)}
                            placeholder="Nickname Game (contoh: Odyssia#SEA)"
                            className="p-1.5 rounded border border-[#2A1B42] bg-[#1D0F33] text-xs text-white flex-1"
                          />
                          <input
                            value={editIdInput}
                            onChange={(e) => setEditIdInput(e.target.value)}
                            placeholder="ID Akun Game"
                            className="p-1.5 rounded border border-[#2A1B42] bg-[#1D0F33] text-xs text-white w-28"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handlePartyAction("UPDATE_NICKNAME", {
                                targetUserId: m.userId,
                                inGameNickname: editNickInput,
                                inGameId: editIdInput,
                              })
                            }
                            className="px-3 py-1.5 rounded bg-purple-600 text-white font-bold text-xs"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNickMemberId(null)}
                            className="px-2 py-1.5 text-xs text-gray-400"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave / Disband Party */}
            <div className="pt-4 border-t border-[#2A1B42] flex items-center justify-between">
              <span className="text-[11px] font-mono text-gray-500">
                {isLeader ? "Ketua Party Utama" : "Anggota Party"}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Apakah kamu yakin ingin keluar dari party ini?")) {
                    void handlePartyAction("LEAVE_PARTY");
                    setShowManageModal(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-900/30 text-xs font-bold flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>{isLeader ? "Bubarkan / Keluar Party" : "Keluar dari Party"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
