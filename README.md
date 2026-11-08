# LogHorizon

Komunitas multi-game dengan Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, dan autentikasi Discord melalui Auth.js.

## Menjalankan secara lokal

1. Pasang dependency:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env` lalu isi koneksi PostgreSQL, kredensial OAuth Discord, dan `DISCORD_ANNOUNCEMENT_WEBHOOK_URL` dari channel pengumuman. `AUTH_TRUST_HOST=true` disiapkan untuk pengembangan lokal; pada production aktifkan hanya bila host aplikasi dipercaya dan proxy telah dikonfigurasi dengan benar. Buat aplikasi OAuth di Discord Developer Portal dan daftarkan callback URL:

   ```text
   http://localhost:3000/api/auth/callback/discord
   ```

   Buat nilai `AUTH_SECRET` acak yang panjang. Jangan commit file `.env`.

3. Isi `DATABASE_URL` dengan connection string aplikasi dan `DATABASE_URL_UNPOOLED` dengan connection string langsung untuk migrasi (untuk PostgreSQL lokal, keduanya boleh sama). Buat tabel database dan Prisma Client:

   ```bash
   npm run db:migrate
   npx prisma generate
   ```

4. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

Halaman utama tersedia di `/`, forum di `/forum`, detail thread di `/forum/[id]`, forum jual-beli di `/marketplace`, papan peringkat di `/leaderboard`, turnamen/LFG di `/events`, serta kas komunitas di `/donate`.

## Layanan Neon

Project memakai Prisma/PostgreSQL untuk data aplikasi, Neon Realtime untuk menyegarkan daftar forum secara langsung, dan Neon AI Gateway untuk membuat ringkasan thread. Setelah menjalankan `neon deploy`, variabel `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`, `NEON_AI_GATEWAY_BASE_URL`, dan `NEON_AI_GATEWAY_TOKEN` disimpan lokal di `.env.local`.

Jalankan migrasi Prisma dengan koneksi langsung, bukan pooler. Neon menyediakan `DATABASE_URL_UNPOOLED` untuk tujuan ini; gunakan `DATABASE_URL` pada aplikasi Next.js. Realtime hanya mengirim URL browser dan sealed query yang berumur pendek; secret Realtime dan token AI tetap berada di server. Tambahkan origin aplikasi yang digunakan ke `allowedOrigins` pada `neon.ts`, lalu jalankan `neon deploy` untuk menerapkannya.

Ringkasan AI tersedia untuk anggota yang sudah login. Neon AI Gateway memerlukan kredit aktif untuk menjalankan model; jika belum tersedia, endpoint akan menjelaskan bahwa layanan belum aktif.

Asisten chat `Satpam Horizon` memanggil Hugging Face Inference Providers melalui `https://router.huggingface.co/v1/chat/completions` dan tidak menggunakan Neon AI Gateway. Tambahkan `HF_ACCESS_TOKEN` sebagai secret server (bukan `NEXT_PUBLIC_*`) dengan izin Inference Providers. Model `meta-llama/Meta-Llama-3-8B-Instruct` memerlukan akses model Meta Llama yang disetujui di Hugging Face. Widget hanya tersedia bagi anggota login yang tidak dibanned; input dibatasi 200 karakter, cooldown 5 detik, dan output maksimum 150 token. Batas gratis/kuota Hugging Face bergantung pada akun dan provider, jadi jangan menganggap layanan eksternal bebas biaya tanpa batas. Untuk deploy, masukkan token tersebut sebagai environment variable server di hosting.

## Catatan autentikasi dan moderasi

- Login Discord membuat sesi database. Setelah autentikasi, profil Discord disimpan/diperbarui pada user, sedangkan role dan status ban tetap dikendalikan dari database.
- Untuk mempromosikan moderator/admin pertama, perbarui kolom `role` pada user melalui database. Nilai yang didukung: `MEMBER`, `MODERATOR`, `ADMIN`.
- Route tulis forum dan marketplace memverifikasi sesi dan status ban di server. Vote dan laporan disimpan pada tabel terpisah dengan batas satu vote/laporan per user per post.
- Laporan yang menunggu peninjauan ditampilkan di `/admin` untuk role `MODERATOR` dan `ADMIN`.
- Proxy dan pemeriksaan server melindungi dashboard/API admin. Moderator dapat memproses laporan; perubahan role/status ban dan broadcast hanya dapat dilakukan Admin.
- Broadcast Admin membuat thread pinned di Obrolan Umum lalu mengirim embed ke Discord webhook. Jika webhook gagal, thread tetap tersimpan dan dashboard menampilkan peringatan; atur `DISCORD_ANNOUNCEMENT_WEBHOOK_URL` hanya pada environment server.
- Halaman forum dan marketplace tetap dapat dibaca tanpa login. Tindakan interaktif menampilkan ajakan login Discord; kontak lapak hanya dikirim oleh endpoint server setelah autentikasi dan tidak disertakan dalam respons daftar publik.
- Thread baru memberi 10 XP, komentar memberi 5 XP, dan transaksi lapak yang selesai melalui alur escrow simulasi memberi penjual 50 XP serta badge `Top Trader`. Setelah 25 komentar, anggota mendapat badge `Guild Guide`; level 10 memberikan badge `Veteran`.
- Terapkan perubahan tabel baru menggunakan `npm run db:deploy` dengan `DATABASE_URL_UNPOOLED` mengarah ke database yang benar. Model baru mencakup turnamen/participant, LFG/join, escrow, donasi, XP, level, badge, dan premium.
- `/api/discord/sync` menerima POST dari bot dengan header `Authorization: Bearer <DISCORD_SYNC_TOKEN>` dan JSON `{ "discordId": "Discord user ID", "xpDelta": 10, "role": "MEMBER" }`. Field `xpDelta` dan `role` opsional; batasi token ini pada bot tepercaya dan jangan menaruhnya di client.
- Atur `DISCORD_MARKETPLACE_WEBHOOK_URL` serta `DISCORD_EVENTS_WEBHOOK_URL` untuk notifikasi lapak dan LFG. Pengumuman Admin memakai `DISCORD_ANNOUNCEMENT_WEBHOOK_URL`.
- `/donate` hanya memakai mock payment gateway lokal dan endpoint-nya menolak semua request selain di `NODE_ENV=development`. Mock ini tidak memproses pembayaran nyata; untuk produksi, integrasikan provider pembayaran dan verifikasi callback/webhook provider sebelum mengubah status donasi atau memberi premium.
- Escrow adalah pencatatan status simulasi saja: status bergerak `AVAILABLE` → `IN_ESCROW` → `SOLD`, tetapi aplikasi tidak menerima atau menahan dana nyata. Gunakan payment provider dan tinjauan legal/compliance sebelum menawarkan escrow uang nyata.

Semua kredensial rahasia hanya disimpan di environment server; jangan pernah menaruhnya di variabel `NEXT_PUBLIC_*`.
