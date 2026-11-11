"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
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
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  gatewayRef?: string | null;
  createdAt: string;
  user?: { id: string; username: string | null; avatar: string | null; badges?: string[] };
};

type DashboardData = {
  stats: {
    totalMembers: number;
    totalForumThreads: number;
    activeMarketplaceListings: number;
    pendingReports: number;
    totalDonations: number;
  };
  reports: Report[];
  recentPosts?: RecentPost[];
  users: Member[];
  marketplaceListings?: MarketplaceListing[];
  donations?: DonationRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  canManageRoles: boolean;
  canBanMembers: boolean;
  canBroadcast: boolean;
  currentUserId: string;
};

type Tab = "overview" | "reports" | "members" | "transactions" | "broadcast";

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

  function loadDashboard() {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), search });
    fetch(`/api/admin/dashboard?${query}`)
      .then((response) => readApiResponse<DashboardData>(response, "Gagal memuat dashboard."))
      .then((result) => {
        setData(result);
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

  // Handle report dismiss or delete
  async function handleReport(report: Report, action: "dismiss" | "delete-post") {
    const confirmed = window.confirm(
      action === "delete-post"
        ? `Hapus postingan "${report.post.title}" dan seluruh laporannya?`
        : `Abaikan laporan untuk "${report.post.title}"?`,
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
        "Aksi moderasi gagal.",
      );
      setData((current) =>
        current
          ? {
              ...current,
              reports: current.reports.filter((item) =>
                action === "delete-post" ? item.postId !== report.postId : item.id !== report.id,
              ),
              stats: {
                ...current.stats,
                pendingReports: Math.max(
                  0,
                  current.stats.pendingReports -
                    (action === "delete-post"
                      ? current.reports.filter((item) => item.postId === report.postId).length
                      : 1),
                ),
              },
            }
          : current,
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
        "Gagal mengubah pin status.",
      );
      setData((current) =>
        current
          ? {
              ...current,
              recentPosts: current.recentPosts?.map((p) =>
                p.id === postId ? { ...p, isPinned: !currentPinned } : p,
              ),
            }
          : current,
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
          : current,
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
    change: { role?: Role; isBanned?: boolean; isPremium?: boolean; xp?: number; level?: number },
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
        "Perubahan member gagal disimpan.",
      );
      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current,
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
        "Gagal memperbarui status lapak.",
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
          : current,
      );
      setNotice(`Status lapak diperbarui menjadi ${newStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memperbarui status lapak.");
    } finally {
      setBusyId("");
    }
  }

  // Verify Donation
  async function verifyDonation(donationId: string, newStatus: "SUCCEEDED" | "FAILED") {
    setBusyId(donationId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/admin/donations/${donationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        "Gagal memproses verifikasi donasi.",
      );
      setData((current) =>
        current
          ? {
              ...current,
              donations: current.donations?.map((d) => (d.id === donationId ? { ...d, status: newStatus } : d)),
            }
          : current,
      );
      setNotice(
        newStatus === "SUCCEEDED"
          ? "Donasi berhasil diverifikasi! Lencana donor dan status anggota otomatis aktif."
          : "Donasi ditandai tidak valid.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memproses verifikasi donasi.");
    } finally {
      setBusyId("");
    }
  }

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
              Pusat kendali operasional, moderasi komunitas, perbendaharaan, dan manajemen anggota LogHorizon.
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

        {/* METRIC STATS - 5 CARDS */}
        <section className="admin-stats grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 my-6" aria-label="Statistik guild">
          <article className="admin-stat-card p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <span className="admin-stat-icon text-[#9D4EDD]"><Users size={18} /></span>
            <span className="admin-stat-label text-xs text-gray-400 block mt-1">Total Member</span>
            <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
              {data?.stats.totalMembers ?? "—"}
            </strong>
          </article>
          <article className="admin-stat-card p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <span className="admin-stat-icon text-blue-500"><MessageSquare size={18} /></span>
            <span className="admin-stat-label text-xs text-gray-400 block mt-1">Thread Forum</span>
            <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
              {data?.stats.totalForumThreads ?? "—"}
            </strong>
          </article>
          <article className="admin-stat-card p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <span className="admin-stat-icon text-emerald-500"><Store size={18} /></span>
            <span className="admin-stat-label text-xs text-gray-400 block mt-1">Lapak Aktif</span>
            <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
              {data?.stats.activeMarketplaceListings ?? "—"}
            </strong>
          </article>
          <article className="admin-stat-card p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <span className="admin-stat-icon text-amber-500"><Flag size={18} /></span>
            <span className="admin-stat-label text-xs text-gray-400 block mt-1">Laporan Masuk</span>
            <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
              {data?.stats.pendingReports ?? "—"}
            </strong>
          </article>
          <article className="admin-stat-card p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] col-span-2 lg:col-span-1">
            <span className="admin-stat-icon text-purple-400"><DollarSign size={18} /></span>
            <span className="admin-stat-label text-xs text-gray-400 block mt-1">Kas Donasi</span>
            <strong className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-300 block mt-0.5 truncate">
              {data ? formatMoney.format(data.stats.totalDonations) : "—"}
            </strong>
          </article>
        </section>

        {/* 5 NAVIGATION TABS */}
        <div
          className="admin-tabs flex overflow-x-auto scrollbar-none gap-2 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-b border-gray-200 dark:border-[#211C2B]"
          role="tablist"
          aria-label="Menu navigasi admin"
        >
          <button
            role="tab"
            aria-selected={tab === "overview"}
            className={`admin-tab ${tab === "overview" ? "active" : ""}`}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={15} /> Ringkasan (Overview)
          </button>
          <button
            role="tab"
            aria-selected={tab === "reports"}
            className={`admin-tab ${tab === "reports" ? "active" : ""}`}
            onClick={() => setTab("reports")}
          >
            <Flag size={15} /> Moderasi &amp; Konten
            {Boolean(data?.stats.pendingReports) && <span>{data?.stats.pendingReports}</span>}
          </button>
          <button
            role="tab"
            aria-selected={tab === "members"}
            className={`admin-tab ${tab === "members" ? "active" : ""}`}
            onClick={() => setTab("members")}
          >
            <Users size={15} /> Member &amp; Kasta
          </button>
          <button
            role="tab"
            aria-selected={tab === "transactions"}
            className={`admin-tab ${tab === "transactions" ? "active" : ""}`}
            onClick={() => setTab("transactions")}
          >
            <Coins size={15} /> Lapak &amp; Kas Donasi
          </button>
          {isAdmin && (
            <button
              role="tab"
              aria-selected={tab === "broadcast"}
              className={`admin-tab ${tab === "broadcast" ? "active" : ""}`}
              onClick={() => setTab("broadcast")}
            >
              <Megaphone size={15} /> Broadcast Pengumuman
            </button>
          )}
        </div>

        {/* Global Notifications */}
        {notice && (
          <div className="inline-notice mb-4" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Tutup notifikasi">
              <X size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="inline-error mb-4" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Tutup pesan">
              <X size={15} />
            </button>
          </div>
        )}

        {loading && !data && <div className="empty-state py-12 text-center text-gray-500">Memuat data guild…</div>}

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {tab === "overview" && (
          <section className="space-y-6" role="tabpanel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Actions Panel */}
              <div className="p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-[#9D4EDD]" /> Aksi Cepat Admin
                </h2>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setTab("broadcast")}
                    className="w-full text-left px-3.5 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                  >
                    <span>📢 Terbitkan Pengumuman Resmi</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("reports")}
                    className="w-full text-left px-3.5 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                  >
                    <span>🛡️ Tinjau Laporan Pelanggaran</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                      {data?.stats.pendingReports ?? 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("transactions")}
                    className="w-full text-left px-3.5 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                  >
                    <span>💎 Verifikasi Kas &amp; Donasi</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Security & Health Status */}
              <div className="p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <ShieldCheck size={18} className="text-emerald-500" /> Status Ekosistem Guild
                </h2>
                <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                  <li className="flex items-center justify-between">
                    <span>Database Neon Serverless:</span>
                    <span className="font-semibold text-emerald-500">Normal / Online</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Inference AI Satpam:</span>
                    <span className="font-semibold text-emerald-500">Router Siap</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Perlindungan Akun:</span>
                    <span className="font-semibold text-emerald-500">OAuth Discord</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Sistem Moderasi Konten:</span>
                    <span className="font-semibold text-purple-400">Aktif</span>
                  </li>
                </ul>
              </div>

              {/* Direct Guild Portals */}
              <div className="p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <ExternalLink size={18} className="text-[#9D4EDD]" /> Akses Cepat Halaman
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Link href="/forum" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    Forum
                  </Link>
                  <Link href="/marketplace" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    Marketplace
                  </Link>
                  <Link href="/leaderboard" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    Leaderboard
                  </Link>
                  <Link href="/events" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    Events &amp; LFG
                  </Link>
                  <Link href="/news" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    News Hub
                  </Link>
                  <Link href="/donate" className="p-2 rounded border border-gray-200 dark:border-[#211C2B] text-center hover:border-[#9D4EDD]">
                    Treasury
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REPORTS & CONTENT GUARD */}
        {/* ========================================================================= */}
        {tab === "reports" && (
          <section className="space-y-8" role="tabpanel">
            {/* 1. Laporan Masuk */}
            <div className="admin-panel">
              <div className="admin-panel-heading flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Laporan Pengguna (Pending Reports)</h2>
                  <p className="text-xs text-gray-500">Postingan atau aktivitas yang dilaporkan oleh member.</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                  {data?.reports.length ?? 0} pending
                </span>
              </div>

              {!loading && data?.reports.length === 0 && (
                <div className="empty-state py-8 text-center text-sm text-gray-400">
                  Semua bersih! Tidak ada laporan yang tertunda saat ini.
                </div>
              )}

              <div className="admin-reports space-y-3">
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>Kategori: {report.post.category.toLowerCase().replaceAll("_", " ")}</span>
                        <span>Penulis: {report.post.author.username ?? "Gamer"}</span>
                        <span>Pelapor: {report.reporter.username ?? "Gamer"}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-[#1A1526] p-2.5 rounded border border-gray-200 dark:border-[#211C2B]">
                        <strong>Alasan Laporan:</strong> {report.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Link
                        className="button button-quiet button-small text-xs"
                        href={`/forum/${report.post.id}`}
                        target="_blank"
                      >
                        Buka Thread
                      </Link>
                      <button
                        className="button button-danger button-small text-xs flex items-center gap-1"
                        disabled={busyId === report.id}
                        onClick={() => void handleReport(report, "delete-post")}
                      >
                        <Trash2 size={13} /> Hapus Konten
                      </button>
                      <button
                        className="button button-success button-small text-xs flex items-center gap-1"
                        disabled={busyId === report.id}
                        onClick={() => void handleReport(report, "dismiss")}
                      >
                        <Check size={13} /> Tandai Aman
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* 2. Postingan Terbaru & Pin Control */}
            <div className="admin-panel p-5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <div className="admin-panel-heading mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kontrol Konten Forum Terbaru</h2>
                <p className="text-xs text-gray-500">Sematkan postingan penting (Pin/Unpin) atau bersihkan spam langsung dari panel ini.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                      <th className="py-2">Judul Thread</th>
                      <th className="py-2">Kategori</th>
                      <th className="py-2">Penulis</th>
                      <th className="py-2">Status Pin</th>
                      <th className="py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                    {data?.recentPosts?.map((post) => (
                      <tr key={post.id}>
                        <td className="py-2.5 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                          {post.title}
                        </td>
                        <td className="py-2.5 text-gray-500">{post.category.toLowerCase().replaceAll("_", " ")}</td>
                        <td className="py-2.5 text-gray-500">{post.author.username ?? "Gamer"}</td>
                        <td className="py-2.5">
                          {post.isPinned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9D4EDD]/15 text-[#9D4EDD]">
                              PINNED
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() => void togglePinPost(post.id, post.isPinned)}
                            className="px-2.5 py-1 rounded text-xs font-semibold border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]"
                          >
                            {post.isPinned ? "Lepas Pin" : "📌 Pin Thread"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() => void deletePostDirect(post.id, post.title)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: USERS & ROLES */}
        {/* ========================================================================= */}
        {tab === "members" && (
          <section className="admin-panel p-5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]" role="tabpanel">
            <div className="admin-panel-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Manajemen Member &amp; Kasta Role</h2>
                <p className="text-xs text-gray-500">Kelola role, sesuaikan level / XP, status premium, dan pembatasan akun anggota.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari Username / Discord ID…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="member-table-wrap w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="member-table min-w-[750px] w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                    <th className="py-2.5">Member</th>
                    <th className="py-2.5">Discord ID</th>
                    <th className="py-2.5">Role Web</th>
                    <th className="py-2.5">Level &amp; XP</th>
                    <th className="py-2.5">Premium</th>
                    <th className="py-2.5">Status Akun</th>
                    <th className="py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                  {data?.users.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1526]/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <DiscordAvatar
                            src={member.avatar}
                            username={member.username ?? "Member"}
                            size={28}
                            className="rounded-full shrink-0"
                          />
                          <div>
                            <strong className="block text-gray-900 dark:text-white font-bold">
                              {member.username ?? "Gamer"}
                            </strong>
                            {member.id === data.currentUserId && (
                              <span className="text-[10px] text-purple-400 font-mono">(Akun Anda)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-gray-400 text-[11px]">
                        {member.discordId ?? "—"}
                      </td>
                      <td className="py-3">
                        <select
                          className="role-select text-xs py-1 px-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]"
                          aria-label={`Role ${member.username ?? "member"}`}
                          value={member.role}
                          disabled={!data.canManageRoles || busyId === member.id || member.id === data.currentUserId}
                          onChange={(event) => void updateMember(member, { role: event.target.value as Role })}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            Lv. {member.level ?? 1} ({member.xp ?? 0} XP)
                          </span>
                          {isAdmin && (
                            <div className="inline-flex gap-1 ml-1">
                              <button
                                type="button"
                                title="Tambah 50 XP"
                                disabled={busyId === member.id}
                                onClick={() => void updateMember(member, { xp: (member.xp ?? 0) + 50 })}
                                className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200"
                              >
                                +50
                              </button>
                              <button
                                type="button"
                                title="Kurang 50 XP"
                                disabled={busyId === member.id}
                                onClick={() => void updateMember(member, { xp: Math.max(0, (member.xp ?? 0) - 50) })}
                                className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200"
                              >
                                -50
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {isAdmin ? (
                          <button
                            type="button"
                            disabled={busyId === member.id}
                            onClick={() => void updateMember(member, { isPremium: !member.isPremium })}
                            className={`px-2 py-1 rounded text-[11px] font-bold ${
                              member.isPremium
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                            }`}
                          >
                            {member.isPremium ? "★ PREMIUM" : "Standar"}
                          </button>
                        ) : (
                          <span className="text-gray-400">{member.isPremium ? "★ Elite" : "Standar"}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={member.isBanned ? "member-status banned text-red-500 font-bold" : "member-status active text-emerald-500 font-bold"}>
                          {member.isBanned ? "BANNED" : "AKTIF"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className={member.isBanned ? "button button-unban button-small text-xs" : "button button-quiet button-small text-xs"}
                          disabled={!data.canBanMembers || busyId === member.id || member.id === data.currentUserId}
                          onClick={() => void updateMember(member, { isBanned: !member.isBanned })}
                        >
                          <Ban size={13} /> {member.isBanned ? "Unban" : "Ban"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && !data?.users.length && (
                    <tr>
                      <td className="py-8 text-center text-gray-400" colSpan={7}>
                        Member tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-[#211C2B] text-xs">
              <span className="text-gray-500">
                Menampilkan {data?.users.length ?? 0} dari {data?.pagination.total ?? 0} member
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="p-1 rounded border border-gray-200 dark:border-[#211C2B] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Halaman {data?.pagination.page ?? page} / {Math.max(1, data?.pagination.totalPages ?? 1)}
                </span>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  disabled={page >= (data?.pagination.totalPages ?? 1)}
                  onClick={() => setPage((value) => value + 1)}
                  className="p-1 rounded border border-gray-200 dark:border-[#211C2B] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MARKETPLACE & TREASURY */}
        {/* ========================================================================= */}
        {tab === "transactions" && (
          <section className="space-y-8" role="tabpanel">
            {/* 1. Kas Donasi Masuk */}
            <div className="admin-panel p-5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <div className="admin-panel-heading mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake size={18} className="text-[#9D4EDD]" /> Riwayat Donasi &amp; Benefactor Guild
                </h2>
                <p className="text-xs text-gray-500">
                  Verifikasi konfirmasi donasi dari petualang untuk mengaktifkan lencana donor (*Knight*, *High Merchant*, *Noble Patron*).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                      <th className="py-2.5">Petualang</th>
                      <th className="py-2.5">Nominal (IDR)</th>
                      <th className="py-2.5">Tanggal</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                    {data?.donations?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Petualang"} size={24} />
                            <span className="font-semibold text-gray-900 dark:text-white">{item.user?.username ?? "Petualang"}</span>
                          </div>
                        </td>
                        <td className="py-3 font-bold text-purple-600 dark:text-purple-300">
                          {formatMoney.format(item.amount)}
                        </td>
                        <td className="py-3 text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === "SUCCEEDED"
                                ? "bg-emerald-500/15 text-emerald-500"
                                : item.status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "bg-red-500/15 text-red-500"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          {isAdmin && item.status !== "SUCCEEDED" && (
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => void verifyDonation(item.id, "SUCCEEDED")}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                            >
                              ✓ Verifikasi / Setujui
                            </button>
                          )}
                          {isAdmin && item.status === "SUCCEEDED" && (
                            <span className="text-emerald-500 font-semibold text-xs">Terverifikasi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!data?.donations?.length && (
                      <tr>
                        <td className="py-6 text-center text-gray-400" colSpan={5}>
                          Belum ada catatan donasi masuk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Pantauan Transaksi Lapak Marketplace */}
            <div className="admin-panel p-5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <div className="admin-panel-heading mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Store size={18} className="text-[#9D4EDD]" /> Pantauan Lapak Marketplace
                </h2>
                <p className="text-xs text-gray-500">
                  Ubah status lapak (*AVAILABLE*, *IN_ESCROW*, *SOLD*) atau hapus listing bermasalah.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#211C2B] text-gray-400">
                      <th className="py-2.5">Judul Lapak</th>
                      <th className="py-2.5">Penjual</th>
                      <th className="py-2.5">Game</th>
                      <th className="py-2.5">Harga</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Ubah Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                    {data?.marketplaceListings?.map((listing) => {
                      const mData = (listing.marketData && typeof listing.marketData === "object" ? listing.marketData : {}) as Record<string, unknown>;
                      const statusStr = String(mData.status ?? "AVAILABLE");
                      const gameStr = String(mData.game ?? "—");
                      const priceNum = Number(mData.price ?? 0);

                      return (
                        <tr key={listing.id}>
                          <td className="py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                            {listing.title}
                          </td>
                          <td className="py-3 text-gray-500">{listing.author.username ?? "Gamer"}</td>
                          <td className="py-3 text-gray-500">{gameStr}</td>
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
                              className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]"
                            >
                              {statusStr === "SOLD" ? "Tandai Tersedia" : "Tandai Terjual"}
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
                        <td className="py-6 text-center text-gray-400" colSpan={6}>
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
        {/* TAB 5: BROADCAST ANNOUNCEMENTS */}
        {/* ========================================================================= */}
        {tab === "broadcast" && isAdmin && <BroadcastForm onNotice={setNotice} onError={setError} />}
      </div>
    </main>
  );
}

function BroadcastForm({ onNotice, onError }: { onNotice: (message: string) => void; onError: (message: string) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const result = await readApiResponse<{ notificationSent: boolean; warning?: string }>(response, "Broadcast gagal.");
      setTitle("");
      setContent("");
      onNotice(result.notificationSent ? "Pengumuman berhasil disematkan di forum dan dikirim ke Discord." : result.warning ?? "Pengumuman berhasil dipin di Forum.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Broadcast gagal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel broadcast-panel p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]" role="tabpanel">
      <div className="admin-panel-heading flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Broadcast Pengumuman Resmi Guild</h2>
          <p className="text-xs text-gray-500">
            Pengumuman akan otomatis tersemat (pinned) di Forum Obrolan Umum dan disiarkan ke Discord.
          </p>
        </div>
        <span className="p-2 rounded-full bg-[#9D4EDD]/15 text-[#9D4EDD]">
          <Megaphone size={20} />
        </span>
      </div>
      <form className="stack-form broadcast-form space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Pengumuman</label>
          <input
            required
            maxLength={180}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Contoh: Pengumuman Turnamen Akbar Season 1 LogHorizon"
            className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Isi Pengumuman</label>
          <textarea
            required
            maxLength={10000}
            rows={7}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Tulis informasi detail pengumuman untuk seluruh member guild…"
            className="w-full px-3.5 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white"
          />
        </div>
        <p className="text-xs text-gray-500">
          Notifikasi pengumuman otomatis dikirim melalui secure server webhook ke channel Discord LogHorizon.
        </p>
        <button
          type="submit"
          className="button button-primary px-5 py-2.5 text-sm font-bold flex items-center gap-2"
          disabled={saving}
        >
          <Megaphone size={16} /> {saving ? "Mengirim Pengumuman…" : "Pin & Siarkan Pengumuman"}
        </button>
      </form>
    </section>
  );
}
