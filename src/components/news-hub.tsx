"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  Megaphone,
  Newspaper,
  RefreshCw,
  Rss,
  Search,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import type { NormalizedArticle } from "@/app/api/news/route";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

export function NewsHub() {
  const [feed, setFeed] = useState<NormalizedArticle[]>([]);
  const [discordDebug, setDiscordDebug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "GUILD" | "GLOBAL">("ALL");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function fetchNews() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Gagal mengambil transmisi berita");
      const data = await res.json();
      if (data.ok) {
        const combined: NormalizedArticle[] = Array.isArray(data.feed)
          ? data.feed
          : [...(data.guildNews || []), ...(data.articles || [])];

        setFeed(combined);
        setDiscordDebug(typeof data.discordDebug === "string" ? data.discordDebug : "");
      }
    } catch (err) {
      console.error("[NewsHub] Error fetching news:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchNews();
  }, []);

  const guildCount = feed.filter((i) => i.sourceType === "GUILD").length;
  const globalCount = feed.filter((i) => i.sourceType === "GLOBAL").length;

  const filteredFeed = feed.filter((item) => {
    // 1. Filter tipe sumber: ALL | GUILD | GLOBAL
    if (filterType === "GUILD" && item.sourceType !== "GUILD") return false;
    if (filterType === "GLOBAL" && item.sourceType !== "GLOBAL") return false;

    // 2. Filter kategori topik jika dipilih
    if (activeCategory !== "ALL" && item.category !== activeCategory) {
      return false;
    }

    // 3. Pencarian teks
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q) ||
        (item.authorName && item.authorName.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <main className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & STATUS SINKRONISASI */}
      {/* ========================================================================= */}
      <header className="mb-8 border-b border-[#2E1E45] pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] text-xs font-mono font-bold tracking-widest uppercase mb-3">
              <Rss size={13} className="animate-pulse text-[#7C3AED]" />
              <span>LOGHORIZON DISPATCH NETWORK // NEWS HUB</span>
            </div>
            <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-[#F8FAFC] break-words">
              GUILD <span className="text-[#A78BFA]">NEWS HUB</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-[#A78BFA] max-w-2xl leading-relaxed font-sans">
              Feed berita terpadu: pengumuman resmi server Discord LogHorizon bersanding dengan warta gaming, esports, dan teknologi global secara kronologis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {discordDebug && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[11px] font-mono bg-[#7C3AED]/10 text-[#A78BFA] border border-[#7C3AED]/30">
                <span className="w-1.5 h-1.5 rounded-none bg-[#10B981] animate-pulse" />
                <span className="truncate max-w-[240px] sm:max-w-xs">{discordDebug}</span>
              </span>
            )}
            <span className="text-[11px] font-mono text-[#A78BFA] bg-[#130921] px-3 py-1.5 rounded-none border border-[#2E1E45]">
              Transmisi: <strong className="text-[#F8FAFC] font-bold">{feed.length} WARTA</strong>
            </span>
            <button
              onClick={() => void fetchNews()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider bg-[#1A0E2E] text-[#F8FAFC] border border-[#2E1E45] hover:border-[#7C3AED] transition-colors disabled:opacity-50"
              title="Segarkan transmisi warta"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-[#7C3AED]" : ""} />
              <span>{refreshing ? "Memuat…" : "Segarkan"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FILTER PILLS: SEMUA BERITA / INFO GUILD / GLOBAL NEWS + SEARCH BAR */}
        {/* ========================================================================= */}
        <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-[#2E1E45] pt-5">
          {/* Main Filter Pills (ALL / GUILD / GLOBAL) */}
          <div className="flex items-center gap-1.5 p-1 rounded-none bg-[#130921] border border-[#2E1E45] overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3.5 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${
                filterType === "ALL"
                  ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                  : "bg-[#1A0E2E] text-[#A78BFA] border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
              }`}
            >
              <span>⚡ Semua Berita</span>
              <span className="px-1.5 py-0.2 rounded-none text-[10px] bg-black/40 text-[#F8FAFC]">
                {feed.length}
              </span>
            </button>

            <button
              onClick={() => setFilterType("GUILD")}
              className={`px-3.5 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${
                filterType === "GUILD"
                  ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                  : "bg-[#1A0E2E] text-[#A78BFA] border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
              }`}
            >
              <span>🛡️ Info Guild</span>
              <span className="px-1.5 py-0.2 rounded-none text-[10px] bg-black/40 text-[#F8FAFC]">
                {guildCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType("GLOBAL")}
              className={`px-3.5 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${
                filterType === "GLOBAL"
                  ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                  : "bg-[#1A0E2E] text-[#A78BFA] border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
              }`}
            >
              <span>🎮 Global News</span>
              <span className="px-1.5 py-0.2 rounded-none text-[10px] bg-black/40 text-[#F8FAFC]">
                {globalCount}
              </span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="flex items-center gap-2.5 px-3.5 h-11 w-full lg:w-80 shrink-0 rounded-none bg-[#130921] border border-[#2E1E45] focus-within:border-[#7C3AED] transition-colors">
            <Search size={15} className="shrink-0 text-[#A78BFA] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita guild, game, hardware…"
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-[#F8FAFC] placeholder:text-[#A78BFA]/50 p-0 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-[#A78BFA] hover:text-[#F8FAFC] font-mono text-xs uppercase"
                aria-label="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Category Filter Pills (Global Category filter) */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-[#A78BFA] uppercase tracking-wider mr-1 hidden sm:inline">
            KATEGORI:
          </span>
          {[
            { id: "ALL", label: "SEMUA KATEGORI" },
            { id: "Game & Esports", label: "🎮 GAME & ESPORTS" },
            { id: "Hardware & Tech", label: "⚡ HARDWARE & TECH" },
            { id: "Konsol & Rilis", label: "🕹️ KONSOL & RILIS" },
            { id: "Turnamen & Guild", label: "🏆 TURNAMEN & GUILD" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-[#7C3AED]/20 text-[#F8FAFC] border-[#7C3AED]"
                  : "bg-[#130921] text-[#A78BFA] border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. SATU GRID BERITA TERPADU (KRONOLOGIS DARI WAKTU TERBARU) */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-none border border-[#2E1E45] bg-[#130921] overflow-hidden animate-pulse flex flex-col h-[420px]"
            >
              <div className="h-48 w-full bg-[#1A0E2E]" />
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-[#1A0E2E]" />
                  <div className="h-5 w-5/6 bg-[#1A0E2E]" />
                  <div className="h-3.5 w-full bg-[#1A0E2E]" />
                  <div className="h-3.5 w-4/5 bg-[#1A0E2E]" />
                </div>
                <div className="h-9 w-full bg-[#1A0E2E]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFeed.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFeed.map((article, index) => (
            <UnifiedNewsCard key={article.id} article={article} index={index} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-[#2E1E45] rounded-none p-8 max-w-xl mx-auto bg-[#130921]">
          <Newspaper size={40} className="mx-auto text-[#A78BFA] mb-3 opacity-60" />
          <h3 className="font-display text-base font-bold uppercase tracking-tight text-[#F8FAFC]">Tidak ada warta yang cocok</h3>
          <p className="text-xs text-[#A78BFA] mt-1 max-w-md mx-auto font-sans">
            Coba sesuaikan kata kunci pencarian atau ubah filter sumber ke &quot;Semua Berita&quot;.
          </p>
          {discordDebug && (
            <div className="mt-4 inline-block px-3 py-1.5 rounded-none bg-[#09040F] border border-[#2E1E45] text-[11px] font-mono text-[#A78BFA] max-w-md mx-auto break-words">
              <span className="text-[#F8FAFC] font-semibold">Status Sinkronisasi Discord:</span> {discordDebug}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// =========================================================================
// KARTU BERITA TERPADU (UNIFIED NEWS CARD)
// Membedakan sumber GUILD (Discord) vs GLOBAL (Gaming/Tech) secara visual
// =========================================================================
function UnifiedNewsCard({ article, index }: { article: NormalizedArticle; index: number }) {
  const isGuild = article.sourceType === "GUILD";
  const [imgSrc, setImgSrc] = useState(article.imageUrl || (isGuild ? null : DEFAULT_THUMBNAIL));
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.35) }}
      className={`group rounded-none overflow-hidden flex flex-col justify-between transition-all duration-200 bg-[#130921] ${
        isGuild
          ? "border-l-4 border-l-[#7C3AED] border border-[#2E1E45] hover:border-[#7C3AED]"
          : "border border-[#2E1E45] hover:border-[#7C3AED]"
      }`}
    >
      <div>
        {/* Gambar Thumbnail Warta */}
        {imgSrc && !imgError ? (
          <div className="relative h-48 w-full overflow-hidden bg-[#1A0E2E]">
            <Image
              src={imgSrc}
              alt={article.title}
              fill
              loading="lazy"
              unoptimized
              onError={() => {
                if (isGuild) {
                  setImgError(true);
                } else {
                  setImgSrc(DEFAULT_THUMBNAIL);
                }
              }}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Badge Kategori di Pojok Gambar */}
            <div className="absolute top-3 left-3 z-10">
              {isGuild ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#7C3AED] text-[#F8FAFC] border border-[#7C3AED]">
                  <span>🛡️</span>
                  <span>INFO GUILD</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#09040F]/90 text-[#A78BFA] border border-[#2E1E45]">
                  <span>🎮</span>
                  <span>{article.category || "GAMING / TECH"}</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Header Banner jika warta Discord tidak memiliki gambar */
          <div className="p-4 bg-[#1A0E2E] border-b border-[#2E1E45] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {article.authorAvatar ? (
                <Image
                  src={article.authorAvatar}
                  alt={article.authorName ?? "Council"}
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 rounded-none border border-[#2E1E45] object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-none bg-[#7C3AED] text-[#F8FAFC] flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
                  LH
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-mono font-bold text-[#F8FAFC] truncate">
                  {article.authorName ?? "Council LogHorizon"}
                </p>
                <p className="text-[10px] font-mono text-[#A78BFA]">
                  Discord • #pengumuman
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#7C3AED] text-[#F8FAFC] shrink-0">
              <span>🛡️</span>
              <span>INFO GUILD</span>
            </span>
          </div>
        )}

        {/* Isi Teks Konten */}
        <div className="p-5 text-left">
          {/* Metadata Bar (Tanggal & Sumber) */}
          <div className="flex items-center justify-between text-[11px] text-[#A78BFA] mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-bold truncate max-w-[170px]">
              {isGuild ? (
                <>
                  <Shield size={12} className="shrink-0 text-[#7C3AED]" />
                  <span>{article.authorName ?? "Discord Guild"}</span>
                </>
              ) : (
                <>
                  <Globe size={11} className="shrink-0" />
                  <span>{article.sourceName}</span>
                </>
              )}
            </span>
            <span className="flex items-center gap-1 shrink-0 text-[#A78BFA]">
              <Calendar size={11} />
              <span>{formattedDate}</span>
            </span>
          </div>

          <h3 className="font-display text-base font-bold text-[#F8FAFC] line-clamp-2 leading-snug uppercase tracking-tight group-hover:text-[#A78BFA] transition-colors break-words">
            {article.title}
          </h3>

          <p className="mt-2.5 text-xs text-[#A78BFA] font-sans line-clamp-3 leading-relaxed break-words whitespace-pre-wrap">
            {article.description}
          </p>
        </div>
      </div>

      {/* Footer Aksi Kartu */}
      <div className="p-5 pt-0">
        {isGuild ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC] bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2] transition-colors"
          >
            <span>Buka di Discord</span>
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC] bg-[#1A0E2E] border border-[#2E1E45] hover:bg-[#7C3AED] hover:border-[#7C3AED] transition-colors group/btn"
          >
            <span>Baca Selengkapnya</span>
            <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </a>
        )}
      </div>
    </motion.article>
  );
}
