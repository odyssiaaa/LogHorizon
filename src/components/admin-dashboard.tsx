"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Ban, Check, ChevronLeft, ChevronRight, Flag, Megaphone, MessageSquare, Shield, Store, Users, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

type Role = "MEMBER" | "MODERATOR" | "ADMIN";
type Report = {
  id: string;
  postId: string;
  reason: string;
  createdAt: string;
  post: { id: string; title: string; category: string; author: { username: string | null } };
  reporter: { username: string | null };
};
type Member = {
  id: string;
  username: string | null;
  avatar: string | null;
  role: Role;
  isBanned: boolean;
  joinedAt: string;
};
type DashboardData = {
  stats: { totalMembers: number; totalForumThreads: number; activeMarketplaceListings: number; pendingReports: number };
  reports: Report[];
  users: Member[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  canManageRoles: boolean;
  canBanMembers: boolean;
  canBroadcast: boolean;
  currentUserId: string;
};
type Tab = "reports" | "members" | "broadcast";

const initialStats = [
  { key: "totalMembers", label: "Total Member", icon: Users },
  { key: "totalForumThreads", label: "Total Thread Forum", icon: MessageSquare },
  { key: "activeMarketplaceListings", label: "Lapak Marketplace Aktif", icon: Store },
  { key: "pendingReports", label: "Laporan Pending", icon: Flag },
] as const;

export function AdminDashboard({ role }: { role: Role }) {
  const isAdmin = role === "ADMIN";
  const [tab, setTab] = useState<Tab>("reports");
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), search });
    fetch(`/api/admin/dashboard?${query}`)
      .then((response) => readApiResponse<DashboardData>(response, "Gagal memuat dashboard."))
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  async function handleReport(report: Report, action: "dismiss" | "delete-post") {
    const confirmed = window.confirm(action === "delete-post"
      ? `Hapus postingan "${report.post.title}" dan seluruh laporannya?`
      : `Abaikan laporan untuk "${report.post.title}"?`);
    if (!confirmed) return;
    setBusyId(report.id);
    setError("");
    try {
      await readApiResponse(await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }), "Aksi moderasi gagal.");
      setData((current) => current ? {
        ...current,
        reports: current.reports.filter((item) => action === "delete-post" ? item.postId !== report.postId : item.id !== report.id),
        stats: {
          ...current.stats,
          pendingReports: Math.max(0, current.stats.pendingReports - (
            action === "delete-post"
              ? current.reports.filter((item) => item.postId === report.postId).length
              : 1
          )),
        },
      } : current);
      setNotice(action === "delete-post" ? "Postingan dan laporannya telah dihapus." : "Laporan telah ditandai selesai.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Aksi moderasi gagal."); }
    finally { setBusyId(""); }
  }

  async function updateMember(member: Member, change: { role: Role } | { isBanned: boolean }) {
    setBusyId(member.id);
    setError("");
    try {
      const updated = await readApiResponse<Member>(await fetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      }), "Perubahan member gagal disimpan.");
      setData((current) => current ? { ...current, users: current.users.map((item) => item.id === updated.id ? updated : item) } : current);
      setNotice("role" in change
        ? `Role ${updated.username ?? "member"} diperbarui.`
        : `${updated.username ?? "Member"} ${updated.isBanned ? "diban" : "diunban"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Perubahan member gagal disimpan."); }
    finally { setBusyId(""); }
  }

  return <main className="community-page"><div className="page-shell admin-page">
    <Link href="/" className="back-link"><ArrowLeft size={15} /> Kembali ke situs</Link>
    <div className="admin-title-row"><div><p className="section-kicker">PANEL MODERASI</p><h1>Admin <span>Dashboard</span></h1><p className="muted-copy">Halo, {role === "ADMIN" ? "Admin" : "Moderator"}. Jaga LogHorizon tetap aman dan ramah.</p></div><span className="admin-role-badge"><Shield size={14} /> {role}</span></div>
    <section className="admin-stats" aria-label="Statistik komunitas">
      {initialStats.map(({ key, label, icon: Icon }) => <article className="admin-stat-card" key={key}><span className="admin-stat-icon"><Icon size={18} /></span><span className="admin-stat-label">{label}</span><strong>{data?.stats[key] ?? "—"}</strong></article>)}
    </section>
    <div className="admin-tabs" role="tablist" aria-label="Menu admin">
      <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("reports")}><Flag size={15} /> Reports{data?.stats.pendingReports ? <span>{data.stats.pendingReports}</span> : null}</button>
      <button role="tab" aria-selected={tab === "members"} className={tab === "members" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("members")}><Users size={15} /> Manajemen Member</button>
      {isAdmin && <button role="tab" aria-selected={tab === "broadcast"} className={tab === "broadcast" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("broadcast")}><Megaphone size={15} /> Broadcast</button>}
    </div>
    {notice && <div className="inline-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Tutup notifikasi"><X size={15} /></button></div>}
    {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Tutup pesan"><X size={15} /></button></div>}
    {loading && !data ? <div className="empty-state">Memuat dashboard…</div> : null}
    {tab === "reports" && <section className="admin-panel" role="tabpanel">
      <div className="admin-panel-heading"><div><h2>Laporan Member</h2><p>Periksa laporan yang menunggu tindakan moderator.</p></div><span>{data?.reports.length ?? 0} pending</span></div>
      {!loading && data?.reports.length === 0 && <div className="empty-state">Tidak ada laporan tertunda.</div>}
      <div className="admin-reports">{data?.reports.map((report) => <article className="admin-report" key={report.id}>
        <div className="admin-report-content"><span className="pending-badge"><AlertTriangle size={12} /> PENDING</span><h3>{report.post.title}</h3><div className="report-context"><span>Forum: {report.post.category.toLowerCase().replaceAll("_", " ")}</span><span>Penulis: {report.post.author.username ?? "Gamer"}</span><span>Pelapor: {report.reporter.username ?? "Gamer"}</span></div><p className="report-reason"><strong>Alasan:</strong> {report.reason}</p><small>{new Date(report.createdAt).toLocaleString("id-ID")}</small></div>
        <div className="report-actions"><Link className="button button-quiet button-small" href={`/forum/${report.post.id}`}>Lihat Postingan</Link><button className="button button-danger button-small" disabled={busyId === report.id} onClick={() => void handleReport(report, "delete-post")}>Hapus Postingan</button><button className="button button-success button-small" disabled={busyId === report.id} onClick={() => void handleReport(report, "dismiss")}><Check size={14} /> Abaikan Laporan</button></div>
      </article>)}</div>
    </section>}
    {tab === "members" && <section className="admin-panel" role="tabpanel">
      <div className="admin-panel-heading"><div><h2>Manajemen Member</h2><p>Kelola akses dan status akun anggota guild.</p></div></div>
      <label className="member-search">Cari username<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ketik username…" /></label>
      {!data?.canManageRoles && <p className="admin-info"><Shield size={14} /> Moderator dapat membatasi akun Member. Perubahan role dan status akun staf hanya dapat dilakukan Admin.</p>}
      <div className="member-table-wrap"><table className="member-table"><thead><tr><th>Member</th><th>Bergabung</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {data?.users.map((member) => <tr key={member.id}><td><div className="member-name"><span className="member-avatar">{member.username?.slice(0, 1).toUpperCase() ?? "G"}</span>{member.username ?? "Gamer"}{member.id === data.currentUserId && <small>(Anda)</small>}</div></td><td>{new Date(member.joinedAt).toLocaleDateString("id-ID")}</td><td><select className="role-select" aria-label={`Role ${member.username ?? "member"}`} value={member.role} disabled={!data.canManageRoles || busyId === member.id || member.id === data.currentUserId} onChange={(event) => void updateMember(member, { role: event.target.value as Role })}><option value="MEMBER">Member</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option></select></td><td><span className={member.isBanned ? "member-status banned" : "member-status active"}>{member.isBanned ? "BANNED" : "AKTIF"}</span></td><td><button className={member.isBanned ? "button button-unban button-small" : "button button-quiet button-small"} disabled={!data.canBanMembers || busyId === member.id || member.id === data.currentUserId} onClick={() => void updateMember(member, { isBanned: !member.isBanned })}><Ban size={13} /> {member.isBanned ? "Unban" : "Ban"}</button></td></tr>)}
        {!loading && !data?.users.length && <tr><td className="table-empty" colSpan={5}>Member tidak ditemukan.</td></tr>}
      </tbody></table></div>
      <div className="pagination"><span>Menampilkan {data?.users.length ?? 0} dari {data?.pagination.total ?? 0} member</span><div><button aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><span>Halaman {data?.pagination.page ?? page} / {Math.max(1, data?.pagination.totalPages ?? 1)}</span><button aria-label="Halaman berikutnya" disabled={page >= (data?.pagination.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>
    </section>}
    {tab === "broadcast" && isAdmin && <BroadcastForm onNotice={setNotice} onError={setError} />}
  </div></main>;
}

function BroadcastForm({ onNotice, onError }: { onNotice: (message: string) => void; onError: (message: string) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const result = await readApiResponse<{ notificationSent: boolean; warning?: string }>(response, "Broadcast gagal.");
      setTitle("");
      setContent("");
      onNotice(result.notificationSent ? "Pengumuman berhasil dipin di forum dan dikirim ke Discord." : result.warning ?? "Pengumuman dipin, tetapi notifikasi Discord gagal.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Broadcast gagal.");
    } finally { setSaving(false); }
  }

  return <section className="admin-panel broadcast-panel" role="tabpanel">
    <div className="admin-panel-heading"><div><h2>Broadcast Pengumuman</h2><p>Pengumuman akan otomatis dipin di Obrolan Umum dan dikirim ke Discord.</p></div><span className="admin-broadcast-icon"><Megaphone size={18} /></span></div>
    <form className="stack-form broadcast-form" onSubmit={submit}>
      <label>Judul Pengumuman<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Jadwal turnamen guild minggu ini" /></label>
      <label>Isi Pengumuman<textarea required maxLength={10000} rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Tulis informasi untuk seluruh member…" /></label>
      <p className="broadcast-hint">Link Discord Webhook disimpan aman di konfigurasi server, tidak dikirim ke browser.</p>
      <button className="button button-primary" disabled={saving}><Megaphone size={15} /> {saving ? "Mengirim…" : "Pin & Kirim Pengumuman"}</button>
    </form>
  </section>;
}
