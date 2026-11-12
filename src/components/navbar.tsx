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
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";

const navLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Forum", href: "/forum", icon: MessageSquare },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Events", href: "/events", icon: Swords },
  { label: "Donate", href: "/donate", icon: HeartHandshake },
  { label: "Rules", href: "/#rules", icon: BookOpen },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close desktop profile dropdown
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
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("loghorizon-theme", nextDark ? "dark" : "light");
  }

  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");
  const isOwner = user?.role === "ADMIN" && (user.username === ".odyssia" || user.discordId === "706661230835925042");

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
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

          {/* SISI TENGAH: Menu Navigasi Horizontal (Khusus Desktop md:flex) */}
          <nav
            className="hidden md:flex items-center gap-0.5 px-2.5 py-1 rounded-full border border-gray-200/60 dark:border-[#211C2B]/80 bg-white/40 dark:bg-[#120F17]/40 backdrop-blur-sm"
            onMouseLeave={() => setHoveredPath(null)}
            aria-label="Navigasi Utama Desktop"
          >
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href) && !link.href.includes("#");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHoveredPath(link.href)}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    isActive
                      ? "text-[#9D4EDD] dark:text-[#C77DFF] font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {hoveredPath === link.href && (
                    <motion.div
                      layoutId="navbarHoverPill"
                      className="absolute inset-0 rounded-md bg-[#9D4EDD]/15 dark:bg-[#9D4EDD]/20 -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
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
            <div className="hidden md:flex items-center gap-2.5">
              {status === "loading" ? (
                <div className="h-8 w-24 rounded bg-gray-200 dark:bg-[#1E1A3A] animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-gray-200 dark:border-[#211C2B] bg-white/60 dark:bg-[#120F17]/60 hover:border-[#9D4EDD]/60 transition-colors"
                      aria-expanded={dropdownOpen}
                      aria-label="Menu profil pengguna"
                    >
                      <div className="relative size-7 rounded-full overflow-hidden border border-[#9D4EDD]/60 bg-[#1E1A3A] flex items-center justify-center shrink-0">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.username ?? "User"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs font-bold text-purple-300">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {isOwner && (
                          <span className="absolute bottom-0 right-0 size-2.5 bg-amber-400 rounded-full border border-black flex items-center justify-center">
                            <Crown size={7} className="text-black" />
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 max-w-[100px] truncate">
                        {user.username ?? user.name ?? "Gamer"}
                      </span>

                      <ChevronDown
                        size={13}
                        className={`text-gray-400 transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180 text-[#9D4EDD]" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Desktop */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 mt-2 w-64 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-2 shadow-2xl z-50 backdrop-blur-xl"
                          role="menu"
                        >
                          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#211C2B]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                                {user.username ?? user.name ?? "Gamer"}
                              </span>
                              {isOwner && <Crown size={12} className="text-amber-400 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[11px] font-mono text-[#9D4EDD] dark:text-[#C77DFF]">
                                {isOwner
                                  ? "👑 Guild Owner"
                                  : user.role === "ADMIN"
                                    ? "🛡️ Guild Admin"
                                    : user.role === "MODERATOR"
                                      ? "⚔️ Lord Commander"
                                      : "🎮 Guild Member"}
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

            {/* Hamburger Menu Button (Khusus Mobile di bawah md) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden size-9 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/60 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:border-[#9D4EDD] transition-colors"
              aria-label="Buka menu navigasi"
              aria-expanded={mobileOpen}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. TAMPILAN MOBILE: OFFCANVAS SLIDEBAR MENU (Side Drawer) */}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              aria-hidden="true"
            />

            {/* Slidebar Menu Drawer (Off-Canvas dari Sisi Kanan) */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] bg-white dark:bg-[#0D0A14] border-l border-gray-200 dark:border-[#211C2B] p-5 flex flex-col justify-between shadow-2xl md:hidden overflow-y-auto"
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
                            ? "👑 Guild Owner"
                            : user.role === "ADMIN"
                              ? "🛡️ Guild Admin"
                              : user.role === "MODERATOR"
                                ? "⚔️ Lord Commander"
                                : "🎮 Member"}
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

                {/* Daftar Menu Navigasi Vertikal */}
                <nav className="mt-5 flex flex-col space-y-1" aria-label="Navigasi Menu Mobile">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                      link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href) && !link.href.includes("#");

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`py-3 px-4 rounded-md text-base font-semibold transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-bold"
                            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={18} className={isActive ? "text-[#9D4EDD] dark:text-[#C77DFF]" : "text-gray-400"} />
                          <span>{link.label}</span>
                        </span>
                        {isActive && <span className="size-1.5 rounded-full bg-[#9D4EDD]" />}
                      </Link>
                    );
                  })}

                  {/* Link Menu Tambahan Mobile (Profile & Settings) */}
                  {user && (
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`py-3 px-4 rounded-md text-base font-semibold transition-colors flex items-center gap-3 ${
                        pathname === "/profile"
                          ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-bold"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Settings size={18} className={pathname === "/profile" ? "text-[#9D4EDD] dark:text-[#C77DFF]" : "text-gray-400"} />
                      <span>Profile &amp; Settings</span>
                    </Link>
                  )}

                  {/* Link Menu Tambahan Mobile (Admin Panel khusus Admin/Moderator) */}
                  {isStaff && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className={`py-3 px-4 rounded-md text-base font-semibold transition-colors flex items-center gap-3 ${
                        pathname.startsWith("/admin")
                          ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-bold"
                          : "text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      }`}
                    >
                      <ShieldCheck size={18} />
                      <span>Admin Panel</span>
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
                    LogHorizon • Find Your Party
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
