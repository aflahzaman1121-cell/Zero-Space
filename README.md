# zero space — The Zero School

Timed tests, misconception-level reports and weekly parent updates for ACCA Foundation students (Class 11–12).

## Deploy on Vercel (about 15 minutes)

1. **Database.** Create a free Postgres database: Supabase (Project Settings → Database → Connection string → *Transaction pooler*, port 6543) or Neon (Vercel → Storage → Neon). Copy the connection string. Tables are created automatically on first request.
2. **Code.** Push this folder to a new GitHub repository.
3. **Vercel.** vercel.com → Add New → Project → import the repository. Framework: Next.js (auto-detected).
4. **Environment variables** (Project → Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Postgres connection string |
   | `SESSION_SECRET` | any random 32+ character string (e.g. `openssl rand -hex 32`) |
   | `SETUP_KEY` | a private passphrase you choose; needed once to create your mentor account |
   | `RESEND_API_KEY`, `MAIL_FROM` | optional, for email alerts when a student finishes a test |
   Do **not** set `ALLOW_DEV_SEED` in production.
5. Deploy. Open `https://<your-app>.vercel.app/setup`, enter the setup key and create your mentor login.
6. Mentor → Students → add students (temporary password; they change it at first login). Mentor → Questions → import. Mentor → Tests → create.
7. Optional: Mentor → Settings → *Load demo data* to try everything first, then delete it.

## Run locally
```
npm install
npm run dev        # no DATABASE_URL needed: uses an embedded Postgres in .data/
npm test
```

## Notes
- All numbers (scores, readiness, trends) are computed by code. Parent messages are templates from those numbers; AI wording can replace `wording` in `lib/reports.ts`.
- Timers are enforced on the server; the browser countdown is display only.
- Nothing is sent to parents automatically.
