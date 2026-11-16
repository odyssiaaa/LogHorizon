"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  Award,
  BadgeCheck,
  Bell,
  Check,
  Crown,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  Shield,
  Sparkles,
  SunMoon,
  Sword,
  Trophy,
  Type,
  UserCheck,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";
import { DailyCheckInWidget } from "@/components/daily-check-in-widget";

type Achievement = {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
};

type Profile = {
  id: string;
  discordId: string | null;
  username: string | null;
  avatar: string | null;
  level: number;
  xp: number;
  role: string;
  isPremium: boolean;
  favoriteGames?: string[];
  gender?: string | null;
  birthDate?: string | null;
  showBirthDate?: boolean;
  inGameName?: string;
  highestRank?: string;
  primaryRole?: string;
  achievements?: Achievement[];
};
type Listing = {
  id: string;
  title: string;
  category: string;
  marketData: unknown;
  createdAt: string;
  reports: { pending: number; resolved: number };
};
type PreferenceState = { dark: boolean; largeFont: boolean; animations: boolean; notifications: boolean };
const initialPreferences: PreferenceState = { dark: true, largeFont: false, animations: true, notifications: false };

const COMMON_GAMES = [
  "Valorant",
  "Mobile Legends",
  "Genshin Impact",
  "Counter-Strike 2",
  "Roblox",
  "Dota 2",
  "Apex Legends",
  "PUBG Mobile",
  "Honkai: Star Rail",
  "Minecraft",
];

function listingStatus(value: unknown) {
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  const status = value.status;
  return status === "AVAILABLE" || status === "SOLD" || status === "IN_ESCROW" ? status : null;
}

