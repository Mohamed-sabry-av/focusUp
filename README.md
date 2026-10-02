# FocusUp

Virtual co-working: book a 1:1 focus session (25 / 50 / 75 min) with a partner and work side by side on video.

- Product spec: [docs/SPEC.md](docs/SPEC.md) (Word export: `docs/FocusUp_SPEC_v1.1.docx`)
- Why things were decided: [docs/DECISIONS.md](docs/DECISIONS.md)
- Code rules for people and agents: [AGENTS.md](AGENTS.md)

## Structure

```
focusUp/
├── apps/
│   ├── api/            # Express REST + socket.io + background workers (the only backend)
│   └── web/            # Next.js 16 frontend
├── packages/
│   ├── env/            # Validated environment variables (server + web)
│   ├── shared-types/   # Zod schemas and types shared by api and web
│   ├── ui/             # shadcn/ui components
│   └── config/         # Shared tsconfig
├── infrastructure/     # LiveKit config for local development
└── docker-compose.yml  # Postgres, Redis, LiveKit for local development
```

## Local setup

Requires [Bun](https://bun.sh) and Docker.

```bash
bun install
cp apps/api/.env.example apps/api/.env       # then fill in the secrets
echo 'NEXT_PUBLIC_SERVER_URL=http://localhost:3000' > apps/web/.env
echo 'NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880' >> apps/web/.env
docker compose up -d
bun run db:migrate
bun run dev
```

### Sign-in setup

Login uses [Better Auth](https://www.better-auth.com) (email + password and Google).

1. Put a random secret in `apps/api/.env`: `BETTER_AUTH_SECRET` (32+ characters; the server will not start without it). The `.env.example` file shows how to generate one.
2. **Emails** (verification, password reset): with no `RESEND_API_KEY`, the API prints each email, including its link, in its log. Copy the link into the browser to continue the flow. Real sending needs a Resend account and a verified domain.
3. **Google sign-in** (optional): create an OAuth client (type "Web application") in Google Cloud Console, add the redirect URI `http://localhost:3000/api/auth/callback/google`, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Without them the Google button reports that it is unavailable.

Users must verify their email before they can book or join a session.

| Service | URL |
|---|---|
| Web | http://localhost:3001 |
| API | http://localhost:3000 (health: `/api/health`) |
| LiveKit | ws://localhost:7880 |
| Postgres | localhost:5437 |

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start api and web |
| `bun run check-types` | Type-check every package |
| `bun run test` | Run the unit tests (no database needed) |
| `bun run test:integration` | Run the auth flows against a real Postgres (creates a `focusup_test` database; Docker Postgres must be running) |
| `bun run db:migrate` | Create/apply a migration in development |
| `bun run db:deploy` | Apply existing migrations (production) |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run db:studio` | Open Prisma Studio |

## Database rules

Schema changes go through a new migration: edit `apps/api/prisma/schema.prisma`, then run `bun run db:migrate`. Never edit an existing migration and never use `prisma db push`.

`livekit/` and `meet/` are optional local clones of upstream LiveKit projects, kept for reference. They are git-ignored.
