"use client";

import { useRef, useEffect } from "react";
import { X, Trophy, Download, Crown, ShieldCheck, Share2 } from "lucide-react";

export interface RosterPlayer {
  name: string;
  inGameId: string;
  role?: "MAIN" | "SUB";
}

interface ChampionCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentTitle: string;
  game: string;
  season?: string;
  eventDate?: string | Date;
  prizePool?: string;
  teamName: string;
  roster: RosterPlayer[];
}

export function ChampionCertificateModal({
  isOpen,
  onClose,
  tournamentTitle,
  game,
  season = "Season 1",
  eventDate,
  prizePool,
  teamName,
  roster,
}: ChampionCertificateModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  // Render High-Resolution Canvas (1200x675 - 16:9)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient (Deep Tactical Violet/Black)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0E0A1A");
    bgGrad.addColorStop(0.5, "#140D26");
    bgGrad.addColorStop(1, "#08060E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid overlay
    ctx.strokeStyle = "rgba(157, 78, 221, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer Glow / Border
    ctx.strokeStyle = "#9D4EDD";
    ctx.lineWidth = 3;
    ctx.strokeRect(25, 25, width - 50, height - 50);

    // Inner Gold Fine Border
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    // Corner Tactical Brackets
    const cornerSize = 25;
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 4;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(25, 25 + cornerSize);
    ctx.lineTo(25, 25);
    ctx.lineTo(25 + cornerSize, 25);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(width - 25 - cornerSize, 25);
    ctx.lineTo(width - 25, 25);
    ctx.lineTo(width - 25, 25 + cornerSize);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(25, height - 25 - cornerSize);
    ctx.lineTo(25, height - 25);
    ctx.lineTo(25 + cornerSize, height - 25);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(width - 25 - cornerSize, height - 25);
    ctx.lineTo(width - 25, height - 25);
    ctx.lineTo(width - 25, height - 25 - cornerSize);
    ctx.stroke();

    // 2. Top Kicker
    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#C77DFF";
    ctx.letterSpacing = "3px";
    ctx.fillText("⚔️ LOGHORIZON ESPORTS • OFFICIAL CERTIFICATE OF VICTORY ⚔️", width / 2, 70);

    // 3. Tournament Title & Season
    ctx.font = "900 28px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.letterSpacing = "1px";
    ctx.fillText(tournamentTitle.toUpperCase(), width / 2, 110);

    // Game & Season Badge
    ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText(`GAME: ${game.toUpperCase()} • ${season.toUpperCase()}${prizePool ? ` • PRIZE POOL: ${prizePool}` : ""}`, width / 2, 138);

    // 4. Gold Trophy Icon & Champion Badge
    ctx.font = "46px sans-serif";
    ctx.fillText("🏆", width / 2, 195);

    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#FBBF24";
    ctx.letterSpacing = "2px";
    ctx.fillText("👑 1ST PLACE • GRAND CHAMPION", width / 2, 230);

    // 5. Team Name (Large glowing gold)
    ctx.font = "900 48px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#FFD166";
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 15;
    ctx.fillText(teamName.toUpperCase(), width / 2, 290);
    ctx.shadowBlur = 0; // reset shadow

    // 6. Roster Players Box
    const rosterBoxY = 325;
    const rosterBoxH = 240;
    const rosterBoxW = width - 140;
    const rosterBoxX = 70;

    ctx.fillStyle = "rgba(18, 13, 30, 0.85)";
    ctx.fillRect(rosterBoxX, rosterBoxY, rosterBoxW, rosterBoxH);
    ctx.strokeStyle = "rgba(157, 78, 221, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rosterBoxX, rosterBoxY, rosterBoxW, rosterBoxH);

    ctx.textAlign = "left";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "#C77DFF";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("OFFICIAL CHAMPION ROSTER:", rosterBoxX + 25, rosterBoxY + 30);

    // Render Players in 2 Columns
    const displayRoster = roster.length > 0
      ? roster
      : [
          { name: "Pemain 1 (Captain)", inGameId: "ID: #0001" },
          { name: "Pemain 2", inGameId: "ID: #0002" },
          { name: "Pemain 3", inGameId: "ID: #0003" },
          { name: "Pemain 4", inGameId: "ID: #0004" },
          { name: "Pemain 5", inGameId: "ID: #0005" },
        ];

    const colCount = 2;
    const playersPerCol = Math.ceil(displayRoster.length / colCount);
    const colWidth = (rosterBoxW - 60) / colCount;

    displayRoster.forEach((player, idx) => {
      const col = Math.floor(idx / playersPerCol);
      const row = idx % playersPerCol;
      const px = rosterBoxX + 30 + col * colWidth;
      const py = rosterBoxY + 65 + row * 26;

      ctx.font = "bold 14px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${idx + 1}. ${player.name}`, px, py);

      ctx.font = "12px 'Courier New', monospace";
      ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
      ctx.fillText(`[${player.inGameId || "VERIFIED"}]`, px + 220, py);
    });

    // 7. Footer & Verification Watermark
    ctx.textAlign = "left";
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText(`TANGGAL RESMI: ${formattedDate}`, 70, height - 42);

    ctx.textAlign = "right";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = "#9D4EDD";
    ctx.fillText("LOGHORIZON OFFICIAL TOURNAMENT • VERIFIED GUILD RECORD", width - 70, height - 42);
  }, [isOpen, tournamentTitle, game, season, eventDate, prizePool, teamName, roster, formattedDate]);

  function handleDownloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanName = teamName.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `LogHorizon-Champion-${cleanName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mendownload sertifikat:", err);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#130921] border border-[#7C3AED] rounded-none w-full max-w-4xl p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95 duration-200 text-white max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-none bg-white/5 hover:bg-white/10 transition z-20"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 pb-2 border-b border-[#2E1E45]">
          <Crown className="text-amber-400" size={20} />
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-white">
              Sertifikat Digital Resmi Juara 1 Turnamen
            </h2>
            <p className="text-xs text-gray-400 font-sans">
              Poster prestasi resmi LogHorizon siap unduh &amp; bagikan ke media sosial.
            </p>
          </div>
        </div>

        {/* Visual Poster Card Responsive Preview */}
        <div className="relative rounded-none overflow-hidden border border-[#2E1E45] bg-[#09040F] p-5 sm:p-7 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-widest mb-1">
            <ShieldCheck size={14} className="text-amber-400" />
            <span>LOGHORIZON ESPORTS // OFFICIAL CHAMPION</span>
          </div>

          <h3 className="text-lg sm:text-2xl font-bold font-display text-white uppercase tracking-tight">
            {tournamentTitle}
          </h3>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono mt-2 mb-4">
            <span>{game}</span>
            <span>&bull;</span>
            <span>{season}</span>
            {prizePool && (
              <>
                <span>&bull;</span>
                <span>{prizePool}</span>
              </>
            )}
          </div>

          <div className="my-2 flex flex-col items-center">
            <span className="text-4xl sm:text-5xl my-1">🏆</span>
            <span className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase">
              1ST PLACE // GRAND CHAMPION
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-amber-300 mt-1 mb-3">
              {teamName}
            </h1>
          </div>

          {/* Roster Preview */}
          <div className="max-w-2xl mx-auto rounded-none border border-[#2E1E45] bg-[#130921] p-3 sm:p-4 text-left">
            <p className="text-[10px] font-mono text-[#A78BFA] font-bold uppercase tracking-wider mb-2">
              SUSUNAN PEMAIN JUARA:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(roster.length > 0 ? roster : [
                { name: "Pemain Inti 1", inGameId: "ID: #0001" },
                { name: "Pemain Inti 2", inGameId: "ID: #0002" },
                { name: "Pemain Inti 3", inGameId: "ID: #0003" },
                { name: "Pemain Inti 4", inGameId: "ID: #0004" },
                { name: "Pemain Inti 5", inGameId: "ID: #0005" },
              ]).map((player, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-none bg-[#09040F] border border-[#2E1E45]"
                >
                  <span className="font-semibold text-white truncate max-w-[140px] font-sans">
                    {idx + 1}. {player.name}
                  </span>
                  <span className="font-mono text-[10px] text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded-none border border-amber-500/20">
                    {player.inGameId || "VERIFIED"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-gray-500 mt-5 pt-3 border-t border-[#2E1E45]">
            <span>TANGGAL VERIFIKASI: {formattedDate}</span>
            <span className="text-[#A78BFA]">OFFICIAL GUILD RECORD // LOGHORIZON</span>
          </div>
        </div>

        {/* Hidden Canvas for High-Resolution PNG generation */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-400 font-sans">
            Format resolusi tinggi (1200x675 HD) optimal untuk Instagram Story &amp; Discord.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadPNG}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-none text-xs font-mono font-bold bg-[#F59E0B] hover:bg-[#D97706] text-black transition"
            >
              <Download size={15} />
              <span>DOWNLOAD PNG</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-none text-xs font-mono font-bold bg-[#1A0E2E] hover:bg-[#251540] text-gray-300 border border-[#2E1E45] transition"
            >
              TUTUP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
