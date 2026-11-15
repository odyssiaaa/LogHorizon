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
    <main className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-10 max-w-[1360px] 2xl:max-w-[1440px] mx-auto w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & STATUS SINKRONISASI */}
      {/* ========================================================================= */}
      <header className="mb-8 border-b border-gray-200 dark:border-[#211C2B] pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] dark:text-[#C77DFF] text-xs font-bold tracking-widest uppercase mb-3">
              <Rss size={13} className="animate-pulse" />
              <span>LOGHORIZON DISPATCH NETWORK</span>
            </div>
            <h1 className="page-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white uppercase font-sans break-words">
              Guild <span className="text-[#9D4EDD] dark:text-[#C77DFF]">News Hub</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Feed berita terpadu: pengumuman resmi server Discord LogHorizon bersanding dengan warta gaming, esports, dan teknologi global secara kronologis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {discordDebug && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[240px] sm:max-w-xs">{discordDebug}</span>
              </span>
            )}
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#16121F] px-3 py-1.5 rounded border border-gray-200 dark:border-[#262033]">
              Transmisi: <strong className="text-purple-600 dark:text-purple-400 font-bold">{feed.length} Warta</strong>
            </span>
            <button
              onClick={() => void fetchNews()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-[#16121F] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#262033] hover:border-[#9D4EDD] transition-colors disabled:opacity-50"
              title="Segarkan transmisi warta"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Memuat…" : "Segarkan"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FILTER PILLS: SEMUA BERITA / INFO GUILD / GLOBAL NEWS + SEARCH BAR */}
        {/* ========================================================================= */}
        <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-gray-200 dark:border-[#211C2B] pt-5">
          {/* Main Filter Pills (ALL / GUILD / GLOBAL) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#120F17] border border-gray-200 dark:border-white/5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                filterType === "ALL"
                  ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>⚡ Semua Berita</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {feed.length}
              </span>
            </button>

            <button
              onClick={() => setFilterType("GUILD")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                filterType === "GUILD"
                  ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>🛡️ Info Guild</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {guildCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType("GLOBAL")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                filterType === "GLOBAL"
                  ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>🎮 Global News</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {globalCount}
              </span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="flex items-center gap-2.5 px-3.5 h-11 w-full lg:w-80 shrink-0 rounded-xl bg-white dark:bg-[#120F17] border border-gray-200 dark:border-white/5 focus-within:border-[#9D4EDD] transition-colors">
            <Search size={15} className="shrink-0 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita guild, game, atau hardware…"
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                aria-label="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Category Filter Pills (Global Category filter) */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Kategori:
          </span>
          {[
            { id: "ALL", label: "Semua Kategori" },
            { id: "Game & Esports", label: "🎮 Game & Esports" },
            { id: "Hardware & Tech", label: "⚡ Hardware & Tech" },
            { id: "Konsol & Rilis", label: "🕹️ Konsol & Rilis" },
            { id: "Turnamen & Guild", label: "🏆 Turnamen & Guild" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] border-[#9D4EDD]"
                  : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:text-white"
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
              className="rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] overflow-hidden animate-pulse flex flex-col h-[420px]"
            >
              <div className="h-48 w-full bg-neutral-200 dark:bg-[#1E1A3A]" />
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                  <div className="h-5 w-5/6 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                  <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                  <div className="h-3.5 w-4/5 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                </div>
                <div className="h-9 w-full rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
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
        <div className="py-16 text-center border border-dashed border-gray-300 dark:border-[#211C2B] rounded-xl p-8 max-w-xl mx-auto">
          <Newspaper size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak ada warta yang cocok</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Coba sesuaikan kata kunci pencarian atau ubah filter sumber ke &quot;Semua Berita&quot;.
          </p>
          {discordDebug && (
            <div className="mt-4 inline-block px-3 py-1.5 rounded bg-black/40 dark:bg-black/60 border border-purple-500/30 text-[11px] font-mono text-purple-300 max-w-md mx-auto break-words">
              <span className="text-gray-400 font-semibold">Status Sinkronisasi Discord:</span> {discordDebug}
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
      className={`group rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 bg-white dark:bg-[#120F17] ${
        isGuild
          ? "border border-[#9D4EDD]/45 hover:border-[#9D4EDD] shadow-sm hover:shadow-lg hover:shadow-[#9D4EDD]/15"
          : "border border-gray-200 dark:border-[#211C2B] hover:border-[#9D4EDD]/60 hover:shadow-lg hover:shadow-[#9D4EDD]/5"
      }`}
    >
      <div>
        {/* Gambar Thumbnail Warta */}
        {imgSrc && !imgError ? (
          <div className="relative h-48 w-full overflow-hidden bg-neutral-100 dark:bg-[#181422]">
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-black uppercase tracking-wider bg-[#9D4EDD] text-white shadow-md shadow-[#9D4EDD]/40">
                  <span>🛡️</span>
                  <span>INFO GUILD</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-black/80 backdrop-blur-md text-[#C77DFF] border border-[#9D4EDD]/40 shadow-sm">
                  <span>🎮</span>
                  <span>{article.category || "GAMING / TECH"}</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Header Banner jika warta Discord tidak memiliki gambar */
          <div className="p-4 bg-[#9D4EDD]/10 border-b border-[#9D4EDD]/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {article.authorAvatar ? (
                <Image
                  src={article.authorAvatar}
                  alt={article.authorName ?? "Council"}
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 rounded-full border border-[#9D4EDD]/50 object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#5865F2] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  LH
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {article.authorName ?? "Council LogHorizon"}
                </p>
                <p className="text-[10px] font-mono text-purple-600 dark:text-[#C77DFF]">
                  Discord • #pengumuman
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#9D4EDD] text-white shrink-0">
              <span>🛡️</span>
              <span>INFO GUILD</span>
            </span>
          </div>
        )}

        {/* Isi Teks Konten */}
        <div className="p-5">
          {/* Metadata Bar (Tanggal & Sumber) */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 text-[#9D4EDD] dark:text-purple-300 font-bold truncate max-w-[170px]">
              {isGuild ? (
                <>
                  <Shield size={12} className="shrink-0 text-[#9D4EDD]" />
                  <span>{article.authorName ?? "Discord Guild"}</span>
                </>
              ) : (
                <>
                  <Globe size={11} className="shrink-0" />
                  <span>{article.sourceName}</span>
                </>
              )}
            </span>
            <span className="flex items-center gap-1 shrink-0 text-gray-400">
              <Calendar size={11} />
              <span>{formattedDate}</span>
            </span>
          </div>

          <h3 className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#9D4EDD] dark:group-hover:text-[#C77DFF] transition-colors break-words">
            {article.title}
          </h3>

          <p className="mt-2.5 text-xs text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed break-words whitespace-pre-wrap">
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-sm transition-all duration-150"
          >
            <span>Buka di Discord</span>
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#262033] hover:bg-[#9D4EDD] hover:text-white hover:border-[#9D4EDD] transition-all duration-150 group/btn"
          >
            <span>Baca Selengkapnya</span>
            <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </a>
        )}
      </div>
    </motion.article>
  );
}
