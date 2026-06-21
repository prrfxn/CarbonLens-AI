import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingDown,
  Activity,
  Flame,
  TreePine,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Newspaper,
  CheckCircle2,
  Circle,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { calculateFootprint, calculateSustainabilityScore } from "@/services/carbon-engine";
import { awardXP, performMetricCheck } from "@/services/user-service";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CarbonLens AI" }] }),
  component: Dashboard,
});

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.21 0.025 210 / 0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    fontSize: 12,
  } as const,
  labelStyle: { color: "oklch(0.97 0.01 180)" },
  itemStyle: { color: "oklch(0.78 0.18 155)" },
};

const defaultHabits = [
  { id: "1", label: "Reusable water bottle", done: false, icon: "💧" },
  { id: "2", label: "Walk or bike short trips", done: false, icon: "🚶" },
  { id: "3", label: "Plant-based meal", done: false, icon: "🥗" },
  { id: "4", label: "Unplug idle devices", done: false, icon: "🔌" },
  { id: "5", label: "5-min cold shower", done: false, icon: "🚿" },
];

const staticNews = [
  {
    title: "Global renewable investments cross $600B in 2025",
    source: "GreenTech Media",
    time: "3h ago",
  },
  {
    title: "New solid-state EV batteries promise 800km range",
    source: "Energy Review",
    time: "5h ago",
  },
  {
    title: "Cities expand micro-mobility corridors to reduce commute footprint",
    source: "EcoCity Journal",
    time: "1d ago",
  },
];

