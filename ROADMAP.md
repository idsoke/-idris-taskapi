# Roadmap idris-taskapi

Dokumen ini berisi rencana pengembangan aplikasi dari kondisi saat ini menuju produk yang lebih matang dan lengkap.

---

## Fase 0 — Kondisi Saat Ini

- [x] Register & login dengan JWT
- [x] CRUD task per user (title, description, status)
- [x] Filter task berdasarkan status
- [x] PostgreSQL dengan Docker Compose
- [x] Deploy ke Render

---

## Fase 1 — Stabilisasi & Kualitas Kode

> **Prioritas:** Tinggi. Fondasi yang kuat sebelum menambah fitur.

### Testing
- [x] Unit test untuk controller dan model (Jest + Supertest)
- [x] Integration test: register → login → CRUD task end-to-end
- [x] Test coverage minimal 80% (dicek otomatis di CI, threshold di `package.json`)

### Validasi & Error Handling
- [ ] Validasi input yang lebih ketat (panjang password, format email) — pakai `zod` atau `joi`
- [ ] Error handling terpusat yang konsisten di seluruh endpoint
- [ ] Tambah try-catch di semua controller (saat ini unhandled rejection bisa crash server)

### Developer Experience
- [ ] Tambah `.gitignore` yang proper (saat ini `node_modules` mungkin ter-track)
- [ ] ESLint + Prettier untuk konsistensi kode
- [ ] `npm run lint` dan `npm test` di CI (GitHub Actions)
- [ ] Logging yang lebih baik (pakai `pino` atau `winston`, bukan `console.error` mentah)

---

## Fase 2 — Fitur Task yang Lebih Lengkap

> **Prioritas:** Tinggi. Membuat aplikasi lebih berguna secara nyata.

### Organisasi Task
- [ ] **Label / Tag** — beri label bebas pada task (e.g. "urgent", "personal", "work")
- [ ] **Prioritas** — field `priority`: `low`, `medium`, `high`
- [x] **Due date** — deadline task, lengkap dengan filter `?overdue=true`
- [ ] **Urutan / reorder** — user bisa atur urutan task secara manual

### Pencarian & Filter
- [ ] Full-text search pada title dan description (`?search=kata-kunci`)
- [ ] Filter kombinasi (`?status=pending&priority=high&label=work`)
- [ ] **Pagination** — saat ini semua task diambil sekaligus; tambah `?page=` & `?limit=`

### Migrasi Database
- [ ] Sistem migrasi yang proper (pakai `node-pg-migrate` atau `db-migrate`)
  — saat ini hanya satu file SQL yang dijalankan ulang
- [ ] Seed data untuk development

---

## Fase 3 — Manajemen Akun User

> **Prioritas:** Sedang. Penting untuk pengalaman user yang lebih baik.

- [ ] **Update profil** — ganti email dan password
- [ ] **Hapus akun** — beserta seluruh task (sudah di-handle oleh `ON DELETE CASCADE`)
- [ ] **Refresh token** — saat ini token expired = harus login ulang
- [ ] **Logout** — token blacklist sederhana (Redis atau database)
- [ ] Role-based access control (RBAC) — saat ini kolom `role` ada tapi belum digunakan
  - `admin` bisa lihat semua user dan task

---

## Fase 4 — Kolaborasi (Multi-user)

> **Prioritas:** Sedang. Mengubah app dari personal menjadi tim.

- [ ] **Workspace / Project** — kelompokkan task dalam satu project bersama
- [ ] **Invite anggota** — undang user lain ke dalam project
- [ ] **Assign task** — assign task ke anggota tertentu
- [ ] **Komentar task** — diskusi dalam setiap task
- [ ] **Notifikasi** — email atau in-app notification saat di-assign atau ada update task

---

## Fase 5 — Developer & Platform

> **Prioritas:** Rendah. Membuka ekosistem di sekitar API.

### API
- [ ] **Versioning** — prefix `/api/v1/` agar tidak breaking saat ada perubahan besar
- [ ] **Rate limiting** — cegah abuse (pakai `express-rate-limit`)
- [ ] **API key** — selain JWT, support API key untuk akses programatik
- [ ] **OpenAPI/Swagger docs** — dokumentasi interaktif yang auto-generate dari kode
- [ ] **Webhooks** — kirim event ke URL eksternal saat task dibuat/diupdate/dihapus

### Infrastruktur
- [ ] Containerize full stack (app + postgres) dalam satu `docker-compose.yml`
- [ ] Health check yang lebih informatif (versi DB, uptime, koneksi aktif)
- [ ] Graceful shutdown — tutup koneksi DB sebelum proses mati
- [ ] Environment staging terpisah dari production

---

## Ide Jangka Panjang

- **Recurring task** — task yang otomatis muncul lagi setiap minggu/bulan
- **Subtask** — task bisa punya children task
- **Attachment** — upload file ke task (S3 / Cloudflare R2)
- **Dashboard & Analytics** — statistik produktivitas (task selesai per minggu, dll.)
- **Mobile-friendly** — API sudah REST, tinggal buat frontend mobile (React Native / Flutter)
- **Integrasi pihak ketiga** — Slack, Telegram bot, Google Calendar

---

## Urutan yang Disarankan

```
Fase 1 (Testing + DX)
  └─> Fase 2 (Fitur Task)
        └─> Fase 3 (Manajemen Akun)
              └─> Fase 4 (Kolaborasi)
                    └─> Fase 5 (Platform)
```

Selesaikan Fase 1 dulu sebelum menambah fitur apapun — bug yang ditemukan di production jauh lebih mahal daripada menulis test dari awal.
