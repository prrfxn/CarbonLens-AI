import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Leaf,
  Sparkles,
  BarChart3,
  Trophy,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Zap,
  Heart,
  Twitter,
  Github,
  Linkedin,
} from "lucide-react";
import { AnimatedEarth } from "@/components/animated-earth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarbonLens AI — See Your Impact. Shape Your Future." },
      {
        name: "description",
        content:
          "Track, simulate, and reduce your carbon footprint with AI guidance, dashboards, and gamified challenges.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BarChart3,
    title: "Live carbon dashboards",
    desc: "See your emissions broken down by transport, energy, food, and more.",
  },
  {
    icon: MessageCircle,
    title: "EcoAI sustainability coach",
    desc: "Chat with an AI that turns your data into a personalized plan.",
  },
  {
    icon: Sparkles,
    title: "Impact simulator",
    desc: "Test lifestyle changes and see CO₂ saved before you commit.",
  },
  {
    icon: Trophy,
    title: "Gamified challenges",
    desc: "Earn XP, badges, and streaks for sustainable habits.",
  },
  {
    icon: Globe2,
    title: "Global benchmarks",
    desc: "Compare against national, global, and Paris-aligned targets.",
  },
  {
    icon: Zap,
    title: "Real-time insights",
    desc: "Get notified when habits help — or hurt — your footprint.",
  },
];

const benefits = [
  "Cut your footprint by an average of 18% in 90 days",
  "Personalized 30-day reduction roadmaps",
  "Carbon offsets from verified projects",
  "Tree planting & impact tracking",
  "Bank-grade data privacy",
  "Works on every device",
];

const testimonials = [
  {
    name: "Maya Chen",
    role: "Product Designer",
    quote: "I finally understand what's driving my emissions. Down 22% in 3 months.",
    avatar: "MC",
  },
  {
    name: "Liam O'Brien",
    role: "Software Engineer",
    quote: "EcoAI feels like a climate-savvy friend in my pocket. The simulator is addictive.",
    avatar: "LO",
  },
  {
    name: "Sofia Reyes",
    role: "Climate Researcher",
    quote: "Best onboarding I've seen in sustainability software. Beautifully done.",
    avatar: "SR",
  },
];

function Landing() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-eco glow-eco">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Carbon<span className="text-gradient-eco">Lens</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#benefits" className="hover:text-foreground">
              Benefits
            </a>
            <a href="#testimonials" className="hover:text-foreground">
              Loved by
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Log in
            </Link>
            <Link
              to="/auth"
              className="rounded-xl gradient-eco px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.18_155/0.25),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-eco" />
              AI-powered carbon platform · v1.0
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Measure. Understand.
              <br />
              <span className="text-gradient-eco">Reduce.</span> Your Carbon Footprint.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              CarbonLens AI turns daily habits into clear emissions data, then coaches you toward a
              lower-impact life with simulations, challenges, and science-backed insights.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/onboarding"
                className="group inline-flex items-center gap-2 rounded-xl gradient-eco px-5 py-3 text-sm font-medium text-primary-foreground glow-eco transition-transform hover:scale-[1.02]"
              >
                Start Tracking{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/app/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium backdrop-blur hover:bg-white/10"
              >
                Try Demo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-eco" /> No credit card
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-eco" /> Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-eco" /> 48k+ users
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <AnimatedEarth />
            {/* Floating stat cards */}
            <motion.div
              className="absolute -left-2 top-10 glass rounded-2xl px-4 py-3 sm:left-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <p className="mt-0.5 text-lg font-semibold">
                412 <span className="text-xs text-muted-foreground">kg CO₂</span>
              </p>
              <p className="text-[11px] text-eco">↓ 14% vs last</p>
            </motion.div>
            <motion.div
              className="absolute -right-2 bottom-10 glass rounded-2xl px-4 py-3 sm:right-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 0.4 }}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Eco score
              </p>
              <p className="mt-0.5 text-lg font-semibold text-gradient-eco">
                78<span className="text-xs text-muted-foreground">/100</span>
              </p>
              <p className="text-[11px] text-ocean">Top 12% globally</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trusted strip */}
      <section className="border-y border-white/5 bg-card/30 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-around gap-6 px-4 text-xs uppercase tracking-widest text-muted-foreground sm:px-6">
          <span>1.28M kg CO₂ saved</span>
          <span>·</span>
          <span>92,480 trees planted</span>
          <span>·</span>
          <span>48k+ active members</span>
          <span>·</span>
          <span>Aligned with UN SDG 13</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-eco">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to <span className="text-gradient-eco">live lighter</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            From your first kilogram tracked to your hundredth tree planted.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-eco/40"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-eco/20 to-ocean/20 ring-1 ring-white/10">
                <f.icon className="h-5 w-5 text-eco" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-eco">Why CarbonLens</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Real change.
              <br />
              Measured in <span className="text-gradient-eco">kilograms of CO₂.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              We don't just track — we coach. Members cut their footprint by an average of 18% in
              their first 90 days.
            </p>
            <ul className="mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-eco" />
                  <span className="text-sm text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Your projected impact</p>
              <span className="rounded-full bg-eco/20 px-2 py-0.5 text-[10px] font-medium text-eco">
                12 months
              </span>
            </div>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-gradient-eco">
              -1,240 kg
            </p>
            <p className="text-sm text-muted-foreground">of CO₂ avoided</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Trees equiv.", value: "56" },
                { label: "Car miles", value: "3,100" },
                { label: "Flights", value: "1.4" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-xl font-semibold">{s.value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[64%] gradient-eco" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">64% of your annual reduction goal</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-eco">Loved by</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            People who actually <span className="text-gradient-eco">moved the needle</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <Heart className="h-5 w-5 text-coral" />
              <p className="mt-3 text-sm text-foreground/90">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full gradient-eco text-xs font-semibold text-primary-foreground">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-eco/15 via-ocean/10 to-transparent p-10 text-center sm:p-16">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-eco/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ocean/20 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
            Your planet is waiting.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Set up your account in under 2 minutes. Start with a free baseline reading.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/onboarding"
              className="rounded-xl gradient-eco px-6 py-3 text-sm font-medium text-primary-foreground glow-eco"
            >
              Start free
            </Link>
            <Link
              to="/app/dashboard"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-card/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-eco">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">
                Carbon<span className="text-gradient-eco">Lens</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-powered carbon footprint platform for a lighter future.
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
          {[
            { title: "Product", links: ["Dashboard", "Coach", "Simulator", "Challenges"] },
            { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
            { title: "Resources", links: ["Docs", "Methodology", "Privacy", "Terms"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
          © 2026 CarbonLens AI. Made with 🌱 for a lighter planet.
        </div>
      </footer>
    </div>
  );
}
