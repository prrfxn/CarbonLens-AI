# CarbonLens AI

> See Your Impact. Shape Your Future.

CarbonLens AI is a production-grade SaaS sustainability platform that enables individuals to measure, understand, simulate, and reduce their carbon footprint. Powered by standard React + TanStack Start, Supabase, and Google Gemini 2.5 Flash.

---

## Key Features

1. **Onboarding & Baseline Calculations**: Gathers commuting, home energy, dietary, shopping, and waste management habits, translating them into actual kilograms of CO₂ via a scientific carbon calculation engine.
2. **Interactive Live Dashboards**: Displays monthly footprints, annual estimates, custom pie-chart breakdowns, comparisons, and active goals.
3. **Daily Habits Logger**: Interactive tracker awarding XP and level progression for daily environment-friendly tasks.
4. **Impact Simulator**: Simulates EV adoption, vegetarian diets, or solar swaps, calculating annual CO₂ offsets and real-world equivalents (e.g. trees planted) before committing.
5. **EcoAI Coach (Gemini 2.5 Flash)**: Context-enhanced AI assistant that reads user profile metrics, active goals, simulations, and chat history to provide highly actionable carbon-reduction roadmaps.
6. **Quest Challenges**: Allows users to join sustainability challenges, track progress, log completions, and earn XP rewards.
7. **Trophy Achievements**: Automatically unlocks badges based on criteria metrics (e.g., "Waste Warrior", "Green Commuter") and awards leveling boosts.
8. **Real-time Leaderboard**: Ranks members globally based on sustainability scores, promoting cooperative gamification.
9. **Admin Panel**: Monitors user growth metrics, active challenges, aggregated CO₂ saved, and utilization graphs.

---

## Technical Architecture

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Framer Motion, Recharts.
- **Routing & Meta**: TanStack Router, TanStack Start (Nitro server integration).
- **Database & Auth**: Supabase Database, Supabase Auth (Email + Google OAuth), Row Level Security (RLS) policies.
- **AI Engine**: Google Gemini 2.5 Flash running securely in Deno Edge Functions (primary) or local server-side fallbacks.

---

## Getting Started

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org) (v18+) and npm installed.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill out your variables:

```bash
cp .env.example .env
```

Ensure you provide:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for client access.
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` for backend edge function operations.

### 3. Run Database Migrations

Copy the SQL code in `supabase/migrations/20260620000000_initial_schema.sql` and run it in your Supabase Query Editor to set up tables, RLS rules, welcome triggers, and baseline lists.

### 4. Deploy EcoAI Edge Function

Deploy the Deno function using the Supabase CLI:

```bash
supabase functions deploy eco-ai --project-ref your-project-id
supabase secrets set GEMINI_API_KEY=your_gemini_api_key --project-ref your-project-id
```

### 5. Start Local Development

Install dependencies and launch the dev server:

```bash
npm install
npm run dev
```

---

## Detailed Guides

For comprehensive configuration and deployment, refer to the documentation inside the `/docs` folder:

- [Architecture Documentation](docs/architecture_documentation.md)
- [Database Documentation](docs/database_documentation.md)
- [Supabase Setup Guide](docs/supabase_setup_guide.md)
- [Google OAuth Setup Guide](docs/google_oauth_setup_guide.md)
- [Gemini Setup Guide](docs/gemini_setup_guide.md)
- [Deployment Guide](docs/deployment_guide.md)
- [Developer Guide](docs/developer_guide.md)

---

Made with 🌱 for a lighter planet.
