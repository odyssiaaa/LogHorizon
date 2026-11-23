"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShieldAlert,
  Flame,
  Search,
  Plus,
  AlertTriangle,
  Lock,
  Skull,
  Eye,
  MessageSquare,
  ExternalLink,
  Coins,
  CheckCircle2,
  Clock,
  Filter,
  X,
  FileText,
  Upload,
  UserX,
  Shield,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { DiscordAvatar } from "@/components/discord-avatar";
import { readApiResponse } from "@/lib/api-response";
import { DraggableScrollRow } from "@/components/draggable-scroll-row";

export type ImprisonedRecord = {
  id: string;
  type: "MEMBER_BAN" | "BOUNTY_IMPRISONED";
  targetName: string;
  avatar: string | null;
  category: string;
  level: number;
  role: string;
  crimeDescription: string;
  verdictDate: string;
  bountyReward?: string | null;
  approvedBy?: string;
  reviewNote?: string | null;
  badges?: string[];
};

export type BountyRecord = {
  id: string;
  targetName: string;
  category: string;
  crimeDescription: string;
  evidenceImage: string | null;
  bountyReward: string | null;
  status: "WANTED_ACTIVE" | "CAPTURED" | "PENDING_REVIEW" | "REJECTED" | "IMPRISONED";
  createdAt: string;
  updatedAt: string;
  submittedBy?: { id: string; username: string | null };
  approvedBy?: { username: string | null; role: string };
};

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: string; badgeClass: string; borderClass: string }
> = {
  SCAM_TRANSAKSI: {
    label: "Penipuan Transaksi / Rekber",
    icon: "🚨",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    borderClass: "border-rose-500/40",
  },
  CHEAT_TURNAMEN: {
    label: "Cheat / Exploit Turnamen",
    icon: "⚔️",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    borderClass: "border-red-500/40",
  },
  TOXIC_BERAT: {
    label: "Toxic Ekstrem / SARA",
    icon: "☣️",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    borderClass: "border-purple-500/40",
  },
  BURONAN_GUILD: {
    label: "Buronan Khusus Guild",
    icon: "🚩",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderClass: "border-amber-500/40",
  },
  PELANGGARAN_BERAT: {
    label: "Sanksi Pelanggaran Berat",
    icon: "⛓️",
    badgeClass: "bg-rose-600/15 text-rose-400 border-rose-600/30",
    borderClass: "border-rose-600/40",
  },
};

