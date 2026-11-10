"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";

const links = [
  ["Home", "/"],
  ["Forum", "/forum"],
  ["Leaderboard", "/leaderboard"],
  ["Events", "/events"],
  ["Donate", "/donate"],
  ["Settings", "/settings"],
  ["Marketplace", "/marketplace"],
  ["Rules", "/#rules"],
];

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeRotated, setThemeRotated] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("loghorizon-theme");
    const dark = savedTheme !== "light";
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("loghorizon-theme", dark ? "dark" : "light");
    setThemeRotated((rotated) => !rotated);
  }

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Navigasi utama">
        <Link href="/" className="brand" aria-label="LogHorizon beranda"><Image className="brand-logo" src="/loghorizon-logo.png" alt="" width={38} height={38} priority /><span>LOG<span>HORIZON</span></span></Link>
        <div className="nav-links">{links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div>
        <div className="nav-actions">
          <button className={`theme-toggle${themeRotated ? " theme-rotated" : ""}`} type="button" onClick={toggleTheme} title="Ganti mode warna" aria-label="Ganti mode warna">
            <Sun className="theme-icon-sun" size={17} />
            <Moon className="theme-icon-moon" size={17} />
          </button>
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") && <Link className="admin-link" href="/admin">Admin Panel</Link>}
          {status === "loading" ? <span className="nav-loading" aria-label="Memuat akun" /> : user ? (
            <div className="nav-user">
              {user.avatar ? <Image className="nav-avatar" src={user.avatar} alt="" width={34} height={34} unoptimized /> : <span className="nav-avatar nav-avatar-fallback">{(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}</span>}
              <span className="nav-username">{user.username ?? user.name ?? "Gamer"}</span>
              <button className="icon-button" onClick={() => signOut()} title="Keluar" aria-label="Keluar"><LogOut size={15} /></button>
            </div>
          ) : <button className="button button-discord nav-discord" onClick={() => signIn("discord")}><span className="discord-symbol">◉</span> Connect Discord</button>}
          <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen && <div className="mobile-nav-links">{links.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}</div>}
      </nav>
    </header>
  );
}
