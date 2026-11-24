"use client";

import React, { useState, FormEvent } from "react";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  Layers,
  Coins,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export function PartnershipProposalForm() {
  const [companyName, setCompanyName] = useState("");
  const [picName, setPicName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<string>("TIER_2_TOURNAMENT");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [websiteUrlHp, setWebsiteUrlHp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!companyName.trim() || companyName.trim().length < 2) {
      setError("Nama brand atau perusahaan wajib diisi.");
      return;
    }
    if (!picName.trim() || picName.trim().length < 2) {
      setError("Nama PIC / penanggung jawab wajib diisi.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) {
      setError("Nomor WhatsApp / telepon wajib valid (minimal 9 digit).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Email resmi perwakilan wajib valid.");
      return;
    }
    if (!proposalDescription.trim() || proposalDescription.trim().length < 10) {
      setError("Mohon jelaskan ringkasan bentuk kolaborasi / proposal yang diajukan (minimal 10 karakter).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partnership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          picName: picName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          tier,
          estimatedValue: estimatedValue.trim() || undefined,
          proposalDescription: proposalDescription.trim(),
          website_url_hp: websiteUrlHp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan proposal kemitraan.");
      }

      setSuccessMessage(data.message || "Proposal kemitraan berhasil dikirim!");
      // Reset form
      setCompanyName("");
      setPicName("");
      setPhone("");
      setEmail("");
      setEstimatedValue("");
      setProposalDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mengirim proposal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#11091D] border-2 border-[#7C3AED]/50 p-6 sm:p-10 shadow-xl relative overflow-hidden">
      <div className="max-w-2xl text-left space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] dark:text-[#A78BFA] font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles size={13} />
          <span>FORMULIR PROPOSAL KEMITRAAN &amp; SPONSOR RESMI</span>
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC]">
          Mulai Kolaborasi Bersama Kami
        </h3>
        <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
          Sampaikan ketertarikan brand Anda. Manajemen eksekutif kami akan segera mempelajari proposal dan menghubungi Anda dalam 1x24 jam kerja.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage ? (
        <div className="p-8 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 text-left space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
            <h4 className="font-display text-lg font-bold">Proposal Berhasil Diterima</h4>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {successMessage}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition shadow-sm"
            >
              Kirim Proposal Lainnya
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Brand / Perusahaan */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#7C3AED]" />
                <span>Nama Brand / Instansi <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: SteelSeries Indonesia / Game Publisher"
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Nama PIC */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User size={13} className="text-[#7C3AED]" />
                <span>Nama Lengkap PIC Narahubung <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Contoh: Arya Pratama (Brand Manager)"
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone size={13} className="text-emerald-500" />
                <span>Nomor WhatsApp Aktif <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Mail size={13} className="text-[#7C3AED]" />
                <span>Email Resmi Kantor / Perusahaan <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: partnership@brand.com"
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pilihan Paket */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers size={13} className="text-[#7C3AED]" />
                <span>Paket Kemitraan yang Diminati <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="TIER_1_COMMUNITY">Tier 1: Community &amp; Media Partner</option>
                <option value="TIER_2_TOURNAMENT">Tier 2: Tournament Title &amp; Prize Sponsor</option>
                <option value="TIER_3_BENEFACTOR">Tier 3: Official Guild Benefactor &amp; Strategic Sponsor</option>
                <option value="CUSTOM">Paket Khusus / Kolaborasi Kustom</option>
              </select>
            </div>

            {/* Estimasi Nilai / Bentuk Dukungan */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Coins size={13} className="text-amber-500" />
                <span>Bentuk / Estimasi Nilai Dukungan <span className="text-slate-400 font-normal">(Opsional)</span></span>
              </label>
              <input
                type="text"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="Contoh: Prize Pool Tunai / Peripheral Gaming / Media Barter"
                className="w-full h-11 px-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {/* Deskripsi Proposal */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#7C3AED]" />
              <span>Ringkasan Rencana Kolaborasi / Kebutuhan Brand <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              required
              rows={4}
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              placeholder="Ceritakan target audiens brand Anda, periode turnamen atau kampanye yang diinginkan, serta ekspektasi deliverables yang ingin dicapai bersama LogHorizon..."
              className="w-full p-3.5 border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#180E28] text-slate-900 dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#7C3AED] leading-relaxed resize-y"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Data Anda bersifat rahasia dan hanya digunakan untuk kepentingan verifikasi kemitraan resmi oleh tim eksekutif LogHorizon.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
            >
              <Send size={15} />
              <span>{loading ? "Mengirim Proposal..." : "Kirim Pengajuan Kemitraan ➔"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