export function DungeonBoard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"IMPRISONED" | "WANTED">("IMPRISONED");
  const [bountySubFilter, setBountySubFilter] = useState<"ACTIVE" | "CAPTURED" | "ALL">("ACTIVE");
  const [imprisonedList, setImprisonedList] = useState<ImprisonedRecord[]>([]);
  const [bountiesList, setBountiesList] = useState<BountyRecord[]>([]);
  const [stats, setStats] = useState({ totalImprisoned: 0, activeBounties: 0, totalCaptured: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modal states
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState<BountyRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form state
  const [formTargetName, setFormTargetName] = useState("");
  const [formCategory, setFormCategory] = useState("SCAM_TRANSAKSI");
  const [formDescription, setFormDescription] = useState("");
  const [formReward, setFormReward] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  async function fetchDungeonData() {
    try {
      const res = await fetch("/api/dungeon");
      const data = await readApiResponse<{
        success: boolean;
        stats: { totalImprisoned: number; activeBounties: number; totalCaptured: number };
        imprisoned: ImprisonedRecord[];
        bounties: BountyRecord[];
      }>(res, "Gagal memuat data penjara");

      setImprisonedList(data.imprisoned || []);
      setBountiesList(data.bounties || []);
      setStats(data.stats || { totalImprisoned: 0, activeBounties: 0, totalCaptured: 0 });
    } catch (err) {
      console.error("[dungeon] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDungeonData();
  }, []);

  async function handleSubmitBounty(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      setFormFeedback({ message: "Silakan login terlebih dahulu untuk mengajukan laporan.", type: "error" });
      return;
    }

    const userLevel = (session?.user as any)?.level ?? 1;
    const userDiscord = (session?.user as any)?.discordId;
    if (userLevel < 2 && !userDiscord) {
      setFormFeedback({
        message: "Akun minimal Level 2 atau terverifikasi akun Discord untuk mengajukan laporan buronan guna mencegah laporan palsu/spam.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    setFormFeedback(null);

    try {
      const res = await fetch("/api/dungeon/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: formTargetName,
          category: formCategory,
          crimeDescription: formDescription,
          bountyReward: formReward || null,
          evidenceImage: formImage || null,
        }),
      });

      const resData = await readApiResponse<{ success: boolean; message: string }>(
        res,
        "Gagal mengajukan laporan buronan"
      );

      setFormFeedback({ message: resData.message, type: "success" });
      setFormTargetName("");
      setFormDescription("");
      setFormReward("");
      setFormImage(null);

      setTimeout(() => {
        setSubmitModalOpen(false);
        setFormFeedback(null);
        void fetchDungeonData();
      }, 3000);
    } catch (err) {
      setFormFeedback({
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengajukan laporan.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered lists
  const filteredImprisoned = useMemo(() => {
    return imprisonedList.filter((item) => {
      const matchQuery =
        !searchQuery ||
        item.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.crimeDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchQuery && matchCategory;
    });
  }, [imprisonedList, searchQuery, selectedCategory]);

  const activeWantedList = useMemo(() => {
    return bountiesList.filter((b) => b.status === "WANTED_ACTIVE");
  }, [bountiesList]);

  const capturedList = useMemo(() => {
    return bountiesList.filter((b) => b.status === "CAPTURED");
  }, [bountiesList]);

  const displayedBounties = useMemo(() => {
    let source = bountiesList;
    if (bountySubFilter === "ACTIVE") {
      source = activeWantedList;
    } else if (bountySubFilter === "CAPTURED") {
      source = capturedList;
    }
    return source.filter((item) => {
      const matchQuery =
        !searchQuery ||
        item.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.crimeDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchQuery && matchCategory;
    });
  }, [bountiesList, bountySubFilter, activeWantedList, capturedList, searchQuery, selectedCategory]);

  return (
    <div className="space-y-8 min-w-0">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: ROYAL DUNGEON & WANTED BOUNTY BOARD                       */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl border-2 border-rose-900/50 bg-gradient-to-br from-[#1A0A1C] via-[#120516] to-[#0A020E] p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Atmosphere glowing effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Skull size={13} className="text-rose-400" /> ROYAL CITADEL DUNGEON
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Flame size={13} className="text-amber-400" /> WANTED BOUNTY BOARD
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Papan Buronan &amp; Sel Tahanan Guild</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Efek jera sosial &amp; daftar hitam terpidana penipuan (<em className="italic text-rose-300 font-semibold">scammer</em>), manipulasi turnamen, dan pelanggaran berat di LogHorizon. Laporkan pelaku untuk diblacklist permanen atau klaim hadiah bounty bagi pembawa informasi valid!
            </p>
          </div>

          {/* Quick Stats & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl border border-rose-950 bg-[#0F0413]/80 backdrop-blur-md text-center">
              <div className="px-2">
                <p className="text-[10px] font-mono text-gray-400 uppercase">Tahanan</p>
                <p className="text-lg sm:text-xl font-black text-rose-400 font-mono">
                  {stats.totalImprisoned}
                </p>
              </div>
              <div className="px-2 border-x border-rose-900/30">
                <p className="text-[10px] font-mono text-gray-400 uppercase">Buronan</p>
                <p className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                  {stats.activeBounties}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[10px] font-mono text-gray-400 uppercase">Tertangkap</p>
                <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                  {stats.totalCaptured}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 shrink-0 border border-rose-400/40"
            >
              <Plus size={16} />
              <span>Ajukan Buronan / Bounty</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB CONTROLS & SEARCH BAR (SEPARATED ROWS - ANTI-CLIPPING)             */}
      {/* ========================================================================= */}
      <div className="space-y-3 pb-3 border-b border-[#2A153A]">
        {/* Baris 1: Tab Utama (Sel Tahanan & Papan Buronan) Full Width Draggable */}
        <DraggableScrollRow className="w-full pb-1">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("IMPRISONED")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border whitespace-nowrap cursor-pointer ${
                activeTab === "IMPRISONED"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500 shadow-md shadow-rose-900/20"
                  : "border-[#2A153A] bg-[#120516] text-gray-400 hover:text-white"
              }`}
            >
              <Lock size={14} className={activeTab === "IMPRISONED" ? "text-rose-400" : "text-gray-500"} />
              <span>⛓️ Sel Tahanan (Banned Permanen) ({imprisonedList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("WANTED")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border whitespace-nowrap cursor-pointer ${
                activeTab === "WANTED"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-900/20"
                  : "border-[#2A153A] bg-[#120516] text-gray-400 hover:text-white"
              }`}
            >
              <Flame size={14} className={activeTab === "WANTED" ? "text-amber-400" : "text-gray-500"} />
              <span>🎯 Papan Buronan &amp; Bounty (WANTED) ({activeWantedList.length})</span>
            </button>
          </div>
        </DraggableScrollRow>

        {/* Baris 2: Kotak Pencarian Pelaku + Filter Kasus (+ Subfilter jika WANTED) */}
        <div className={`grid grid-cols-1 ${activeTab === "WANTED" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3 w-full`}>
          <div className="relative w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama pelaku, nomor rekening, kontak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-[#2A153A] bg-[#120516] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {activeTab === "WANTED" && (
            <select
              value={bountySubFilter}
              onChange={(e) => setBountySubFilter(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-amber-900/40 bg-[#120516] text-amber-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ACTIVE">🎯 Buronan Aktif ({activeWantedList.length})</option>
              <option value="CAPTURED">🏆 Tertangkap ({capturedList.length})</option>
              <option value="ALL">Semua Poster ({bountiesList.length})</option>
            </select>
          )}

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#2A153A] bg-[#120516] text-white text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="ALL">Semua Kasus</option>
            <option value="SCAM_TRANSAKSI">🚨 Penipuan Transaksi</option>
            <option value="CHEAT_TURNAMEN">⚔️ Cheat Turnamen</option>
            <option value="TOXIC_BERAT">☣️ Toxic Ekstrem</option>
            <option value="BURONAN_GUILD">🚩 Buronan Guild</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB CONTENT                                                            */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-gray-400">Memeriksa catatan sipil &amp; jeruji penjara...</p>
        </div>
      ) : activeTab === "IMPRISONED" ? (
        /* ================= TAB 1: SEL TAHANAN PERMANEN ================= */
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 text-xs text-rose-300 flex items-start gap-3">
            <Lock size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ketetapan Hukum Royal Dungeon:</p>
              <p className="text-gray-400 mt-0.5">
                Semua entri di bawah ini telah dijatuhi sanksi hukuman penjara permanen (<em className="italic text-rose-300 font-semibold">Permanent Blacklist</em>). Akun yang terdaftar dilarang keras melakukan transaksi Rekber, dilarang mendaftar turnamen, dan dikucilkan dari seluruh ruang interaksi LogHorizon.
              </p>
            </div>
          </div>

          {filteredImprisoned.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-[#2A153A] bg-[#100414] p-8 space-y-2">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Sel Tahanan Bersih</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Tidak ada terpidana yang cocok dengan filter pencarian ini. Ketertiban komunitas saat ini terjaga kondusif.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredImprisoned.map((item) => {
                const catMeta = CATEGORY_MAP[item.category] || CATEGORY_MAP.PELANGGARAN_BERAT;
                return (
                  <div
                    key={item.id}
                    className="relative rounded-2xl border-2 border-rose-500/40 bg-[#11091D] overflow-hidden shadow-xl flex flex-col justify-between"
                  >
                    {/* Visual prison bars simulation */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(to_right,#ffffff_2px,transparent_2px)] bg-[size:28px_100%]" />

                    {/* Red BANNED stamp overlay */}
                    <div className="absolute top-4 right-4 rotate-12 pointer-events-none z-10">
                      <span className="px-2.5 py-1 rounded border-2 border-rose-600 text-rose-500 font-mono font-black text-xs uppercase tracking-widest bg-rose-950/80 shadow-md">
                        IMPRISONED
                      </span>
                    </div>

                    <div className="p-5 space-y-4 relative z-0">
                      {/* Suspect Header */}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {item.type === "MEMBER_BAN" ? (
                            <DiscordAvatar
                              src={item.avatar}
                              username={item.targetName}
                              size={52}
                              className="rounded-xl grayscale border-2 border-rose-500/50"
                            />
                          ) : (
                            <div className="w-[52px] h-[52px] rounded-xl bg-rose-950/60 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 font-black">
                              <UserX size={24} />
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white">
                            <Lock size={11} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 pr-14">
                          <h3 className="font-black text-base text-white truncate line-through decoration-rose-500 decoration-2">
                            {item.targetName}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border mt-0.5 ${catMeta.badgeClass}`}>
                            <span>{catMeta.icon}</span>
                            <span>{catMeta.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Crime Description */}
                      <div className="p-3 rounded-xl border border-rose-900/30 bg-[#16071F]/80 text-xs text-gray-300 space-y-1">
                        <p className="text-[10px] font-mono text-rose-400 font-bold uppercase">Kronologi / Catatan Vonis:</p>
                        <p className="leading-relaxed line-clamp-4 text-gray-300">{item.crimeDescription}</p>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-4 border-t border-rose-950/60 bg-[#0A020E] flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <Clock size={12} />
                        <span>Vonis: {new Date(item.verdictDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </span>

                      <span className="text-[10px] text-gray-500 uppercase font-bold">Blacklist Tetap</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= TAB 2: PAPAN BURONAN (WANTED & BOUNTY) ================= */
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300 flex items-start gap-3">
            <Flame size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {bountySubFilter === "CAPTURED" ? "Arsip Buronan Tertangkap:" : "Peringatan Buronan Aktif:"}
              </p>
              <p className="text-gray-400 mt-0.5">
                {bountySubFilter === "CAPTURED"
                  ? "Daftar buronan yang telah berhasil diselesaikan permasalahannya, ganti rugi dikembalikan, atau pelakunya telah diamankan dan dijatuhi vonis mutlak."
                  : "Daftar terlapor penipuan (scammer) & perusak guild yang sedang diburu. Jika kamu memiliki informasi valid terkait kontak baru, nomor rekening penipu, atau akun sosial medianya, klik 'Lapor Info Keberadaan' untuk menerima imbalan bounty!"}
              </p>
            </div>
          </div>

          {displayedBounties.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-[#2A153A] bg-[#100414] p-8 space-y-2">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {bountySubFilter === "CAPTURED" ? "Belum Ada Catatan Tertangkap" : "Tidak Ada Buronan Aktif"}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {bountySubFilter === "CAPTURED"
                  ? "Arsip buronan tertangkap akan tampil di sini begitu staf menandai kasus selesai."
                  : "Semua laporan terverifikasi telah diselesaikan atau dijebloskan ke sel penjara."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedBounties.map((bounty) => {
                const catMeta = CATEGORY_MAP[bounty.category] || CATEGORY_MAP.BURONAN_GUILD;
                const isCaptured = bounty.status === "CAPTURED";

                return (
                  <div
                    key={bounty.id}
                    className={`relative rounded-2xl border-2 overflow-hidden shadow-2xl flex flex-col justify-between transition-all hover:scale-[1.01] ${
                      isCaptured
                        ? "border-emerald-600/40 bg-gradient-to-b from-[#0E1F16] via-[#0A160F] to-[#070F0A]"
                        : "border-amber-600/40 bg-gradient-to-b from-[#1F101A] via-[#160B12] to-[#0F050A]"
                    }`}
                  >
                    {/* Top Wanted Poster Header */}
                    <div className="p-5 pb-3 text-center border-b border-[#2A1424] bg-black/30 relative">
                      {/* Big Stamp */}
                      <div className="absolute top-2 right-3 rotate-12 z-10 pointer-events-none">
                        <span
                          className={`px-3 py-1 rounded border-2 font-mono font-black text-xs uppercase tracking-widest shadow-lg ${
                            isCaptured
                              ? "border-emerald-500 text-emerald-400 bg-emerald-950/80"
                              : "border-red-600 text-red-500 bg-red-950/90"
                          }`}
                        >
                          {isCaptured ? "CAPTURED" : "WANTED"}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono tracking-widest uppercase font-black text-amber-500">
                        {isCaptured ? "TELAH DITANGKAP / DISANKSI" : "DEAD OR ALIVE — GUILD OUTLAW"}
                      </p>
                      <h3 className="text-xl font-black text-white truncate mt-1">
                        {bounty.targetName}
                      </h3>
                    </div>

                    {/* Middle Evidence Photo / Details */}
                    <div className="p-5 space-y-4">
                      {/* Evidence Photo */}
                      {bounty.evidenceImage ? (
                        <div
                          onClick={() => setLightboxImage(bounty.evidenceImage)}
                          className="relative w-full h-44 rounded-xl overflow-hidden border border-amber-900/40 bg-black/60 cursor-pointer group"
                        >
                          <Image
                            src={bounty.evidenceImage}
                            alt={`Bukti kasus ${bounty.targetName}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                            <Eye size={15} />
                            <span>Perbesar Bukti</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-xl border border-dashed border-amber-900/30 bg-black/30 flex flex-col items-center justify-center gap-1 text-gray-500 text-xs font-mono">
                          <UserX size={28} className="text-gray-600" />
                          <span>Foto / Bukti Disimpan Staf</span>
                        </div>
                      )}

                      {/* Category & Bounty Reward Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold border ${catMeta.badgeClass}`}>
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>

                        {bounty.bountyReward && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                            <Coins size={13} className="text-amber-400" />
                            <span>Hadiah: {bounty.bountyReward}</span>
                          </span>
                        )}
                      </div>

                      {/* Crime Chronology */}
                      <div className="p-3.5 rounded-xl border border-[#2A1526] bg-black/40 text-xs text-gray-300 space-y-1">
                        <p className="text-[10px] font-mono text-amber-400 font-bold uppercase">Kasus / Modus Penipuan:</p>
                        <p className="leading-relaxed line-clamp-4 text-gray-300">{bounty.crimeDescription}</p>
                      </div>
                    </div>

                    {/* Bottom Action / Staf Approval */}
                    <div className="p-4 border-t border-[#2A1424] bg-black/40 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                        <span>Dilaporkan: {bounty.submittedBy?.username ? `@${bounty.submittedBy.username}` : "Member"}</span>
                        <span>ACC: {bounty.approvedBy?.username ? `@${bounty.approvedBy.username}` : "Staf"}</span>
                      </div>

                      {!isCaptured && (
                        <button
                          type="button"
                          onClick={() => setLocationModalTarget(bounty)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <span>🕵️ Lapor Info Keberadaan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: AJUKAN BURONAN / BOUNTY BARU                                    */}
      {/* ========================================================================= */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border-2 border-rose-500/50 bg-[#120516] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-900/40">
              <div>
                <span className="text-[11px] font-mono text-rose-400 font-black uppercase">
                  PENGADUAN &amp; SANKSI SOSIAL
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Skull size={18} className="text-rose-500" /> Ajukan Laporan Buronan / Scammer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {formFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  formFeedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                {formFeedback.message}
              </div>
            )}

            <form onSubmit={handleSubmitBounty} className="space-y-4">
              {/* Target Identification */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Identitas Terlapor / Pelaku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: @Scammer_Gamer#1234 / No Rekening BCA 12345678 / Sosmed @penipu"
                  value={formTargetName}
                  onChange={(e) => setFormTargetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-950 bg-[#1A0A1F] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Bersifat umum: bisa username Discord, nomor rekening/e-wallet penipu, atau akun sosial media.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Kategori Pelanggaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-950 bg-[#1A0A1F] text-white text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="SCAM_TRANSAKSI">🚨 Penipuan Transaksi / Rekber / Scam Akun</option>
                  <option value="CHEAT_TURNAMEN">⚔️ Kecurangan / Cheat / Exploit Turnamen</option>
                  <option value="TOXIC_BERAT">☣️ Perilaku Toxic Ekstrem / SARA / Pelecehan</option>
                  <option value="BURONAN_GUILD">🚩 Pelanggaran Berat / Buronan Khusus Guild</option>
                </select>
              </div>

              {/* Crime Description */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Kronologi Lengkap Kejadian <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ceritakan kronologi kejadian secara rinci: waktu transaksi, janji pelaku, kerugian nominal, serta alasan mengapa pelaku layak dijadikan buronan guild..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-950 bg-[#1A0A1F] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Bounty Reward (Optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Hadiah Imbalan Bounty (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rp 100.000 atau 500 XP (Bagi yang membawakan info kontak baru pelaku)"
                  value={formReward}
                  onChange={(e) => setFormReward(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-950 bg-[#1A0A1F] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Unggah Foto Pelaku / Bukti Transfer / Bukti Chat (Maks 4MB)
                </label>
                <ImageUploader
                  value={formImage}
                  onChange={(base64) => setFormImage(base64)}
                  label="Klik untuk pilih bukti foto/screenshot screenshot bukti chat atau mutasi rekening penipu"
                />
              </div>

              {/* Security notice */}
              <div className="p-3 rounded-xl border border-amber-900/40 bg-amber-950/20 text-[11px] text-amber-300">
                ⚠️ <strong>Penting:</strong> Laporan buronan ini tidak langsung tayang publik melainkan masuk ke status <code>PENDING_REVIEW</code> dan otomatis dikirimkan ke Discord <code>#mod-logs</code> untuk diverifikasi oleh Moderator (⚔️ Lord Commander) / Admin demi mencegah fitnah.
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rose-900/40">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white text-xs font-bold transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black transition shadow-lg shadow-rose-900/40"
                >
                  {submitting ? "Mengirim Laporan..." : "Kirim Laporan Buronan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: LAPOR INFORMASI KEBERADAAN BURONAN                              */}
      {/* ========================================================================= */}
      {locationModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-[#140818] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-900/40">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-black uppercase">
                  KLAIM BOUNTY &amp; BANTU STAF
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  🕵️ Lapor Info Keberadaan: {locationModalTarget.targetName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalTarget(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <p>
                Punya info valid mengenai nomor baru, username Discord baru, atau akun sosmed dari <strong>{locationModalTarget.targetName}</strong>?
              </p>

              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5 font-mono text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <Coins size={14} />
                  <span>Hadiah Bounty: {locationModalTarget.bountyReward || "Penghargaan XP & Reputasi Guild"}</span>
                </p>
                <p className="text-[11px] text-gray-300">
                  Kerahasiaan identitas informan dijamin penuh oleh Dewan Pengurus LogHorizon.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-bold text-white text-xs">Pilihan Cara Melapor:</p>
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/messages"
                    className="p-3 rounded-xl border border-purple-500/30 bg-[#1D0C2C] hover:border-purple-400 text-white font-bold flex items-center justify-between text-xs transition"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-purple-400" />
                      <span>Kirim Pesan Pribadi (PM) ke Staf</span>
                    </span>
                    <ExternalLink size={13} className="text-gray-400" />
                  </Link>

                  <a
                    href="https://discord.gg/loghorizon"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-white font-bold flex items-center justify-between text-xs transition"
                  >
                    <span className="flex items-center gap-2">
                      <Shield size={16} className="text-[#5865F2]" />
                      <span>Buka Tiket Laporan di Server Discord</span>
                    </span>
                    <ExternalLink size={13} className="text-gray-400" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setLocationModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. LIGHTBOX FOR EVIDENCE IMAGE                                            */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[70vh] rounded-2xl overflow-hidden border border-rose-500/40">
            <Image src={lightboxImage} alt="Bukti Foto Kasus" fill className="object-contain" unoptimized />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-rose-600 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
