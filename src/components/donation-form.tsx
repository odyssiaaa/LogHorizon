"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { BadgeCheck, Crown, Gem, HeartHandshake, QrCode, ShieldCheck, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { ImageUploader } from "@/components/ui/image-uploader";

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
    <main className="donate-page treasury-page py-6 sm:py-10 w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 overflow-x-hidden text-left">
      <header className="treasury-hero mb-8 border-b border-[#2E1E45] pb-6">
        <p className="section-kicker text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
          LOGHORIZON // COMMUNITY FUND &amp; TREASURY
        </p>
        <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-[#F8FAFC] break-words">
          GUILD TREASURY <span className="text-[#A78BFA]">&amp; BENEFACTOR</span>
        </h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-[#A78BFA] max-w-2xl mt-2 leading-relaxed font-sans">
          Dukung operasional server, kembangkan ekosistem, dan danai turnamen komunitas berhadiah massal. Setiap kontribusi kamu akan diverifikasi langsung oleh Admin untuk membuka kasta benefit eksklusif.
        </p>
      </header>

      {message && (
        <div className="p-4 rounded-none bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-semibold mb-6 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-none bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono font-semibold mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}

      <div className="treasury-tier-grid grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-6">
        {tiers.map(({ id, name, icon: Icon, price, badge, benefits }, index) => (
          <article className={`treasury-tier tier-${index + 1} p-5 sm:p-6 rounded-none border border-[#2E1E45] bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between text-left`} key={id}>
            <div>
              <div className="treasury-tier-icon w-10 h-10 rounded-none bg-[#1A0E2E] border border-[#2E1E45] text-[#A78BFA] flex items-center justify-center mb-3">
                <Icon size={20} />
              </div>
              <p className="section-kicker text-[10px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider">TIER 0{index + 1}</p>
              <h2 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight break-words text-[#F8FAFC] mt-1">{name}</h2>
              <strong className="treasury-tier-price text-sm sm:text-base font-mono font-extrabold text-[#10B981] block my-1">{price}</strong>
              <span className="treasury-badge inline-block px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-none bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30 my-2">
                {badge}
              </span>
              <ul className="space-y-2 mt-3 font-sans">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-xs sm:text-sm text-[#A78BFA] leading-snug">
                    <BadgeCheck size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {(session?.user?.username === ".odyssia" || session?.user?.username === "odyssia") ? (
                <p className="premium-state text-xs font-mono font-bold text-[#F59E0B] flex items-center gap-1.5 mt-3">
                  <ShieldCheck size={15} /> Benefit Guild Emperor &amp; Noble Patron Aktif
                </p>
              ) : session?.user?.role === "ADMIN" ? (
                <p className="premium-state text-xs font-mono font-bold text-[#A78BFA] flex items-center gap-1.5 mt-3">
                  <ShieldCheck size={15} /> Hak Istimewa Prince / Princess (High Council) Aktif
                </p>
              ) : (id === "ELITE_PARTY_MEMBER" && session?.user?.isPremium) && (
                <p className="premium-state text-xs font-mono font-bold text-[#10B981] flex items-center gap-1.5 mt-3">
                  <ShieldCheck size={15} /> Status Premium aktif
                </p>
              )}
            </div>
            <button
              type="button"
              className="w-full mt-6 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] justify-center flex items-center gap-2 transition-colors"
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

      <p className="donation-disclaimer treasury-disclaimer text-xs text-[#A78BFA] font-mono mt-4 leading-relaxed">
        Seluruh donasi disalurkan via QRIS resmi perbendaharaan guild LogHorizon. Demi keamanan dan akurasi kas, setiap transaksi wajib dikonfirmasi dan diverifikasi oleh jajaran Admin sebelum status kasta diaktifkan.
      </p>

      {/* QRIS PAYMENT & CONFIRMATION MODAL */}
      {tier && selectedTier && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-[#09040F]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setTier(null); }}>
          <section className="modal-card treasury-modal bg-[#130921] border border-[#2E1E45] rounded-none p-5 sm:p-8 w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative my-auto text-left" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-title">
            <button type="button" className="modal-close absolute top-4 right-4 text-[#A78BFA] hover:text-[#F8FAFC]" onClick={() => setTier(null)} disabled={loading} aria-label="Tutup">
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <p className="section-kicker text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-wider">KAS PERBENDAHARAAN GUILD</p>
              <h2 id="treasury-modal-title" className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#F8FAFC] mt-1">
                {selectedTier.name}
              </h2>
            </div>

            {/* QRIS OFFICIAL GUILD DISPLAY */}
            <div className="bg-[#1A0E2E] border border-[#2E1E45] rounded-none p-4 text-center my-4 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#A78BFA] mb-2 uppercase">
                <QrCode size={16} /> QRIS RESMI GUILD LOGHORIZON
              </div>
              <div className="relative w-48 h-64 sm:w-56 sm:h-72 rounded-none overflow-hidden shadow-lg bg-white border border-[#2E1E45]">
                <Image
                  src={qrisUrl}
                  alt="QRIS Resmi Guild LogHorizon"
                  fill
                  sizes="(max-width: 640px) 192px, 224px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] font-mono text-[#A78BFA] mt-2">
                NMID: <strong className="text-[#F8FAFC]">ID1025450776899</strong> (odyssiavault)
              </p>
              <p className="text-[10px] font-mono text-[#A78BFA]/70">
                Mendukung semua Bank &amp; E-Wallet (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay)
              </p>
            </div>

            {/* TRANSFER CONFIRMATION FORM */}
            <div className="space-y-3 mt-4 text-left font-mono">
              <div>
                <label className="block text-xs font-bold text-[#A78BFA] mb-1 uppercase">
                  Nominal Transfer (IDR) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={10000}
                  max={10000000}
                  step={5000}
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-[#2E1E45] bg-[#1A0E2E] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7C3AED]"
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
                <ImageUploader
                  value={proofUrl}
                  onChange={setProofUrl}
                  label="Bukti Struk Transfer / Screenshot QRIS (Opsional)"
                  description="Pilih foto langsung dari galeri HP atau PC. Otomatis dikompresi ringan."
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
