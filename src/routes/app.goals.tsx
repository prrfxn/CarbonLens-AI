import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Calendar, Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { awardXP, performMetricCheck } from "@/services/user-service";
import { toast } from "sonner";

export const Route = createFileRoute("/app/goals")({
  head: () => ({ meta: [{ title: "Goals — CarbonLens AI" }] }),
  component: Goals,
});

const categories = [
  "Overall",
  "Transport",
  "Energy",
  "Food",
  "Shopping",
  "Waste",
  "Offsets",
  "Engagement",
];
const icons = ["🎯", "🚗", "⚡", "🥦", "📦", "♻️", "🌳", "🏆"];

function Goals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    title: "",
    category: "Overall",
    target_value: "",
    deadline: "",
    icon: "🎯",
  });
  const [progressVal, setProgressVal] = useState("");

  // Query user goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation to create a goal
  const createGoalMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: form.title,
        category: form.category,
        target_value: Number(form.target_value),
        progress_value: 0,
        deadline: form.deadline || null,
        icon: form.icon,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", user?.id] });
      setShowAddModal(false);
      setForm({ title: "", category: "Overall", target_value: "", deadline: "", icon: "🎯" });
      toast.success("Goal created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create goal.");
    },
  });

  // Mutation to log progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({
      goalId,
      addValue,
      currentVal,
      targetVal,
      title,
    }: {
      goalId: string;
      addValue: number;
      currentVal: number;
      targetVal: number;
      title: string;
    }) => {
      if (!user) return;
      const newVal = Math.min(targetVal, currentVal + addValue);
      const isCompleted = newVal >= targetVal;

      const { error } = await supabase
        .from("goals")
        .update({
          progress_value: newVal,
          status: isCompleted ? "completed" : "active",
        })
        .eq("user_id", user.id)
        .eq("id", goalId);

      if (error) throw error;

      if (isCompleted) {
        // Award XP (Goal completion bonus = 100 XP!)
        await awardXP(user.id, 100, `Completed goal: ${title} (+100 XP)`, "🎯");
        await performMetricCheck(user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
      setShowProgressModal(null);
      setProgressVal("");
      toast.success("Goal progress updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update progress.");
    },
  });

  // Mutation to archive / delete a goal
  const archiveGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("goals")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", user?.id] });
      toast.success("Goal archived successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to archive goal.");
    },
  });

  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Goals" description="Updating track map..." />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Your sustainability goals"
        description="Set ambitious targets. Track every gram of CO₂."
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl gradient-eco px-4 py-2 text-sm font-medium text-primary-foreground glow-eco"
          >
            <Plus className="h-4 w-4" /> New goal
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {activeGoals.map((g, i) => {
          const pct = Math.round((g.progress_value / g.target_value) * 100);
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-2xl">
                        {g.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">{g.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{g.category}</p>
                      </div>
                    </div>
                    {g.deadline && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {g.deadline}
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-baseline justify-between">
                      <p className="text-3xl font-semibold text-gradient-eco">{pct}%</p>
                      <span className="text-xs text-muted-foreground">
                        {g.progress_value} / {g.target_value}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full gradient-eco transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProgressModal(g.id)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium hover:bg-white/10"
                  >
                    Log Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveGoalMutation.mutate(g.id)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-coral/80 hover:bg-white/10 hover:text-coral"
                  >
                    Archive
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {/* Empty add card */}
        <GlassCard
          className="flex items-center justify-center border-dashed text-center hover:bg-white/10 cursor-pointer"
          onClick={() => setShowAddModal(true)}
        >
          <button
            type="button"
            className="flex w-full flex-col items-center gap-2 py-8 text-muted-foreground hover:text-foreground"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5">
              <Target className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Create a new goal</p>
            <p className="text-xs">Set a target and we'll help you hit it</p>
          </button>
        </GlassCard>
      </div>

      {completedGoals.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Completed goals
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((g) => (
              <GlassCard key={g.id} className="border-eco/30 bg-eco/5">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2 items-center">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold truncate max-w-[150px]">{g.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{g.category}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-eco/25 px-2 py-0.5 text-[10px] text-eco font-medium">
                    Completed
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Target value of {g.target_value} completed successfully.
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal overlay */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong w-full max-w-md rounded-3xl p-6 border border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Create New Goal</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-white/5 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.title || !form.target_value) {
                    toast.error("Please fill out required fields.");
                    return;
                  }
                  createGoalMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Reduce electricity load"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const idx = categories.indexOf(e.target.value);
                        setForm({ ...form, category: e.target.value, icon: icons[idx] ?? "🎯" });
                      }}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Goal Icon
                    </label>
                    <select
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    >
                      {icons.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Target Value *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.target_value}
                      onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      placeholder="e.g. 200"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco text-muted-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createGoalMutation.isPending}
                  className="w-full py-2.5 rounded-xl gradient-eco font-medium text-sm text-primary-foreground glow-eco transition-all disabled:opacity-50"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Add Goal"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Modal overlay */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong w-full max-w-sm rounded-3xl p-6 border border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Log Progress</h3>
                <button
                  type="button"
                  onClick={() => setShowProgressModal(null)}
                  className="p-1 hover:bg-white/5 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const targetGoal = goals?.find((g) => g.id === showProgressModal);
                  if (!targetGoal || !progressVal) return;
                  updateProgressMutation.mutate({
                    goalId: targetGoal.id,
                    addValue: Number(progressVal),
                    currentVal: Number(targetGoal.progress_value),
                    targetVal: Number(targetGoal.target_value),
                    title: targetGoal.title,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">
                    Add Value to Progress
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={progressVal}
                    onChange={(e) => setProgressVal(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateProgressMutation.isPending}
                  className="w-full py-2.5 rounded-xl gradient-eco font-medium text-sm text-primary-foreground glow-eco transition-all disabled:opacity-50"
                >
                  {updateProgressMutation.isPending ? "Logging..." : "Submit Progress"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
