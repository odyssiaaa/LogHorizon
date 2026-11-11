"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
  Crown,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Forum", href: "/forum" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "News", href: "/news" },
  { label: "Events", href: "/events" },
  { label: "Donate", href: "/donate" },
  { label: "Rules", href: "/#rules" },
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

  // Sync initial theme
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("loghorizon-theme");
    const dark = savedTheme !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // Scroll listener for floating glassmorphism effect
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on route change or ESC key
  useEffect(() => {
    setMobileOpen(false);
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
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "py-2.5 bg-white/70 dark:bg-[#08060B]/70 backdrop-blur-md border-b-[0.5px] border-[#E5E7EB] dark:border-[#211C2B] shadow-sm shadow-purple-950/5"
            : "py-4 bg-transparent border-b-[0.5px] border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* 1. SISI KIRI: Logo & Nama Guild */}
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

          {/* 2. SISI TENGAH: Menu Navigasi (Desktop) dengan Micro-Interaction Aura Pill */}
          <nav
            className="hidden md:flex items-center gap-0.5 px-2.5 py-1 rounded-full border border-gray-200/60 dark:border-[#211C2B]/80 bg-white/40 dark:bg-[#120F17]/40 backdrop-blur-sm"
            onMouseLeave={() => setHoveredPath(null)}
            aria-label="Navigasi Utama"
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

          {/* 3. SISI KANAN: Aksi User (Theme Toggle, Profile / Discord Connect, & Mobile Toggle) */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
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

            {/* Auth Section */}
            {status === "loading" ? (
              <div className="h-8 w-24 rounded bg-gray-200 dark:bg-[#1E1A3A] animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-gray-200 dark:border-[#211C2B] bg-white/60 dark:bg-[#120F17]/60 hover:border-[#9D4EDD]/60 transition-colors"
                  aria-expanded={dropdownOpen}
                  aria-label="Menu pengguna"
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

                  <span className="hidden sm:inline text-xs font-bold text-gray-800 dark:text-gray-200 max-w-[100px] truncate">
                    {user.username ?? user.name ?? "Gamer"}
                  </span>

                  <ChevronDown
                    size={13}
                    className={`text-gray-400 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180 text-[#9D4EDD]" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Taktis */}
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
                      {/* Info Profil */}
                      <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#211C2B]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                            {user.username ?? user.name ?? "Gamer"}
                          </span>
                          {isOwner && <Crown size={12} className="text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] font-mono text-[#9D4EDD] dark:text-[#C77DFF] mt-0.5">
                          {isOwner
                            ? "👑 Guild Owner (Emperor)"
                            : user.role === "ADMIN"
                              ? "🛡️ Guild Admin"
                              : user.role === "MODERATOR"
                                ? "⚔️ Lord Commander"
                                : "🎮 Guild Member"}
                        </p>
                      </div>

                      {/* Menu Aksi */}
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
                          href="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E1A3A] transition-colors"
                          role="menuitem"
                        >
                          <Settings size={14} className="shrink-0" />
                          <span>Pengaturan Akun</span>
                        </Link>
                      </div>

                      {/* Sign Out */}
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

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden size-9 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/60 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:border-[#9D4EDD] transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 4. RESPONSIVE MOBILE SIDE DRAWER (Framer Motion Slide-in) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] md:hidden"
              aria-hidden="true"
            />

            {/* Slide Drawer Content */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-[#0D0A14] border-l border-gray-200 dark:border-[#211C2B] p-6 flex flex-col justify-between z-[101] shadow-2xl md:hidden overflow-y-auto"
              aria-label="Menu navigasi mobile"
            >
              <div>
                {/* Header Drawer */}
                <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-[#211C2B]">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-8 rounded-full overflow-hidden border border-[#9D4EDD]/40">
                      <Image src="/loghorizon-logo.png" alt="LogHorizon" fill className="object-cover" />
                    </div>
                    <span className="font-black text-sm text-gray-900 dark:text-white tracking-wider">
                      LOG<span className="text-[#9D4EDD] dark:text-[#C77DFF]">HORIZON</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-8 rounded-md border border-gray-200 dark:border-[#211C2B] text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center"
                    aria-label="Tutup menu"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Profile Card Mobile */}
                {user ? (
                  <div className="mt-5 p-3.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#14101C]">
                    <div className="flex items-center gap-3">
                      <div className="relative size-9 rounded-full overflow-hidden border border-[#9D4EDD]/60 bg-[#1E1A3A] shrink-0">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username ?? "User"} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="grid place-items-center h-full text-xs font-bold text-purple-300">
                            {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                            {user.username ?? user.name ?? "Gamer"}
                          </p>
                          {isOwner && <Crown size={12} className="text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] font-mono text-[#9D4EDD] dark:text-[#C77DFF]">
                          {isOwner
                            ? "👑 Guild Owner"
                            : user.role === "ADMIN"
                              ? "🛡️ Admin"
                              : user.role === "MODERATOR"
                                ? "⚔️ Moderator"
                                : "🎮 Member"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void signIn("discord");
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-[#5865F2] text-white text-xs font-bold shadow-md shadow-[#5865F2]/20"
                    >
                      <span className="text-sm leading-none">◉</span>
                      <span>Connect Discord</span>
                    </button>
                  </div>
                )}

                {/* Nav Links Vertikal (Ukuran Jempol Nyaman) */}
                <nav className="mt-6 flex flex-col space-y-1">
                  {navLinks.map((link) => {
                    const isActive =
                      link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href) && !link.href.includes("#");

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`py-3 px-3 rounded-md text-base font-bold transition-colors border-b border-gray-100 dark:border-[#211C2B]/50 flex items-center justify-between ${
                          isActive
                            ? "text-[#9D4EDD] dark:text-[#C77DFF] bg-[#9D4EDD]/10"
                            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{link.label}</span>
                        {isActive && <span className="size-1.5 rounded-full bg-[#9D4EDD]" />}
                      </Link>
                    );
                  })}

                  {/* Additional Mobile Links */}
                  {user && (
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="py-3 px-3 rounded-md text-base font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-[#211C2B]/50 flex items-center gap-2.5"
                    >
                      <Settings size={17} className="text-gray-400" />
                      <span>Pengaturan Akun</span>
                    </Link>
                  )}

                  {isStaff && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="py-3 px-3 rounded-md text-base font-semibold text-purple-600 dark:text-purple-300 border-b border-gray-100 dark:border-[#211C2B]/50 flex items-center gap-2.5"
                    >
                      <ShieldCheck size={17} />
                      <span>Dashboard Admin</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-6 border-t border-gray-100 dark:border-[#211C2B] space-y-3">
                {/* Theme Selector Switch */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#14101C] text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Moon size={14} className="text-purple-400" /> : <Sun size={14} className="text-amber-500" />}
                    <span>Mode Tampilan</span>
                  </span>
                  <span className="text-xs uppercase font-mono text-purple-600 dark:text-purple-400">
                    {isDark ? "Gelap (Dark)" : "Terang (Light)"}
                  </span>
                </button>

                {/* Sign Out Mobile */}
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/25 border border-red-200/50 dark:border-red-900/30"
                  >
                    <LogOut size={14} />
                    <span>Keluar Akun (Sign Out)</span>
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
