"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  ChevronDown,
  Crown,
  HeartHandshake,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";

type NavDropdownItem = {
  label: string;
  href: string;
  desc: string;
  icon: typeof MessageSquare;
};

type NavGroup = {
  title: string;
  key: string;
  icon: typeof MessageSquare;
  items: NavDropdownItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Komunitas",
    key: "komunitas",
    icon: MessageSquare,
    items: [
      {
        label: "Forum Diskusi",
        href: "/forum",
        desc: "Diskusi umum & clip komunitas",
        icon: MessageSquare,
      },
      {
        label: "Warta & Info Discord",
        href: "/news",
        desc: "Berita game & pengumuman guild",
        icon: Newspaper,
      },
      {
        label: "Papan Peringkat",
        href: "/leaderboard",
        desc: "Top XP & Donatur",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Arena & Mabar",
    key: "arena",
    icon: Swords,
    items: [
      {
        label: "Cari Teman Mabar (LFG)",
        href: "/events?view=mabar",
        desc: "Ajakan push rank & mabar cepat",
        icon: Users,
      },
      {
        label: "Turnamen & Bagan",
        href: "/events?view=turnamen",
        desc: "Kompetisi resmi & bracket pertandingan",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Guild",
    key: "guild",
    icon: Crown,
    items: [
      {
        label: "Treasury & Donasi",
        href: "/donate",
        desc: "Dukung guild & klaim kasta role",
        icon: HeartHandshake,
      },
      {
        label: "Aturan & Kasta",
        href: "/rules",
        desc: "Panduan & hierarki kerajaan LogHorizon",
        icon: BookOpen,
      },
    ],
  },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<Record<string, boolean>>({
    komunitas: true,
    arena: true,
    guild: false,
  });
  const [isDark, setIsDark] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Poll unread messages count for active user
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }
    let active = true;

    const checkUnread = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/conversations/unread-count");
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; unreadCount?: number };
        if (active && typeof data.unreadCount === "number") {
          setUnreadMessages(data.unreadCount);
        }
      } catch {
        // Silently catch background errors
      }
    };

    void checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial theme from localStorage
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("loghorizon-theme");
    const dark = savedTheme !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // Scroll listener for floating navbar
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 15);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside to close desktop profile dropdown and menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
    setActiveMenu(null);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setDropdownOpen(false);
        setActiveMenu(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    const applyTheme = () => {
      setIsDark(nextDark);
      document.documentElement.classList.toggle("dark", nextDark);
      window.localStorage.setItem("loghorizon-theme", nextDark ? "dark" : "light");
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        applyTheme();
      });
    } else {
      applyTheme();
    }
  }

  const handleMouseEnter = (key: string) => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setActiveMenu(key);
  };

  const handleMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 180);
  };

  const toggleMobileGroup = (key: string) => {
    setMobileAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");
  const isOwner = Boolean(user && (user.username === ".odyssia" || user.username === "odyssia" || user.name === ".odyssia" || user.discordId === "706661230835925042"));

  // Determine active states for top nav items
  const isHomeActive = pathname === "/";
  const isMarketplaceActive = pathname.startsWith("/marketplace");
  const isKomunitasActive = pathname.startsWith("/forum") || pathname.startsWith("/news") || pathname.startsWith("/leaderboard");
  const isArenaActive = pathname.startsWith("/events");
  const isGuildActive = pathname.startsWith("/donate") || pathname.startsWith("/rules") || pathname === "/#rules";

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Sticky z-40, Glassmorphism) */}
      {/* ========================================================================= */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 bg-white/80 dark:bg-[#08060B]/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#211C2B] ${
          scrolled ? "py-2.5 shadow-sm shadow-purple-950/5" : "py-3 sm:py-3.5"
        }`}
      >
        <div className="w-full max-w-[1360px] 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
          {/* SISI KIRI: Logo & Nama Guild */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="LogHorizon Beranda">
            <div className="relative size-9 rounded-full overflow-hidden border border-[#9D4EDD]/40 group-hover:border-[#9D4EDD] transition-colors bg-[#171322] flex items-center justify-center shadow-sm">
              <Image
                src="/loghorizon-logo.png"
                alt="LogHorizon Emblem"
                width={36}
                height={36}
                className="object-cover transition-transform group-hover:scale-105"
                priority
              />
            </div>
            <span className="font-black tracking-wider text-base text-gray-900 dark:text-white uppercase font-sans">
              LOG<span className="text-[#9D4EDD] dark:text-[#C77DFF]">HORIZON</span>
            </span>
          </Link>

          {/* SISI TENGAH: Menu Navigasi Terstruktur Desktop (Dropdown Cyber Minimalist) */}
          <nav
            className="hidden md:flex desktop-navbar items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200/60 dark:border-[#211C2B]/80 bg-white/40 dark:bg-[#120F17]/40 backdrop-blur-sm"
            aria-label="Navigasi Utama Desktop"
          >
            {/* 1. HOME */}
            <Link
              href="/"
              className={`relative px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                isHomeActive
                  ? "text-[#9D4EDD] dark:text-[#C77DFF]"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Home
            </Link>

            {/* 2. KOMUNITAS DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("komunitas")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "komunitas" ? null : "komunitas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  isKomunitasActive
                    ? "text-[#9D4EDD] dark:text-[#C77DFF]"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span>Komunitas</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "komunitas" ? "rotate-180 text-[#9D4EDD]" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "komunitas" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-2 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white/95 dark:bg-[#120F17]/95 backdrop-blur-md shadow-2xl z-50 space-y-1"
                  >
                    {navGroups[0].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-purple-50 dark:hover:bg-[#1E1A3A]/70 group/item"
                      >
                        <div className="size-8 rounded-md bg-purple-500/10 text-purple-600 dark:text-[#C77DFF] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-[#9D4EDD] group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white group-hover/item:text-[#9D4EDD] dark:group-hover/item:text-[#C77DFF] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. ARENA & MABAR DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("arena")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "arena" ? null : "arena")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  isArenaActive
                    ? "text-[#9D4EDD] dark:text-[#C77DFF]"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span>Arena &amp; Mabar</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "arena" ? "rotate-180 text-[#9D4EDD]" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "arena" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-2 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white/95 dark:bg-[#120F17]/95 backdrop-blur-md shadow-2xl z-50 space-y-1"
                  >
                    {navGroups[1].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-purple-50 dark:hover:bg-[#1E1A3A]/70 group/item"
                      >
                        <div className="size-8 rounded-md bg-purple-500/10 text-purple-600 dark:text-[#C77DFF] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-[#9D4EDD] group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white group-hover/item:text-[#9D4EDD] dark:group-hover/item:text-[#C77DFF] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4. MARKETPLACE */}
            <Link
              href="/marketplace"
              className={`relative px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                isMarketplaceActive
                  ? "text-[#9D4EDD] dark:text-[#C77DFF]"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Marketplace
            </Link>

            {/* 5. GUILD DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("guild")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "guild" ? null : "guild")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  isGuildActive
                    ? "text-[#9D4EDD] dark:text-[#C77DFF]"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span>Guild</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "guild" ? "rotate-180 text-[#9D4EDD]" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "guild" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-2 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white/95 dark:bg-[#120F17]/95 backdrop-blur-md shadow-2xl z-50 space-y-1"
                  >
                    {navGroups[2].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-purple-50 dark:hover:bg-[#1E1A3A]/70 group/item"
                      >
                        <div className="size-8 rounded-md bg-purple-500/10 text-purple-600 dark:text-[#C77DFF] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-[#9D4EDD] group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white group-hover/item:text-[#9D4EDD] dark:group-hover/item:text-[#C77DFF] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* SISI KANAN: Aksi Desktop & Hamburger Mobile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme Toggle (Tampil di Desktop & Mobile) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="size-9 rounded-full border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/60 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:border-[#9D4EDD] transition-colors"
              title={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
              aria-label="Ganti mode tema"
            >
              {isDark ? (
                <Sun size={15} className="text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon size={15} className="text-purple-600 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Aksi Khusus Desktop (Lonceng Notifikasi & Profil) */}
            <div className="hidden md:flex desktop-navbar items-center gap-2.5">
              {status === "loading" ? (
                <div className="h-8 w-24 rounded bg-gray-200 dark:bg-[#1E1A3A] animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/messages"
                    className="relative p-2 rounded-full border border-gray-200 dark:border-[#211C2B] bg-white/60 dark:bg-[#120F17]/60 hover:border-[#9D4EDD]/60 transition-colors text-gray-600 dark:text-gray-300 hover:text-[#9D4EDD] dark:hover:text-[#C77DFF]"
                    title="Pesan &amp; Obrolan Komunitas"
                  >
                    <MessageSquare size={17} />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#9D4EDD] text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>
                  <NotificationBell />
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-gray-200 dark:border-[#211C2B] bg-white/60 dark:bg-[#120F17]/60 hover:border-[#9D4EDD]/60 transition-colors"
                      aria-expanded={dropdownOpen}
                      aria-label="Menu profil pengguna"
                    >
                      <div className="relative size-7 rounded-full overflow-hidden border border-[#9D4EDD]/40 bg-[#171322] flex items-center justify-center">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username ?? "User"} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="text-xs font-bold text-purple-300">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[90px] truncate">
                        {user.username ?? user.name ?? "Gamer"}
                      </span>
                      <ChevronDown size={13} className="text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-2 shadow-xl z-50 space-y-1"
                          role="menu"
                        >
                          <div className="px-3 py-2 border-b border-gray-100 dark:border-[#211C2B]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {user.username ?? user.name ?? "Gamer"}
                              </span>
                              {isOwner && <Crown size={12} className="text-amber-400 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[11px] font-mono text-[#9D4EDD] dark:text-[#C77DFF]">
                                {isOwner
                                  ? "👑 Emperor"
                                  : user.role === "ADMIN"
                                    ? "✨ Prince / Princess"
                                    : user.role === "MODERATOR"
                                      ? "⚔️ Lord Commander"
                                      : "🎮 Adventurer"}
                              </p>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400">
                                Lv. {user.level ?? 1}
                              </span>
                            </div>
                          </div>

                          <div className="py-1">
                            {isStaff && (
                              <Link
                                href="/admin"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#1E1A3A] transition-colors"
                                role="menuitem"
                              >
                                <ShieldCheck size={14} className="shrink-0" />
                                <span>Dashboard Admin</span>
                              </Link>
                            )}
                            <Link
                              href="/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E1A3A] transition-colors"
                              role="menuitem"
                            >
                              <Settings size={14} className="shrink-0" />
                              <span>Profil &amp; Pengaturan</span>
                            </Link>
                          </div>

                          <div className="pt-1 border-t border-gray-100 dark:border-[#211C2B]">
                            <button
                              type="button"
                              onClick={() => {
                                setDropdownOpen(false);
                                void signOut();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              role="menuitem"
                            >
                              <LogOut size={14} className="shrink-0" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => void signIn("discord")}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-sm shadow-[#5865F2]/25 shrink-0"
                >
                  <span className="text-sm leading-none">◉</span>
                  <span>Connect Discord</span>
                </motion.button>
              )}
            </div>

            {/* Mobile Actions (Pesan & Hamburger Menu) */}
            <div className="flex md:hidden items-center gap-1.5">
              {user && (
                <Link
                  href="/messages"
                  className="relative size-9 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/60 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:border-[#9D4EDD] transition-colors"
                  aria-label="Pesan &amp; Obrolan Komunitas"
                >
                  <MessageSquare size={17} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 size-3.5 bg-[#9D4EDD] rounded-full text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="mobile-only size-9 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/60 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:border-[#9D4EDD] transition-colors"
                aria-label="Buka menu navigasi"
                aria-expanded={mobileOpen}
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. TAMPILAN MOBILE: OFFCANVAS SLIDEBAR MENU (Accordion Style) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Latar Belakang Gelap Transparan (Backdrop Overlay) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden mobile-only"
              aria-hidden="true"
            />

            {/* Slidebar Menu Drawer (Off-Canvas dari Sisi Kanan) */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-[#0D0A14] border-l border-gray-200 dark:border-[#211C2B] p-5 flex flex-col justify-between shadow-2xl md:hidden mobile-slidebar overflow-y-auto"
              aria-label="Menu navigasi mobile"
            >
              <div>
                {/* Header Slidebar: Logo LogHorizon + Tombol Tutup (X) */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#211C2B]">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-8 rounded-full overflow-hidden border border-[#9D4EDD]/40 bg-[#171322] flex items-center justify-center">
                      <Image src="/loghorizon-logo.png" alt="LogHorizon" fill className="object-cover" />
                    </div>
                    <span className="font-black text-sm text-gray-900 dark:text-white tracking-wider">
                      LOG<span className="text-[#9D4EDD] dark:text-[#C77DFF]">HORIZON</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-md border border-gray-200 dark:border-[#211C2B] text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
                    aria-label="Tutup menu navigasi"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Kartu Info User Mobile */}
                {user ? (
                  <div className="mt-4 p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#14101C]">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 rounded-full overflow-hidden border border-[#9D4EDD]/60 bg-[#1E1A3A] shrink-0">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username ?? "User"} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="grid place-items-center h-full text-xs font-bold text-purple-300">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {isOwner && (
                          <span className="absolute bottom-0 right-0 size-3 bg-amber-400 rounded-full border border-black flex items-center justify-center">
                            <Crown size={8} className="text-black" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                            {user.username ?? user.name ?? "Gamer"}
                          </p>
                          {isOwner && <Crown size={12} className="text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] font-mono text-[#9D4EDD] dark:text-[#C77DFF]">
                          {isOwner
                            ? "👑 Emperor"
                            : user.role === "ADMIN"
                              ? "✨ Prince / Princess"
                              : user.role === "MODERATOR"
                                ? "⚔️ Lord Commander"
                                : "🎮 Adventurer"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold">
                            Lv. {user.level ?? 1}
                          </span>
                          <span>•</span>
                          <span>{user.xp ?? 0} XP</span>
                        </div>
                      </div>
                    </div>

                    {/* Pesan & Obrolan Komunitas Shortcut */}
                    <Link
                      href="/messages"
                      onClick={() => setMobileOpen(false)}
                      className="mt-2.5 flex items-center justify-between p-2.5 rounded-lg border border-[#9D4EDD]/30 bg-[#9D4EDD]/10 text-xs font-bold text-gray-800 dark:text-gray-200 hover:border-[#9D4EDD] transition"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare size={15} className="text-[#9D4EDD]" />
                        <span>Pesan &amp; Obrolan Komunitas</span>
                      </div>
                      {unreadMessages > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9D4EDD] text-white">
                          {unreadMessages} baru
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Buka ➔</span>
                      )}
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void signIn("discord");
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold shadow-md shadow-[#5865F2]/20 transition"
                    >
                      <span className="text-sm leading-none">◉</span>
                      <span>Connect Discord</span>
                    </button>
                  </div>
                )}

                {/* Daftar Menu Navigasi Vertikal Accordion */}
                <nav className="mt-5 flex flex-col space-y-1.5" aria-label="Navigasi Menu Mobile">
                  {/* HOME */}
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className={`py-2.5 px-3.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-between ${
                      isHomeActive
                        ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF]"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Home size={16} className={isHomeActive ? "text-[#9D4EDD] dark:text-[#C77DFF]" : "text-gray-400"} />
                      <span>Home</span>
                    </span>
                    {isHomeActive && <span className="size-1.5 rounded-full bg-[#9D4EDD]" />}
                  </Link>

                  {/* ACCORDION GROUPS */}
                  {navGroups.map((group) => {
                    const isOpen = mobileAccordion[group.key] ?? false;
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.key} className="rounded-lg border border-gray-200/70 dark:border-[#211C2B] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleMobileGroup(group.key)}
                          className="w-full py-2.5 px-3.5 flex items-center justify-between bg-gray-50/70 dark:bg-[#120F17]/60 text-sm font-bold text-gray-800 dark:text-gray-200 hover:text-[#9D4EDD]"
                        >
                          <span className="flex items-center gap-2.5">
                            <GroupIcon size={16} className="text-[#9D4EDD]" />
                            <span>{group.title}</span>
                          </span>
                          <ChevronDown size={14} className={`transition-transform duration-200 text-gray-400 ${isOpen ? "rotate-180 text-[#9D4EDD]" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="p-1 space-y-0.5 bg-white dark:bg-[#0D0A14]"
                            >
                              {group.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = pathname === subItem.href || (subItem.href.includes("?") && pathname === subItem.href.split("?")[0]);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-start gap-2.5 ${
                                      isSubActive
                                        ? "bg-purple-500/15 text-[#9D4EDD] dark:text-[#C77DFF] font-bold"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    <SubIcon size={14} className="shrink-0 mt-0.5 text-purple-500/80" />
                                    <div>
                                      <p>{subItem.label}</p>
                                      <p className="text-[10px] text-gray-400 line-clamp-1">{subItem.desc}</p>
                                    </div>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* MARKETPLACE */}
                  <Link
                    href="/marketplace"
                    onClick={() => setMobileOpen(false)}
                    className={`py-2.5 px-3.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-between ${
                      isMarketplaceActive
                        ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF]"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Store size={16} className={isMarketplaceActive ? "text-[#9D4EDD] dark:text-[#C77DFF]" : "text-gray-400"} />
                      <span>Marketplace</span>
                    </span>
                    {isMarketplaceActive && <span className="size-1.5 rounded-full bg-[#9D4EDD]" />}
                  </Link>

                  {/* Profile & Settings (jika login) */}
                  {user && (
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2.5 ${
                        pathname === "/profile"
                          ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF]"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Settings size={16} className={pathname === "/profile" ? "text-[#9D4EDD]" : "text-gray-400"} />
                      <span>Profil &amp; Pengaturan</span>
                    </Link>
                  )}

                  {/* Admin Panel (jika staff) */}
                  {isStaff && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2.5 ${
                        pathname.startsWith("/admin")
                          ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF]"
                          : "text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      }`}
                    >
                      <ShieldCheck size={16} />
                      <span>Dashboard Admin</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Footer Slidebar (Sign Out jika Login) */}
              <div className="pt-5 border-t border-gray-100 dark:border-[#211C2B] mt-6">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-md text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/25 border border-red-200/50 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-center text-gray-400 font-mono">
                    LogHorizon • Cyber Gaming Guild
                  </p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
