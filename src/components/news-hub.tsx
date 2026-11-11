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
  MessageSquare,
  Newspaper,
  RefreshCw,
  Rss,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import type { NormalizedArticle } from "@/app/api/news/route";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

export function NewsHub() {
  const [guildNews, setGuildNews] = useState<NormalizedArticle[]>([]);
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<string>("Multi-Source Dispatch");
  const [mainTab, setMainTab] = useState<"all" | "guild" | "global">("all");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
        setGuildNews(Array.isArray(data.guildNews) ? data.guildNews : []);
        setArticles(Array.isArray(data.articles) ? data.articles : []);
        setProvider(data.provider ?? "LogHorizon Dispatch");
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

  const filteredGlobalArticles = articles.filter((article) => {
    if (activeCategory !== "ALL" && article.category !== activeCategory) {
      return false;
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const match =
        article.title.toLowerCase().includes(q) ||
        article.description.toLowerCase().includes(q) ||
        article.sourceName.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const filteredGuildNews = guildNews.filter((item) => {
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.authorName && item.authorName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <main className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      {/* Header Section */}
      <header className="mb-8 border-b border-gray-200 dark:border-[#211C2B] pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] dark:text-[#C77DFF] text-xs font-bold tracking-widest uppercase mb-3">
              <Rss size={13} className="animate-pulse" />
              <span>LOGHORIZON DISPATCH NETWORK</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white uppercase font-sans break-words">
              Guild <span className="text-[#9D4EDD] dark:text-[#C77DFF]">News Hub</span>
            </h1>
            <p className="mt-2 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Pusat informasi dan pengumuman resmi server Discord LogHorizon serta transmisi berita gaming, esports, dan teknologi global.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#16121F] px-3 py-1.5 rounded border border-gray-200 dark:border-[#262033]">
              Transmisi: <strong className="text-purple-600 dark:text-purple-400 font-bold">{guildNews.length + articles.length} Warta Aktif</strong>
            </span>
            <button
              onClick={() => void fetchNews()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-[#16121F] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#262033] hover:border-[#9D4EDD] transition-colors disabled:opacity-50"
              title="Segarkan transmisi warta"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Memuat…" : "Segarkan Warta"}</span>
            </button>
          </div>
        </div>

        {/* Tactical Main Tab Selector */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-gray-200 dark:border-[#211C2B] pt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setMainTab("all")}
              className={`px-4 py-2 rounded text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
                mainTab === "all"
                  ? "bg-[#9D4EDD] text-white border-[#9D4EDD] shadow-sm shadow-[#9D4EDD]/25"
                  : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#211C2B] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>⚡ Semua Warta</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {guildNews.length + articles.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab("guild")}
              className={`px-4 py-2 rounded text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
                mainTab === "guild"
                  ? "bg-[#9D4EDD] text-white border-[#9D4EDD] shadow-sm shadow-[#9D4EDD]/25"
                  : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#211C2B] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Megaphone size={14} className="text-[#C77DFF]" />
              <span>Warta Resmi Guild (Discord)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {guildNews.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab("global")}
              className={`px-4 py-2 rounded text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
                mainTab === "global"
                  ? "bg-[#9D4EDD] text-white border-[#9D4EDD] shadow-sm shadow-[#9D4EDD]/25"
                  : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#211C2B] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Globe size={14} />
              <span>Berita Gaming &amp; Tech (Global)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 dark:bg-white/20">
                {articles.length}
              </span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="relative flex items-center w-full sm:w-72 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pengumuman atau warta…"
              className="w-full pl-11 pr-8 py-2 rounded bg-white dark:bg-[#120F17] text-gray-900 dark:text-white border border-gray-200 dark:border-[#211C2B] text-xs outline-none focus:border-[#9D4EDD] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                aria-label="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SEKSI 1: INFO & BERITA RESMI GUILD (DARI SERVER DISCORD) */}
      {(mainTab === "all" || mainTab === "guild") && (
        <section className="mb-14" aria-labelledby="guild-news-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-[#9D4EDD]/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-[#9D4EDD] text-white uppercase">
                  [GUILD INFO]
                </span>
                <h2 id="guild-news-heading" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Info &amp; Pengumuman Resmi Guild
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Transmisi langsung dari channel server Discord resmi LogHorizon.
              </p>
            </div>

            <a
              href="https://discord.gg/aJvbVyTxNb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] hover:underline self-start sm:self-auto"
            >
              <span>Buka Server Discord</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#9D4EDD]/20 bg-white dark:bg-[#120F17] p-5 h-64 animate-pulse space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-[#1E1A3A]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-28 bg-neutral-200 dark:bg-[#1E1A3A] rounded" />
                      <div className="h-3 w-20 bg-neutral-200 dark:bg-[#1E1A3A] rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-5/6 bg-neutral-200 dark:bg-[#1E1A3A] rounded" />
                  <div className="h-16 w-full bg-neutral-200 dark:bg-[#1E1A3A] rounded" />
                </div>
              ))}
            </div>
          ) : filteredGuildNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuildNews.map((item, index) => (
                <GuildNewsCard key={item.id} article={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-dashed border-[#9D4EDD]/30 bg-[#9D4EDD]/5 text-center">
              <Megaphone size={36} className="mx-auto text-[#9D4EDD] mb-2 opacity-70" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Belum Ada Transmisi Pengumuman Discord</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
                Kunjungi channel pengumuman di server Discord LogHorizon untuk melihat pesan dan informasi mabar terbaru.
              </p>
              <a
                href="https://discord.gg/aJvbVyTxNb"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition"
              >
                <span>Masuk Discord LogHorizon</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          )}
        </section>
      )}

      {/* SEKSI 2: BERITA GAME & TEKNOLOGI (GLOBAL NEWS) */}
      {(mainTab === "all" || mainTab === "global") && (
        <section aria-labelledby="global-news-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-gray-200 dark:border-[#211C2B]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-gray-200 dark:bg-[#262033] text-gray-700 dark:text-gray-300 uppercase">
                  GLOBAL DISPATCH
                </span>
                <h2 id="global-news-heading" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Berita Game &amp; Teknologi Global
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Update terkini dari Gamebrott, Antara Tekno, NewsAPI, dan analis industri esports.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none self-start sm:self-auto">
              {[
                { id: "ALL", label: "Semua Kategori" },
                { id: "Game & Esports", label: "🎮 Game" },
                { id: "Hardware & Tech", label: "⚡ Hardware" },
                { id: "Konsol & Rilis", label: "🕹️ Konsol" },
                { id: "Turnamen & Guild", label: "🏆 Turnamen" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition whitespace-nowrap border ${
                    activeCategory === cat.id
                      ? "bg-[#9D4EDD] text-white border-[#9D4EDD]"
                      : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#211C2B]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] overflow-hidden animate-pulse flex flex-col h-[410px]"
                >
                  <div className="h-48 w-full bg-neutral-200 dark:bg-[#1E1A3A]" />
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                      <div className="h-5 w-5/6 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                      <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                    </div>
                    <div className="h-8 w-28 rounded bg-neutral-200 dark:bg-[#1E1A3A] pt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGlobalArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGlobalArticles.map((article, index) => (
                <NewsCard key={article.id} article={article} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-gray-300 dark:border-[#211C2B] rounded-lg p-8">
              <Newspaper size={36} className="mx-auto text-gray-400 mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tidak ada warta global yang cocok</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Coba ganti kata kunci pencarian atau pilih kategori &quot;Semua Kategori&quot;.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

// Kartu Warta Resmi Guild (Dari Discord)
function GuildNewsCard({ article, index }: { article: NormalizedArticle; index: number }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || null);
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
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.35) }}
      className="group rounded-lg border border-[#9D4EDD]/35 hover:border-[#9D4EDD] bg-white dark:bg-[#120F17] overflow-hidden flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#9D4EDD]/10"
    >
      <div>
        {/* Header Kartu Discord */}
        <div className="p-4 bg-[#9D4EDD]/10 border-b border-[#9D4EDD]/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {article.authorAvatar ? (
              <Image
                src={article.authorAvatar}
                alt={article.authorName ?? "Council"}
                width={32}
                height={32}
                unoptimized
                className="w-8 h-8 rounded-full border border-[#9D4EDD]/50 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center text-xs font-bold shrink-0">
                LH
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {article.authorName ?? "Council LogHorizon"}
              </p>
              <p className="text-[10px] font-mono text-purple-600 dark:text-[#C77DFF]">
                Server Discord • #pengumuman
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#9D4EDD] text-white shrink-0">
            [GUILD INFO]
          </span>
        </div>

        {/* Thumbnail / Image Attachment jika ada */}
        {imgSrc && !imgError && (
          <div className="relative h-44 w-full overflow-hidden bg-neutral-100 dark:bg-[#181422]">
            <Image
              src={imgSrc}
              alt={article.title}
              fill
              loading="lazy"
              unoptimized
              onError={() => setImgError(true)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-5">
          <p className="text-[11px] font-mono text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Calendar size={12} className="text-[#9D4EDD]" />
            <span>{formattedDate}</span>
          </p>

          <h3 className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#9D4EDD] dark:group-hover:text-[#C77DFF] transition-colors break-words">
            {article.title}
          </h3>

          <p className="mt-2.5 text-xs text-gray-600 dark:text-gray-300 line-clamp-4 leading-relaxed whitespace-pre-wrap break-words">
            {article.description}
          </p>
        </div>
      </div>

      {/* Footer Kartu Discord */}
      <div className="p-5 pt-0">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-sm transition-all duration-150"
        >
          <span>Buka di Discord</span>
          <ArrowUpRight size={14} />
        </a>
      </div>
    </motion.article>
  );
}

// Kartu Warta Berita Game & Tech Global
function NewsCard({ article, index }: { article: NormalizedArticle; index: number }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || DEFAULT_THUMBNAIL);
  const [imgLoaded, setImgLoaded] = useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.35) }}
      className="group rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-[#9D4EDD]/60 hover:shadow-lg hover:shadow-[#9D4EDD]/5"
    >
      <div>
        {/* Thumbnail Image Container */}
        <div className="relative h-48 w-full overflow-hidden bg-neutral-100 dark:bg-[#181422]">
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-[#1E1A3A]" />
          )}
          <Image
            src={imgSrc}
            alt={article.title}
            fill
            loading="lazy"
            unoptimized
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgSrc(DEFAULT_THUMBNAIL);
              setImgLoaded(true);
            }}
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Badge Kategori */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-black/75 backdrop-blur-md text-[#C77DFF] border border-[#9D4EDD]/40 shadow-sm">
              {article.category}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 text-[#9D4EDD] dark:text-purple-300 font-bold truncate max-w-[160px]">
              <Globe size={11} className="shrink-0" />
              {article.sourceName}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar size={11} />
              {formattedDate}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#9D4EDD] dark:group-hover:text-[#C77DFF] transition-colors break-words">
            {article.title}
          </h3>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed break-words">
            {article.description}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-5 pt-0 mt-1">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#262033] hover:bg-[#9D4EDD] hover:text-white hover:border-[#9D4EDD] transition-all duration-150 group/btn"
        >
          <span>Baca Selengkapnya</span>
          <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </a>
      </div>
    </motion.article>
  );
}
