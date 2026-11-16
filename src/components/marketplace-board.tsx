"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDownUp, Flag, Loader2, MessageSquare, Plus, Search, Shield, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { isPublicMarketData } from "@/lib/market-data";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { PostReactions } from "@/components/post-reactions";
import { SkeletonMarketCard, TacticalEmptyState } from "@/components/ui-feedback";
import { EscrowChatModal } from "@/components/escrow-chat-modal";
import { ShareButton } from "@/components/share-button";
import type { MarketplacePostRecord } from "@/types/community";
import { motion } from "framer-motion";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";

type MarketPost = MarketplacePostRecord;

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

type LiveRow = { id: string; status: string | null };
type LiveState = "connecting" | "live" | "stale" | "error" | "closed" | "unavailable";

export function MarketplaceBoard({ realtimeUrl }: { realtimeUrl: string }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [type, setType] = useState("ALL");
  const [game, setGame] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounced Search: 500ms delay to prevent excessive queries to Neon
  useEffect(() => {
    if (searchValue === search) return;
    setIsSearching(true);
    const timer = setTimeout(() => {
      setSearch(searchValue);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, search]);
  const [compose, setCompose] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginAction, setLoginAction] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, { userId: string; contact: string; discordId?: string | null; sellerUsername?: string | null }>>({});
  const [contactLoading, setContactLoading] = useState("");
  const [escrowLoading, setEscrowLoading] = useState("");
  const [activeEscrowModalId, setActiveEscrowModalId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("live");

  async function performContactAction(id: string, contactData: { contact: string; discordId?: string | null; sellerUsername?: string | null }, preopenedWindow?: Window | null) {
    const value = contactData.contact;
    const discordId = contactData.discordId;
    const rawPhone = value.match(/^(?:https?:\/\/)?(?:www\.)?wa\.me\/([0-9]+)/i)?.[1] ?? value.replace(/[^\d]/g, "");
    const phone = rawPhone.startsWith("0") ? `62${rawPhone.slice(1)}` : rawPhone;
    const isWhatsApp = /^(?:https?:\/\/)?(?:www\.)?wa\.me\//i.test(value) || /^\+?[\d\s()-]{8,}$/.test(value);

    if (isWhatsApp) {
      const popup = preopenedWindow ?? window.open("about:blank", "_blank");
      if (popup) {
        popup.opener = null;
        popup.location.href = `https://wa.me/${phone}`;
      } else {
        setNotice("Pop-up diblokir browser. Izinkan pop-up untuk membuka WhatsApp.");
      }
      return;
    }

    // Direct Discord PC / DM action
    if (discordId) {
      const discordUrl = `https://discord.com/users/${discordId}`;
      const popup = preopenedWindow ?? window.open("about:blank", "_blank");
      if (popup) {
        popup.opener = null;
        popup.location.href = discordUrl;
      }
      setNotice(`Membuka profil Discord @${contactData.sellerUsername ?? value} untuk Private Chat...`);
      return;
    }

    preopenedWindow?.close();
    const discordUsername = value.replace(/^discord\s*:\s*/i, "");
    try {
      await navigator.clipboard.writeText(discordUsername);
      setNotice(`Username Discord @${discordUsername} berhasil disalin! Buka Discord untuk kirim pesan.`);
    } catch (reason) {
      console.error("[marketplace] Failed to copy Discord contact", reason);
      setContacts((current) => ({ ...current, [id]: { userId: user?.id ?? "", contact: discordUsername } }));
      setError("Clipboard tidak tersedia. Kontak penjual ditampilkan agar bisa disalin manual.");
    }
  }

  useEffect(() => {
    const query = new URLSearchParams({ category: "MARKETPLACE" });
    if (type !== "ALL") query.set("type", type);
    if (game.trim()) query.set("game", game.trim());
    if (search.trim()) query.set("search", search.trim());
    if (sort === "cheapest") query.set("sort", "asc");
    if (sort === "expensive") query.set("sort", "desc");
    fetch(`/api/posts?${query}`)
      .then(async (response) => {
        const data = await readApiResponse<MarketPost[]>(response, "Gagal memuat lapak.");
        setPosts(data);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Gagal memuat lapak."))
      .finally(() => setLoading(false));
  }, [type, game, sort, search, refreshKey]);

  useLiveSync(() => {
    setRefreshKey((k) => k + 1);
  }, { intervalMs: 12000, revalidateOnFocus: true });

  useEffect(() => {
    if (!realtimeUrl) return;
    let active = true;
    let client: ReturnType<typeof createRealtimeClient> | undefined;
    let subscription: ReturnType<ReturnType<typeof createRealtimeClient>["subscribe"]> | undefined;
    async function subscribeToListings() {
      try {
        const response = await fetch("/api/marketplace/live", { method: "POST" });
        const query = await readApiResponse<SealedLiveQuery<LiveRow>>(response, "Live update marketplace gagal disiapkan.");
        if (!active) return;
        client = createRealtimeClient({ url: realtimeUrl });
        subscription = client.subscribe(query);
        subscription.onUpdate((update) => {
          if (update.type === "changes" && active) setRefreshKey((value) => value + 1);
        });
        subscription.onStateChange((state) => {
          if (active) setLiveState(state.status);
        });
      } catch (reason) {
        if (active) {
          setLiveState("error");
          setError(reason instanceof Error ? reason.message : "Live update marketplace gagal disambungkan.");
        }
      }
    }
    void subscribeToListings();
    return () => {
      active = false;
      subscription?.unsubscribe();
      client?.close();
    };
  }, [realtimeUrl]);

  async function report(id: string) {
    if (!user) {
      setLoginAction("melaporkan lapak");
      return;
    }
    setReportId(id);
  }

  async function revealContact(id: string) {
    const currentUser = user;
    if (!currentUser) {
      setLoginAction("melihat kontak penjual");
      return;
    }
    const popup = window.open("about:blank", "_blank");
    setContactLoading(id);
    setError("");
    try {
      const response = await fetch(`/api/posts/${id}/contact`);
      const data = await readApiResponse<{ contact: string; discordId?: string | null; sellerUsername?: string | null }>(response, "Kontak penjual tidak dapat dimuat.");
      setContacts((current) => ({
        ...current,
        [id]: {
          userId: currentUser.id,
          contact: data.contact,
          discordId: data.discordId,
          sellerUsername: data.sellerUsername,
        },
      }));
      await performContactAction(id, data, popup);
    } catch (reason) {
      popup?.close();
      setError(reason instanceof Error ? reason.message : "Kontak penjual tidak dapat dimuat.");
    } finally {
      setContactLoading("");
    }
  }

  function createListing() {
    if (!user) {
      setLoginAction("membuat lapak");
      return;
    }
    if (user.isBanned) {
      setNotice("Akun kamu sedang dibatasi dan tidak dapat membuat lapak.");
      return;
    }
    setCompose(true);
  }

  async function startEscrow(id: string) {
    if (!user) {
      setLoginAction("memulai transaksi escrow");
      return;
    }
    try {
      setEscrowLoading(id);
      const response = await fetch(`/api/posts/${id}/escrow`, { method: "POST" });
      const data = await readApiResponse<{ transaction?: { id: string }; notice: string }>(response, "Transaksi escrow gagal dimulai.");
      setNotice(data.notice);
      if (data.transaction?.id) {
        setActiveEscrowModalId(data.transaction.id);
      }
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Transaksi escrow gagal dimulai.");
    } finally {
      setEscrowLoading("");
    }
  }

  async function completeEscrow(transactionId: string, postId: string) {
    try {
      setEscrowLoading(postId);
      const response = await fetch(`/api/escrow/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await readApiResponse<{ notice: string }>(response, "Konfirmasi transaksi gagal.");
      setNotice(data.notice);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Konfirmasi transaksi gagal.");
    } finally {
      setEscrowLoading("");
    }
  }

  async function updateListingStatus(id: string, nextStatus: "AVAILABLE" | "SOLD") {
    try {
      setEscrowLoading(id);
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await readApiResponse<unknown>(response, "Status lapak gagal diperbarui.");
      setPosts((current) => current.map((post) => {
        if (post.id !== id || !isPublicMarketData(post.marketData)) return post;
        return { ...post, marketData: { ...post.marketData, status: nextStatus } };
      }));
      setNotice(`Status lapak diubah menjadi ${nextStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status lapak gagal diperbarui.");
    } finally {
      setEscrowLoading("");
    }
  }

  async function deleteListing(id: string) {
    if (!confirm("Apakah kamu yakin ingin menghapus lapak ini?")) return;
    try {
      setEscrowLoading(id);
      const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      await readApiResponse<unknown>(response, "Gagal menghapus lapak.");
      setPosts((current) => current.filter((post) => post.id !== id));
      setNotice("Lapak berhasil dihapus.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus lapak.");
    } finally {
      setEscrowLoading("");
    }
  }

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <div>
        <div className="market-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-200 dark:border-[#2E1E45] pb-6">
          <div className="text-left">
            <p className="section-kicker text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
              MARKETPLACE KOMUNITAS // ESCROW REKBER
            </p>
            <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] break-words">
              LAPAK <span className="text-[#7C3AED] dark:text-[#A78BFA]">GAMER</span>
            </h1>
            <p className="muted-copy text-xs sm:text-sm md:text-base text-slate-600 dark:text-[#A78BFA] max-w-2xl mt-1.5 leading-relaxed font-sans">
              Jual beli akun, item, top-up, dan jasa gaming dengan komunitas LogHorizon. Transaksi dipantau oleh sistem keamanan guild.
            </p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap mt-2.5 border ${
              liveState === "live"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border-emerald-500/30"
                : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45]"
            }`}>
              {liveState === "live" ? "● LIVE SYNC" : liveState === "connecting" ? "MENYAMBUNG LIVE…" : liveState === "stale" ? "MEMPERBARUI…" : liveState === "error" ? "TERPUTUS" : "OFFLINE"}
            </span>
          </div>
          <div>
            {status === "loading" ? (
              <span className="nav-loading" />
            ) : (
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] transition-colors shadow-sm"
                onClick={createListing}
              >
                <Plus size={16} /> <span>BUAT LAPAK BARU</span>
              </button>
            )}
          </div>
        </div>

        {/* ESCROW SECURITY PROTOCOL BANNER */}
        <div className="mb-6 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] border-l-4 border-l-[#10B981] bg-white dark:bg-[#130921] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left font-mono shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-emerald-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] flex items-center justify-center text-emerald-600 dark:text-[#10B981] shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-wider">PROTOKOL REKBER RESMI GUILD LOGHORIZON (3-PARTY ESCROW)</p>
              <p className="text-[11px] text-slate-600 dark:text-[#A78BFA] font-sans">Dana pembeli ditahan aman di kas guild hingga verifikasi kepemilikan akun/item selesai 100%.</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30 rounded-none shrink-0 self-start sm:self-auto">
            ● ESCROW READY
          </span>
        </div>

        <section className="market-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] mb-6 text-left shadow-sm dark:shadow-none" aria-label="Filter dan pencarian marketplace">
          <div className="flex items-center gap-3 px-3.5 h-11 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] focus-within:border-[#7C3AED] transition-colors sm:col-span-2 lg:col-span-1">
            <div className="shrink-0 text-slate-400 dark:text-[#A78BFA] flex items-center">
              {isSearching ? (
                <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
              ) : (
                <Search size={16} />
              )}
            </div>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Cari judul, game, penjual…"
              aria-label="Cari lapak"
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 p-0 font-sans"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  setSearch("");
                }}
                aria-label="Hapus pencarian"
                className="shrink-0 text-slate-400 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] font-mono text-xs uppercase"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <label className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            Tipe transaksi
            <select className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-800 dark:text-[#F8FAFC] text-xs font-mono focus:border-[#7C3AED]" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="ALL">Semua Tipe</option>
              <option value="WTS">WTS · Dijual</option>
              <option value="WTB">WTB · Dicari</option>
            </select>
          </label>
          <label className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            Nama game
            <input className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-800 dark:text-[#F8FAFC] text-xs font-sans focus:border-[#7C3AED]" value={game} onChange={(event) => setGame(event.target.value)} placeholder="Semua game" />
          </label>
          <label className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            <span className="flex items-center gap-1"><ArrowDownUp size={12} /> Urutkan harga</span>
            <select className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-800 dark:text-[#F8FAFC] text-xs font-mono focus:border-[#7C3AED]" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Terbaru</option>
              <option value="cheapest">Termurah</option>
              <option value="expensive">Termahal</option>
            </select>
          </label>
        </section>

        {notice && <div className="inline-notice mb-4" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Tutup notifikasi"><X size={15} /></button></div>}
        {error && <div className="inline-error mb-4" role="alert">{error}</div>}

        {loading ? (
          <div className="market-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <SkeletonMarketCard key={key} />
            ))}
          </div>
        ) : posts.length ? (
          <section className="market-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {posts.map((post, index) => {
            if (!isPublicMarketData(post.marketData)) return <article className="market-card p-4 rounded-none border border-[#2E1E45] bg-[#130921]" key={post.id}><p className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none">Data lapak tidak valid.</p></article>;
            const market = post.marketData;
            return <motion.article className={`market-card rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED] transition-all p-4 shadow-sm dark:shadow-none ${market.status === "AVAILABLE" ? "market-card-available" : market.status === "SOLD" ? "market-card-sold opacity-60" : ""}`} key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}>
              <div className="market-listing-labels flex flex-wrap gap-1.5 mb-3 font-mono">
                {post.isPinned && <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/40">PINNED</span>}
                {(post.author.isPremium || post.author.role === "ADMIN" || post.author.username === ".odyssia") && (
                  <span className="px-2 py-0.5 rounded-none text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-[#F59E0B] border border-amber-500/30">
                    ✦ VERIFIED SELLER
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-none text-[10px] font-extrabold uppercase ${market.type === "WTS" ? "bg-[#7C3AED] text-white" : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]"}`}>{market.type}</span>
                <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]">{market.game}</span>
                <span className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30">
                  {market.status === "IN_ESCROW" ? "IN ESCROW" : market.status}
                </span>
              </div>
              <div className="market-image mb-3 rounded-none overflow-hidden border border-slate-200 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#1A0E2E]"><MarketImage src={market.imageUrl} alt={`Bukti lapak ${post.title}`} /></div>
              <div className="market-card-body text-left">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500 dark:text-[#A78BFA] uppercase">HARGA:</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-[#10B981]">{money.format(market.price)}</span>
                </div>
                <h2 className="font-display text-base font-bold uppercase tracking-tight break-words text-slate-900 dark:text-[#F8FAFC]">{post.title}</h2>
                <p className="market-description break-words text-xs text-slate-600 dark:text-[#A78BFA] font-sans line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
                <div className="market-card-meta flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-[#2E1E45] font-mono text-xs">
                  <span className="post-author flex items-center gap-2">
                    <DiscordAvatar src={post.author.avatar} username={post.author.username} size={22} />
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 dark:text-[#A78BFA]">oleh{" "}</span>
                      <Link
                        href={`/u/${post.author.username ?? "user"}`}
                        className={`font-semibold hover:underline ${(post.author.isPremium || post.author.role === "ADMIN" || post.author.username === ".odyssia") ? "premium-username" : "text-slate-900 dark:text-[#F8FAFC]"}`}
                      >
                        {post.author.username ?? "Gamer"}
                      </Link>
                      {(post.author.username?.toLowerCase() === ".odyssia" || post.author.username?.toLowerCase() === "odyssia") ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-amber-500/10 text-amber-600 dark:text-[#F59E0B] border border-amber-500/30">
                          👑 Emperor
                        </span>
                      ) : post.author.role === "ADMIN" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                          ✨ Prince
                        </span>
                      ) : post.author.role === "MODERATOR" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          ⚔️ Mod
                        </span>
                      ) : null}
                    </span>
              </span>
              {(post.author.successfulSales ?? 0) > 0 ? (
                <span
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-[#10B981] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-none text-[10px]"
                  title="Reputasi Transaksi Rekber Terverifikasi"
                >
                  <ShieldCheck size={12} className="text-emerald-600 dark:text-[#10B981] shrink-0" />
                  <span>🛡️ {post.author.successfulSales} REKBER SUKSES</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-[#A78BFA] bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] px-2 py-0.5 rounded-none text-[10px]"
                  title="Penjual baru di LogHorizon"
                >
                  <Shield size={12} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
                  <span>🛡️ PENJUAL BARU</span>
                </span>
              )}
            </div>
            <PostReactions postId={post.id} likes={post.likes} dislikes={post.dislikes} reaction={post.votes?.[0]?.value ?? null} onLoginRequired={() => setLoginAction("memberi reaksi")} onChange={(result) => setPosts((current) => current.map((entry) => entry.id === post.id ? { ...entry, ...result, votes: result.reaction ? [{ value: result.reaction }] : [] } : entry))} />
            {user && contacts[post.id]?.userId === user.id ? (
              <div className="market-contact-revealed font-mono text-xs my-2 p-2 bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45]">
                <span className="text-slate-600 dark:text-[#A78BFA]">Kontak: <strong className="text-slate-900 dark:text-[#F8FAFC]">{contacts[post.id].contact}</strong></span>
                <button
                  className="mt-1.5 w-full py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] flex items-center justify-center gap-1.5 shadow-sm"
                  onClick={() => void performContactAction(post.id, contacts[post.id])}
                >
                  {contacts[post.id].discordId ? "💬 Private Chat (PC) Discord" : "Hubungi / Salin Kontak"}
                </button>
              </div>
            ) : (
              <button
                className="mt-2 w-full py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC] transition flex items-center justify-center gap-1.5"
                disabled={contactLoading === post.id || status === "loading"}
                onClick={() => void revealContact(post.id)}
              >
                {contactLoading === post.id
                  ? "MEMUAT KONTAK…"
                  : status === "loading"
                    ? "MEMERIKSA AKUN…"
                    : user
                      ? "💬 Hubungi Penjual (PC Discord/WA)"
                      : "Login untuk Lihat Kontak"}
              </button>
            )}
            <div className="market-card-actions flex flex-wrap gap-2 mt-4 font-mono">
              <ShareButton
                url={`/marketplace?id=${post.id}`}
                title={`[${market.type}] ${post.title} - Marketplace LogHorizon`}
                text={`Cek lapak ${post.title} (${market.game}) di Marketplace LogHorizon: Rp ${market.price?.toLocaleString("id-ID")}`}
                label="Bagikan"
                variant="outline"
              />
              {user?.id !== post.authorId && (
                <Link
                  href={`/messages?user=${post.authorId}`}
                  className="px-3 py-1.5 rounded-none font-mono text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC] flex items-center gap-1"
                  title="Kirim Pesan Langsung (PM) ke Penjual"
                >
                  <MessageSquare size={13} /> PM Penjual
                </Link>
              )}
              {market.status === "AVAILABLE" && market.type === "WTS" && user?.id !== post.authorId && (
                <button
                  className="px-3.5 py-1.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED]"
                  disabled={escrowLoading === post.id}
                  onClick={() => void startEscrow(post.id)}
                >
                  {escrowLoading === post.id ? "Memproses…" : "🛡️ Beli via Rekber Guild"}
                </button>
              )}
              {post.escrowTransactions?.map((transaction) => (
                <button
                  key={transaction.id}
                  className="px-3 py-1.5 rounded-none font-mono text-xs font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30 flex items-center gap-1"
                  onClick={() => setActiveEscrowModalId(transaction.id)}
                >
                  <ShieldCheck size={13} /> Ruang Rekber 3-Pihak
                </button>
              ))}
              {(user?.id === post.authorId || user?.role === "ADMIN" || user?.role === "MODERATOR") && market.status !== "IN_ESCROW" && <button className="px-3 py-1.5 rounded-none font-mono text-xs uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED]" disabled={escrowLoading === post.id} onClick={() => void updateListingStatus(post.id, market.status === "SOLD" ? "AVAILABLE" : "SOLD")}>{market.status === "SOLD" ? "Tandai tersedia" : "Tandai terjual"}</button>}
              {post.escrowTransactions?.filter((transaction) => transaction.sellerId === user?.id || user?.role === "ADMIN" || user?.role === "MODERATOR").map((transaction) => <button key={transaction.id} className="px-3 py-1.5 rounded-none font-mono text-xs uppercase tracking-wider bg-[#10B981] text-slate-900 font-bold" disabled={escrowLoading === post.id} onClick={() => void completeEscrow(transaction.id, post.id)}>{escrowLoading === post.id ? "Memproses…" : "Konfirmasi selesai"}</button>)}
              <button className="text-xs font-mono text-slate-500 dark:text-[#A78BFA] hover:text-rose-500 inline-flex items-center gap-1" onClick={() => void report(post.id)}><Flag size={14} /> Report</button>
              {(user?.id === post.authorId || user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                <button
                  className="text-xs font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-1 ml-auto"
                  disabled={escrowLoading === post.id}
                  onClick={() => void deleteListing(post.id)}
                  title="Hapus lapak"
                >
                  <Trash2 size={14} /> Hapus
                </button>
              )}
            </div>
          </div>
        </motion.article>
      })}
    </section>
    ) : (
      <TacticalEmptyState
        isSearch={Boolean(search.trim() || game.trim() || type !== "ALL")}
        title={search.trim() ? `Pencarian "${search}" Tidak Ditemukan` : undefined}
        description={search.trim() ? "Tidak ada lapak yang cocok dengan kata kunci pencarianmu. Coba ganti kata kunci atau reset filter." : "Belum ada lapak yang dibuka di kategori ini. Buka lapak pertamamu sekarang!"}
      />
    )}
  </div>
    {compose && <MarketModal canPin={Boolean(user?.isPremium || user?.role === "ADMIN" || user?.username === ".odyssia")} onClose={() => setCompose(false)} onCreated={() => { setCompose(false); setRefreshKey((value) => value + 1); }} />}
    {activeEscrowModalId && (
      <EscrowChatModal
        escrowId={activeEscrowModalId}
        onClose={() => setActiveEscrowModalId(null)}
        onStatusChange={() => setRefreshKey((value) => value + 1)}
      />
    )}
    <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
    <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setNotice} />
  </main>
  );
}

