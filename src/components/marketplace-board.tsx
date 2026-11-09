"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDownUp, Flag, Plus, Search, ShoppingBag, X } from "lucide-react";
import { isPublicMarketData } from "@/lib/market-data";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";

type MarketPost = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  author: { id: string; username: string | null };
  marketData: unknown;
  escrowTransactions: { id: string; buyerId: string; sellerId: string }[];
};

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function MarketplaceBoard() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [type, setType] = useState("ALL");
  const [game, setGame] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compose, setCompose] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginAction, setLoginAction] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, { userId: string; contact: string }>>({});
  const [contactLoading, setContactLoading] = useState("");
  const [escrowLoading, setEscrowLoading] = useState("");

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
    setContactLoading(id);
    setError("");
    try {
      const response = await fetch(`/api/posts/${id}/contact`);
      const data = await readApiResponse<{ contact: string }>(response, "Kontak penjual tidak dapat dimuat.");
      setContacts((current) => ({ ...current, [id]: { userId: currentUser.id, contact: data.contact } }));
    } catch (reason) {
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
      const data = await readApiResponse<{ notice: string }>(response, "Transaksi escrow gagal dimulai.");
      setNotice(data.notice);
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

  return <main className="community-page"><div className="page-shell">
    <div className="market-heading"><div><p className="section-kicker">MARKETPLACE KOMUNITAS</p><h1>Lapak <span>Gamer</span></h1><p className="muted-copy">Jual beli akun, item, top-up, dan jasa gaming dengan komunitas LogHorizon. Escrow saat ini hanya simulasi status, bukan penahanan uang.</p></div><div>{status === "loading" ? <span className="nav-loading" /> : <button className="button button-primary" onClick={createListing}><Plus size={17} /> Buat Lapak</button>}</div></div>
    <section className="market-filters" aria-label="Filter dan pencarian marketplace">
      <form className="market-search" onSubmit={(event) => { event.preventDefault(); setSearch(searchValue); }}><Search size={17} /><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Cari judul, deskripsi, game, atau penjual…" aria-label="Cari lapak" /><button type="submit">Cari</button></form>
      <label>Tipe transaksi<select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">Semua</option><option value="WTS">WTS · Dijual</option><option value="WTB">WTB · Dicari</option></select></label>
      <label>Nama game<input value={game} onChange={(event) => setGame(event.target.value)} placeholder="Semua game" /></label>
      <label><ArrowDownUp size={14} /> Urutkan harga<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Terbaru</option><option value="cheapest">Termurah</option><option value="expensive">Termahal</option></select></label>
    </section>
    {notice && <div className="inline-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Tutup notifikasi"><X size={15} /></button></div>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    {loading ? <div className="empty-state">Memuat lapak…</div> : posts.length ? <section className="market-grid">
      {posts.map((post) => {
        if (!isPublicMarketData(post.marketData)) return <article className="market-card" key={post.id}><p className="inline-error">Data lapak tidak valid.</p></article>;
        const market = post.marketData;
        return <article className="market-card" key={post.id}>
          <div className="market-listing-labels"><span className={market.type === "WTS" ? "trade-badge wts" : "trade-badge wtb"}>{market.type}</span><span className="market-label-game">{market.game}</span><span className="market-label-price">{money.format(market.price)}</span><span className={`status-badge ${market.status === "AVAILABLE" ? "available" : market.status === "IN_ESCROW" ? "in-escrow" : "sold"}`}>{market.status === "IN_ESCROW" ? "IN ESCROW" : market.status}</span></div>
          <div className="market-image">{market.imageUrl ? <Image src={market.imageUrl} alt={`Bukti lapak ${post.title}`} fill unoptimized sizes="(max-width: 700px) 100vw, 33vw" /> : <ShoppingBag size={28} />}</div>
          <div className="market-card-body"><h2>{post.title}</h2><p className="market-game">{market.game}</p><p className="market-price">{money.format(market.price)}</p><p className="market-description">{post.content}</p>
            <div className="market-card-meta"><span>oleh <strong>{post.author.username ?? "Gamer"}</strong></span><span>{new Date(post.createdAt).toLocaleDateString("id-ID")}</span></div>
            {user && contacts[post.id]?.userId === user.id ? <p className="market-contact-revealed">Kontak penjual: <strong>{contacts[post.id].contact}</strong></p> : <button className="contact-button" disabled={contactLoading === post.id || status === "loading"} onClick={() => void revealContact(post.id)}>{contactLoading === post.id ? "Memuat kontak…" : status === "loading" ? "Memeriksa akun…" : user ? "Lihat Kontak Penjual" : "Login untuk Lihat Kontak"}</button>}
            <div className="market-card-actions">
              {market.status === "AVAILABLE" && market.type === "WTS" && user?.id !== post.authorId && <button className="button button-primary" disabled={escrowLoading === post.id} onClick={() => void startEscrow(post.id)}>{escrowLoading === post.id ? "Memproses…" : "Ajukan transaksi escrow"}</button>}
              {post.escrowTransactions?.filter((transaction) => transaction.sellerId === user?.id || user?.role === "ADMIN" || user?.role === "MODERATOR").map((transaction) => <button key={transaction.id} className="button button-sold" disabled={escrowLoading === post.id} onClick={() => void completeEscrow(transaction.id, post.id)}>{escrowLoading === post.id ? "Memproses…" : "Konfirmasi transaksi selesai"}</button>)}
              <button className="report-button" onClick={() => void report(post.id)}><Flag size={14} /> Report Post</button>
            </div>
          </div>
        </article>;
      })}
    </section> : <div className="empty-state">Belum ada lapak yang cocok. Buat lapak pertama atau ubah filter.</div>}
  </div>
    {compose && <MarketModal onClose={() => setCompose(false)} onCreated={() => { setCompose(false); setRefreshKey((value) => value + 1); }} />}
    <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
    <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setNotice} />
  </main>;
}

function MarketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"WTS" | "WTB">("WTS");
  const [game, setGame] = useState("");
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");
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
      const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "MARKETPLACE", title, content, marketData: { type, game, price: Number(price), contact, imageUrl } }) });
      await readApiResponse<unknown>(response, "Lapak gagal dibuat.");
      onCreated();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Lapak gagal dibuat."); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card market-modal" role="dialog" aria-modal="true" aria-labelledby="market-modal-title"><button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button><p className="section-kicker">PASANG LAPAK</p><h2 id="market-modal-title">Buat Lapak Baru</h2><form className="stack-form" onSubmit={submit}>
    <label>Judul Lapak<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Akun Genshin AR 60" /></label>
    <div className="form-grid-two"><label>Tipe Transaksi<select value={type} onChange={(event) => setType(event.target.value as "WTS" | "WTB")}><option value="WTS">WTS · Saya menjual</option><option value="WTB">WTB · Saya mencari</option></select></label><label>Nama Game<input required value={game} onChange={(event) => setGame(event.target.value)} placeholder="Nama game" /></label></div>
    <div className="form-grid-two"><label>Harga (Rupiah)<input required type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="250000" /></label><label>Kontak Penjual (Discord/WA)<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="username atau nomor WA" /></label></div>
    <label>Deskripsi<textarea required maxLength={10000} rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Jelaskan detail barang dan ketentuan transaksi…" /></label>
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
