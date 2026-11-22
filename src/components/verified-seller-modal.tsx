"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";

interface VerifiedSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type StaffUser = {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  roleTitle: string;
  role: string;
  isOnline: boolean;
  discordId?: string | null;
};

export function VerifiedSellerModal({
  isOpen,
  onClose,
  onSuccess,
}: VerifiedSellerModalProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [pactAccepted, setPactAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("NONE");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  // Fetch status & available staff
  useEffect(() => {
    if (!isOpen) return;
    setLoadingStaff(true);
    fetch("/api/user/seller-verification")
      .then((res) => res.json())
      .then((data) => {
        if (data.isVerifiedSeller) {
          setIsAlreadyVerified(true);
          setCurrentStatus("VERIFIED");
        } else if (data.sellerVerificationStatus) {
          setCurrentStatus(data.sellerVerificationStatus);
          if (data.sellerPactAcceptedAt) {
            setPactAccepted(true);
          }
        }
        if (Array.isArray(data.availableStaff)) {
          setStaffList(data.availableStaff);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat status seller:", err);
      })
      .finally(() => setLoadingStaff(false));
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(targetStaffId?: string) {
    if (!session?.user) {
      setError("Silakan login terlebih dahulu untuk mengajukan verifikasi penjual.");
      return;
    }

    if (!pactAccepted) {
      setError("Wajib mencentang persetujuan Pakta Pertanggungjawaban Hukum sebelum melanjutkan.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/user/seller-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pactAccepted: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mencatat pengajuan verifikasi.");
      }

      setSuccessNotice("Pengajuan berhasil dicatat! Membuka ruang obrolan staf...");
      setCurrentStatus("REQUESTED");
      if (onSuccess) onSuccess();

      // Pilih staf tujuan (targetStaffId atau staf online pertama atau targetStaff dari response)
      const selectedStaffId =
        targetStaffId ||
        data.targetStaff?.id ||
        staffList.find((s) => s.isOnline)?.id ||
        staffList[0]?.id;

      setTimeout(() => {
        onClose();
        if (selectedStaffId) {
          router.push(`/messages?targetUser=${selectedStaffId}`);
        } else {
          router.push("/messages");
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#7C3AED]/60 rounded-none shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0E061A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-amber-500/15 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold uppercase tracking-tight text-sm sm:text-base text-slate-900 dark:text-white">
                  Verifikasi Penjual Terpercaya
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-amber-500/15 text-amber-600 dark:text-[#F59E0B] border border-amber-500/30 uppercase">
                  ✦ VERIFIED SELLER
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-[#A78BFA] mt-0.5">
                Protokol Validasi Identitas &amp; Wawancara Staf Resmi LogHorizon
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* ALREADY VERIFIED STATE */}
        {isAlreadyVerified ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 flex items-center justify-center">
              <BadgeCheck size={36} className="text-emerald-500" />
            </div>
            <div>
              <h4 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                Akun Anda Telah Terverifikasi!
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#A78BFA] max-w-md mx-auto mt-1">
                Lencana <strong className="text-amber-500 font-bold">✅ VERIFIED SELLER</strong> telah aktif di seluruh lapak Marketplace dan profil publik Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold uppercase transition"
            >
              Tutup &amp; Kembali
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {currentStatus === "REQUESTED" && (
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-mono flex items-start gap-2.5">
                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <strong className="block font-bold uppercase mb-0.5">Status Pengajuan: Sedang Diproses (REQUESTED)</strong>
                  <span>
                    Anda telah menyetujui pakta integritas. Silakan klik salah satu Staf di bawah untuk memulai sesi wawancara via Private Chat atau Discord.
                  </span>
                </div>
              </div>
            )}

            {/* SYARAT & KETENTUAN VERIFIKASI */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shield size={14} className="text-[#7C3AED]" />
                1. Alur &amp; Ketentuan Verifikasi Penjual
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-none bg-slate-50 dark:bg-[#150A26] border border-slate-200 dark:border-[#2A1B42]">
                  <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-[#A78BFA]" />
                    Wawancara Langsung oleh Staf
                  </p>
                  <p className="text-slate-600 dark:text-gray-300 text-[11px] leading-relaxed">
                    Calon penjual wajib menghubungi langsung salah satu Staf / High Council (via Private Chat website atau DM Discord) untuk validasi data &amp; rekam jejak secara langsung.
                  </p>
                </div>
                <div className="p-3 rounded-none bg-slate-50 dark:bg-[#150A26] border border-slate-200 dark:border-[#2A1B42]">
                  <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Keamanan Privasi (Zero Storage KTP)
                  </p>
                  <p className="text-slate-600 dark:text-gray-300 text-[11px] leading-relaxed">
                    Website LogHorizon <strong>TIDAK MENYIMPAN</strong> dokumen identitas atau foto KTP mentah di server database publik demi menjaga keamanan privasi pribadi member.
                  </p>
                </div>
              </div>
            </div>

            {/* PAKTA PERTANGGUNGJAWABAN HUKUM & SANKSI SOSIAL */}
            <div className="space-y-2.5">
              <h4 className="font-mono text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Scale size={14} className="text-amber-500" />
                2. Pakta Pertanggungjawaban Hukum &amp; Sanksi Sosial
              </h4>

              {/* Kotak Merah Emas Tegas */}
              <div className="p-4 rounded-none bg-gradient-to-br from-red-950/30 via-[#1A0A10] to-amber-950/25 border-2 border-red-500/60 shadow-inner space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase">
                  <ShieldAlert size={16} className="text-red-400" />
                  <span>PERNYATAAN PAKTA INTEGRITAS RESMI</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-amber-200/90 font-serif italic border-l-2 border-amber-500/70 pl-3">
                  &ldquo;Saya menyatakan bersedia menjalani validasi identitas bersama Staf LogHorizon dan menjamin kejujuran dalam setiap transaksi. Apabila di kemudian hari saya terbukti melakukan penipuan (scam) atau membawa kabur dana/akun anggota LogHorizon, saya bersedia menerima sanksi sosial (publikasi blacklist penipu di seluruh jaringan komunitas) serta diproses secara hukum pidana sesuai peraturan perundang-undangan yang berlaku di Indonesia.&rdquo;
                </p>
              </div>

              {/* Checkbox Wajib */}
              <label className="flex items-start gap-3 p-3 rounded-none bg-slate-50 dark:bg-[#150A26] border border-slate-200 dark:border-[#2A1B42] cursor-pointer select-none hover:border-[#7C3AED]/70 transition">
                <input
                  type="checkbox"
                  checked={pactAccepted}
                  onChange={(e) => setPactAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <span className="text-xs text-slate-800 dark:text-gray-200 font-mono font-medium leading-snug">
                  Saya telah membaca, memahami, dan menyetujui seluruh isi <strong>Pakta Pertanggungjawaban Hukum &amp; Sanksi Sosial</strong> di atas secara sadar tanpa paksaan dari pihak manapun.
                </span>
              </label>
            </div>

            {/* DAFTAR STAF TERSEDIA UNTUK WAWANCARA */}
            <div className="space-y-2.5">
              <h4 className="font-mono text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-[#A78BFA]" />
                  3. Jajaran Staf / High Council untuk Wawancara
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Klik salah satu untuk chat langsung</span>
              </h4>

              {loadingStaff ? (
                <div className="p-4 text-center text-xs font-mono text-slate-400">
                  <Loader2 size={16} className="animate-spin inline mr-2 text-[#7C3AED]" /> Memeriksa ketersediaan staf...
                </div>
              ) : staffList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {staffList.slice(0, 4).map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleSubmit(staff.id)}
                      disabled={!pactAccepted || submitting}
                      className="p-2.5 rounded-none bg-slate-50 dark:bg-[#150A26] hover:bg-slate-100 dark:hover:bg-[#1E0F38] border border-slate-200 dark:border-[#2A1B42] hover:border-[#7C3AED] flex items-center justify-between text-left transition disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <DiscordAvatar
                            src={staff.avatar ?? null}
                            username={staff.username}
                            size={32}
                            className="rounded-full"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                              staff.isOnline ? "bg-emerald-500" : "bg-slate-500"
                            }`}
                            title={staff.isOnline ? "Online" : "Offline"}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#A78BFA]">
                            @{staff.username}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-[#A78BFA] truncate">
                            {staff.roleTitle}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-slate-400 group-hover:text-[#A78BFA] pl-2">
                        <MessageSquare size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 p-2">Staf LogHorizon selalu siaga di saluran chat.</p>
              )}
            </div>

            {/* TOMBOL AKSI UTAMA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!pactAccepted || submitting}
                className="w-full sm:flex-1 py-3 px-4 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-300 dark:disabled:bg-[#2A1B42] text-white font-mono text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Mendaftarkan Pengajuan...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    <span>💬 Hubungi Staf yang Tersedia (Buka Chat)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-none bg-slate-100 dark:bg-[#1A0E2E] hover:bg-slate-200 dark:hover:bg-[#2A1B42] text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
