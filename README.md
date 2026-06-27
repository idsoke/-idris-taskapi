# idris-taskapi

REST API untuk manajemen task pribadi dengan autentikasi JWT. Dibangun menggunakan Express.js dan PostgreSQL sebagai portfolio project untuk mendemonstrasikan desain REST API, autentikasi, dan relational schema design.

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| Auth | JWT (`jsonwebtoken`) |
| Password hashing | bcrypt |
| DB driver | `pg` |

## Cara Menjalankan

```bash
cp .env.example .env
# Edit .env — wajib isi JWT_SECRET dengan string random yang panjang

docker compose up -d   # jalankan PostgreSQL di localhost:5432
npm install
npm run migrate        # buat tabel users dan tasks
npm run dev            # server berjalan di http://localhost:3000
```

## Environment Variables

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `PORT` | | `3000` | Port server |
| `DATABASE_URL` | Ya | — | PostgreSQL connection string |
| `JWT_SECRET` | Ya | — | Secret key untuk signing JWT |
| `JWT_EXPIRES_IN` | | `1d` | Durasi token JWT |

## API

Postman collection tersedia di [`postman/`](./postman). Import `idris-taskapi.postman_collection.json` dan `idris-taskapi.postman_environment.json`, pilih environment **idris-taskapi (local)**, lalu jalankan **Auth → Register** atau **Auth → Login** — token JWT tersimpan otomatis ke variabel `{{token}}` dan dipakai di semua request Tasks.

### Health Check

```
GET /health
→ { "status": "ok" }
```

### Auth

| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/register` | Daftar akun baru |
| POST | `/auth/login` | Login, dapat JWT token |

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"secret123"}'
```

Gunakan `token` dari response sebagai Bearer token di semua request Tasks.

### Tasks

Semua endpoint task memerlukan header `Authorization: Bearer <token>`.

| Method | Path | Keterangan |
|---|---|---|
| POST | `/tasks` | Buat task baru |
| GET | `/tasks` | List semua task (opsional `?status=`) |
| GET | `/tasks/:id` | Detail satu task |
| PATCH | `/tasks/:id` | Update title / description / status |
| DELETE | `/tasks/:id` | Hapus task |

`status` menerima nilai: `pending`, `in_progress`, atau `done`.

```bash
# Buat task
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Belajar Docker","description":"Pelajari dasar Docker dan Compose"}'

# List task dengan filter status
curl http://localhost:3000/tasks?status=in_progress \
  -H "Authorization: Bearer $TOKEN"

# Update status
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'
```

## Deploy ke Render

API ini siap dijalankan di [Render](https://render.com) (free tier).

1. **Buat PostgreSQL database** di Render → salin **Internal Database URL**

2. **Buat Web Service** — hubungkan repo ini
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables:

     | Key | Value |
     |---|---|
     | `DATABASE_URL` | Internal Database URL dari langkah 1 |
     | `JWT_SECRET` | String random panjang (`openssl rand -hex 32`) |
     | `JWT_EXPIRES_IN` | `1d` |
     | `NODE_ENV` | `production` |

   Render mengisi `PORT` secara otomatis.

3. **Jalankan migrasi** via Shell tab di Render:
   ```bash
   npm run migrate
   ```

4. **Verifikasi**: `GET https://<your-service>.onrender.com/health` harus mengembalikan `{"status":"ok"}`

> Koneksi database di production menggunakan SSL (`ssl: { rejectUnauthorized: false }`), diaktifkan otomatis saat `NODE_ENV=production` — lihat `src/config/db.js`.

## Skema Database

```sql
users
  id            SERIAL PRIMARY KEY
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  role          TEXT NOT NULL DEFAULT 'user'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

tasks
  id            SERIAL PRIMARY KEY
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
  title         TEXT NOT NULL
  description   TEXT
  status        TEXT NOT NULL DEFAULT 'pending'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()

INDEX idx_tasks_user_id ON tasks(user_id)
```

## Struktur Project

```
idris-taskapi/
├── migrations/
│   ├── 001_init.sql        # DDL tabel users dan tasks
│   └── run.js              # Script runner migrasi
├── src/
│   ├── config/
│   │   └── db.js           # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   ├── models/
│   │   ├── userModel.js
│   │   └── taskModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── taskRoutes.js
│   └── index.js            # Entry point
├── docker-compose.yml
├── .env.example
└── package.json
```

## Catatan Desain

- **Schema**: `users` dan `tasks` dihubungkan via foreign key dengan `ON DELETE CASCADE` — task user ikut terhapus jika akun dihapus. Index pada `tasks.user_id` menjaga performa query per-user.
- **Auth**: password di-hash bcrypt sebelum disimpan; JWT menyimpan `id`, `email`, dan `role` agar API tetap stateless.
- **Authorization**: setiap query task di-scope ke `req.user.id`, sehingga user hanya bisa melihat dan memodifikasi task miliknya sendiri.

## Roadmap

Lihat [ROADMAP.md](./ROADMAP.md) untuk rencana pengembangan ke depan.
