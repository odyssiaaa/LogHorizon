"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { BadgeCheck, Crown, Gem, HeartHandshake, ShieldCheck, Wallet, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const tiers = [
  { id: "ADVENTURER_SUPPORT", name: "Adventurer Support", icon: ShieldCheck, price: "Kontribusi bebas", badge: "Guild Supporter", benefits: ["Badge supporter di profil dan leaderboard", "Dukungan operasional guild", "Role Knight setelah pembayaran terverifikasi"] },
  { id: "ELITE_PARTY_MEMBER", name: "Elite Party Member", icon: Crown, price: "Dukungan bulanan", badge: "High Merchant", benefits: ["Status Premium setelah pembayaran terverifikasi", "Warna username premium dan akses pin forum", "Role High Merchant setelah pembayaran terverifikasi"] },
  { id: "GUILD_BENEFACTOR", name: "Guild Benefactor", icon: Gem, price: "Sponsor turnamen", badge: "Guild Benefactor", benefits: ["Badge benefactor di profil", "Sorotan sponsor setelah verifikasi", "Role Noble Patron setelah pembayaran terverifikasi"] },
] as const;
type TierId = (typeof tiers)[number]["id"];

export function DonationForm({ simulationEnabled }: { simulationEnabled: boolean }) {
  const { data: session, update } = useSession();
  const [tier, setTier] = useState<TierId | null>(null);
  const [amount, setAmount] = useState("25000");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [treasury, setTreasury] = useState<{ total: number; goal: number | null } | null>(null);

  useEffect(() => {
    fetch("/api/donate")
      .then(async (response) => readApiResponse<{ total: number; goal: number | null }>(response, "Ringkasan kas gagal dimuat."))
      .then(setTreasury)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Ringkasan kas gagal dimuat."));
  }, []);

  async function processPayment() {
    if (!tier) return;
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isSafeInteger(numericAmount) || numericAmount < 5000 || numericAmount > 1_000_000) {
      setError("Nominal simulasi harus Rp5.000–Rp1.000.000.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    await new Promise((resolve) => window.setTimeout(resolve, 3_000));
    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, tier }),
      });
      const result = await readApiResponse<{ notice: string }>(response, "Donasi belum berhasil.");
      setMessage(result.notice);
      setTier(null);
      const summaryResponse = await fetch("/api/donate");
      const summary = await readApiResponse<{ total: number; goal: number | null }>(summaryResponse, "Ringkasan kas gagal dimuat.");
      setTreasury(summary);
      await update();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Donasi belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  const progress = treasury?.goal ? Math.min(100, (treasury.total / treasury.goal) * 100) : 0;
  const selectedTier = tiers.find((item) => item.id === tier);

  return (
    <main className="page-shell donate-page treasury-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <header className="treasury-hero mb-8">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">LOGHORIZON / COMMUNITY FUND</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">GUILD TREASURY <span className="text-[#9D4EDD] dark:text-[#C77DFF]">&amp; BENEFACTOR</span></h1>
        <p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl mt-2 leading-relaxed">Dukung operasional server, kembangkan ekosistem, dan danai turnamen komunitas berhadiah massal. Setiap kontribusi kamu akan membuka kasta benefit eksklusif.</p>
        <div className="treasury-progress mt-6">
          <div><span>Kas tercatat</span><strong>{treasury ? formatMoney.format(treasury.total) : "Memuat…"}</strong></div>
          <div><span>{treasury?.goal ? "Target kas" : "Target kas belum diatur"}</span><strong>{treasury?.goal ? formatMoney.format(treasury.goal) : "—"}</strong></div>
          <div className="treasury-track" role="progressbar" aria-label="Progres kas komunitas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
          <small>{treasury?.goal ? `${Math.round(progress)}% dari target` : "Atur GUILD_TREASURY_GOAL_IDR untuk menampilkan progres target."}</small>
        </div>
      </header>

      <div className="treasury-tier-grid grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 my-6">
        {tiers.map(({ id, name, icon: Icon, price, badge, benefits }, index) => (
          <article className={`treasury-tier tier-${index + 1} p-5 sm:p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex flex-col justify-between`} key={id}>
            <div>
              <div className="treasury-tier-icon w-10 h-10 rounded bg-[#9D4EDD]/10 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center mb-3"><Icon size={20} /></div>
              <p className="section-kicker text-[10px] font-bold text-[#9D4EDD] uppercase tracking-wider">TIER 0{index + 1}</p>
              <h2 className="text-lg sm:text-xl font-bold break-words text-gray-900 dark:text-white mt-1">{name}</h2>
              <strong className="treasury-tier-price text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-300 block my-1">{price}</strong>
              <span className="treasury-badge inline-block px-2.5 py-1 text-xs font-bold rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 my-2">{badge}</span>
              <ul className="space-y-2 mt-3">{benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-snug"><BadgeCheck size={15} className="text-[#9D4EDD] shrink-0 mt-0.5" /><span>{benefit}</span></li>)}</ul>
              {id === "ELITE_PARTY_MEMBER" && session?.user?.isPremium && <p className="premium-state text-xs font-bold text-amber-500 flex items-center gap-1.5 mt-3"><ShieldCheck size={15} /> Status Premium aktif</p>}
            </div>
            <button type="button" className="button button-primary w-full mt-6 justify-center flex items-center gap-2" onClick={() => { setTier(id); setAmount(id === "ADVENTURER_SUPPORT" ? "10000" : id === "ELITE_PARTY_MEMBER" ? "50000" : "100000"); setError(""); }}>
              <HeartHandshake size={16} /> <span>Pilih tier</span>
            </button>
          </article>
        ))}
      </div>
      {(message || error) && <div className={error ? "inline-error" : "inline-notice"} role={error ? "alert" : "status"}>{error || message}</div>}
      <p className="donation-disclaimer treasury-disclaimer">Gateway saat ini simulasi untuk development, bukan pembayaran nyata. Benefit dan role Discord baru aktif setelah pembayaran diverifikasi; otomatisasi role Discord memerlukan konfigurasi bot tepercaya.</p>

      {tier && selectedTier && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setTier(null); }}>
        <section className="modal-card treasury-modal" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-title">
          <button type="button" className="modal-close" onClick={() => setTier(null)} disabled={loading} aria-label="Tutup"><X size={18} /></button>
          <p className="section-kicker">SIMULASI PAYMENT GATEWAY</p><h2 id="treasury-modal-title">{selectedTier.name}</h2>
          <label className="treasury-amount-label">Nominal kontribusi (IDR)<input type="number" min={5000} max={1000000} step={1000} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="mock-qris"><Wallet size={28} /><strong>QRIS / PAYMENT MOCKUP</strong><span>Bukan kode pembayaran aktif</span><code>{formatMoney.format(Number(amount) || 0)}</code></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="button button-primary treasury-pay-button" onClick={() => void processPayment()} disabled={loading || !simulationEnabled}>
            {loading ? "Memeriksa pembayaran…" : !simulationEnabled ? "Payment gateway belum tersedia" : session?.user ? "Simulasikan pembayaran" : "Login Discord untuk lanjut"}
          </button>
          {loading && <div className="treasury-loading" role="status">Memverifikasi transaksi simulasi…</div>}
        </section>
      </div>}
    </main>
  );
}
