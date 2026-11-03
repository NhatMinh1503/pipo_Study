# Deploy — Supabase cloud + Vercel (free tiers)

Production = one Supabase project (Tokyo) + one Vercel project (functions in `hnd1`, Tokyo).
Vercel deploys `main` automatically; every PR gets a preview URL.

## 1. Supabase

```bash
supabase login                               # opens the browser
supabase link --project-ref <project-ref>    # asks for the database password
supabase db push                             # applies supabase/migrations — never seed.sql
```

Dictionary (once, and again only if the dictionary table is emptied):

```bash
# .env.production.local holds the cloud URL + secret key (gitignored)
node --env-file=.env.production.local --experimental-strip-types --no-warnings scripts/import-jmdict.mts
```

Dashboard → Authentication → URL Configuration:

- Site URL: `https://<app>.vercel.app`
- Redirect URLs: `https://<app>.vercel.app/auth/callback`, `https://*-<team>.vercel.app/auth/callback` (previews)

Dashboard → Authentication → Emails → SMTP Settings (Brevo):

- Host `smtp-relay.brevo.com`, port `587`, user = Brevo SMTP login, password = Brevo SMTP key
- Sender email = the address verified in Brevo, sender name `pipo`

## 2. Vercel environment variables

| Name                                   | Value                                     | Secret  |
| -------------------------------------- | ----------------------------------------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co`       | no      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable | no      |
| `NEXT_PUBLIC_SITE_URL`                 | `https://<app>.vercel.app`                | no      |
| `SUPABASE_SECRET_KEY`                  | Project Settings → API Keys → secret      | **yes** |
| `GEMINI_API_KEY`                       | a key created for production only         | **yes** |
| `GEMINI_MODEL`                         | `gemini-3.5-flash-lite`                   | no      |
| `GROQ_API_KEY`                         | console.groq.com → API Keys (free)        | **yes** |
| `GROQ_MODEL`                           | `qwen/qwen3.8-27b`                        | no      |
| `AI_PRIMARY`                           | `groq` (Gemini becomes the fallback)      | no      |
| `AI_DAILY_LIMIT`                       | `150`                                     | no      |

Never set `AI_PROVIDER` in production (the fake AI is refused there anyway).

## 3. Free-tier limits to remember

- Supabase pauses a free project after ~7 days without traffic → Dashboard → "Restore".
- Custom SMTP starts at 30 emails/hour (raise under Authentication → Rate Limits); Brevo free = 300/day.
- Vercel Hobby is for non-commercial use.
