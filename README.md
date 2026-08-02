# Hadid Web — Build Documentation

A workout tracker web app. Log sets, track PRs, see muscle load, build streaks.
Port of the 8-screen React Native concept to a **Next.js PWA** hosted free on **Vercel**, with **Supabase** as database + auth.

Design intent: **calm, premium, iOS-native feel**. Not a loud gym app. Quiet surfaces, soft depth, restrained motion, one accent colour used sparingly.

## Documents

| # | Doc | What's in it |
|---|-----|--------------|
| 01 | [Product Spec](docs/01-product-spec.md) | Scope, users, features per screen, non-goals |
| 02 | [Architecture](docs/02-architecture.md) | Stack, folder layout, data flow, offline strategy |
| 03 | [Database Schema](docs/03-database-schema.md) | Tables, RLS policies, seed data, SQL migrations |
| 04 | [Design System](docs/04-design-system.md) | Colour, type, spacing, motion, component specs |
| 05 | [Screen Specs](docs/05-screens.md) | All 8 screens — layout, states, interactions |
| 06 | [Setup & Deployment](docs/06-setup-deployment.md) | Zero-cost setup, env vars, deploy, free-tier limits |
| 07 | [Build Roadmap](docs/07-roadmap.md) | Phased task list, definition of done per phase |

## Quick summary

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + CSS variables for theming
- **Motion**: Motion (Framer Motion successor) — spring physics only
- **Data**: Supabase Postgres + Row Level Security + Realtime (optional)
- **Auth**: Supabase Auth — anonymous sign-in first, upgrade to email/OAuth later
- **Charts**: hand-rolled SVG (no chart library)
- **Offline**: IndexedDB write queue + optimistic UI
- **Delivery**: installable PWA, mobile-first, works standalone on iOS home screen
- **Cost**: $0 — Vercel Hobby + Supabase Free

## Non-negotiables

1. Zero-friction entry — usable before any account exists.
2. Logging a set takes ≤ 2 taps.
3. Every interaction responds in < 100ms (optimistic, never wait on network).
4. No layout shift, no spinners on the critical path.
5. Works offline mid-workout. Gyms have bad signal.
