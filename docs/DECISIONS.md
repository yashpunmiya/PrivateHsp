# Decisions

## 2026-10-26 — npm and single Next.js application
- Use npm consistently; npm and pnpm exist, but npm is the default and avoids multiple lockfiles.
- Start as a single Next.js App Router application with explicit module boundaries, matching the brief and avoiding premature service splits.
- Do not initialize Prisma/PostgreSQL until a first persisted feature needs it; schema must reflect actual implemented state.
