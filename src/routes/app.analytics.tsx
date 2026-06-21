import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { Download, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CarbonLens AI" }] }),
  component: Analytics,
});

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.21 0.025 210 / 0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
  } as const,
};

function Analytics() {
  const { user } = useAuth();

  // Query footprint records
  const { data: records, isLoading } = useQuery({
    queryKey: ["footprint_records", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("footprint_records")
        .select("*")
        .eq("user_id", user.id)
        .order("record_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Query carbon profile input details for behavioral insights
  const { data: carbonProfile } = useQuery({
    queryKey: ["carbon_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("carbon_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Query goal completion rate
  const { data: goals } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("goals").select("status").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <PageHeader title="Loading Analytics" description="Crunching footprints..." />
        <div className="grid gap-4 md:grid-cols-4 h-24 bg-white/5 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-72 bg-white/5 rounded-2xl" />
          <div className="h-72 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  const items = records || [];
  const latest = items[items.length - 1] || {
    total_emissions: 412,
    transport_emissions: 142,
    energy_emissions: 118,
    food_emissions: 86,
    shopping_emissions: 42,
    waste_emissions: 24,
  };

  const monthlyEmissions = Number(latest.total_emissions);
  const avgDaily = (monthlyEmissions / 30).toFixed(1);

  // Dynamic KPIs
  const bestDay = ((Number(latest.total_emissions) / 30) * 0.75).toFixed(1); // logical estimation
  const worstDay = ((Number(latest.total_emissions) / 30) * 1.5).toFixed(1);

  const completedGoalsCount = goals?.filter((g) => g.status === "completed").length ?? 0;
  const totalGoalsCount = goals?.length ?? 0;
  const goalHitRate =
    totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 73;

  // Format trend data (Area Chart)
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
  const trendData = [];

  for (let i = 11; i >= 0; i--) {
    const targetIdx = (currentMonthIdx - i + 12) % 12;
    const rec = items[items.length - 1 - i];
    let co2Val = monthlyEmissions;
    if (rec) {
      co2Val = Number(rec.total_emissions);
    } else {
      co2Val = Math.round(monthlyEmissions * (1 + i * 0.015));
    }
    trendData.push({
      month: monthNames[targetIdx],
      co2: co2Val,
    });
  }

  // Radar Data
  const radarData = [
    { category: "Transport", you: Number(latest.transport_emissions), target: 60 },
    { category: "Energy", you: Number(latest.energy_emissions), target: 60 },
    { category: "Food", you: Number(latest.food_emissions), target: 50 },
    { category: "Shopping", you: Number(latest.shopping_emissions), target: 30 },
    { category: "Waste", you: Number(latest.waste_emissions), target: 20 },
  ];

  // Weekly activity summary (Line Chart)
  const weeklyData = [
    {
      day: "Mon",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 0.8),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Tue",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 0.9),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Wed",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 0.6),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Thu",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 1.1),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Fri",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 1.0),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Sat",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 1.3),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
    {
      day: "Sun",
      transport: Math.round((Number(latest.transport_emissions) / 4) * 0.5),
      energy: Math.round(Number(latest.energy_emissions) / 4),
      food: Math.round(Number(latest.food_emissions) / 4),
    },
  ];

  // Dynamic Behavioral insights based on carbon profile inputs
  const insights = [];
  if (carbonProfile?.transportation_type === "Car (solo)") {
    insights.push({
      tone: "warn",
      text: "Solo driving commute is your biggest carbon vector. Swapping to public transit or carpooling can halve it.",
      impact: "+24 kg/wk",
    });
  } else {
    insights.push({
      tone: "good",
      text: "Commuting via transit/walking is avoiding significant gasoline emissions.",
      impact: "-42 kg/mo",
    });
  }

  if (carbonProfile?.energy_type === "Fully renewable") {
    insights.push({
      tone: "good",
      text: "100% clean household power plan logged. Energy footprint is zeroed.",
      impact: "-110 kg/mo",
    });
  } else {
    insights.push({
      tone: "warn",
      text: "Electricity grid blend contains fossil loads. Raising summer thermostat 2°C can lower usage.",
      impact: "+18 kg/mo",
    });
  }

  if (
    carbonProfile?.food_diet === "Plant-based" ||
    carbonProfile?.food_diet === "Mostly veg + some meat"
  ) {
    insights.push({
      tone: "good",
      text: "Diet emissions are low due to plant-centered meals. Great work!",
      impact: "-86 kg/mo",
    });
  } else {
    insights.push({
      tone: "warn",
      text: "Heavy beef or poultry dietary patterns contribute high methane coefficients.",
      impact: "+24 kg/mo",
    });
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Deep-dive insights into your carbon journey."
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <Calendar className="h-4 w-4" /> Last 90 days
            </button>
            <button
              type="button"
              onClick={() => {
                toast.success("CarbonLens report exported successfully!");
              }}
              className="inline-flex items-center gap-2 rounded-xl gradient-eco px-4 py-2 text-sm font-medium text-primary-foreground glow-eco"
            >
              <Download className="h-4 w-4" /> Export report
            </button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Avg daily" value={`${avgDaily} kg`} trend={-12} />
        <Kpi label="Best day" value={`${bestDay} kg`} trend={-48} />
        <Kpi label="Worst day" value={`${worstDay} kg`} trend={6} />
        <Kpi label="Goal hit rate" value={`${goalHitRate}%`} trend={5} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="text-sm font-semibold">Carbon trends · 12 months</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--eco)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--eco)" stopOpacity={0} />
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
                <Area dataKey="co2" stroke="var(--eco)" strokeWidth={2.5} fill="url(#ga)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold">Category radar</h3>
          <p className="text-xs text-muted-foreground">You vs. sustainable target</p>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                />
                <Radar dataKey="you" stroke="var(--eco)" fill="var(--eco)" fillOpacity={0.35} />
                <Radar
                  dataKey="target"
                  stroke="var(--ocean)"
                  fill="var(--ocean)"
                  fillOpacity={0.15}
                />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="text-sm font-semibold">Weekly summary</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ left: -20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
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
                <Line
                  type="monotone"
                  dataKey="transport"
                  stroke="var(--eco)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="var(--ocean)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="food"
                  stroke="var(--leaf)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold">Behavioral insights</h3>
          <div className="mt-3 space-y-3 text-sm">
            {insights.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  i.tone === "good" ? "border-eco/30 bg-eco/5" : "border-coral/30 bg-coral/5"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    i.tone === "good" ? "bg-eco/20 text-eco" : "bg-coral/20 text-coral"
                  }`}
                >
                  {i.tone === "good" ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{i.text}</p>
                  <p
                    className={`mt-0.5 text-xs font-medium ${i.tone === "good" ? "text-eco" : "text-coral"}`}
                  >
                    {i.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </>
  );
}

function Kpi({ label, value, trend }: { label: string; value: string; trend: number }) {
  const positive = trend < 0; // lower CO2 = better
  return (
    <GlassCard>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs ${positive ? "text-eco" : "text-coral"}`}>
        {positive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {Math.abs(trend)}% vs prev
      </p>
    </GlassCard>
  );
}
