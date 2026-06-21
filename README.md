# CarbonLens AI

> See Your Impact. Shape Your Future.

CarbonLens AI is an AI-powered sustainability dashboard and calculator built for the **Google Solution Challenge 2026** (PromptWars Virtual Challenge 3). It enables individuals to measure, understand, simulate, and reduce their carbon footprint using daily habit checklists, target simulators, gamified milestones, and a context-aware AI Coach powered by **Google Gemini 2.5 Flash**.

---

## 1. Implemented Features

1. **Onboarding & Baseline Questionnaire**: Gathers initial transportation, home energy, diet, shopping, and waste management habits, translating choices into actual kilograms of CO₂ via a modular carbon calculation engine.
2. **Interactive Live Dashboards**: Renders carbon totals, sustainability scores, XP level metrics, itemized pie-chart breakdowns, active goals, tree offset counters, and daily checkbox tasks.
3. **Daily Habits Logger**: Users mark down green habits (e.g. reusable water bottle, plant-based meal) to immediately earn +15 XP.
4. **Impact Simulator**: Interactively tests scenarios (EV adoption, solar panel swaps, vegetarian transitions) to preview carbon savings and tree equivalents before committing.
5. **EcoAI Coach (Gemini 2.5 Flash)**: Context-enhanced assistant connected via Supabase Edge Functions. It reads the user's active goals, logs, level, and carbon profiles to formulate tailored reduction roadmaps. Features a built-in exponential backoff loop and a safe offline contingency mode (keeps logging active during rate limit periods).
6. **Quest Challenges**: Users join structural challenges (Meat-Free Monday, Walk 5km Daily) and log daily logs to complete goals and claim +350 XP rewards.
7. **Trophy Achievements**: Automatically unlocks and showcases user badges (e.g., "Eco Beginner", "Waste Warrior", "Green Commuter") as milestones are reached.
8. **Live Global Leaderboard**: Ranks members dynamically based on their actual sustainability scores, XP points, and active habits.
9. **Admin Teleboard**: Administrative views displaying real-time platform aggregates (DAU, Retention %, total trees, CO₂ saved), challenge/achievement editors, XP modifiers, and broadcast announcements.
10. **Auth Integration**: Secure email registration, session persistence, and Google OAuth redirects with inline error captures.

---

## 2. Tech Stack

* **Frontend**: React 19, TypeScript, TailwindCSS v4, Recharts, Framer Motion
* **Routing & SSR Engine**: TanStack Router, TanStack Start (native Vite bundling with Nitro serverless handlers)
* **Backend Database**: Supabase Database (PostgreSQL with RLS policy protection and auto-signup trigger scripts)
* **AI Model integration**: Deno Edge Functions connecting to Gemini 2.5 Flash (utilizing server-side fallback endpoints)
* **Hosting Configuration**: Native Vercel deployment mappings (`vercel.json` + `nitro()` bundler presets)

---

## 3. Required Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*Note: For serverless actions and AI features, configure `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as secrets directly inside your Supabase project settings.*

---

## 4. Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Copy the SQL code inside [initial_schema.sql](file:///c:/Coding/CarbonLens%20AI/aura-eco-insight-main/supabase/migrations/20260620000000_initial_schema.sql) and execute it in your Supabase SQL Editor to establish tables, RLS rules, profiles triggers, and default challenges.

### 3. Deploy Edge Functions
Login to your Supabase account and deploy the Deno server code:
```bash
supabase functions deploy eco-ai --project-ref your-project-id
supabase secrets set GEMINI_API_KEY=your_gemini_api_key --project-ref your-project-id
```

### 4. Start Development
```bash
npm run dev
```

---

## 5. Deployment

This repository is optimized for **Vercel** deployment using the Build Output API.

* **Vite Preset**: Configured via `nitro()` plugin in `vite.config.ts`.
* **Framework Preset**: Overridden explicitly using `vercel.json` to ensure serverless route mapping compiles server actions cleanly.
* **Build Command**: `npm run build`
* **Output Directory**: Handled automatically via Nitro build presets.
