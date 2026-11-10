"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronDown, Crown, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, User, X } from "lucide-react";

const links = [
  ["Home", "/"],
  ["Forum", "/forum"],
  ["Marketplace", "/marketplace"],
  ["Leaderboard", "/leaderboard"],
  ["Events", "/events"],
  ["News", "/news"],
  ["Donate", "/donate"],
  ["Rules", "/#rules"],
];

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeRotated, setThemeRotated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("loghorizon-theme");
    const dark = savedTheme !== "light";
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("loghorizon-theme", dark ? "dark" : "light");
    setThemeRotated((rotated) => !rotated);
  }

  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");
  const isOwner = user?.role === "ADMIN" && (user.username === ".odyssia" || user.discordId === "706661230835925042");

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Navigasi utama">
        <Link href="/" className="brand" aria-label="LogHorizon beranda">
          <Image className="brand-logo" src="/loghorizon-logo.png" alt="" width={38} height={38} priority />
          <span>LOG<span>HORIZON</span></span>
        </Link>

        <div className="nav-links">
          {links.map(([label, href]) => (
            <Link key={label} href={href} className="nav-link-item">
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <button
            className={`theme-toggle${themeRotated ? " theme-rotated" : ""}`}
            type="button"
            onClick={toggleTheme}
            title="Ganti mode warna"
            aria-label="Ganti mode warna"
          >
            <Sun className="theme-icon-sun" size={17} />
            <Moon className="theme-icon-moon" size={17} />
          </button>

          {status === "loading" ? (
            <span className="nav-loading" aria-label="Memuat akun" />
          ) : user ? (
            <div className="profile-dropdown-wrap" ref={dropdownRef}>
              <button
                type="button"
                className={`profile-trigger${dropdownOpen ? " open" : ""}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-label="Menu profil"
              >
                <div className="profile-avatar-container">
                  {user.avatar ? (
                    <Image className="nav-avatar" src={user.avatar} alt="" width={34} height={34} unoptimized />
                  ) : (
                    <span className="nav-avatar nav-avatar-fallback">
                      {(user.username ?? user.name ?? "G").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {isOwner && (
                    <span className="owner-crown-badge" title="Guild Owner">
                      <Crown size={11} />
                    </span>
                  )}
                </div>
                <div className="profile-trigger-info">
                  <span className={`nav-username${isOwner ? " owner-username" : ""}`}>
                    {user.username ?? user.name ?? "Gamer"}
                  </span>
                  <span className="profile-role-tag">
                    {isOwner ? "Owner" : user.role === "ADMIN" ? "Admin" : user.role === "MODERATOR" ? "Mod" : "Member"}
                  </span>
                </div>
                <ChevronDown size={14} className={`profile-chevron${dropdownOpen ? " rotated" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown-menu" role="menu">
                  <div className="dropdown-user-header">
                    <p className="dropdown-user-name">{user.username ?? user.name ?? "Gamer"}</p>
                    <p className="dropdown-user-role">
                      {isOwner ? "👑 Guild Owner (Emperor)" : user.role === "ADMIN" ? "🛡️ Guild Admin" : user.role === "MODERATOR" ? "⚔️ Lord Commander" : "🎮 Guild Member"}
                    </p>
                  </div>

                  <div className="dropdown-divider" />

                  <Link
                    href="/settings"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Settings size={15} />
                    <span>Pengaturan Akun</span>
                  </Link>

                  {isStaff && (
                    <Link
                      href="/admin"
                      className="dropdown-item staff-item"
                      onClick={() => setDropdownOpen(false)}
                      role="menuitem"
                    >
                      <ShieldCheck size={15} />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-item logout-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut();
                    }}
                    role="menuitem"
                  >
                    <LogOut size={15} />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="button button-discord nav-discord" onClick={() => signIn("discord")}>
              <span className="discord-symbol">◉</span> Connect Discord
            </button>
          )}

          <button
            className="mobile-menu-toggle"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-nav-links">
            {links.map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
            {user && (
              <Link href="/settings" onClick={() => setMenuOpen(false)}>
                ⚙️ Pengaturan Akun
              </Link>
            )}
            {isStaff && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}>
                🛡️ Admin Panel
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
