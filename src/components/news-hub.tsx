"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Calendar, ExternalLink, Globe, Loader2, Newspaper, RefreshCw, Rss, Search, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import type { NormalizedArticle } from "@/app/api/news/route";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

export function NewsHub() {
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<string>("Multi-Source Dispatch");
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
      if (data.ok && Array.isArray(data.articles)) {
        setArticles(data.articles);
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

  const filteredArticles = articles.filter((article) => {
    // 1. Filter Category
    if (activeCategory !== "ALL" && article.category !== activeCategory) {
      return false;
    }
    // 2. Filter Search Query
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
              Arsip warta terlengkap seputar skena gaming, turnamen esports, rilis konsol, dan inovasi teknologi komputasi berbahasa Indonesia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#16121F] px-3 py-1.5 rounded border border-gray-200 dark:border-[#262033]">
              Transmisi: <strong className="text-purple-600 dark:text-purple-400 font-bold">{articles.length} Berita Aktif</strong>
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

        {/* Filter Controls (Search + Categories) */}
        <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: "ALL", label: "Semua Warta" },
              { id: "Game & Esports", label: "🎮 Game & Esports" },
              { id: "Hardware & Tech", label: "⚡ Hardware & Tech" },
              { id: "Konsol & Rilis", label: "🕹️ Konsol & Rilis" },
              { id: "Turnamen & Guild", label: "🏆 Turnamen & Guild" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap border ${
                  activeCategory === tab.id
                    ? "bg-[#9D4EDD] text-white border-[#9D4EDD] shadow-sm shadow-[#9D4EDD]/20"
                    : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#211C2B] hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Search Bar */}
          <div className="relative flex items-center w-full md:w-72 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari game, topik, atau kata kunci…"
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

      {/* Grid Konten Berita */}
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
                  <div className="h-3.5 w-4/6 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
                </div>
                <div className="h-8 w-28 rounded bg-neutral-200 dark:bg-[#1E1A3A] pt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length > 0 ? (
        <>
          <div className="mb-4 text-xs font-mono text-gray-500 dark:text-gray-400">
            Menampilkan <strong className="text-gray-900 dark:text-white">{filteredArticles.length}</strong> warta terverifikasi
            {debouncedSearch ? ` untuk pencarian "${debouncedSearch}"` : ""}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
              <NewsCard key={article.id} article={article} index={index} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-20 text-center border border-dashed border-gray-300 dark:border-[#211C2B] rounded-lg p-8">
          <Newspaper size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak ada warta yang cocok</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Tidak ditemukan warta untuk kata kunci pencarian tersebut. Coba ganti kata kunci atau pilih tab kategori &quot;Semua Warta&quot;.
          </p>
          {debouncedSearch && (
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("ALL");
              }}
              className="mt-4 px-3 py-1.5 rounded text-xs font-bold bg-[#9D4EDD] text-white hover:bg-[#8338EC] transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>
      )}
    </main>
  );
}

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
          {/* Metadata Bar */}
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

          {/* Title */}
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#9D4EDD] dark:group-hover:text-[#C77DFF] transition-colors break-words">
            {article.title}
          </h2>

          {/* Snippet / Description */}
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed break-words">
            {article.description}
          </p>
        </div>
      </div>

      {/* Card Footer / Action Button */}
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
