# Traffic Planner

SaaS for police departments to plan traffic patterns for major events. MVP tenant: UMass Amherst PD (commencement, football, Mullins Center).

## Stack

- Next.js 16 (App Router, React 19, React Compiler on)
- TypeScript, Tailwind v4
- Neon Postgres + Drizzle ORM
- NextAuth (Credentials for supervisors, magic-link tokens for officers)
- Mapbox GL JS

## Local setup

```bash
cd apps/traffic-planner
cp .env.example .env.local   # fill in DATABASE_URL, NEXT_PUBLIC_MAPBOX_TOKEN, NEXTAUTH_SECRET
npm install
npm run db:push              # create tables in your Neon DB
npm run seed                 # seed UMass PD + an admin user
npm run dev                  # http://localhost:3100
```

## Routes

- `/` — landing / department picker
- `/login` — supervisor login (email + password)
- `/o/[token]` — officer magic link landing
- `/plan/[planId]` — supervisor planner (map editor)
- `/o/event/[planId]` — officer mobile view
- `/command/[planId]` — command/dispatch big-screen view

## Roles

- `admin` — full department admin, manages users + roster
- `supervisor` — creates and publishes plans
- `officer` — magic-link only, sees their assignment

## Out of MVP scope

- Multi-tenant signup / billing
- Officer GPS tracking
- Native mobile apps
