"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Flag, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

export function LoginPrompt({
  open,
  onClose,
  action,
}: {
  open: boolean;
  onClose: () => void;
  action: string;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card login-prompt" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        <p className="section-kicker">GABUNG KE PARTY</p>
        <h2 id="login-prompt-title">Login untuk {action}</h2>
        <p>Masuk dengan Discord untuk berinteraksi dengan komunitas LogHorizon.</p>
        <button className="button button-discord" onClick={() => signIn("discord")}><span className="discord-symbol">◉</span> Continue with Discord</button>
      </section>
    </div>
  );
}

export function ReportDialog({
  postId,
  open,
  onClose,
  onSuccess,
}: {
  postId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !postId) return null;
  const close = () => {
    setReason("");
    setError("");
    onClose();
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await readApiResponse<unknown>(await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }), "Laporan gagal dikirim.");
      setReason("");
      close();
      onSuccess("Laporan berhasil dikirim ke moderator.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Laporan gagal dikirim.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="modal-card report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
        <button className="modal-close" onClick={close} aria-label="Tutup"><X size={19} /></button>
        <p className="section-kicker"><Flag size={13} /> LAPORKAN POSTINGAN</p>
        <h2 id="report-modal-title">Bantu jaga komunitas</h2>
        <form className="stack-form" onSubmit={submit}>
          <label>Alasan laporan<textarea required maxLength={2000} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Jelaskan masalah, misalnya indikasi scam atau konten yang melanggar aturan…" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={saving}>{saving ? "Mengirim…" : "Kirim Laporan"}</button>
        </form>
      </section>
    </div>
  );
}
