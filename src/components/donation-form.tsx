"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { BadgeCheck, Crown, Gem, HeartHandshake, QrCode, ShieldCheck, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const tiers = [
  {
    id: "ADVENTURER_SUPPORT",
    name: "Adventurer Support",
    icon: ShieldCheck,
    price: "Rp 10.000 - Rp 49.999",
    rangeText: "Rp 10.000 - Rp 49.999",
    badge: "Knight",
    min: 10000,
    max: 49999,
    benefits: [
      "Role & Lencana Knight di profil dan leaderboard",
      "Dukungan operasional server guild",
      "Diaktifkan setelah verifikasi Admin",
    ],
  },
  {
    id: "ELITE_PARTY_MEMBER",
    name: "Elite Party Member",
    icon: Crown,
    price: "Rp 50.000 - Rp 99.999",
    rangeText: "Rp 50.000 - Rp 99.999",
    badge: "High Merchant",
    min: 50000,
    max: 99999,
    benefits: [
      "Status Premium (Elite Party Member)",
      "Bebas fee marketplace dan sorotan khusus",
      "Role High Merchant setelah verifikasi Admin",
    ],
  },
  {
    id: "GUILD_BENEFACTOR",
    name: "Guild Benefactor",
    icon: Gem,
    price: "Mulai Rp 100.000+",
    rangeText: "Mulai Rp 100.000+",
    badge: "Noble Patron",
    min: 100000,
    max: Infinity,
    benefits: [
      "Lencana Noble Patron di profil & leaderboard",
      "Sorotan benefactor utama turnamen guild",
      "Role kehormatan Noble Patron setelah verifikasi Admin",
    ],
  },
] as const;

type TierId = (typeof tiers)[number]["id"];

type TreasurySummary = {
  total: number;
  goal: number | null;
  qrisImageUrl?: string;
  minDonation?: number;
};

function getTierByAmount(val: number): TierId {
  if (val >= 100000) return "GUILD_BENEFACTOR";
  if (val >= 50000) return "ELITE_PARTY_MEMBER";
  return "ADVENTURER_SUPPORT";
}

