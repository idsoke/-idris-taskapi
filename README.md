# idris-taskapi

A small Task Management REST API built with Express and PostgreSQL, with JWT-based authentication. Built as a portfolio project to demonstrate REST API design, authentication, and relational schema design.

## Stack

- Node.js + Express
- PostgreSQL (via `pg`)
- JWT authentication (`jsonwebtoken`) + password hashing (`bcrypt`)

## Getting started

```bash
cp .env.example .env
# edit .env if needed (DATABASE_URL, JWT_SECRET)

docker compose up -d        # starts PostgreSQL on localhost:5432
npm install
npm run migrate             # creates users and tasks tables
npm run dev                 # starts the API on http://localhost:3000
```

## API

A ready-to-use Postman collection lives in [`postman/`](./postman). Import both
`idris-taskapi.postman_collection.json` and `idris-taskapi.postman_environment.json`
into Postman, select the "idris-taskapi (local)" environment (or point `baseUrl` at
your deployed URL), then run **Auth → Register** or **Auth → Login** — the JWT is
saved automatically to the `{{token}}` variable and reused by every request under
**Tasks**.

### Auth

| Method | Path             | Description         |
| ------ | ---------------- | ------------------- |
| POST   | `/auth/register` | Create an account   |
| POST   | `/auth/login`    | Get a JWT token     |

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"secret123"}'
```

Use the returned `token` as a Bearer token for the endpoints below.

### Tasks (require `Authorization: Bearer <token>`)

| Method | Path          | Description                          |
| ------ | ------------- | ------------------------------------ |
| POST   | `/tasks`      | Create a task                         |
| GET    | `/tasks`      | List your tasks (optional `?status=`) |
| GET    | `/tasks/:id`  | Get a single task                     |
| PATCH  | `/tasks/:id`  | Update title/description/status       |
| DELETE | `/tasks/:id`  | Delete a task                         |

`status` accepts `pending`, `in_progress`, or `done`.

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write README","description":"Document the API"}'
```

## Deploying to Render

This API is set up to run on [Render](https://render.com) (free tier) with a managed PostgreSQL database.

1. **Create a PostgreSQL database**
   - Render dashboard → **New** → **PostgreSQL** (free plan)
   - Copy the **Internal Database URL** once it's provisioned

2. **Create a Web Service**
   - Render dashboard → **New** → **Web Service** → connect this repo
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables:
     | Key              | Value                                   |
     | ---------------- | --------------------------------------- |
     | `DATABASE_URL`   | Internal Database URL from step 1        |
     | `JWT_SECRET`     | a long random string (e.g. `openssl rand -hex 32`) |
     | `JWT_EXPIRES_IN` | `1d`                                     |
     | `NODE_ENV`       | `production`                             |

   Render sets `PORT` automatically; the app already reads `process.env.PORT`.

3. **Run the migration**
   - After the first deploy, open the service's **Shell** tab and run:
     ```bash
     npm run migrate
     ```
   - This creates the `users` and `tasks` tables on the new database.

4. **Verify**
   - `GET https://<your-service>.onrender.com/health` should return `{"status":"ok"}`

> Note: in production, the database connection uses SSL (`ssl: { rejectUnauthorized: false }`), enabled automatically when `NODE_ENV=production` — see `src/config/db.js`.

## Design notes

- **Schema**: `users` and `tasks` are linked with a foreign key (`tasks.user_id`), with `ON DELETE CASCADE` so a user's tasks are removed if the account is deleted. An index on `tasks.user_id` keeps per-user listing fast.
- **Auth**: passwords are hashed with bcrypt before storage; JWTs carry the user id, email, and role so the API stays stateless.
- **Authorization**: every task query is scoped to `req.user.id`, so users can only see and modify their own tasks.
