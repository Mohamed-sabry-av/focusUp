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
| `bun run test` | Run all tests |
| `bun run db:migrate` | Create/apply a migration in development |
| `bun run db:deploy` | Apply existing migrations (production) |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run db:studio` | Open Prisma Studio |

## Database rules

Schema changes go through a new migration: edit `apps/api/prisma/schema.prisma`, then run `bun run db:migrate`. Never edit an existing migration and never use `prisma db push`.

`livekit/` and `meet/` are optional local clones of upstream LiveKit projects, kept for reference. They are git-ignored.
