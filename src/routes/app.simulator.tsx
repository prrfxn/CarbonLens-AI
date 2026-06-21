import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, TreePine, Check, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/simulator")({
  head: () => ({ meta: [{ title: "Impact Simulator — CarbonLens AI" }] }),
  component: Simulator,
});

const simulatorOptions = [
  {
    id: "transit",
    title: "Switch to public transport",
    description: "Replace 50% of car trips with transit",
    icon: "🚆",
    saving: 0.18,
    color: "eco",
  },
  {
    id: "ac",
    title: "Reduce AC usage by 20%",
    description: "Raise thermostat 2°C in summer",
    icon: "❄️",
    saving: 0.08,
    color: "ocean",
  },
  {
    id: "shop",
    title: "Cut online shopping by 30%",
    description: "Fewer parcels, less packaging",
    icon: "📦",
    saving: 0.05,
    color: "sun",
  },
  {
    id: "veg",
    title: "Eat vegetarian 4 days/week",
    description: "Plant-forward dinners",
    icon: "🥦",
    saving: 0.12,
    color: "leaf",
  },
  {
    id: "solar",
    title: "Switch to renewable energy",
    description: "100% green electricity plan",
    icon: "☀️",
    saving: 0.22,
    color: "sun",
  },
  {
    id: "fly",
    title: "Skip one long-haul flight",
    description: "Replace with regional travel",
    icon: "✈️",
    saving: 0.15,
    color: "coral",
  },
];

function Simulator() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set(["transit"]));
  const [committing, setCommitting] = useState(false);

  // Fetch user latest footprint record to get live baseline
  const { data: latestRecord, isLoading } = useQuery({
    queryKey: ["latest_footprint_record", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("footprint_records")
        .select("total_emissions")
        .eq("user_id", user.id)
        .order("record_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Default baseline to 4944 kg if no records yet
  const baselineMonthly = latestRecord ? Number(latestRecord.total_emissions) : 412;
  const annualCO2 = baselineMonthly * 12;

  const totalSavingFraction = simulatorOptions
    .filter((o) => selected.has(o.id))
    .reduce((a, o) => a + o.saving, 0);

  const annualSaved = Math.round(annualCO2 * totalSavingFraction);
  const projected = annualCO2 - annualSaved;
  const trees = Math.round(annualSaved / 22);
  const carMiles = Math.round(annualSaved * 2.5);

  const handleCommit = async () => {
    if (!user) return;
    setCommitting(true);
    try {
      const { error } = await supabase.from("simulations").insert({
        user_id: user.id,
        scenario_data: { selected_ids: Array.from(selected) },
        annual_savings: annualSaved,
        percentage_reduction: Math.round(totalSavingFraction * 100),
      });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "simulation_commit",
        description: `Committed to simulation saving ${annualSaved} kg CO₂/year!`,
        carbon_saved: annualSaved / 12, // monthly equiv
        icon: "⚡",
      });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Simulation Saved!",
        message: `You committed to actions saving up to ${annualSaved.toLocaleString()} kg CO₂ annually.`,
        type: "success",
        icon: "✨",
      });

      toast.success("Simulation goals committed and saved to your history!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to commit simulation goals.");
    } finally {
      setCommitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <PageHeader title="Loading Simulator" description="Analyzing baseline dimensions..." />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-40 rounded-2xl bg-white/5" />
            <div className="h-40 rounded-2xl bg-white/5" />
          </div>
          <div className="h-96 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Impact simulator"
        description="Test lifestyle changes and see exactly how much CO₂ you'd save."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Options */}
        <div className="space-y-3 lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Pick the changes you'd commit to
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {simulatorOptions.map((o) => {
              const active = selected.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                    active
                      ? "border-eco/50 bg-eco/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{o.icon}</span>
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full border ${active ? "border-eco bg-eco text-primary-foreground" : "border-white/20"}`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{o.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>
                  <p className="mt-3 text-xs font-medium text-eco">
                    ↓ {Math.round(annualCO2 * o.saving)} kg CO₂/year
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-eco/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-eco">
                <Sparkles className="h-3.5 w-3.5" /> Projection
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Current annual emissions</p>
              <p className="text-2xl font-semibold line-through opacity-50">
                {Math.round(annualCO2).toLocaleString()} kg
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Projected with changes</p>
              <motion.p
                key={projected}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-semibold tracking-tight text-gradient-eco"
              >
                {projected.toLocaleString()}
              </motion.p>
              <p className="text-xs text-muted-foreground">kg CO₂/year</p>

              <div className="mt-5 rounded-xl border border-eco/30 bg-eco/10 p-3">
                <p className="text-xs text-muted-foreground">You'd save</p>
                <p className="text-xl font-semibold text-eco">
                  {annualSaved.toLocaleString()} kg CO₂
                </p>
                <p className="text-[11px] text-muted-foreground">
                  per year ({Math.round(totalSavingFraction * 100)}% reduction)
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Real-world equivalent
            </p>
            <div className="mt-3 space-y-2">
              <Row
                icon={<TreePine className="h-4 w-4 text-leaf" />}
                label="Trees absorbing for 1 yr"
                value={trees.toLocaleString()}
              />
              <Row icon="🚗" label="Car miles avoided" value={carMiles.toLocaleString()} />
              <Row icon="✈️" label="NYC–LA flights" value={(annualSaved / 900).toFixed(1)} />
              <Row
                icon="💡"
                label="LED bulbs for 1 yr"
                value={Math.round(annualSaved / 8).toString()}
              />
            </div>
          </GlassCard>

          <button
            type="button"
            onClick={handleCommit}
            disabled={committing || selected.size === 0}
            className="w-full rounded-xl gradient-eco px-4 py-3 text-sm font-medium text-primary-foreground glow-eco disabled:opacity-50"
          >
            {committing ? "Saving Simulation..." : "Commit to these changes"}
          </button>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span> {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