function MarketModal({ canPin, onClose, onCreated }: { canPin: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"WTS" | "WTB">("WTS");
  const [game, setGame] = useState("");
  const [price, setPrice] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const imageUrl = images[0] || null;
      let finalContent = content;
      if (images.length > 1) {
        const extraImgs = images.slice(1).map((img, i) => `\n\n![Foto ${i + 2}](${img})`).join("");
        finalContent += extraImgs;
      }
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "MARKETPLACE",
          title,
          content: finalContent,
          isPinned,
          marketData: { type, game, price: Number(price), imageUrl },
        }),
      });
      await readApiResponse<unknown>(response, "Lapak gagal dibuat.");
      onCreated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Lapak gagal dibuat."); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card market-modal w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto my-auto" role="dialog" aria-modal="true" aria-labelledby="market-modal-title"><button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button><p className="section-kicker">PASANG LAPAK</p><h2 id="market-modal-title">Buat Lapak Baru</h2><form className="stack-form" onSubmit={submit}>
    <label>Judul Lapak<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Akun Genshin AR 60" /></label>
    <div className="form-grid-two"><label>Tipe Transaksi<select value={type} onChange={(event) => setType(event.target.value as "WTS" | "WTB")}><option value="WTS">WTS · Saya menjual</option><option value="WTB">WTB · Saya mencari</option></select></label><label>Nama Game<input required value={game} onChange={(event) => setGame(event.target.value)} placeholder="Nama game" /></label></div>
    <div className="form-grid-two">
      <label>Harga (Rupiah)<input required type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="250000" /></label>
      <div className="flex flex-col justify-end">
        <p className="text-xs text-purple-400 bg-purple-950/20 border border-purple-500/30 rounded p-2.5">
          🛡️ <strong>Kontak Otomatis Discord:</strong> Pembeli akan diarahkan langsung ke profil Discord resmi akun Anda saat menghubungi penjual.
        </p>
      </div>
    </div>
    <label>Deskripsi<textarea required maxLength={10000} rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Jelaskan detail barang dan ketentuan transaksi…" /></label>
    {canPin && <label className="form-checkbox"><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} /> Sematkan lapak (Premium, maks. 3)</label>}
    
    <div>
      <ImageUploader
        multiple
        maxFiles={3}
        values={images}
        onMultiChange={setImages}
        label="Foto Barang / Akun (1-3 Foto Langsung dari Galeri HP/PC)"
        description="Pilih 1 sampai 3 foto dari galeri HP atau komputer. Otomatis dikompresi (< 100 KB)."
      />
    </div>

    {error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={saving}>{saving ? "Menerbitkan…" : "Terbitkan Lapak"}</button>
  </form></section></div>;
}

function MarketImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <ShoppingBag size={28} className="text-gray-400 opacity-60" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      loading="lazy"
      sizes="(max-width: 700px) 100vw, 33vw"
      onError={() => setError(true)}
      className="object-cover"
    />
  );
}
