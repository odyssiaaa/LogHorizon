"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDownUp, Flag, Loader2, Plus, Search, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { isPublicMarketData } from "@/lib/market-data";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { PostReactions } from "@/components/post-reactions";
import { SkeletonMarketCard, TacticalEmptyState } from "@/components/ui-feedback";
import { EscrowChatModal } from "@/components/escrow-chat-modal";
import type { MarketplacePostRecord } from "@/types/community";
import { motion } from "framer-motion";

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

  return <main className="community-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden"><div className="page-shell px-0 sm:px-0">
    <div className="market-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">MARKETPLACE KOMUNITAS</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">Lapak <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Gamer</span></h1>
        <p className="muted-copy text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mt-1 leading-relaxed">Jual beli akun, item, top-up, dan jasa gaming dengan komunitas LogHorizon. Transaksi dipantau oleh sistem keamanan guild.</p>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap mt-2 live-status live-${liveState}`}>{liveState === "live" ? "Live" : liveState === "connecting" ? "Menghubungkan live…" : liveState === "stale" ? "Memperbarui…" : liveState === "error" ? "Live terputus" : "Live tidak aktif"}</span>
      </div>
      <div>{status === "loading" ? <span className="nav-loading" /> : <button className="button button-primary w-full sm:w-auto inline-flex items-center justify-center gap-2" onClick={createListing}><Plus size={17} /> <span>Buat Lapak</span></button>}</div>
    </div>
    <section className="market-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] mb-6" aria-label="Filter dan pencarian marketplace">
      <div className="market-search relative flex items-center sm:col-span-2 lg:col-span-1">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-gray-400">
          {isSearching ? (
            <Loader2 size={16} className="animate-spin text-[#9D4EDD] shrink-0" />
          ) : (
            <Search size={16} className="shrink-0" />
          )}
        </div>
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Cari judul, game, atau penjual…"
          aria-label="Cari lapak"
          className="w-full pl-11 pr-10 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#9D4EDD]"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              setSearch("");
            }}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <label>Tipe transaksi<select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">Semua</option><option value="WTS">WTS · Dijual</option><option value="WTB">WTB · Dicari</option></select></label>
      <label>Nama game<input value={game} onChange={(event) => setGame(event.target.value)} placeholder="Semua game" /></label>
      <label><ArrowDownUp size={14} /> Urutkan harga<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="cheapest">Termurah</option><option value="expensive">Termahal</option></select></label>
    </section>
    {notice && <div className="inline-notice mb-4" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Tutup notifikasi"><X size={15} /></button></div>}
    {error && <div className="inline-error mb-4" role="alert">{error}</div>}
    {loading ? (
      <div className="market-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map((key) => (
          <SkeletonMarketCard key={key} />
        ))}
      </div>
    ) : posts.length ? (
      <section className="market-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {posts.map((post, index) => {
        if (!isPublicMarketData(post.marketData)) return <article className="market-card" key={post.id}><p className="inline-error">Data lapak tidak valid.</p></article>;
        const market = post.marketData;
        return <motion.article className={`market-card ${market.status === "AVAILABLE" ? "market-card-available" : market.status === "SOLD" ? "market-card-sold" : ""}`} key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}>
          <div className="market-listing-labels flex flex-wrap gap-1.5 mb-3">
            {post.isPinned && <span className="pinned-label">PINNED</span>}
            {post.author.isPremium && (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ✦ PREMIUM SELLER / VERIFIED
              </span>
            )}
            <span className={market.type === "WTS" ? "trade-badge wts" : "trade-badge wtb"}>{market.type}</span>
            <span className="market-label-game">{market.game}</span>
            <span className="market-label-price">{money.format(market.price)}</span>
            <span className={`status-badge ${market.status === "AVAILABLE" ? "available" : market.status === "IN_ESCROW" ? "in-escrow" : "sold"}`}>
              {market.status === "IN_ESCROW" ? "IN ESCROW" : market.status}
            </span>
          </div>
          <div className="market-image"><MarketImage src={market.imageUrl} alt={`Bukti lapak ${post.title}`} /></div>
          <div className="market-card-body"><h2 className="text-lg sm:text-xl font-bold break-words text-gray-900 dark:text-white">{post.title}</h2><p className="market-game">{market.game}</p><p className="market-price">{money.format(market.price)}</p><p className="market-description break-words text-xs sm:text-sm">{post.content}</p>
            <div className="market-card-meta flex flex-wrap items-center justify-between gap-2">
              <span className="post-author flex items-center gap-2">
                <DiscordAvatar src={post.author.avatar} username={post.author.username} size={28} />
                <span>
                  oleh{" "}
                  <Link
                    href={`/u/${post.author.username ?? "user"}`}
                    className={`font-semibold hover:underline ${post.author.isPremium ? "premium-username" : ""}`}
                  >
                    {post.author.username ?? "Gamer"}
                  </Link>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
                ✔ {post.author.successfulSales ?? 0} Transaksi Sukses
              </span>
            </div>
            <PostReactions postId={post.id} likes={post.likes} dislikes={post.dislikes} reaction={post.votes?.[0]?.value ?? null} onLoginRequired={() => setLoginAction("memberi reaksi")} onChange={(result) => setPosts((current) => current.map((entry) => entry.id === post.id ? { ...entry, ...result, votes: result.reaction ? [{ value: result.reaction }] : [] } : entry))} />
            {user && contacts[post.id]?.userId === user.id ? (
              <div className="market-contact-revealed">
                <span>Kontak: <strong>{contacts[post.id].contact}</strong></span>
                <button
                  className="contact-button flex items-center justify-center gap-1.5"
                  onClick={() => void performContactAction(post.id, contacts[post.id])}
                >
                  {contacts[post.id].discordId ? "💬 Private Chat (PC) Discord" : "Hubungi / Salin Kontak"}
                </button>
              </div>
            ) : (
              <button
                className="contact-button flex items-center justify-center gap-1.5"
                disabled={contactLoading === post.id || status === "loading"}
                onClick={() => void revealContact(post.id)}
              >
                {contactLoading === post.id
                  ? "Memuat kontak…"
                  : status === "loading"
                    ? "Memeriksa akun…"
                    : user
                      ? "💬 Hubungi Penjual (PC Discord/WA)"
                      : "Login untuk Lihat Kontak"}
              </button>
            )}
            <div className="market-card-actions flex flex-wrap gap-2 mt-4">
              {market.status === "AVAILABLE" && market.type === "WTS" && user?.id !== post.authorId && (
                <button
                  className="button button-primary"
                  disabled={escrowLoading === post.id}
                  onClick={() => void startEscrow(post.id)}
                >
                  {escrowLoading === post.id ? "Memproses…" : "🛡️ Beli via Rekber Guild"}
                </button>
              )}
              {post.escrowTransactions?.map((transaction) => (
                <button
                  key={transaction.id}
                  className="button button-quiet text-xs flex items-center gap-1 border-purple-500/40 text-purple-400"
                  onClick={() => setActiveEscrowModalId(transaction.id)}
                >
                  <ShieldCheck size={13} /> Ruang Rekber 3-Pihak
                </button>
              ))}
              {(user?.id === post.authorId || user?.role === "ADMIN" || user?.role === "MODERATOR") && market.status !== "IN_ESCROW" && <button className="button button-quiet" disabled={escrowLoading === post.id} onClick={() => void updateListingStatus(post.id, market.status === "SOLD" ? "AVAILABLE" : "SOLD")}>{market.status === "SOLD" ? "Tandai tersedia" : "Tandai terjual"}</button>}
              {post.escrowTransactions?.filter((transaction) => transaction.sellerId === user?.id || user?.role === "ADMIN" || user?.role === "MODERATOR").map((transaction) => <button key={transaction.id} className="button button-sold" disabled={escrowLoading === post.id} onClick={() => void completeEscrow(transaction.id, post.id)}>{escrowLoading === post.id ? "Memproses…" : "Konfirmasi transaksi selesai"}</button>)}
              <button className="report-button" onClick={() => void report(post.id)}><Flag size={14} /> Laporkan Penjual</button>
              {(user?.id === post.authorId || user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                <button
                  className="report-button text-red-500 hover:text-red-400"
                  disabled={escrowLoading === post.id}
                  onClick={() => void deleteListing(post.id)}
                  title="Hapus lapak"
                >
                  <Trash2 size={14} /> Hapus Lapak
                </button>
              )}
            </div>
          </div>
        </motion.article>;
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
    {compose && <MarketModal canPin={Boolean(user?.isPremium)} onClose={() => setCompose(false)} onCreated={() => { setCompose(false); setRefreshKey((value) => value + 1); }} />}
    {activeEscrowModalId && (
      <EscrowChatModal
        escrowId={activeEscrowModalId}
        onClose={() => setActiveEscrowModalId(null)}
        onStatusChange={() => setRefreshKey((value) => value + 1)}
      />
    )}
    <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
    <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setNotice} />
  </main>;
}

function MarketModal({ canPin, onClose, onCreated }: { canPin: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"WTS" | "WTB">("WTS");
  const [game, setGame] = useState("");
  const [price, setPrice] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const imagePreview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadResponse = await fetch("/api/marketplace/image", { method: "POST", body: formData });
        const upload = await readApiResponse<{ imageUrl: string }>(uploadResponse, "Gambar gagal diunggah.");
        imageUrl = upload.imageUrl;
      }
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "MARKETPLACE",
          title,
          content,
          isPinned,
          marketData: { type, game, price: Number(price), imageUrl },
        }),
      });
      await readApiResponse<unknown>(response, "Lapak gagal dibuat.");
      onCreated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Lapak gagal dibuat."); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card market-modal" role="dialog" aria-modal="true" aria-labelledby="market-modal-title"><button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button><p className="section-kicker">PASANG LAPAK</p><h2 id="market-modal-title">Buat Lapak Baru</h2><form className="stack-form" onSubmit={submit}>
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
    <label>Foto barang (opsional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
      const file = event.target.files?.[0] ?? null;
      if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024)) {
        setError("Gunakan gambar JPG, PNG, atau WebP dengan ukuran maksimal 4 MB.");
        event.currentTarget.value = "";
        setImageFile(null);
        return;
      }
      setError("");
      setImageFile(file);
    }} /></label>
    <p className="upload-hint">Unggah foto untuk WTS atau WTB, atau biarkan kosong jika belum ada foto.</p>
    {imagePreview && <Image className="market-image-preview" src={imagePreview} alt="Pratinjau foto lapak" width={260} height={180} unoptimized />}
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
