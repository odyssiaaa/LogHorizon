"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

const amounts = [10000, 25000, 50000, 100000];
const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function DonationForm() {
  const { data: session, update } = useSession();
  const [amount, setAmount] = useState(25000);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function donate() {
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const result = await readApiResponse<{ notice: string }>(response, "Donasi belum berhasil.");
      setMessage(result.notice);
      await update();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Donasi belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell donate-page">
      <header className="donate-heading">
        <p className="section-kicker">SUPPORT THE GUILD</p>
        <h1>Kas komunitas <span>LogHorizon</span></h1>
        <p className="muted-copy">Dukungan member membantu menjaga server dan aktivitas komunitas tetap berjalan.</p>
      </header>
      <section className="donate-panel">
        <div className="donate-panel-heading"><span className="donate-icon"><HeartHandshake size={20} /></span><div><h2>Dukung operasional guild</h2><p>Pilih nominal kontribusi untuk simulasi pembayaran lokal.</p></div></div>
        <div className="donation-amounts" role="group" aria-label="Pilih nominal donasi">
          {amounts.map((option) => <button key={option} type="button" className={amount === option ? "donation-amount active" : "donation-amount"} onClick={() => setAmount(option)}>{formatMoney.format(option)}</button>)}
        </div>
        <div className="donation-total"><span>Total mock donation</span><strong>{formatMoney.format(amount)}</strong></div>
        {session?.user?.isPremium && <p className="premium-state"><ShieldCheck size={16} /> Akun kamu sudah berstatus Premium.</p>}
        {message && <p className="inline-notice" role="status">{message}</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="button button-primary donate-submit" disabled={loading} onClick={() => void donate()}>{loading ? "Memproses simulasi…" : session?.user ? "Konfirmasi simulasi donasi" : "Login dengan Discord untuk donasi"}</button>
        <p className="donation-disclaimer">Mock gateway ini hanya untuk pengembangan lokal. Tidak memproses uang nyata; jangan aktifkan sebagai alur pembayaran produksi.</p>
      </section>
    </main>
  );
}