export function SettingsDashboard() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Gamer Profile & Identity Form
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [customGameInput, setCustomGameInput] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showBirthDate, setShowBirthDate] = useState(false);
  const [savingGamer, setSavingGamer] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("loghorizon-preferences");
        const savedTheme = localStorage.getItem("loghorizon-theme");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            const value = parsed as Record<string, unknown>;
            setPreferences({
              dark: savedTheme === "light" ? false : savedTheme === "dark" ? true : typeof value.dark === "boolean" ? value.dark : true,
              largeFont: typeof value.largeFont === "boolean" ? value.largeFont : false,
              animations: typeof value.animations === "boolean" ? value.animations : true,
              notifications: typeof value.notifications === "boolean" ? value.notifications : false,
            });
          }
        } else if (savedTheme === "light" || savedTheme === "dark") {
          setPreferences((current) => ({ ...current, dark: savedTheme === "dark" }));
        }
      } catch (reason) {
        console.error("[settings] Failed to read browser preferences", reason);
        setError("Preferensi tersimpan tidak dapat dibaca di browser ini.");
      } finally {
        setPreferencesReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.classList.toggle("dark", preferences.dark);
    document.documentElement.style.colorScheme = preferences.dark ? "dark" : "light";
    document.documentElement.classList.toggle("large-font", preferences.largeFont);
    document.documentElement.classList.toggle("reduce-motion", !preferences.animations);
    try {
      localStorage.setItem("loghorizon-preferences", JSON.stringify(preferences));
      localStorage.setItem("loghorizon-theme", preferences.dark ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("loghorizon-preferences", { detail: preferences }));
    } catch (reason) {
      console.error("[settings] Failed to save browser preferences", reason);
    }
  }, [preferences, preferencesReady]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    Promise.all([
      fetch("/api/settings/profile").then((response) => readApiResponse<Profile>(response, "Profil gagal dimuat.")),
      fetch("/api/settings/listings").then((response) => readApiResponse<Listing[]>(response, "Riwayat lapak gagal dimuat.")),
    ]).then(([nextProfile, nextListings]) => {
      if (!active) return;
      setProfile(nextProfile);
      setFavoriteGames(nextProfile.favoriteGames ?? []);
      setGender(nextProfile.gender ?? "");
      setBirthDate(nextProfile.birthDate ?? "");
      setShowBirthDate(Boolean(nextProfile.showBirthDate));
      setListings(nextListings);
      setError("");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Pengaturan gagal dimuat.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [status]);

  function updatePreference<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function syncProfile() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/profile", { method: "POST" });
      const result = await readApiResponse<{ profile: Profile; notice: string }>(response, "Sinkronisasi Discord gagal.");
      setProfile(result.profile);
      setMessage(result.notice);
      await update();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sinkronisasi Discord gagal.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveGamerProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingGamer(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGames,
          gender: gender ? gender : null,
          birthDate: birthDate ? birthDate : null,
          showBirthDate,
        }),
      });
      const result = await readApiResponse<{ profile: Profile; message: string }>(response, "Gagal menyimpan profil gamer.");
      setProfile((current) => current ? { ...current, ...result.profile } : result.profile);
      setMessage(result.message || "Profil gamer berhasil disimpan!");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan profil gamer.");
    } finally {
      setSavingGamer(false);
    }
  }

  function toggleGame(gameName: string) {
    setFavoriteGames((current) =>
      current.includes(gameName) ? current.filter((g) => g !== gameName) : [...current, gameName]
    );
  }

  function addCustomGame() {
    const trimmed = customGameInput.trim();
    if (!trimmed) return;
    if (favoriteGames.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setCustomGameInput("");
      return;
    }
    if (favoriteGames.length >= 20) return;
    setFavoriteGames((current) => [...current, trimmed]);
    setCustomGameInput("");
  }

  function removeGame(gameName: string) {
    setFavoriteGames((current) => current.filter((g) => g !== gameName));
  }

  async function changeListingStatus(listing: Listing, nextStatus: "AVAILABLE" | "SOLD") {
    setSavingStatus(listing.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/posts/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await readApiResponse<unknown>(response, "Status lapak gagal diperbarui.");
      setListings((current) => current.map((entry) => entry.id === listing.id && entry.marketData && typeof entry.marketData === "object"
        ? { ...entry, marketData: { ...entry.marketData, status: nextStatus } }
        : entry));
      setMessage("Status lapak berhasil diperbarui.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status lapak gagal diperbarui.");
    } finally {
      setSavingStatus("");
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) return <main className="community-page"><div className="empty-state">Memuat pengaturan…</div></main>;
  if (!session?.user) return <main className="community-page page-shell settings-page"><p className="section-kicker">ACCOUNT / SETTINGS</p><h1>Pengaturan <span>Akun</span></h1><p className="muted-copy">Hubungkan Discord untuk mengelola profil dan preferensi.</p><button className="button button-discord" onClick={() => void signIn("discord", { callbackUrl: "/settings" })}>Login dengan Discord</button></main>;

  return <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
    <header className="settings-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><p className="section-kicker text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-1">ACCOUNT / CONTROL CENTER</p><h1 className="page-title text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">Pengaturan <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Akun</span></h1><p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Profil, preferensi antarmuka, dan aktivitas komunitas.</p></div><div className="settings-account-chip self-start sm:self-auto"><DiscordAvatar className="settings-avatar" src={profile?.avatar ?? session.user.avatar} username={profile?.username ?? session.user.username} size={40} />{profile?.username ?? session.user.name ?? "Adventurer"}<span>{profile?.role ?? session.user.role}</span></div></header>
    <DailyCheckInWidget />
    {error && <div className="inline-error" role="alert">{error}</div>}
    {message && <div className="inline-notice" role="status">{message}</div>}
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Menu pengaturan">
        <a href="#profile-settings"><Shield size={16} /> Profil Discord</a>
        <a href="#gamer-settings"><Gamepad2 size={16} /> Identitas Gamer</a>
        <a href="#achievement-settings"><Trophy size={16} /> Pencapaian (Achievements)</a>
        <a href="#preference-settings"><SunMoon size={16} /> Preferensi UI</a>
        <a href="#listing-settings"><BadgeCheck size={16} /> Lapak &amp; Notifikasi</a>
      </nav>
      <div className="settings-content space-y-6">
        {/* 01 / PROFILE SYNC */}
        <section className="settings-panel" id="profile-settings">
          <div className="settings-panel-heading">
            <div>
              <p className="section-kicker">01 / PROFILE SYNC</p>
              <h2>Profil Discord</h2>
            </div>
            <button className="button button-quiet" onClick={() => void syncProfile()} disabled={syncing}>
              <RefreshCw size={15} className={syncing ? "spin-icon" : ""} /> {syncing ? "Sinkronisasi…" : "Sync Discord Profile"}
            </button>
          </div>
          <dl className="settings-profile-grid">
            <div><dt>Discord ID</dt><dd>{profile?.discordId ?? "Belum tersedia"}</dd></div>
            <div><dt>Username</dt><dd>{profile?.username ?? "Gamer"}</dd></div>
            <div><dt>Role komunitas</dt><dd>{(profile?.username === ".odyssia" || profile?.username === "odyssia") ? "👑 Emperor (Owner)" : (profile?.role === "ADMIN" || session.user.role === "ADMIN") ? "✨ Prince / Princess (Admin)" : (profile?.role === "MODERATOR" || session.user.role === "MODERATOR") ? "⚔️ Lord Commander (Moderator)" : (profile?.role ?? session.user.role)}</dd></div>
            <div><dt>Level / XP</dt><dd>Lv. {profile?.level ?? 1} · {profile?.xp ?? 0} XP</dd></div>
            <div><dt>Benefit</dt><dd>{(profile?.username === ".odyssia" || profile?.username === "odyssia") ? "👑 Guild Emperor / Noble Patron (Full Perks)" : (profile?.role === "ADMIN" || session.user.role === "ADMIN") ? "✨ Prince / Princess (Admin Privileges)" : profile?.isPremium ? "Elite Party Member (Premium)" : "Adventurer"}</dd></div>
          </dl>
        </section>

        {/* 02 / IDENTITAS & GAME YANG DIMAINKAN */}
        <section className="settings-panel" id="gamer-settings">
          <div className="settings-panel-heading">
            <div>
              <p className="section-kicker">02 / PROFIL GAMER</p>
              <h2>Identitas &amp; Game yang Dimainkan</h2>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Pilih game yang aktif kamu mainkan dan sesuaikan identitas profilmu untuk komunitas LogHorizon.
          </p>
          <form onSubmit={(e) => void saveGamerProfile(e)} className="space-y-5">
            {/* 1. Game yang Dimainkan */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Game yang Dimainkan (Pilih Cepat atau Tambah Kustom)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_GAMES.map((g) => {
                  const isSelected = favoriteGames.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGame(g)}
                      className={`px-3 py-1.5 rounded-none text-xs font-bold border transition-colors ${
                        isSelected
                          ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                          : "border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-700 dark:text-gray-300 hover:border-[#7C3AED]"
                      }`}
                    >
                      {isSelected ? `✓ ${g}` : `+ ${g}`}
                    </button>
                  );
                })}
              </div>

              {/* Tambah game kustom */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  maxLength={40}
                  value={customGameInput}
                  onChange={(e) => setCustomGameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomGame();
                    }
                  }}
                  placeholder="Tambah Game Lainnya..."
                  className="flex-1 px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={addCustomGame}
                  className="px-3 py-2 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-colors shrink-0"
                >
                  + Tambah
                </button>
              </div>

              {/* Daftar game terpilih */}
              {favoriteGames.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">
                    Game Terpilih ({favoriteGames.length}/20):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {favoriteGames.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-purple-300 text-xs font-medium"
                      >
                        {g}
                        <button
                          type="button"
                          onClick={() => removeGame(g)}
                          className="hover:text-red-400 font-bold ml-0.5 text-sm leading-none"
                          title="Hapus"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Gender & 3. Tanggal Lahir (Opsional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#2E1E45]">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Gender (Opsional)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="">Pilih gender (Opsional)</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                  <option value="Privasi / Tidak disebutkan">Privasi / Tidak disebutkan</option>
                </select>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  Pilihan identitas gender untuk komunitas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Lahir (Opsional)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={showBirthDate}
                    onChange={(e) => setShowBirthDate(e.target.checked)}
                    className="rounded-none border-gray-300 dark:border-[#2E1E45] text-[#7C3AED] focus:ring-0"
                  />
                  <span>Tampilkan tanggal lahir / usia di profil publik</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGamer}
                className="button button-primary px-5 py-2.5 rounded-none text-xs font-bold inline-flex items-center gap-2"
              >
                {savingGamer ? "Menyimpan…" : "Simpan Profil Gamer"}
              </button>
            </div>
          </form>
        </section>

        {/* 03 / PENCAPAIAN GUILD (ACHIEVEMENTS) */}
        <section className="settings-panel" id="achievement-settings">
          <div className="settings-panel-heading">
            <div>
              <p className="section-kicker">03 / GUILD BADGES</p>
              <h2>Pencapaian Petualang (Achievements)</h2>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Lencana pencapaian otomatis diberikan sistem berdasarkan kontribusi nyata di komunitas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.achievements?.map((ach) => (
              <div
                key={ach.id}
                className={`p-3.5 rounded-none border flex items-start gap-3 transition-colors ${
                  ach.unlocked
                    ? "bg-purple-500/10 border-purple-500/30 text-gray-900 dark:text-white"
                    : "bg-gray-50 dark:bg-[#08060B]/50 border-gray-200 dark:border-[#2E1E45] opacity-60 text-gray-400"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-none flex items-center justify-center shrink-0 text-base ${
                    ach.unlocked ? "bg-[#9D4EDD]/20 text-[#9D4EDD]" : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  {ach.unlocked ? <Award size={18} /> : "🔒"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold block">{ach.title}</strong>
                    {ach.unlocked && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-emerald-500/15 text-emerald-400">
                        TERBUKA
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 04 / INTERFACE */}
        <section className="settings-panel" id="preference-settings">
          <div className="settings-panel-heading">
            <div>
              <p className="section-kicker">04 / INTERFACE</p>
              <h2>Preferensi Antarmuka</h2>
            </div>
          </div>
          <label className="settings-toggle"><span><SunMoon size={17} /><span><strong>Mode gelap</strong><small>Gunakan tema taktis gelap sebagai tampilan utama.</small></span></span><input type="checkbox" checked={preferences.dark} onChange={(event) => updatePreference("dark", event.target.checked)} /></label>
          <label className="settings-toggle"><span><Type size={17} /><span><strong>Ukuran artikel besar</strong><small>Perbesar teks isi thread dan komentar.</small></span></span><input type="checkbox" checked={preferences.largeFont} onChange={(event) => updatePreference("largeFont", event.target.checked)} /></label>
          <label className="settings-toggle"><span><RefreshCw size={17} /><span><strong>Animasi antarmuka</strong><small>Matikan untuk mengurangi gerakan dan beban perangkat.</small></span></span><input type="checkbox" checked={preferences.animations} onChange={(event) => updatePreference("animations", event.target.checked)} /></label>
          <p className="settings-footnote">Preferensi ini disimpan di browser perangkat ini.</p>
        </section>

        {/* 05 / ACTIVITY */}
        <section className="settings-panel" id="listing-settings">
          <div className="settings-panel-heading">
            <div>
              <p className="section-kicker">05 / ACTIVITY</p>
              <h2>Lapak &amp; Notifikasi</h2>
            </div>
            <a className="text-link" href="/marketplace">Buka marketplace <ExternalLink size={14} /></a>
          </div>
          <label className="settings-toggle"><span><Bell size={17} /><span><strong>Notifikasi balasan &amp; transaksi</strong><small>Simpan preferensi untuk pemberitahuan thread dan aktivitas lapak.</small></span></span><input type="checkbox" checked={preferences.notifications} onChange={(event) => updatePreference("notifications", event.target.checked)} /></label>
          <p className="settings-footnote">Preferensi notifikasi tersimpan di profil akun kamu.</p>
          <div className="settings-listings-wrap w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="settings-listings min-w-[550px] w-full">
              <thead><tr><th>Postingan</th><th>Tanggal</th><th>Laporan</th><th>Status lapak</th></tr></thead>
              <tbody>
                {listings.map((listing) => {
                  const status = listingStatus(listing.marketData);
                  return <tr key={listing.id}><td><a href={status ? "/marketplace" : `/forum/${listing.id}`}>{listing.title}</a><small>{listing.category.replaceAll("_", " ")}</small></td><td>{new Date(listing.createdAt).toLocaleDateString("id-ID")}</td><td>{listing.reports.pending} pending · {listing.reports.resolved} selesai</td><td>{status ? <select aria-label={`Status ${listing.title}`} value={status === "IN_ESCROW" ? "AVAILABLE" : status} disabled={status === "IN_ESCROW" || savingStatus === listing.id} onChange={(event) => void changeListingStatus(listing, event.target.value as "AVAILABLE" | "SOLD")}><option value="AVAILABLE">AVAILABLE</option><option value="SOLD">SOLD</option></select> : "Thread Forum"}</td></tr>;
                })}
                {!listings.length && <tr><td colSpan={4}>Belum ada postingan atau lapak.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </main>;
}
