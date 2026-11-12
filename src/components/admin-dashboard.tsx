"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  DollarSign,
  ExternalLink,
  Flag,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";

type Role = "MEMBER" | "MODERATOR" | "ADMIN";

type Report = {
  id: string;
  postId: string;
  reason: string;
  createdAt: string;
  post: { id: string; title: string; category: string; isPinned?: boolean; author: { username: string | null } };
  reporter: { username: string | null };
};

type RecentPost = {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: { username: string | null };
};

type Member = {
  id: string;
  username: string | null;
  avatar: string | null;
  discordId?: string | null;
  role: Role;
  isBanned: boolean;
  isPremium?: boolean;
  xp?: number;
  level?: number;
  badges?: string[];
  joinedAt: string;
};

type MarketplaceListing = {
  id: string;
  title: string;
  marketData: unknown;
  createdAt: string;
  author: { id: string; username: string | null };
};

type DonationRecord = {
  id: string;
  userId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUCCEEDED" | "FAILED";
  senderName?: string | null;
  notes?: string | null;
  proofUrl?: string | null;
  gatewayRef?: string | null;
  createdAt: string;
  user?: { id: string; username: string | null; avatar: string | null; badges?: string[] };
};

type AnnouncementRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  author: { username: string | null };
};

type SiteConfig = {
  id: string;
  statMembers: string;
  statParties: string;
  statVoice: string;
  qrisImageUrl: string;
  rekberAccount: string;
  rekberFee: number;
  monthlyGoal: number;
  minDonation: number;
  discordInviteUrl: string;
  updatedAt?: string;
};

type Sponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: string;
  createdAt: string;
};

