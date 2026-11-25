"use client";

import React, { useState, useEffect, FormEvent } from "react";
import {
  X,
  Trophy,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  QrCode,
  Check,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { PriceDisplay } from "@/context/locale-context";

interface TournamentRegistrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  session?: any;
  onSuccess?: (updatedTournament?: any) => void;
}

export function TournamentRegistrationWizardModal({
  isOpen,
  onClose,
  tournament,
  session,
  onSuccess,
}: TournamentRegistrationWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [captainIgn, setCaptainIgn] = useState("");
  const [phone, setPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);
  const [websiteUrlHp, setWebsiteUrlHp] = useState("");

  const [mainPlayers, setMainPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [subPlayers, setSubPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [showSubstitutes, setShowSubstitutes] = useState(false);

  // Status & Validation
  const [error, setError] = useState("");
  const [partyNotice, setPartyNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingParty, setIsFetchingParty] = useState(false);

  const mainCount = tournament?.mainPlayersCount ?? 5;
  const subCount = tournament?.subPlayersCount ?? 2;
  const isPaid = !tournament?.isFreeEntry && (tournament?.entryFee ?? 0) > 0;

  // Real-time phone validation
  const cleanPhoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = cleanPhoneDigits.length >= 10 && cleanPhoneDigits.length <= 15;

  // Initialize roster when opened
  useEffect(() => {
    if (isOpen && tournament) {
      setCurrentStep(1);
      setError("");
      setPartyNotice("");
      setTeamName("");
      setTeamTag("");
      const defaultCaptain = session?.user?.username || session?.user?.name || "";
      setCaptainIgn(defaultCaptain);
      setPhone("");
      setSenderName("");
      setPaymentProof("");
      setAgreeRules(false);
      setWebsiteUrlHp("");

      const mains: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < mainCount; i++) {
        mains.push({
          nickname: i === 0 ? defaultCaptain : "",
          gameId: "",
        });
      }
      setMainPlayers(mains);

      const subs: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < subCount; i++) {
        subs.push({ nickname: "", gameId: "" });
      }
      setSubPlayers(subs);
      setShowSubstitutes(false);
    }
  }, [isOpen, tournament, session, mainCount, subCount]);

  if (!isOpen || !tournament) return null;

  async function handleAutofillParty() {
    setIsFetchingParty(true);
    setError("");
    setPartyNotice("");
    try {
      const res = await fetch("/api/parties/my-party");
      if (!res.ok) throw new Error("Gagal mengambil data party guild.");
      const data = await res.json();
      if (!data.inParty || !data.party) {
        setError("Kamu belum bergabung dalam party resmi. Buat atau gabung party di tab 'Party Skuad'!");
        return;
      }

      const party = data.party;
      setTeamName(party.name || "");
      if (party.tag) setTeamTag(party.tag);

      const members = party.members || [];
      const newMains: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < mainCount; i++) {
        const mem = members[i];
        newMains.push({
          nickname: mem?.inGameNickname || mem?.user?.username || (i === 0 ? (session?.user?.username || "") : ""),
          gameId: mem?.inGameId || "",
        });
      }
      setMainPlayers(newMains);

      const newSubs: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < subCount; i++) {
        const mem = members[mainCount + i];
        newSubs.push({
          nickname: mem?.inGameNickname || mem?.user?.username || "",
          gameId: mem?.inGameId || "",
        });
      }
      setSubPlayers(newSubs);

      if (members[0]?.inGameNickname) {
        setCaptainIgn(members[0].inGameNickname);
      }

      setPartyNotice(`⚡ Berhasil mengisi data dari Party [${party.tag}] ${party.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal autofill dari party.");
    } finally {
      setIsFetchingParty(false);
    }
  }

  function handleGoToStep2() {
    setError("");
    if (!teamName.trim() || teamName.trim().length < 2) {
      setError("Nama tim wajib diisi (minimal 2 karakter).");
      return;
    }
    const cleanCap = captainIgn.trim() || mainPlayers[0]?.nickname.trim();
    if (!cleanCap || cleanCap.length < 2) {
      setError("Nama / Nickname Kapten Tim wajib diisi (minimal 2 karakter).");
      return;
    }
    if (!isPhoneValid) {
      setError("Nomor WhatsApp kapten wajib valid (10 - 15 digit angka, contoh: 08123456789).");
      return;
    }
    setCurrentStep(2);
  }

  function handleGoToStep3() {
    setError("");
    for (let i = 0; i < mainPlayers.length; i++) {
      const p = mainPlayers[i];
      if (!p.nickname.trim() || !p.gameId.trim()) {
        setError(`Pemain Inti #${i + 1} wajib diisi lengkap (Nickname dan ID / Tag Game).`);
        return;
      }
    }
    setCurrentStep(3);
  }

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!agreeRules) {
      setError("Kamu wajib menyetujui regulasi dan tata tertib turnamen.");
      return;
    }

    if (isPaid) {
      if (!senderName.trim()) {
        setError("Nama pengirim rekening / e-wallet pembayaran wajib diisi.");
        return;
      }
      if (!paymentProof) {
        setError("Bukti transfer pembayaran QRIS wajib dilampirkan.");
        return;
      }
    }

    const cleanCap = captainIgn.trim() || mainPlayers[0]?.nickname.trim();
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    const roster = [
      ...mainPlayers.map((p) => ({
        name: p.nickname.trim(),
        inGameId: p.gameId.trim(),
        role: "MAIN" as const,
      })),
      ...subPlayers
        .filter((p) => p.nickname.trim() && p.gameId.trim())
        .map((p) => ({
          name: p.nickname.trim(),
          inGameId: p.gameId.trim(),
          role: "SUB" as const,
        })),
    ];

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          teamTag: teamTag.trim() || undefined,
          phone: cleanPhone,
          captainName: cleanCap,
          captainIgn: cleanCap,
          senderName: isPaid ? senderName.trim() : undefined,
          paymentProof: isPaid ? paymentProof : undefined,
          website_url_hp: websiteUrlHp,
          mainPlayers: mainPlayers.map((p) => ({
            name: p.nickname.trim(),
            nickname: p.nickname.trim(),
            inGameId: p.gameId.trim(),
            gameId: p.gameId.trim(),
          })),
          subPlayers: subPlayers
            .filter((p) => p.nickname.trim() && p.gameId.trim())
            .map((p) => ({
              name: p.nickname.trim(),
              nickname: p.nickname.trim(),
              inGameId: p.gameId.trim(),
              gameId: p.gameId.trim(),
            })),
          roster,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftarkan tim turnamen.");
      }

      if (onSuccess) {
        onSuccess(data.tournament);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#11091D] border-2 border-[#7C3AED]/70 shadow-2xl rounded-none flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#160D27] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#7C3AED]/15 border border-[#7C3AED]/40 rounded-none text-[#7C3AED] dark:text-[#A78BFA]">
              <Trophy size={18} />
            </div>
            <div>
              <div className="font-mono text-[11px] font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                <span>PENDAFTARAN TURNAMEN RESMI</span>
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span className="text-amber-500 font-semibold">{tournament.game}</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] truncate max-w-sm sm:max-w-md">
                {tournament.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition rounded-none hover:bg-slate-200 dark:hover:bg-white/10"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP PROGRESSION BAR */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#0E061A] shrink-0">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
            {/* Step 1 Tab */}
            <div
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border-b-2 transition-all ${
                currentStep === 1
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-[#7C3AED]/5"
                  : currentStep > 1
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-400 dark:text-slate-500"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 1 ? "bg-[#7C3AED] text-white" : currentStep > 1 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}>
                {currentStep > 1 ? <Check size={12} /> : "1"}
              </span>
              <span className="truncate">1. Identitas Tim</span>
            </div>

            {/* Step 2 Tab */}
            <div
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border-b-2 transition-all ${
                currentStep === 2
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-[#7C3AED]/5"
                  : currentStep > 2
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-400 dark:text-slate-500"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? "bg-[#7C3AED] text-white" : currentStep > 2 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}>
                {currentStep > 2 ? <Check size={12} /> : "2"}
              </span>
              <span className="truncate">2. Roster Pemain</span>
            </div>

            {/* Step 3 Tab */}
            <div
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border-b-2 transition-all ${
                currentStep === 3
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-[#7C3AED]/5"
                  : "border-transparent text-slate-400 dark:text-slate-500"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? "bg-[#7C3AED] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}>
                3
              </span>
              <span className="truncate">3. Konfirmasi</span>
            </div>
          </div>
        </div>

        {/* NOTICES & ERRORS */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}
        {partyNotice && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="leading-snug">{partyNotice}</span>
          </div>
        )}

        {/* BODY CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Anti-Bot Honeypot */}
          <input
            type="text"
            name="website_url_hp"
            value={websiteUrlHp}
            onChange={(e) => setWebsiteUrlHp(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
          />
          {/* =================================================================== */}
          {/* STEP 1: IDENTITAS TIM & KONTAK KAPTEN                               */}
          {/* =================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Shortcut Autofill from Party */}
              <div className="p-3.5 bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 border border-[#7C3AED]/30 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles size={16} className="text-[#A78BFA] shrink-0" />
                  <span className="text-slate-800 dark:text-[#E9D5FF] font-medium">
                    Punya Guild Party resmi di LogHorizon?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutofillParty}
                  disabled={isFetchingParty}
                  className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <span>{isFetchingParty ? "Memeriksa..." : "⚡ Isi Otomatis dari Party Saya"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1 text-left">
                  <label className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Tim <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Contoh: LogHorizon Esports"
                    className="w-full h-10 px-3 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tag Tim <span className="text-slate-400 text-[10px]">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
                    placeholder="[LH]"
                    maxLength={6}
                    className="w-full h-10 px-3 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-mono font-bold focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    IGN / Nickname Kapten Tim <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={captainIgn}
                    onChange={(e) => {
                      setCaptainIgn(e.target.value);
                      if (mainPlayers.length > 0) {
                        setMainPlayers((prev) =>
                          prev.map((p, i) => (i === 0 ? { ...p, nickname: e.target.value } : p))
                        );
                      }
                    }}
                    placeholder="Contoh: Shiroe"
                    className="w-full h-10 px-3 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone size={12} className="text-emerald-500" />
                      <span>WhatsApp Kapten (Aktif) <span className="text-rose-500">*</span></span>
                    </label>
                    {phone && (
                      <span className={`text-[10px] font-mono font-semibold ${isPhoneValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                        {isPhoneValid ? "✓ Format Valid" : "Minimal 10 digit"}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 / 628123456789"
                    className={`w-full h-10 px-3 border bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-mono focus:outline-none ${
                      phone
                        ? isPhoneValid
                          ? "border-emerald-500 focus:border-emerald-600"
                          : "border-amber-500 focus:border-amber-600"
                        : "border-slate-300 dark:border-[#2E1E45] focus:border-[#7C3AED]"
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Digunakan staf panitia untuk koordinasi bracket, match lobby, dan verifikasi slot.
                  </p>
                </div>
              </div>

              {/* Guest Information Note */}
              <div className="p-3 bg-slate-100 dark:bg-[#180E28] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
                <span>
                  Mode Terbuka: Member guild maupun tim umum (Guest) dapat mendaftar. Simpan nomor WhatsApp untuk fitur <strong>🔍 Cek Status Tim</strong>.
                </span>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2: ROSTER 5 PEMAIN INTI & CADANGAN                             */}
          {/* =================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">
                    Roster {mainCount} Pemain Inti <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pemain #1 otomatis berperan sebagai Kapten Tim.
                  </p>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Wajib Diisi Semua
                </span>
              </div>

              {/* MAIN PLAYERS LIST */}
              <div className="space-y-2">
                {mainPlayers.map((player, idx) => (
                  <div
                    key={`main-${idx}`}
                    className="p-2.5 sm:p-3 bg-slate-50 dark:bg-[#160D27] border border-slate-200 dark:border-[#2E1E45] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-none text-[11px] font-mono font-bold flex items-center justify-center ${
                        idx === 0 ? "bg-amber-500 text-slate-950" : "bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA]"
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {idx === 0 ? "Kapten" : `Inti #${idx + 1}`}
                      </span>
                    </div>

                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={player.nickname}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMainPlayers((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, nickname: val } : p))
                          );
                          if (idx === 0) setCaptainIgn(val);
                        }}
                        placeholder={`Nickname Game Pemain #${idx + 1}`}
                        className="w-full h-8 px-2.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={player.gameId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMainPlayers((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, gameId: val } : p))
                          );
                        }}
                        placeholder="ID / Tag Game *"
                        className="w-full h-8 px-2.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* COLLAPSIBLE SUBSTITUTES */}
              {subCount > 0 && (
                <div className="border border-slate-200 dark:border-[#2E1E45] mt-3">
                  <button
                    type="button"
                    onClick={() => setShowSubstitutes(!showSubstitutes)}
                    className="w-full p-3 bg-slate-100 dark:bg-[#180E28] hover:bg-slate-200 dark:hover:bg-[#1F1235] text-left flex items-center justify-between transition text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-[#A78BFA]" />
                      <span>Roster Pemain Cadangan ({subCount} Slot Opsional)</span>
                    </span>
                    {showSubstitutes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showSubstitutes && (
                    <div className="p-3 bg-white dark:bg-[#11091D] space-y-2 border-t border-slate-200 dark:border-[#2E1E45]">
                      {subPlayers.map((player, idx) => (
                        <div
                          key={`sub-${idx}`}
                          className="p-2.5 bg-slate-50 dark:bg-[#160D27] border border-slate-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <div className="sm:col-span-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-none text-[11px] font-mono font-bold flex items-center justify-center bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                              Sub
                            </span>
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              Cadangan #{idx + 1}
                            </span>
                          </div>
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={player.nickname}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubPlayers((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, nickname: val } : p))
                                );
                              }}
                              placeholder={`Nickname Cadangan #${idx + 1}`}
                              className="w-full h-8 px-2.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={player.gameId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubPlayers((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, gameId: val } : p))
                                );
                              }}
                              placeholder="ID Game (Opsional)"
                              className="w-full h-8 px-2.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 3: RINGKASAN, PEMBAYARAN QRIS & PERSETUJUAN                    */}
          {/* =================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#160D27] border border-slate-200 dark:border-[#2E1E45] space-y-2 text-xs">
                <div className="font-mono text-[11px] font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider">
                  RINGKASAN PENDAFTARAN TIM
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama Tim:</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {teamTag ? `[${teamTag}] ` : ""}
                      {teamName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kapten &amp; WhatsApp:</span>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {captainIgn} ({phone})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pemain Inti ({mainPlayers.length}):</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {mainPlayers.map((p) => p.nickname).join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Biaya Pendaftaran:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {isPaid ? <PriceDisplay amountIdr={tournament.entryFee} /> : "GRATIS (FREE ENTRY)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT SECTION (IF PAID) */}
              {isPaid && (
                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-amber-500" />
                    <h5 className="font-display text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                      Instruksi Pembayaran Biaya Pendaftaran
                    </h5>
                  </div>

                  {tournament.qrisImageUrl && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#11091D] p-3 border border-amber-500/20">
                      <div className="p-1 bg-white border border-slate-200 shrink-0">
                        <img
                          src={tournament.qrisImageUrl}
                          alt="QRIS Pembayaran"
                          className="w-28 h-28 object-contain"
                        />
                      </div>
                      <div className="text-xs text-left space-y-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          Scan QRIS Resmi Turnamen
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {tournament.qrisText || "Scan QRIS menggunakan BCA, Mandiri, GoPay, OVO, Dana, atau ShopeePay. Simpan bukti transfer untuk dilampirkan di bawah."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <label className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nama Pemilik Rekening / Akun E-Wallet Pengirim <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Contoh: Budi Santoso / Akun Dana"
                      className="w-full h-10 px-3 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <ImageUploader
                      value={paymentProof}
                      onChange={setPaymentProof}
                      label="Upload Screenshot Bukti Transfer *"
                      required={!paymentProof}
                      description="Format JPG, PNG, atau WebP (otomatis dikompresi agar hemat kuota)."
                    />
                  </div>
                </div>
              )}

              {/* RULES AGREEMENT CHECKBOX */}
              <div className="p-3 bg-slate-50 dark:bg-[#160D27] border border-slate-200 dark:border-[#2E1E45] flex items-start gap-3 text-left">
                <input
                  type="checkbox"
                  id="agree-rules"
                  checked={agreeRules}
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <label htmlFor="agree-rules" className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
                  Saya selaku kapten/perwakilan menyatakan bahwa seluruh data roster valid, bersedia hadir tepat waktu di room pertandingan, dan tunduk pada <strong>Regulasi Resmi &amp; Fair Play LogHorizon</strong>.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BUTTON ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#160D27] flex items-center justify-between shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setCurrentStep((prev) => (prev - 1) as any);
              }}
              className="px-4 py-2 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-200 font-mono text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-[#251540] flex items-center gap-1.5"
            >
              <ChevronLeft size={15} />
              <span>Kembali</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-200 font-mono text-xs font-bold transition hover:bg-slate-100 dark:hover:bg-[#251540]"
            >
              Batal
            </button>
          )}

          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleGoToStep2}
              className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Lanjut ke Roster Pemain</span>
              <ChevronRight size={15} />
            </button>
          )}

          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleGoToStep3}
              className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Lanjut ke Konfirmasi</span>
              <ChevronRight size={15} />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !agreeRules}
              className="px-6 py-2.5 bg-gradient-to-r from-[#7C3AED] to-emerald-600 hover:from-[#6D28D9] hover:to-emerald-700 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Trophy size={15} />
              <span>{isSubmitting ? "Mendaftarkan Tim..." : "🏆 Selesaikan Pendaftaran Tim"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
