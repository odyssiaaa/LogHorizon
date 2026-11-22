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

export { UniversalReportDialog as ReportDialog } from "@/components/universal-report-dialog";