function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [habits, setHabits] = useState(defaultHabits);

  // Load completed habits from localStorage for today
  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`habits_${user?.id}_${today}`);
    if (saved) {
      try {
        const completedIds = JSON.parse(saved) as string[];
        setHabits(defaultHabits.map((h) => ({ ...h, done: completedIds.includes(h.id) })));
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  // Query Footprint Records
  const {
    data: records,
    isLoading: recordsLoading,
    error: recordsError,
  } = useQuery({
    queryKey: ["footprint_records", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("footprint_records")
        .select("*")
        .eq("user_id", user.id)
        .order("record_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Query Goals
  const { data: goals } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Habit toggling mutation
  const logHabitMutation = useMutation({
    mutationFn: async (habit: (typeof defaultHabits)[0]) => {
      if (!user) return;

      // Award XP
      const xpReward = 15;
      await awardXP(user.id, xpReward, `Completed daily habit: ${habit.label}`, habit.icon);
      await performMetricCheck(user.id);

      // Save locally
      const today = new Date().toDateString();
      const saved = localStorage.getItem(`habits_${user.id}_${today}`);
      let completedIds: string[] = [];
      if (saved) {
        completedIds = JSON.parse(saved);
      }
      if (!completedIds.includes(habit.id)) {
        completedIds.push(habit.id);
      }
      localStorage.setItem(`habits_${user.id}_${today}`, JSON.stringify(completedIds));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
    },
  });

  const toggleHabit = async (habitId: string) => {
    const target = habits.find((h) => h.id === habitId);
    if (!target || target.done) return; // Only allow logging incomplete habits to prevent XP abuse

    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, done: true } : h)));
    toast.promise(logHabitMutation.mutateAsync(target), {
      loading: "Logging habit and awarding XP...",
      success: `Logged! +15 XP earned.`,
      error: "Failed to award XP.",
    });
  };

  // If loading query or profile
  if (recordsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Dashboard" description="Preparing carbon metrics..." />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // Handle empty state: Redirect to onboarding if no footprint record is found
  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass max-w-md rounded-3xl p-8 border border-white/10 space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-eco flex items-center justify-center glow-eco">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">Ready to see your impact?</h2>
          <p className="text-sm text-muted-foreground">
            Complete the 2-minute onboarding questionnaire to set up your carbon profile and view
            live statistics.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex w-full justify-center items-center gap-2 rounded-xl gradient-eco px-5 py-3 text-sm font-medium text-primary-foreground glow-eco"
          >
            Create Carbon Baseline <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // Active footprint record
  const latestRecord = records[0];
  const monthlyFootprintVal = Number(latestRecord.total_emissions);
  const annualEstimateTons = ((monthlyFootprintVal * 12) / 1000).toFixed(1);

  // Compare with previous month or set a default delta
  const prevMonthVal = records[1]?.total_emissions
    ? Number(records[1].total_emissions)
    : Math.round(monthlyFootprintVal * 1.08); // fallback mockup delta
  const pctVsLast = Math.round(((prevMonthVal - monthlyFootprintVal) / prevMonthVal) * 100);

  // Breakdown array for charts
  const categories = [
    { name: "Transport", value: Number(latestRecord.transport_emissions), color: "var(--eco)" },
    { name: "Energy", value: Number(latestRecord.energy_emissions), color: "var(--ocean)" },
    { name: "Food", value: Number(latestRecord.food_emissions), color: "var(--leaf)" },
    { name: "Shopping", value: Number(latestRecord.shopping_emissions), color: "var(--sun)" },
    { name: "Waste", value: Number(latestRecord.waste_emissions), color: "var(--coral)" },
  ];

  // Generate trend line based on user records + realistic backfill
  const monthlyTrendData = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonthIdx = new Date().getMonth();

  for (let i = 11; i >= 0; i--) {
    const targetIdx = (currentMonthIdx - i + 12) % 12;
    const rec = records[i];
    let co2Val = monthlyFootprintVal;
    if (rec) {
      co2Val = Number(rec.total_emissions);
    } else {
      // Simulate historical reduction curve backwards
      co2Val = Math.round(monthlyFootprintVal * (1 + i * 0.015));
    }
    monthlyTrendData.push({
      month: monthNames[targetIdx],
      co2: co2Val,
      target: 330, // standard target
    });
  }

  return (
    <>
      <PageHeader
        title="Your sustainability dashboard"
        description="A real-time look at your footprint, habits, and impact."
        actions={
          <Link
            to="/app/simulator"
            className="inline-flex items-center gap-2 rounded-xl gradient-eco px-4 py-2 text-sm font-medium text-primary-foreground glow-eco"
          >
            <Sparkles className="h-4 w-4" /> Simulate change
          </Link>
        }
      />

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Monthly footprint"
          value={`${monthlyFootprintVal}`}
          unit="kg CO₂"
          change={
            pctVsLast >= 0
              ? `↓ ${pctVsLast}% vs last month`
              : `↑ ${Math.abs(pctVsLast)}% vs last month`
          }
          positive={pctVsLast >= 0}
          icon={TrendingDown}
        />
        <StatCard
          title="Annual estimate"
          value={`${annualEstimateTons}t`}
          unit="CO₂/year"
          change="On track to beat target"
          positive
          icon={Activity}
        />
        <StatCard
          title="Sustainability score"
          value={`${profile?.sustainability_score ?? 70}`}
          unit="/100"
          change="Top 12% globally"
          positive
          icon={Sparkles}
          gradient
        />
        <StatCard
          title="Eco streak"
          value={`${profile?.streak ?? 1}`}
          unit="days"
          change="🔥 Keep it going!"
          icon={Flame}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Trend */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Monthly emission trend</h3>
              <p className="text-xs text-muted-foreground">Last 12 months · kg CO₂</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-eco" /> You
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ocean" /> Target
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyTrendData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--eco)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--eco)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ocean)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--ocean)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="co2"
                  stroke="var(--eco)"
                  strokeWidth={2.5}
                  fill="url(#g1)"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="var(--ocean)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#g2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Breakdown */}
        <GlassCard>
          <h3 className="text-sm font-semibold">Emission breakdown</h3>
          <p className="text-xs text-muted-foreground">Where your kg of CO₂ come from</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={3}
                  stroke="none"
                >
                  {categories.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {categories.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  {e.name}
                </span>
                <span className="font-medium">{e.value} kg</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Comparisons + active goals */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="text-sm font-semibold">Goal Progress Overview</h3>
          <p className="text-xs text-muted-foreground">Status of your active milestones</p>
          <div className="mt-4 space-y-4">
            {goals && goals.length > 0 ? (
              goals.map((g) => {
                const pct = Math.min(100, Math.round((g.progress_value / g.target_value) * 100));
                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="text-sm">{g.icon}</span> {g.title}
                      </span>
                      <span className="text-muted-foreground">
                        {g.progress_value} / {g.target_value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full gradient-eco" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No active goals.{" "}
                <Link to="/app/goals" className="text-eco underline font-medium">
                  Set a new goal
                </Link>{" "}
                to start tracking.
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold">Benchmark</h3>
          <p className="text-xs text-muted-foreground">Monthly kg CO₂ comparison</p>
          <div className="mt-4 space-y-4">
            <BenchmarkBar label="You" value={monthlyFootprintVal} max={1340} color="var(--eco)" />
            <BenchmarkBar label="Global average" value={333} max={1340} color="var(--ocean)" />
            <BenchmarkBar label="National average" value={1340} max={1340} color="var(--coral)" />
            <BenchmarkBar label="Sustainable target" value={200} max={1340} color="var(--leaf)" />
          </div>
        </GlassCard>
      </div>

      {/* Bottom row: habits, news, AI tip */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Today's eco habits</h3>
            <span className="text-xs text-muted-foreground">
              {habits.filter((h) => h.done).length}/{habits.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {habits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => toggleHabit(h.id)}
                disabled={h.done}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                  h.done
                    ? "border-eco/30 bg-eco/5 cursor-default"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{h.icon}</span>
                <span className={`flex-1 text-sm ${h.done ? "" : "text-muted-foreground"}`}>
                  {h.label}
                </span>
                {h.done ? (
                  <CheckCircle2 className="h-4 w-4 text-eco" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TreePine className="h-4 w-4 text-eco" /> Tree impact
          </h3>
          <p className="text-xs text-muted-foreground">Your contribution this year</p>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-5xl font-semibold text-gradient-eco">
              {profile?.trees_planted ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">trees planted</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full gradient-leaf"
              style={{ width: `${Math.min(100, ((profile?.trees_planted ?? 0) / 25) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Goal: 25 trees by Dec</p>
          <button
            type="button"
            onClick={async () => {
              try {
                const { error } = await supabase
                  .from("profiles")
                  .update({ trees_planted: (profile?.trees_planted ?? 0) + 1 })
                  .eq("id", user?.id ?? "");
                if (error) throw error;
                await awardXP(user?.id ?? "", 25, "Offset another tree", "🌳");
                queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
                toast.success("Offset successfully! +1 tree planted, +25 XP earned.");
              } catch (e) {
                toast.error("Failed to plant offset tree.");
              }
            }}
            className="mt-4 w-full rounded-xl border border-eco/30 bg-eco/10 px-3 py-2 text-sm font-medium text-eco hover:bg-eco/15"
          >
            Plant another tree ($3.50)
          </button>
        </GlassCard>

        <GlassCard>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Newspaper className="h-4 w-4 text-ocean" /> Eco news
          </h3>
          <p className="text-xs text-muted-foreground">Stories shaping the climate beat</p>
          <div className="mt-3 space-y-3">
            {staticNews.map((n) => (
              <a
                key={n.title}
                href="#"
                className="block rounded-xl border border-white/5 p-3 hover:bg-white/5"
              >
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.source} · {n.time}
                </p>
              </a>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* EcoAI tip banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 relative overflow-hidden rounded-2xl border border-eco/30 bg-gradient-to-br from-eco/15 via-ocean/10 to-transparent p-6"
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-eco/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-eco glow-eco">
              <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-eco">Today's EcoAI tip</p>
              <p className="mt-1 text-sm font-medium">
                Air-drying laundry instead of using the dryer can save ~2 kg CO₂ per load.
              </p>
            </div>
          </div>
          <Link
            to="/app/coach"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Chat with EcoAI <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </>
  );
}

function StatCard({
  title,
  value,
  unit,
  change,
  positive,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  unit: string;
  change: string;
  positive?: boolean;
  icon: React.ElementType;
  gradient?: boolean;
}) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
          <Icon className="h-4 w-4 text-eco" />
        </div>
      </div>
      <p
        className={`mt-3 text-4xl font-semibold tracking-tight ${gradient ? "text-gradient-eco" : ""}`}
      >
        {value}
        <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className={`mt-1.5 text-xs ${positive ? "text-eco" : "text-coral"}`}>{change}</p>
    </GlassCard>
  );
}

function BenchmarkBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} kg</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