export function DonationForm({ simulationEnabled: _simulationEnabled }: { simulationEnabled: boolean }) {
  const { data: session } = useSession();
  const [tier, setTier] = useState<TierId | null>(null);
  const [amount, setAmount] = useState("50000");
  const [senderName, setSenderName] = useState("");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);

  useEffect(() => {
    fetch("/api/donate")
      .then(async (response) => readApiResponse<TreasurySummary>(response, "Ringkasan kas gagal dimuat."))
      .then(setTreasury)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Ringkasan kas gagal dimuat."));
  }, []);

  function handleAmountChange(newVal: string) {
    setAmount(newVal);
    const num = Number(newVal);
    if (Number.isSafeInteger(num) && num > 0) {
      setTier(getTierByAmount(num));
    }
  }

  async function submitTransferConfirmation() {
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isSafeInteger(numericAmount) || numericAmount < 10000 || numericAmount > 10_000_000) {
      setError("Nominal donasi harus minimal Rp 10.000 (maksimal Rp 10.000.000).");
      return;
    }
    if (!senderName.trim()) {
      setError("Harap isi nama pengirim / pemilik rekening transfer.");
      return;
    }

    const currentTier = getTierByAmount(numericAmount);

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          tier: currentTier,
          senderName: senderName.trim(),
          notes: notes.trim(),
          proofUrl: proofUrl.trim(),
        }),
      });

      const result = await readApiResponse<{ notice: string }>(response, "Konfirmasi donasi gagal dikirim.");
      setMessage(result.notice);
      setTier(null);
      setSenderName("");
      setNotes("");
      setProofUrl("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konfirmasi donasi gagal dikirim.");
    } finally {
      setLoading(false);
    }
  }

  const progress = treasury?.goal ? Math.min(100, (treasury.total / treasury.goal) * 100) : 0;
  const selectedTier = tiers.find((item) => item.id === tier) ?? tiers[0];
  const qrisUrl = treasury?.qrisImageUrl || process.env.NEXT_PUBLIC_QRIS_IMAGE_URL || "/qris-guild.png";

  return (
    <main className="page-shell donate-page treasury-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <header className="treasury-hero mb-8">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">LOGHORIZON / COMMUNITY FUND</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
          GUILD TREASURY <span className="text-[#9D4EDD] dark:text-[#C77DFF]">&amp; BENEFACTOR</span>
        </h1>
        <p className="muted-copy text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mt-2 leading-relaxed">
          Dukung operasional server, kembangkan ekosistem, dan danai turnamen komunitas berhadiah massal. Setiap kontribusi kamu akan diverifikasi langsung oleh Admin untuk membuka kasta benefit eksklusif.
        </p>

        <div className="treasury-progress mt-6">
          <div>
            <span>Kas terverifikasi</span>
            <strong>{treasury ? formatMoney.format(treasury.total) : "Memuat…"}</strong>
          </div>
          <div>
            <span>Target kas komunitas</span>
            <strong>{treasury?.goal ? formatMoney.format(treasury.goal) : "Rp 5.000.000"}</strong>
          </div>
          <div className="treasury-track" role="progressbar" aria-label="Progres kas komunitas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{treasury?.goal ? `${Math.round(progress)}% dari target bulanan` : "Target pendanaan operasional guild"}</small>
        </div>
      </header>

      {message && (
        <div className="p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold mb-6 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}

      <div className="treasury-tier-grid grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 my-6">
        {tiers.map(({ id, name, icon: Icon, price, badge, benefits }, index) => (
          <article className={`treasury-tier tier-${index + 1} p-5 sm:p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex flex-col justify-between`} key={id}>
            <div>
              <div className="treasury-tier-icon w-10 h-10 rounded bg-[#9D4EDD]/10 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center mb-3">
                <Icon size={20} />
              </div>
              <p className="section-kicker text-[10px] font-bold text-[#9D4EDD] uppercase tracking-wider">TIER 0{index + 1}</p>
              <h2 className="text-lg md:text-xl font-bold break-words text-gray-900 dark:text-white mt-1">{name}</h2>
              <strong className="treasury-tier-price text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-300 block my-1">{price}</strong>
              <span className="treasury-badge inline-block px-2.5 py-1 text-xs font-bold rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 my-2">
                {badge}
              </span>
              <ul className="space-y-2 mt-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-snug">
                    <BadgeCheck size={15} className="text-[#9D4EDD] shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {id === "ELITE_PARTY_MEMBER" && session?.user?.isPremium && (
                <p className="premium-state text-xs font-bold text-amber-500 flex items-center gap-1.5 mt-3">
                  <ShieldCheck size={15} /> Status Premium aktif
                </p>
              )}
            </div>
            <button
              type="button"
              className="button button-primary w-full mt-6 justify-center flex items-center gap-2"
              onClick={() => {
                setTier(id);
                setAmount(id === "ADVENTURER_SUPPORT" ? "25000" : id === "ELITE_PARTY_MEMBER" ? "50000" : "100000");
                setError("");
              }}
            >
              <HeartHandshake size={16} /> <span>Pilih Tier Ini</span>
            </button>
          </article>
        ))}
      </div>

      <p className="donation-disclaimer treasury-disclaimer text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
        Seluruh donasi disalurkan via QRIS resmi perbendaharaan guild LogHorizon. Demi keamanan dan akurasi kas, setiap transaksi wajib dikonfirmasi dan diverifikasi oleh jajaran Admin sebelum status kasta diaktifkan.
      </p>

      {/* QRIS PAYMENT & CONFIRMATION MODAL */}
      {tier && selectedTier && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setTier(null); }}>
          <section className="modal-card treasury-modal bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-title">
            <button type="button" className="modal-close absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setTier(null)} disabled={loading} aria-label="Tutup">
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <p className="section-kicker text-xs font-bold text-[#9D4EDD] uppercase tracking-wider">KAS PERBENDAHARAAN GUILD</p>
              <h2 id="treasury-modal-title" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                {selectedTier.name}
              </h2>
            </div>

            {/* QRIS OFFICIAL GUILD DISPLAY */}
            <div className="bg-[#08060B] border border-purple-500/30 rounded-lg p-4 text-center my-4 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-2">
                <QrCode size={16} /> QRIS RESMI GUILD LOGHORIZON
              </div>
              <div className="relative w-48 h-64 sm:w-56 sm:h-72 rounded overflow-hidden border border-white/10 shadow-lg bg-white">
                <Image
                  src={qrisUrl}
                  alt="QRIS Resmi Guild LogHorizon"
                  fill
                  sizes="(max-width: 640px) 192px, 224px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                NMID: <strong>ID1025450776899</strong> (odyssiavault)
              </p>
              <p className="text-[11px] text-gray-500">
                Mendukung semua Bank &amp; E-Wallet (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay)
              </p>
            </div>

            {/* TRANSFER CONFIRMATION FORM */}
            <div className="space-y-3 mt-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nominal Transfer (IDR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={10000}
                  max={10000000}
                  step={5000}
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="50000"
                />
              </div>

              {/* Dynamic Tier Explanation */}
              <div className="p-3 rounded-lg bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-xs text-purple-700 dark:text-purple-300">
                <p className="font-semibold">
                  Nominal kamu masuk ke kategori <span className="font-bold underline">{selectedTier.name}</span> dengan benefit <span className="font-bold underline">{selectedTier.badge}</span>.
                </p>
                {Number(amount) < 10000 && (
                  <p className="text-red-400 font-bold mt-1">
                    Batas minimal donasi adalah Rp 10.000 untuk mendapatkan benefit guild.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Pengirim / Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="Contoh: Budi Santoso / Akun Dana"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ID Transaksi / Catatan Transfer (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="No. Ref / Catatan transfer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Link Bukti Transfer / Screenshot (Opsional)
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(event) => setProofUrl(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="https://imgur.com/... atau tautan gambar"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-semibold mt-3" role="alert">{error}</p>}

            <button
              type="button"
              className="button button-primary w-full mt-6 justify-center flex items-center gap-2 py-3 text-sm font-bold"
              onClick={() => void submitTransferConfirmation()}
              disabled={loading}
            >
              {loading
                ? "Mengirim konfirmasi…"
                : session?.user
                  ? "Konfirmasi Sudah Transfer"
                  : "Login Discord untuk lanjut"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