type DashboardData = {
  stats: {
    totalMembers: number;
    totalForumThreads: number;
    activeMarketplaceListings: number;
    activeEscrows?: number;
    pendingDonations?: number;
    pendingReports: number;
    totalDonations: number;
  };
  reports: Report[];
  recentPosts?: RecentPost[];
  users: Member[];
  marketplaceListings?: MarketplaceListing[];
  donations?: DonationRecord[];
  announcements?: AnnouncementRecord[];
  siteConfig?: SiteConfig;
  sponsors?: Sponsor[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  canManageRoles: boolean;
  canBanMembers: boolean;
  canBroadcast: boolean;
  currentUserId: string;
};

type Tab = "overview" | "settings" | "treasury" | "members" | "moderation";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function AdminDashboard({ role }: { role: Role }) {
  const isAdmin = role === "ADMIN";
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  // Site Config CMS Form State
  const [configForm, setConfigForm] = useState<SiteConfig>({
    id: "default",
    statMembers: "1,200+",
    statParties: "450+",
    statVoice: "24/7",
    qrisImageUrl: "/qris-guild.png",
    rekberAccount: "BCA 1234567890 a.n LogHorizon",
    rekberFee: 5000,
    monthlyGoal: 5000000,
    minDonation: 10000,
    discordInviteUrl: "https://discord.gg/aJvbVyTxNb",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // New Sponsor Form State
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [sponsorWebsite, setSponsorWebsite] = useState("");
  const [sponsorTier, setSponsorTier] = useState("Benefactor");
  const [savingSponsor, setSavingSponsor] = useState(false);

  function loadDashboard() {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), search });
    fetch(`/api/admin/dashboard?${query}`)
      .then((response) => readApiResponse<DashboardData>(response, "Gagal memuat dashboard."))
      .then((result) => {
        setData(result);
        if (result.siteConfig) {
          setConfigForm(result.siteConfig);
        }
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Gagal memuat dashboard.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Save Site Config CMS
  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingConfig(true);
    setError("");
    try {
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const result = await readApiResponse<{ config: SiteConfig; message: string }>(response, "Gagal menyimpan konfigurasi.");
      setConfigForm(result.config);
      setNotice(result.message || "Pengaturan website berhasil disimpan!");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan konfigurasi.");
    } finally {
      setSavingConfig(false);
    }
  }

  // Reset Simulated Donations to pure Rp 0
  async function handleResetDonations() {
    const confirmed = window.confirm(
      "PERINGATAN: Apakah kamu yakin ingin mereset seluruh data donasi simulasi? Saldo kas terverifikasi akan kembali ke Rp 0."
    );
    if (!confirmed) return;

    setBusyId("reset-donations");
    setError("");
    try {
      const response = await fetch("/api/admin/donations/reset", {
        method: "POST",
      });
      const result = await readApiResponse<{ message: string }>(response, "Gagal mereset data donasi.");
      setNotice(result.message || "Seluruh data transaksi donasi simulasi telah dihapus. Saldo kas kembali Rp 0.");
      loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mereset data donasi.");
    } finally {
      setBusyId("");
    }
  }

  // Add Sponsor
  async function handleAddSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sponsorName.trim()) return;
    setSavingSponsor(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sponsorName.trim(),
          logoUrl: sponsorLogo.trim() || undefined,
          websiteUrl: sponsorWebsite.trim() || undefined,
          tier: sponsorTier.trim() || "Benefactor",
        }),
      });
      const result = await readApiResponse<{ sponsor: Sponsor }>(response, "Gagal menambahkan sponsor.");
      setData((current) =>
        current
          ? {
              ...current,
              sponsors: [result.sponsor, ...(current.sponsors ?? [])],
            }
          : current
      );
      setSponsorName("");
      setSponsorLogo("");
      setSponsorWebsite("");
      setNotice(`Sponsor "${result.sponsor.name}" berhasil ditambahkan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menambahkan sponsor.");
    } finally {
      setSavingSponsor(false);
    }
  }

  // Delete Sponsor
  async function handleDeleteSponsor(id: string, name: string) {
    if (!window.confirm(`Hapus sponsor "${name}"?`)) return;
    setBusyId(id);
    setError("");
    try {
      await readApiResponse(await fetch(`/api/admin/sponsors/${id}`, { method: "DELETE" }), "Gagal menghapus sponsor.");
      setData((current) =>
        current
          ? {
              ...current,
              sponsors: current.sponsors?.filter((s) => s.id !== id),
            }
          : current
      );
      setNotice(`Sponsor "${name}" berhasil dihapus.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus sponsor.");
    } finally {
      setBusyId("");
    }
  }

  // Handle report dismiss or delete
  async function handleReport(report: Report, action: "dismiss" | "delete-post") {
    const confirmed = window.confirm(
      action === "delete-post"
        ? `Hapus postingan "${report.post.title}" dan seluruh laporannya?`
        : `Abaikan laporan untuk "${report.post.title}"?`
    );
    if (!confirmed) return;
    setBusyId(report.id);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
        "Aksi moderasi gagal."
      );
      setData((current) =>
        current
          ? {
              ...current,
              reports: current.reports.filter((item) =>
                action === "delete-post" ? item.postId !== report.postId : item.id !== report.id
              ),
              stats: {
                ...current.stats,
                pendingReports: Math.max(
                  0,
                  current.stats.pendingReports -
                    (action === "delete-post"
                      ? current.reports.filter((item) => item.postId === report.postId).length
                      : 1)
                ),
              },
            }
          : current
      );
      setNotice(action === "delete-post" ? "Postingan dan laporannya telah dihapus." : "Laporan telah ditandai selesai.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Aksi moderasi gagal.");
    } finally {
      setBusyId("");
    }
  }

  // Handle Pin / Unpin Forum Post
  async function togglePinPost(postId: string, currentPinned: boolean) {
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: !currentPinned }),
        }),
        "Gagal mengubah pin status."
      );
      setData((current) =>
        current
          ? {
              ...current,
              recentPosts: current.recentPosts?.map((p) =>
                p.id === postId ? { ...p, isPinned: !currentPinned } : p
              ),
            }
          : current
      );
      setNotice(!currentPinned ? "Postingan berhasil disematkan (pinned)!" : "Pin postingan dicabut.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mengubah pin status.");
    } finally {
      setBusyId("");
    }
  }

  // Handle Delete Post directly
  async function deletePostDirect(postId: string, title: string) {
    if (!window.confirm(`Hapus thread "${title}" secara permanen?`)) return;
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(await fetch(`/api/posts/${postId}`, { method: "DELETE" }), "Gagal menghapus thread.");
      setData((current) =>
        current
          ? {
              ...current,
              recentPosts: current.recentPosts?.filter((p) => p.id !== postId),
              marketplaceListings: current.marketplaceListings?.filter((p) => p.id !== postId),
            }
          : current
      );
      setNotice(`Thread "${title}" berhasil dihapus.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus thread.");
    } finally {
      setBusyId("");
    }
  }

  // Update member properties (role, ban, xp, premium)
  async function updateMember(
    member: Member,
    change: { role?: Role; isBanned?: boolean; isPremium?: boolean; xp?: number; level?: number }
  ) {
    setBusyId(member.id);
    setError("");
    try {
      const updated = await readApiResponse<Member>(
        await fetch(`/api/admin/users/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        }),
        "Perubahan member gagal disimpan."
      );
      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current
      );
      setNotice(`Data anggota ${updated.username ?? "member"} berhasil diperbarui.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Perubahan member gagal disimpan.");
    } finally {
      setBusyId("");
    }
  }

  // Update Marketplace Listing Status
  async function updateListingStatus(postId: string, newStatus: "AVAILABLE" | "IN_ESCROW" | "SOLD") {
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        "Gagal memperbarui status lapak."
      );
      setData((current) =>
        current
          ? {
              ...current,
              marketplaceListings: current.marketplaceListings?.map((l) => {
                if (l.id !== postId) return l;
                const mData = (l.marketData && typeof l.marketData === "object" ? l.marketData : {}) as Record<string, unknown>;
                return { ...l, marketData: { ...mData, status: newStatus } };
              }),
            }
          : current
      );
      setNotice(`Status lapak diperbarui menjadi ${newStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memperbarui status lapak.");
    } finally {
      setBusyId("");
    }
  }

  // Verify Donation
  async function verifyDonation(donationId: string, newStatus: "APPROVED" | "REJECTED") {
    setBusyId(donationId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/admin/donations/${donationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        "Gagal memproses verifikasi donasi."
      );
      setData((current) =>
        current
          ? {
              ...current,
              donations: current.donations?.map((d) => (d.id === donationId ? { ...d, status: newStatus } : d)),
            }
          : current
      );
      setNotice(
        newStatus === "APPROVED"
          ? "Donasi berhasil diverifikasi (ACC)! Role & lencana donor otomatis diaktifkan."
          : "Donasi ditolak."
      );
      loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memproses verifikasi donasi.");
    } finally {
      setBusyId("");
    }
  }

  const pendingDonationsList = data?.donations?.filter((d) => d.status === "PENDING") ?? [];
  const processedDonationsList = data?.donations?.filter((d) => d.status !== "PENDING") ?? [];

  return (
    <main className="community-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <div className="page-shell admin-page px-0 sm:px-0">
        <Link href="/" className="back-link inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] mb-4">
          <ArrowLeft size={15} /> Kembali ke situs
        </Link>

        {/* Title Header */}
        <div className="admin-title-row flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
              LOGHORIZON / GUILD HEADQUARTERS
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">
              Command <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Center</span>
            </h1>
            <p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pusat kendali operasional, CMS website, perbendaharaan, dan manajemen anggota LogHorizon.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="p-2 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-300 hover:border-[#9D4EDD]"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <span className="admin-role-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/30">
              <Shield size={14} /> {role === "ADMIN" ? "Emperor / Admin" : "Lord Commander / Mod"}
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {notice && (
          <div className="inline-notice mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Tutup notifikasi">
              <X size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="inline-error mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Tutup pesan">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RESPONSIVE LAYOUT: DESKTOP SIDEBAR + MOBILE HORIZONTAL TABS */}
        {/* ========================================================================= */}
        <div className="md:grid md:grid-cols-[230px_1fr] md:gap-8 items-start">
          {/* DESKTOP SIDEBAR (< md hidden) */}
          <aside className="hidden md:flex flex-col gap-1.5 sticky top-24 p-3 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-1.5">
              PANEL KENDALI
            </p>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "overview"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("overview")}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard size={16} />
                <span>Overview &amp; Statistik</span>
              </div>
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === "settings"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
                }`}
                onClick={() => setTab("settings")}
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={16} />
                  <span>Pengaturan Web (CMS)</span>
                </div>
              </button>
            )}

            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "treasury"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("treasury")}
            >
              <div className="flex items-center gap-2.5">
                <Coins size={16} />
                <span>Verifikasi Kas &amp; Rekber</span>
              </div>
              {Boolean(data?.stats.pendingDonations) && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === "treasury" ? "bg-white text-[#9D4EDD]" : "bg-amber-500/20 text-amber-400"}`}>
                  {data?.stats.pendingDonations}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "members"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("members")}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} />
                <span>Member &amp; Kasta</span>
              </div>
            </button>

            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "moderation"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("moderation")}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={16} />
                <span>Moderasi &amp; Broadcast</span>
              </div>
              {Boolean(data?.stats.pendingReports) && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === "moderation" ? "bg-white text-[#9D4EDD]" : "bg-rose-500/20 text-rose-400"}`}>
                  {data?.stats.pendingReports}
                </span>
              )}
            </button>
          </aside>

          {/* MOBILE HORIZONTAL SCROLLABLE TABS (>= md hidden) */}
          <div className="md:hidden flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pb-2 mb-6 border-b border-gray-200 dark:border-[#211C2B] -mx-4 px-4">
            <button
              type="button"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 ${
                tab === "overview" ? "bg-[#9D4EDD] text-white" : "bg-gray-100 dark:bg-[#120F17] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("overview")}
            >
              <LayoutDashboard size={14} /> Overview
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 ${
                  tab === "settings" ? "bg-[#9D4EDD] text-white" : "bg-gray-100 dark:bg-[#120F17] text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setTab("settings")}
              >
                <Settings size={14} /> Web CMS
              </button>
            )}
            <button
              type="button"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 ${
                tab === "treasury" ? "bg-[#9D4EDD] text-white" : "bg-gray-100 dark:bg-[#120F17] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("treasury")}
            >
              <Coins size={14} /> Kas &amp; Rekber
              {Boolean(data?.stats.pendingDonations) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-extrabold">
                  {data?.stats.pendingDonations}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 ${
                tab === "members" ? "bg-[#9D4EDD] text-white" : "bg-gray-100 dark:bg-[#120F17] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("members")}
            >
              <Users size={14} /> Member
            </button>
            <button
              type="button"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 ${
                tab === "moderation" ? "bg-[#9D4EDD] text-white" : "bg-gray-100 dark:bg-[#120F17] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("moderation")}
            >
              <ShieldAlert size={14} /> Moderasi
              {Boolean(data?.stats.pendingReports) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold">
                  {data?.stats.pendingReports}
                </span>
              )}
            </button>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="min-w-0">
            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW & STATISTIK GUILD */}
            {/* ========================================================================= */}
            {tab === "overview" && (
              <section className="space-y-6" role="tabpanel">
                {/* 5 METRIC CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <article className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <div className="flex items-center justify-between text-[#9D4EDD]">
                      <Users size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Total Member</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {data?.stats.totalMembers ?? "0"}
                    </strong>
                  </article>

                  <article className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <div className="flex items-center justify-between text-purple-400">
                      <DollarSign size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Kas Terverifikasi</span>
                    <strong className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-300 block mt-0.5 truncate">
                      {data ? formatMoney.format(data.stats.totalDonations) : "Rp 0"}
                    </strong>
                  </article>

                  <article className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <div className="flex items-center justify-between text-amber-500">
                      <Coins size={20} />
                      {Boolean(data?.stats.pendingDonations) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400">
                          AKSI
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Donasi Pending</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {data?.stats.pendingDonations ?? 0}
                    </strong>
                  </article>

                  <article className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <div className="flex items-center justify-between text-blue-500">
                      <Store size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Rekber Aktif</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {data?.stats.activeEscrows ?? 0}
                    </strong>
                  </article>

                  <article className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between text-rose-500">
                      <Flag size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Laporan Masuk</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {data?.stats.pendingReports ?? 0}
                    </strong>
                  </article>
                </div>

                {/* QUICK ACTIONS & STATUS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <Sparkles size={18} className="text-[#9D4EDD]" /> Pintasan Manajemen
                    </h2>
                    <div className="space-y-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setTab("settings")}
                          className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                        >
                          <span>⚙️ Pengaturan Konten Website (CMS)</span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTab("treasury")}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>💎 Verifikasi Kas Donasi &amp; Rekber</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                          {data?.stats.pendingDonations ?? 0} pending
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("members")}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>👥 Kelola Member, Kasta &amp; Status Banned</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("moderation")}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>🛡️ Moderasi Konten, Sponsor &amp; Broadcast</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <ShieldCheck size={18} className="text-emerald-500" /> Status Ekosistem Guild
                    </h2>
                    <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#211C2B]">
                        <span>Database Neon PostgreSQL:</span>
                        <span className="font-semibold text-emerald-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Terhubung / Online
                        </span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#211C2B]">
                        <span>Otentikasi Member:</span>
                        <span className="font-semibold text-emerald-500">OAuth Discord Aman</span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#211C2B]">
                        <span>Target Kas Terverifikasi:</span>
                        <span className="font-bold text-purple-400">
                          {formatMoney.format(configForm.monthlyGoal || 5000000)}
                        </span>
                      </li>
                      <li className="flex items-center justify-between py-1">
                        <span>QRIS Resmi Perbendaharaan:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                          {configForm.qrisImageUrl}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PENGATURAN KONTEN WEBSITE (SITE SETTINGS CMS) */}
            {/* ========================================================================= */}
            {tab === "settings" && isAdmin && (
              <section className="space-y-6" role="tabpanel">
                <div className="p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={20} className="text-[#9D4EDD]" /> Pengaturan Konten Website (Site Settings CMS)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ubah statistik beranda, info pembayaran QRIS, nomor rekening Rekber, target kas, dan tautan resmi langsung tanpa edit kode.
                    </p>
                  </div>

                  <form onSubmit={(e) => void handleSaveConfig(e)} className="space-y-6">
                    {/* 1. STATISTIK BERANDA */}
                    <div className="border-t border-gray-200 dark:border-[#211C2B] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        01 / STATISTIK COUNTER BERANDA
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Anggota Guild
                          </label>
                          <input
                            type="text"
                            value={configForm.statMembers}
                            onChange={(e) => setConfigForm({ ...configForm, statMembers: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="1,200+"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Party Terbentuk
                          </label>
                          <input
                            type="text"
                            value={configForm.statParties}
                            onChange={(e) => setConfigForm({ ...configForm, statParties: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="450+"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Voice Aktif
                          </label>
                          <input
                            type="text"
                            value={configForm.statVoice}
                            onChange={(e) => setConfigForm({ ...configForm, statVoice: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="24/7"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. PEMBAYARAN & QRIS */}
                    <div className="border-t border-gray-200 dark:border-[#211C2B] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        02 / INFO PEMBAYARAN, QRIS &amp; REKBER
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            URL Gambar QRIS Resmi Guild
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={configForm.qrisImageUrl}
                              onChange={(e) => setConfigForm({ ...configForm, qrisImageUrl: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                              placeholder="/qris-guild.png"
                              required
                            />
                            {configForm.qrisImageUrl && (
                              <div className="relative w-10 h-10 rounded border border-gray-200 dark:border-[#211C2B] overflow-hidden bg-white shrink-0">
                                <Image
                                  src={configForm.qrisImageUrl}
                                  alt="Preview QRIS"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Nomor Rekening / E-Wallet Rekber
                          </label>
                          <input
                            type="text"
                            value={configForm.rekberAccount}
                            onChange={(e) => setConfigForm({ ...configForm, rekberAccount: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="BCA 1234567890 a.n LogHorizon"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Biaya Admin Rekber (IDR)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={configForm.rekberFee}
                            onChange={(e) => setConfigForm({ ...configForm, rekberFee: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="5000"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. TARGET KAS & MINIMAL DONASI */}
                    <div className="border-t border-gray-200 dark:border-[#211C2B] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        03 / TARGET KAS &amp; BATAS MINIMAL DONASI
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Target Kas Bulanan (IDR)
                          </label>
                          <input
                            type="number"
                            min={100000}
                            step={50000}
                            value={configForm.monthlyGoal}
                            onChange={(e) => setConfigForm({ ...configForm, monthlyGoal: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="5000000"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Batas Minimal Donasi (IDR)
                          </label>
                          <input
                            type="number"
                            min={1000}
                            step={5000}
                            value={configForm.minDonation}
                            onChange={(e) => setConfigForm({ ...configForm, minDonation: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="10000"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. LINK KOMUNITAS */}
                    <div className="border-t border-gray-200 dark:border-[#211C2B] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        04 / LINK TAUTAN DISCORD RESMI
                      </h3>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Link Invite Discord Resmi Guild
                        </label>
                        <input
                          type="url"
                          value={configForm.discordInviteUrl}
                          onChange={(e) => setConfigForm({ ...configForm, discordInviteUrl: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                          placeholder="https://discord.gg/aJvbVyTxNb"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="button button-primary px-6 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2"
                      >
                        {savingConfig ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Menyimpan Pengaturan…
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Simpan Pengaturan Website (CMS)
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: VERIFIKASI DONASI & TRANSAKSI REKBER */}
            {/* ========================================================================= */}
            {tab === "treasury" && (
              <section className="space-y-8" role="tabpanel">
                {/* TOOLBAR & RESET DATA SIMULASI */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Coins size={18} className="text-[#9D4EDD]" /> Verifikasi Donasi &amp; Kas Perbendaharaan
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      ACC atau tolak antrean donasi. Lencana kasta donatur otomatis aktif saat donasi disetujui.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={busyId === "reset-donations"}
                      onClick={() => void handleResetDonations()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <RotateCcw size={14} className={busyId === "reset-donations" ? "animate-spin" : ""} />
                      <span>Reset Data Simulasi (Kembali Rp 0)</span>
                    </button>
                  )}
                </div>

                {/* 1. ANTREAN DONASI PENDING */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Antrean Donasi Menunggu Verifikasi ({pendingDonationsList.length})
                      </h3>
                      <p className="text-xs text-gray-500">Periksa bukti transfer dan klik ACC untuk mengaktifkan kasta donatur.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                          <th className="py-2.5">Pengirim Rekening</th>
                          <th className="py-2.5">Akun Member</th>
                          <th className="py-2.5">Nominal</th>
                          <th className="py-2.5">Catatan / Ref</th>
                          <th className="py-2.5">Bukti Transfer</th>
                          <th className="py-2.5">Waktu</th>
                          <th className="py-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                        {pendingDonationsList.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 font-bold text-gray-900 dark:text-white">
                              {item.senderName || "-"}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Member"} size={22} />
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{item.user?.username ?? "Member"}</span>
                              </div>
                            </td>
                            <td className="py-3 font-extrabold text-purple-600 dark:text-purple-300">
                              {formatMoney.format(item.amount)}
                            </td>
                            <td className="py-3 text-gray-500 max-w-[150px] truncate">{item.notes || "-"}</td>
                            <td className="py-3">
                              {item.proofUrl ? (
                                <a
                                  href={item.proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#9D4EDD] hover:underline font-bold inline-flex items-center gap-1"
                                >
                                  <span>Lihat Bukti</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Tanpa bukti link</span>
                              )}
                            </td>
                            <td className="py-3 text-gray-500 text-[11px]">
                              {new Date(item.createdAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => void verifyDonation(item.id, "APPROVED")}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25"
                              >
                                ACC / Verifikasi
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => void verifyDonation(item.id, "REJECTED")}
                                className="px-2.5 py-1 rounded text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                Tolak
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingDonationsList.length === 0 && (
                          <tr>
                            <td className="py-6 text-center text-gray-400" colSpan={7}>
                              Tidak ada antrean donasi pending saat ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. RIWAYAT DONASI TERVERIFIKASI */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                    Riwayat Donasi Selesai / Terverifikasi
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                          <th className="py-2.5">User</th>
                          <th className="py-2.5">Pengirim</th>
                          <th className="py-2.5">Nominal</th>
                          <th className="py-2.5">Tanggal</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                        {processedDonationsList.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Member"} size={22} />
                                <span className="font-semibold text-gray-900 dark:text-white">{item.user?.username ?? "Member"}</span>
                              </div>
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-300">{item.senderName || "-"}</td>
                            <td className="py-3 font-bold text-purple-600 dark:text-purple-300">
                              {formatMoney.format(item.amount)}
                            </td>
                            <td className="py-3 text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.status === "APPROVED" || item.status === "SUCCEEDED"
                                    ? "bg-emerald-500/15 text-emerald-500"
                                    : "bg-red-500/15 text-red-500"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {processedDonationsList.length === 0 && (
                          <tr>
                            <td className="py-6 text-center text-gray-400" colSpan={5}>
                              Belum ada catatan donasi terverifikasi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. PANTAUAN REKBER MARKETPLACE */}
                <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Pantauan Transaksi Lapak &amp; Rekber Marketplace
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Selesaikan transaksi rekber (*SOLD*), batalkan (*AVAILABLE*), atau hapus lapak bermasalah.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                          <th className="py-2.5">Judul Lapak</th>
                          <th className="py-2.5">Penjual</th>
                          <th className="py-2.5">Harga</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Aksi Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                        {data?.marketplaceListings?.map((listing) => {
                          const mData = (listing.marketData && typeof listing.marketData === "object" ? listing.marketData : {}) as Record<string, unknown>;
                          const statusStr = String(mData.status ?? "AVAILABLE");
                          const priceNum = Number(mData.price ?? 0);

                          return (
                            <tr key={listing.id}>
                              <td className="py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                                {listing.title}
                              </td>
                              <td className="py-3 text-gray-500">{listing.author.username ?? "Gamer"}</td>
                              <td className="py-3 font-bold text-gray-800 dark:text-gray-200">{formatMoney.format(priceNum)}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    statusStr === "AVAILABLE"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : statusStr === "IN_ESCROW"
                                        ? "bg-amber-500/15 text-amber-500"
                                        : "bg-gray-500/15 text-gray-400"
                                  }`}
                                >
                                  {statusStr}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={busyId === listing.id}
                                  onClick={() => void updateListingStatus(listing.id, statusStr === "SOLD" ? "AVAILABLE" : "SOLD")}
                                  className="px-2.5 py-1 rounded text-xs border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]"
                                >
                                  {statusStr === "SOLD" ? "Batalkan Rekber (Tersedia)" : "Selesaikan Rekber (Terjual)"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === listing.id}
                                  onClick={() => void deletePostDirect(listing.id, listing.title)}
                                  className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {!data?.marketplaceListings?.length && (
                          <tr>
                            <td className="py-6 text-center text-gray-400" colSpan={5}>
                              Belum ada lapak terbuka.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: MANAJEMEN MEMBER & KASTA ROLE */}
            {/* ========================================================================= */}
            {tab === "members" && (
              <section className="space-y-6" role="tabpanel">
                <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users size={18} className="text-[#9D4EDD]" /> Manajemen Member &amp; Kasta Role
                      </h2>
                      <p className="text-xs text-gray-500">
                        Atur role web, sesuaikan Level &amp; XP, berikan status Premium, dan berikan sanksi Ban.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Cari username / discordId…"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                          <th className="py-2.5">Member</th>
                          <th className="py-2.5">Role Web</th>
                          <th className="py-2.5">Level / XP</th>
                          <th className="py-2.5">Status Premium</th>
                          <th className="py-2.5 text-right">Aksi Akun</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                        {data?.users.map((member) => {
                          const isSelf = member.id === data.currentUserId;
                          return (
                            <tr key={member.id}>
                              <td className="py-3">
                                <div className="flex items-center gap-2.5">
                                  <DiscordAvatar src={member.avatar} username={member.username ?? "Member"} size={28} />
                                  <div>
                                    <span className="font-bold text-gray-900 dark:text-white block">
                                      {member.username ?? "Gamer"}
                                    </span>
                                    <span className="text-[10px] text-gray-400">ID: {member.discordId || member.id}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3">
                                <select
                                  disabled={!isAdmin || isSelf || busyId === member.id}
                                  value={member.role}
                                  onChange={(e) => void updateMember(member, { role: e.target.value as Role })}
                                  className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none"
                                >
                                  <option value="MEMBER">MEMBER</option>
                                  <option value="MODERATOR">MODERATOR</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              </td>

                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#9D4EDD]">Lv. {member.level ?? 1}</span>
                                  <span className="text-gray-400">({(member.xp ?? 0).toLocaleString("id-ID")} XP)</span>
                                </div>
                              </td>

                              <td className="py-3">
                                <button
                                  type="button"
                                  disabled={busyId === member.id}
                                  onClick={() => void updateMember(member, { isPremium: !member.isPremium })}
                                  className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                    member.isPremium
                                      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent"
                                  }`}
                                >
                                  {member.isPremium ? "★ Premium Aktif" : "Standar"}
                                </button>
                              </td>

                              <td className="py-3 text-right">
                                {!isSelf && (
                                  <button
                                    type="button"
                                    disabled={busyId === member.id}
                                    onClick={() => void updateMember(member, { isBanned: !member.isBanned })}
                                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                                      member.isBanned
                                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                        : "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25"
                                    }`}
                                  >
                                    {member.isBanned ? "Buka Ban (Unban)" : "Ban Member"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {Boolean(data?.pagination && data.pagination.totalPages > 1) && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#211C2B] mt-4">
                      <span className="text-xs text-gray-500">
                        Halaman {data?.pagination.page} dari {data?.pagination.totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                          className="px-2.5 py-1 rounded border border-gray-200 dark:border-[#211C2B] text-xs disabled:opacity-50"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(data?.pagination && page >= data.pagination.totalPages)}
                          onClick={() => setPage(page + 1)}
                          className="px-2.5 py-1 rounded border border-gray-200 dark:border-[#211C2B] text-xs disabled:opacity-50"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: MODERASI KONTEN, SPONSOR & BROADCAST */}
            {/* ========================================================================= */}
            {tab === "moderation" && (
              <section className="space-y-8" role="tabpanel">
                {/* 1. KELOLA SPONSOR RESMI */}
                <div className="p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-[#9D4EDD]" /> Kelola Sponsor Resmi (Section 06 Beranda)
                      </h2>
                      <p className="text-xs text-gray-500">
                        Tambah atau hapus mitra dan sponsor resmi yang tampil di halaman depan LogHorizon.
                      </p>
                    </div>
                  </div>

                  {/* Form Tambah Sponsor */}
                  <form onSubmit={(e) => void handleAddSponsor(e)} className="p-4 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B] mb-6 space-y-3">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Tambah Sponsor Baru</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <input
                          type="text"
                          required
                          value={sponsorName}
                          onChange={(e) => setSponsorName(e.target.value)}
                          placeholder="Nama Sponsor / Brand *"
                          className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                      </div>
                      <div>
                        <input
                          type="url"
                          value={sponsorLogo}
                          onChange={(e) => setSponsorLogo(e.target.value)}
                          placeholder="URL Logo (Opsional)"
                          className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                      </div>
                      <div>
                        <input
                          type="url"
                          value={sponsorWebsite}
                          onChange={(e) => setSponsorWebsite(e.target.value)}
                          placeholder="Link Website (Opsional)"
                          className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={sponsorTier}
                          onChange={(e) => setSponsorTier(e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-xs text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="Benefactor">Benefactor</option>
                          <option value="Platinum Partner">Platinum</option>
                          <option value="Gold Partner">Gold</option>
                        </select>
                        <button
                          type="submit"
                          disabled={savingSponsor}
                          className="button button-primary px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-1 shrink-0"
                        >
                          <Plus size={14} /> Tambah
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* List Sponsor Aktif */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {data?.sponsors?.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-3 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sp.logoUrl ? (
                            <div className="relative w-8 h-8 rounded overflow-hidden shrink-0">
                              <Image src={sp.logoUrl} alt={sp.name} fill className="object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#9D4EDD]/15 text-[#9D4EDD] flex items-center justify-center font-bold text-xs shrink-0">
                              {sp.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <strong className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                              {sp.name}
                            </strong>
                            <span className="text-[10px] text-purple-400 font-semibold">{sp.tier}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === sp.id}
                          onClick={() => void handleDeleteSponsor(sp.id, sp.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                          title="Hapus Sponsor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {!data?.sponsors?.length && (
                      <p className="text-xs text-gray-400 col-span-3 py-4 text-center">
                        Belum ada sponsor khusus yang ditambahkan.
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. LAPORAN PELANGGARAN & MODERASI THREAD */}
                <div className="p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                    <Flag size={18} className="text-amber-500" /> Moderasi Laporan Forum ({data?.reports.length ?? 0})
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">Postingan atau aktivitas yang dilaporkan oleh member.</p>

                  <div className="space-y-3">
                    {data?.reports.map((report) => (
                      <article
                        className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-[#120F17] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        key={report.id}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 uppercase tracking-wider inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> PENDING
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {report.post.title}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500">
                            Penulis: <strong>{report.post.author.username ?? "Gamer"}</strong> • Pelapor: <strong>{report.reporter.username ?? "Gamer"}</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-[#1A1526] p-2 rounded border border-gray-200 dark:border-[#211C2B]">
                            <strong>Alasan:</strong> {report.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={busyId === report.id}
                            onClick={() => void handleReport(report, "dismiss")}
                            className="px-2.5 py-1 rounded text-xs border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]"
                          >
                            Abaikan
                          </button>
                          <button
                            type="button"
                            disabled={busyId === report.id}
                            onClick={() => void handleReport(report, "delete-post")}
                            className="px-2.5 py-1 rounded text-xs font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20"
                          >
                            Hapus Post
                          </button>
                        </div>
                      </article>
                    ))}
                    {!data?.reports.length && (
                      <p className="text-xs text-gray-400 py-3 text-center">
                        Semua bersih! Tidak ada laporan pending saat ini.
                      </p>
                    )}
                  </div>

                  {/* DAFTAR POST TERKINI + PIN / UNPIN */}
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#211C2B]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                      Daftar Thread Terkini (Pin &amp; Hapus Konten)
                    </h3>
                    <div className="space-y-2">
                      {data?.recentPosts?.slice(0, 10).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {post.isPinned && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#9D4EDD]/15 text-[#9D4EDD] shrink-0">
                                PINNED
                              </span>
                            )}
                            <span className="font-bold text-gray-900 dark:text-white truncate">
                              {post.title}
                            </span>
                            <span className="text-gray-400 shrink-0">
                              oleh {post.author.username ?? "Gamer"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void togglePinPost(post.id, post.isPinned)}
                              className={`p-1.5 rounded border ${
                                post.isPinned
                                  ? "text-[#9D4EDD] border-[#9D4EDD]/40 bg-[#9D4EDD]/10"
                                  : "text-gray-500 border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]"
                              }`}
                              title={post.isPinned ? "Lepas Pin" : "Sematkan (Pin)"}
                            >
                              {post.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void deletePostDirect(post.id, post.title)}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Hapus Thread"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. BROADCAST PENGUMUMAN RESMI (24 JAM) */}
                {isAdmin && (
                  <BroadcastSection
                    announcements={data?.announcements ?? []}
                    onNotice={setNotice}
                    onError={setError}
                    onRefresh={loadDashboard}
                  />
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function BroadcastSection({
  announcements,
  onNotice,
  onError,
  onRefresh,
}: {
  announcements: AnnouncementRecord[];
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, imageUrl: imageUrl.trim() || undefined }),
      });
      const result = await readApiResponse<{ notificationSent: boolean; warning?: string }>(response, "Broadcast gagal.");
      setTitle("");
      setContent("");
      setImageUrl("");
      onNotice(result.notificationSent ? "Warta berhasil disiarkan ke Beranda dan Discord." : result.warning ?? "Warta berhasil diterbitkan.");
      onRefresh();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Broadcast gagal.");
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();
  const activeAnnouncements = announcements.filter((a) => new Date(a.expiresAt) > now);

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone size={18} className="text-[#9D4EDD]" /> Broadcast Pengumuman Resmi Guild (Tayang 24 Jam)
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pengumuman resmi akan tayang sebagai banner di Beranda website dan otomatis terkirim ke Discord webhook.
        </p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Judul Warta / Pengumuman <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            placeholder="Contoh: Maintenance Server Guild & Pendaftaran Turnamen"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Isi Pengumuman Lengkap <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            placeholder="Tuliskan instruksi, detail jadwal, atau pengumuman penting untuk seluruh anggota…"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            URL Gambar / Banner (Opsional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            placeholder="https://imgur.com/... atau tautan gambar langsung"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="button button-primary px-5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2"
        >
          {saving ? "Menyiarkan pengumuman…" : "Siarkan Pengumuman (Web + Discord)"}
        </button>
      </form>

      {/* Daftar Pengumuman Aktif */}
      <div className="pt-4 border-t border-gray-200 dark:border-[#211C2B]">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Pengumuman Sedang Tayang ({activeAnnouncements.length})
        </h3>
        <div className="space-y-2">
          {activeAnnouncements.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B] flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block font-bold text-gray-900 dark:text-white">{item.title}</strong>
                <span className="text-[10px] text-gray-400">
                  Dibuat {new Date(item.createdAt).toLocaleString("id-ID")} • Berakhir {new Date(item.expiresAt).toLocaleString("id-ID")}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                AKTIF (24H)
              </span>
            </div>
          ))}
          {!activeAnnouncements.length && (
            <p className="text-xs text-gray-400 text-center py-2">Tidak ada pengumuman yang sedang tayang.</p>
          )}
        </div>
      </div>
    </div>
  );
}
