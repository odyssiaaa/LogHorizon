"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  ArrowUp,
  Award,
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
  ShieldAlert,
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
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { GlobalUserSearch } from "@/components/global-user-search";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

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
        label: "Direktori Petualang",
        href: "/members",
        desc: "Cari member, cek profil & ajak mabar",
        icon: Users,
      },
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
      {
        label: "Hall of Winners 🏆",
        href: "/hall-of-winners",
        desc: "Aula para juara & arsip piala season",
        icon: Award,
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
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      setShowScrollTop(window.scrollY > 250);
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

  const [adminPendingCount, setAdminPendingCount] = useState(0);

  // Poll pending queue count for staff/owner
  useEffect(() => {
    if (!isStaff && !isOwner) {
      setAdminPendingCount(0);
      return;
    }
    let active = true;
    const fetchPending = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/admin/pending-count");
        if (!res.ok) return;
        const json = (await res.json()) as { pendingCount?: number };
        if (active && typeof json.pendingCount === "number") {
          setAdminPendingCount(json.pendingCount);
        }
      } catch {
        // Silently catch background errors
      }
    };
    void fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isStaff, isOwner]);

  // Determine active states for top nav items
  const isHomeActive = pathname === "/";
  const isMarketplaceActive = pathname.startsWith("/marketplace");
  const isKomunitasActive = pathname.startsWith("/forum") || pathname.startsWith("/news") || pathname.startsWith("/leaderboard");
  const isArenaActive = pathname.startsWith("/events");
  const isGuildActive = pathname.startsWith("/donate") || pathname.startsWith("/rules") || pathname === "/#rules";

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MAIN TOP NAVBAR (Sticky z-40, Slim 72px)                               */}
      {/* ========================================================================= */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 bg-white/95 dark:bg-[#09040F]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2A1B42] h-[72px] flex items-center ${
          scrolled ? "shadow-md shadow-slate-900/5 dark:shadow-xl dark:shadow-black/40" : ""
        }`}
      >
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
          {/* SISI KIRI: Logo & Nama Guild */}
          <Link href="/" className="flex items-center gap-3 group shrink-0" aria-label="LogHorizon Beranda">
            <div className="relative size-9 rounded-lg border border-slate-200 dark:border-[#2A1B42] group-hover:border-[#7C3AED] transition-colors bg-slate-100 dark:bg-[#11091D] flex items-center justify-center shadow-sm overflow-hidden">
              <Image
                src="/loghorizon-logo.png"
                alt="LogHorizon Emblem"
                width={36}
                height={36}
                className="object-cover transition-transform group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-bold tracking-wider text-base text-slate-900 dark:text-[#F8FAFC] uppercase">
                LOG<span className="text-[#7C3AED] dark:text-[#A78BFA]">HORIZON</span>
              </span>
            </div>
          </Link>

          {/* SISI TENGAH: Menu Navigasi 5 Menu Pill Desktop */}
          <nav
            className="hidden md:flex desktop-navbar items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-100/90 dark:bg-[#11091D]"
            aria-label="Navigasi Utama Desktop"
          >
            {/* 1. HOME */}
            <Link
              href="/"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                isHomeActive
                  ? "bg-[#7C3AED] text-white"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1A0F2E]"
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  isKomunitasActive || activeMenu === "komunitas"
                    ? "bg-[#7C3AED] text-white"
                    : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1A0F2E]"
                }`}
              >
                <span>Komunitas</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "komunitas" ? "rotate-180" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "komunitas" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] shadow-xl dark:shadow-2xl z-50 divide-y divide-slate-100 dark:divide-[#2A1B42]/60 p-1.5"
                  >
                    {navGroups[0].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-md text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1A0F2E] group/item"
                      >
                        <div className="size-8 rounded-md bg-slate-100 dark:bg-[#1A0F2E] border border-slate-200 dark:border-[#2A1B42] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:border-[#7C3AED] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-[#A78BFA] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug line-clamp-1 mt-0.5">
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  isArenaActive || activeMenu === "arena"
                    ? "bg-[#7C3AED] text-white"
                    : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1A0F2E]"
                }`}
              >
                <span>Arena &amp; Mabar</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "arena" ? "rotate-180" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "arena" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] shadow-xl dark:shadow-2xl z-50 divide-y divide-slate-100 dark:divide-[#2A1B42]/60 p-1.5"
                  >
                    {navGroups[1].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-md text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1A0F2E] group/item"
                      >
                        <div className="size-8 rounded-md bg-slate-100 dark:bg-[#1A0F2E] border border-slate-200 dark:border-[#2A1B42] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:border-[#7C3AED] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-[#A78BFA] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug line-clamp-1 mt-0.5">
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
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                isMarketplaceActive
                  ? "bg-[#7C3AED] text-white"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1A0F2E]"
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  isGuildActive || activeMenu === "guild"
                    ? "bg-[#7C3AED] text-white"
                    : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1A0F2E]"
                }`}
              >
                <span>Guild</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === "guild" ? "rotate-180" : "opacity-70"}`} />
              </button>

              <AnimatePresence>
                {activeMenu === "guild" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] shadow-xl dark:shadow-2xl z-50 divide-y divide-slate-100 dark:divide-[#2A1B42]/60 p-1.5"
                  >
                    {navGroups[2].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setActiveMenu(null)}
                        className="flex items-start gap-3 p-2.5 rounded-md text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1A0F2E] group/item"
                      >
                        <div className="size-8 rounded-md bg-slate-100 dark:bg-[#1A0F2E] border border-slate-200 dark:border-[#2A1B42] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5 group-hover/item:border-[#7C3AED] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-white transition-colors">
                          <item.icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] group-hover/item:text-[#7C3AED] dark:group-hover/item:text-[#A78BFA] transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug line-clamp-1 mt-0.5">
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
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Global Member Search Desktop */}
            <GlobalUserSearch className="hidden lg:block w-40 xl:w-56 shrink-0" placeholder="🔍 Cari Petualang..." />

            {/* Theme Toggle Component */}
            <ThemeToggle />
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>

            {/* Aksi Khusus Desktop (Pesan, Lonceng Notifikasi & Profil) */}
            <div className="hidden md:flex desktop-navbar items-center gap-2">
              {status === "loading" ? (
                <div className="h-10 w-24 rounded-lg bg-slate-100 dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/messages"
                    className="relative w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white flex items-center justify-center shrink-0 shadow-sm dark:shadow-none"
                    title="Pesan &amp; Obrolan Komunitas"
                  >
                    <MessageSquare size={16} />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#7C3AED] text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>
                  <NotificationBell />
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="relative h-10 px-3 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors flex items-center gap-2 font-mono text-xs text-slate-900 dark:text-[#F8FAFC] shadow-sm dark:shadow-none"
                      aria-expanded={dropdownOpen}
                      aria-label="Menu profil pengguna"
                    >
                      <div className="relative size-6 rounded-md border border-[#7C3AED]/40 bg-slate-100 dark:bg-[#1A0E2E] flex items-center justify-center overflow-hidden">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username ?? "User"} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="text-[10px] font-bold text-[#7C3AED] dark:text-[#A78BFA]">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold max-w-[100px] truncate">
                        {user.username ?? user.name ?? "Gamer"}
                      </span>
                      <span className="size-2 rounded-full bg-[#10B981] shrink-0" title="Online" />
                      <ChevronDown size={13} className="text-slate-400 dark:text-[#A78BFA]" />
                      {(isStaff || isOwner) && adminPendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] p-2 shadow-xl dark:shadow-2xl z-50 space-y-1 divide-y divide-slate-100 dark:divide-[#2A1B42]/60"
                          role="menu"
                        >
                          <div className="px-3 py-2 pb-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                                {user.username ?? user.name ?? "Gamer"}
                              </span>
                              {isOwner && <Crown size={12} className="text-amber-500 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]">
                                {isOwner
                                  ? "👑 Emperor"
                                  : user.role === "ADMIN"
                                    ? "✨ Prince / Princess"
                                    : user.role === "MODERATOR"
                                      ? "⚔️ Lord Commander"
                                      : "🎮 Adventurer"}
                              </p>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2A1B42] text-emerald-600 dark:text-[#10B981] font-bold rounded">
                                Lv. {user.level ?? 1}
                              </span>
                            </div>
                          </div>

                          <div className="py-1 pt-1.5 space-y-0.5">
                            {(isStaff || isOwner) && (
                              <Link
                                href="/admin"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono font-semibold text-slate-700 dark:text-[#A78BFA] hover:text-[#7C3AED] dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1A0E2E] transition-colors group"
                                role="menuitem"
                              >
                                <div className="flex items-center gap-2">
                                  <ShieldAlert size={14} className="shrink-0 text-[#7C3AED] dark:text-[#C4B5FD] group-hover:scale-110 transition-transform" />
                                  <span>Dashboard Admin</span>
                                </div>
                                {adminPendingCount > 0 ? (
                                  <span className="flex items-center gap-1">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[10px] font-mono font-bold leading-none">
                                      {adminPendingCount}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">Akses ➔</span>
                                )}
                              </Link>
                            )}
                            <Link
                              href="/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono text-slate-700 dark:text-[#F8FAFC] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] hover:bg-slate-50 dark:hover:bg-[#1A0E2E] transition-colors"
                              role="menuitem"
                            >
                              <Settings size={14} className="shrink-0 text-[#7C3AED] dark:text-[#A78BFA]" />
                              <span>Profil &amp; Pengaturan</span>
                            </Link>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDropdownOpen(false);
                                void signOut();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => void signIn("discord")}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-bold transition-all border border-[#5865F2] shrink-0"
                >
                  <span className="text-sm leading-none">◉</span>
                  <span>Connect Discord</span>
                </motion.button>
              )}
            </div>

            {/* Mobile Actions (Pesan, Notifikasi & Hamburger Menu) */}
            <div className="flex md:hidden items-center gap-1.5">
              {user ? (
                <Link
                  href="/messages"
                  className="relative w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white flex items-center justify-center hover:border-[#7C3AED] transition-colors shrink-0 shadow-sm dark:shadow-none"
                  aria-label="Pesan &amp; Obrolan Komunitas"
                >
                  <MessageSquare size={16} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-1 bg-[#7C3AED] rounded-full text-[8px] font-mono font-bold text-white flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void signIn("discord")}
                  className="px-2.5 h-10 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-mono font-bold border border-[#5865F2] shrink-0"
                >
                  Masuk
                </button>
              )}

              <NotificationBell />

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="mobile-only w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-700 dark:text-[#F8FAFC] flex items-center justify-center hover:border-[#7C3AED] transition-colors shrink-0 shadow-sm dark:shadow-none"
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
      {/* 2. TAMPILAN MOBILE: OFFCANVAS SLIDEBAR MENU (Brutalism Accordion)          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden mobile-only"
              aria-hidden="true"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-[#09040F] border-l border-slate-200 dark:border-[#2E1E45] p-5 flex flex-col justify-between shadow-2xl md:hidden mobile-slidebar overflow-y-auto rounded-none"
              aria-label="Menu navigasi mobile"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#2E1E45]">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-8 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#130921] flex items-center justify-center overflow-hidden">
                      <Image src="/loghorizon-logo.png" alt="LogHorizon" fill className="object-cover" />
                    </div>
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] tracking-wider uppercase">
                      LOG<span className="text-[#7C3AED] dark:text-[#A78BFA]">HORIZON</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-none border border-slate-200 dark:border-[#2E1E45] text-slate-500 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] flex items-center justify-center transition"
                    aria-label="Tutup menu navigasi"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Switcher Bahasa & Mata Uang Mobile */}
                <div className="mt-3">
                  <LocaleSwitcher isMobileDrawer />
                </div>

                {/* Global Member Search Mobile */}
                <div className="mt-3">
                  <GlobalUserSearch
                    variant="mobile"
                    placeholder="🔍 Cari Petualang..."
                    onSelectUser={() => setMobileOpen(false)}
                  />
                </div>

                {/* Banner Pasang PWA di Layar Utama HP */}
                <PwaInstallBanner isDrawer />

                {/* Kartu Info User Mobile */}
                {user ? (
                  <div className="mt-4 p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921]">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 rounded-none border border-[#7C3AED]/60 bg-slate-100 dark:bg-[#1A0E2E] shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username ?? "User"} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="grid place-items-center h-full text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA]">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {isOwner && (
                          <span className="absolute bottom-0 right-0 size-3 bg-amber-400 border border-black flex items-center justify-center">
                            <Crown size={8} className="text-black" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 font-mono">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC] truncate">
                            {user.username ?? user.name ?? "Gamer"}
                          </p>
                          <span className="size-2 rounded-full bg-[#10B981] shrink-0" />
                          {isOwner && <Crown size={12} className="text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-[#A78BFA]">
                          {isOwner
                            ? "👑 Emperor"
                            : user.role === "ADMIN"
                              ? "✨ Prince / Princess"
                              : user.role === "MODERATOR"
                                ? "⚔️ Lord Commander"
                                : "🎮 Adventurer"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-[#A78BFA]">
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-emerald-600 dark:text-[#10B981] font-bold">
                            Lv. {user.level ?? 1}
                          </span>
                          <span>•</span>
                          <span>{user.xp ?? 0} XP</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/messages"
                      onClick={() => setMobileOpen(false)}
                      className="mt-2.5 flex items-center justify-between p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-xs font-mono font-bold text-slate-900 dark:text-[#F8FAFC] hover:border-[#7C3AED] transition"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                        <span>Pesan &amp; Obrolan Komunitas</span>
                      </div>
                      {unreadMessages > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-[#7C3AED] text-white">
                          {unreadMessages} baru
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#7C3AED] dark:text-[#A78BFA]">Buka ➔</span>
                      )}
                    </Link>

                    {(isStaff || isOwner) && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="mt-2 flex items-center justify-between p-2.5 rounded-none border border-[#7C3AED] bg-[#7C3AED]/15 text-xs font-mono font-bold text-[#7C3AED] dark:text-[#C4B5FD] hover:bg-[#7C3AED] hover:text-white transition"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                          <span>ADMIN COMMAND CENTER</span>
                        </div>
                        {adminPendingCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                            {adminPendingCount} Pending
                          </span>
                        ) : (
                          <span className="text-[10px]">Akses ➔</span>
                        )}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void signIn("discord");
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-bold transition border border-[#5865F2]"
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
                    className={`py-2.5 px-3.5 rounded-none border text-sm font-bold transition-colors flex items-center justify-between ${
                      isHomeActive
                        ? "bg-purple-50 dark:bg-[#1A0E2E] text-[#7C3AED] dark:text-[#F8FAFC] border-[#7C3AED]"
                        : "border-slate-200 dark:border-[#2E1E45] text-slate-700 dark:text-[#A78BFA] hover:bg-slate-100 dark:hover:bg-[#130921] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Home size={16} className={isHomeActive ? "text-[#7C3AED]" : "text-slate-400 dark:text-[#A78BFA]"} />
                      <span>Home</span>
                    </span>
                    {isHomeActive && <span className="size-1.5 bg-[#7C3AED]" />}
                  </Link>

                  {/* ACCORDION GROUPS */}
                  {navGroups.map((group) => {
                    const isOpen = mobileAccordion[group.key] ?? false;
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.key} className="rounded-none border border-slate-200 dark:border-[#2E1E45] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleMobileGroup(group.key)}
                          className="w-full py-2.5 px-3.5 flex items-center justify-between bg-slate-50 dark:bg-[#130921] text-sm font-bold text-slate-900 dark:text-[#F8FAFC] hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
                        >
                          <span className="flex items-center gap-2.5">
                            <GroupIcon size={16} className="text-[#7C3AED]" />
                            <span>{group.title}</span>
                          </span>
                          <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 dark:text-[#A78BFA] ${isOpen ? "rotate-180 text-[#7C3AED]" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="p-1 space-y-0.5 bg-white dark:bg-[#09040F] divide-y divide-slate-100 dark:divide-[#2E1E45]/40"
                            >
                              {group.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = pathname === subItem.href || (subItem.href.includes("?") && pathname === subItem.href.split("?")[0]);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`py-2 px-3 rounded-none text-xs font-medium transition-colors flex items-start gap-2.5 ${
                                      isSubActive
                                        ? "bg-purple-50 dark:bg-[#1A0E2E] text-[#7C3AED] dark:text-[#F8FAFC] font-bold"
                                        : "text-slate-600 dark:text-[#A78BFA] hover:bg-slate-100 dark:hover:bg-[#130921] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                                    }`}
                                  >
                                    <SubIcon size={14} className="shrink-0 mt-0.5 text-[#7C3AED]" />
                                    <div>
                                      <p>{subItem.label}</p>
                                      <p className="text-[10px] text-slate-500 dark:text-[#A78BFA]/80 line-clamp-1">{subItem.desc}</p>
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
                    className={`py-2.5 px-3.5 rounded-none border text-sm font-bold transition-colors flex items-center justify-between ${
                      isMarketplaceActive
                        ? "bg-purple-50 dark:bg-[#1A0E2E] text-[#7C3AED] dark:text-[#F8FAFC] border-[#7C3AED]"
                        : "border-slate-200 dark:border-[#2E1E45] text-slate-700 dark:text-[#A78BFA] hover:bg-slate-100 dark:hover:bg-[#130921] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Store size={16} className={isMarketplaceActive ? "text-[#7C3AED]" : "text-slate-400 dark:text-[#A78BFA]"} />
                      <span>Marketplace</span>
                    </span>
                    {isMarketplaceActive && <span className="size-1.5 bg-[#7C3AED]" />}
                  </Link>

                  {/* Profile & Settings (jika login) */}
                  {user && (
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`py-2.5 px-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] text-sm font-bold transition-colors flex items-center gap-2.5 ${
                        pathname === "/profile"
                          ? "bg-purple-50 dark:bg-[#1A0E2E] text-[#7C3AED] dark:text-[#F8FAFC] border-[#7C3AED]"
                          : "text-slate-700 dark:text-[#A78BFA] hover:bg-slate-100 dark:hover:bg-[#130921] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                      }`}
                    >
                      <Settings size={16} className={pathname === "/profile" ? "text-[#7C3AED]" : "text-slate-400 dark:text-[#A78BFA]"} />
                      <span>Profil &amp; Pengaturan</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Footer Slidebar (Sign Out jika Login) */}
              <div className="pt-5 border-t border-slate-200 dark:border-[#211C2B] mt-6">
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

      {/* ===================================================================== */}
      {/* MOBILE SCROLL-TO-TOP BUTTON (↑) PADA KIRI BAWAH LAYAR                 */}
      {/* ===================================================================== */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 left-3.5 z-40 md:hidden size-11 rounded-full bg-[#11091D]/90 dark:bg-[#11091D]/90 bg-white/90 backdrop-blur-md border-2 border-[#7C3AED] shadow-xl text-[#7C3AED] dark:text-[#A78BFA] hover:bg-[#7C3AED] hover:text-white flex items-center justify-center transition-all active:scale-90 animate-in fade-in zoom-in-75 duration-200 cursor-pointer"
          aria-label="Kembali ke atas layar"
          title="Kembali ke atas layar"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ===================================================================== */}
      {/* MOBILE FLOATING BOTTOM DOCK (< 768px / md:hidden)                     */}
      {/* ===================================================================== */}
      <nav
        aria-label="Navigasi Bawah Layar Mobile"
        className="fixed bottom-3 inset-x-3 z-40 md:hidden bg-[#11091D]/95 dark:bg-[#11091D]/95 bg-white/95 backdrop-blur-md border border-[#7C3AED]/40 shadow-[0_8px_30px_rgba(0,0,0,0.45)] rounded-2xl px-2 py-1.5 transition-all select-none"
      >
        <div className="grid grid-cols-5 items-center text-center gap-1">
          {/* 1. Home */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-colors ${
              isHomeActive
                ? "text-[#7C3AED] dark:text-[#A78BFA] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Home size={19} className={isHomeActive ? "text-[#7C3AED] dark:text-[#A78BFA]" : ""} />
            <span className="text-[11px] font-medium mt-1 leading-none">Home</span>
          </Link>

          {/* 2. Forum */}
          <Link
            href="/forum"
            onClick={() => setMobileOpen(false)}
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-colors ${
              pathname.startsWith("/forum")
                ? "text-[#7C3AED] dark:text-[#A78BFA] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare size={19} className={pathname.startsWith("/forum") ? "text-[#7C3AED] dark:text-[#A78BFA]" : ""} />
            <span className="text-[11px] font-medium mt-1 leading-none">Forum</span>
          </Link>

          {/* 3. Arena (Tombol Tengah Menonjol Beraksen Ungu) */}
          <Link
            href="/events"
            onClick={() => setMobileOpen(false)}
            className="flex flex-col items-center justify-center -mt-3.5"
            aria-label="Buka Arena Turnamen & Mabar"
          >
            <div className={`size-12 rounded-xl flex items-center justify-center shadow-lg border transition-transform active:scale-95 ${
              isArenaActive
                ? "bg-[#7C3AED] text-white border-[#C4B5FD] shadow-[0_0_20px_rgba(124,58,237,0.5)]"
                : "bg-[#7C3AED] text-white border-[#7C3AED]/60 shadow-md"
            }`}>
              <Swords size={20} />
            </div>
            <span className="text-[11px] font-bold text-[#7C3AED] dark:text-[#A78BFA] mt-0.5 leading-none">Arena</span>
          </Link>

          {/* 4. Market */}
          <Link
            href="/marketplace"
            onClick={() => setMobileOpen(false)}
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-colors ${
              isMarketplaceActive
                ? "text-[#7C3AED] dark:text-[#A78BFA] font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Store size={19} className={isMarketplaceActive ? "text-[#7C3AED] dark:text-[#A78BFA]" : ""} />
            <span className="text-[11px] font-medium mt-1 leading-none">Market</span>
          </Link>

          {/* 5. Menu / Profil (Buka Laci Drawer) */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative"
            aria-label="Buka Menu Lengkap & Profil"
          >
            {user ? (
              <div className="relative size-[22px] rounded-full overflow-hidden border border-[#7C3AED] shrink-0">
                {user.avatar ? (
                  <Image src={user.avatar} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  <span className="grid place-items-center h-full text-[10px] font-bold text-[#7C3AED]">
                    {(user.username ?? user.name ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <Menu size={19} />
            )}

            {/* Notification badge with count if unread messages or admin pending */}
            {(unreadMessages > 0 || adminPendingCount > 0) && (
              <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadMessages + adminPendingCount > 9 ? "9+" : unreadMessages + adminPendingCount}
              </span>
            )}

            <span className="text-[11px] font-medium mt-1 leading-none">
              {user ? "Profil" : "Menu"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
