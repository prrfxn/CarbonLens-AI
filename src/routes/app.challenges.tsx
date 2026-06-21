import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Flame, Clock, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { awardXP, awardAchievement, performMetricCheck } from "@/services/user-service";
import { toast } from "sonner";

export const Route = createFileRoute("/app/challenges")({
  head: () => ({ meta: [{ title: "Challenges — CarbonLens AI" }] }),
  component: Challenges,
});

function Challenges() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // 1. Query all challenges
  const { data: challenges, isLoading: loadingChallenges } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("xp", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // 2. Query user joined challenges
  const { data: userChallenges, isLoading: loadingUserChallenges } = useQuery({
    queryKey: ["user_challenges", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Map user challenge progress by challenge_id
  const joinedMap = new Map<string, (typeof userChallenges)[0]>();
  userChallenges?.forEach((uc) => {
    joinedMap.set(uc.challenge_id, uc);
  });

  // Mutation to join a challenge
  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) return;
      const { error } = await supabase.from("user_challenges").insert({
        user_id: user.id,
        challenge_id: challengeId,
        progress: 0,
        status: "joined",
      });
      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "challenge_join",
        description: "Joined a new sustainability challenge",
        icon: "⚔️",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_challenges", user?.id] });
      toast.success("Joined challenge successfully! Go log some progress.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to join challenge.");
    },
  });

  // Mutation to log progress / complete challenge
  const progressMutation = useMutation({
    mutationFn: async ({
      challengeId,
      completedDays,
      requiredDays,
      challengeXp,
      category,
    }: {
      challengeId: string;
      completedDays: number;
      requiredDays: number;
      challengeXp: number;
      category: string;
    }) => {
      if (!user) return;

      // STREAK AUDIT: check if already completed to prevent duplicate updates
      const { data: uc, error: ucErr } = await supabase
        .from("user_challenges")
        .select("status, completed_days")
        .eq("user_id", user.id)
        .eq("challenge_id", challengeId)
        .single();

      if (ucErr || !uc) throw new Error("Could not find joined challenge.");
      if (uc.status === "completed") {
        throw new Error("Challenge already completed!");
      }

      const nextCompleted = uc.completed_days + 1;
      const progressPercent = Math.min(
        100,
        Math.round((nextCompleted / requiredDays) * 100 * 100) / 100,
      );
      const isCompleted = nextCompleted >= requiredDays;

      const { error } = await supabase
        .from("user_challenges")
        .update({
          completed_days: nextCompleted,
          progress: progressPercent,
          status: isCompleted ? "completed" : "joined",
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("user_id", user.id)
        .eq("challenge_id", challengeId);

      if (error) throw error;

      if (isCompleted) {
        // Award XP (challenge base + 50 XP completion bonus!)
        const totalXp = challengeXp + 50;
        await awardXP(user.id, totalXp, `Completed challenge: +${totalXp} XP earned!`, "🏆");

        // Award Category-specific achievements
        if (category === "Waste") {
          await awardAchievement(user.id, "waste_warrior");
        } else if (category === "Transport") {
          await awardAchievement(user.id, "green_commuter");
        } else if (category === "Food") {
          await awardAchievement(user.id, "vegan_voyager");
        }
        await performMetricCheck(user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_challenges", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
      toast.success("Progress logged successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log progress.");
    },
  });

  const activeChallenges =
    challenges?.filter((c) => {
      if (c.is_archived) return false;
      const joined = joinedMap.get(c.id);
      return !joined || joined.progress < 100;
    }) || [];

  const completedChallenges =
    challenges?.filter((c) => {
      const joined = joinedMap.get(c.id);
      return joined && joined.progress === 100;
    }) || [];

  if (loadingChallenges || loadingUserChallenges) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Challenges" description="Preparing quests..." />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Sustainability challenges"
        description="Pick a quest, earn XP, level up your impact."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <Flame className="h-4 w-4 text-coral" />{" "}
            <span className="font-semibold">{profile?.streak ?? 1}-day</span> streak
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" /> Available Quests · {activeChallenges.length}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {activeChallenges.map((c, i) => {
          const joined = joinedMap.get(c.id);
          const progress = joined ? Number(joined.progress) : 0;
          const completedDays = joined ? (joined.completed_days ?? 0) : 0;
          const requiredDays = c.required_days ?? 7;
          const isJoined = !!joined;

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="group flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">
                      {c.icon}
                    </div>
                    <span className="rounded-full bg-sun/15 px-2 py-1 text-[10px] font-medium text-sun">
                      +{c.xp} XP
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="mt-6">
                  {isJoined ? (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-eco">{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full gradient-eco transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          progressMutation.mutate({
                            challengeId: c.id,
                            completedDays,
                            requiredDays,
                            challengeXp: c.xp,
                            category: c.category ?? "",
                          })
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-eco/30 bg-eco/5 py-2 text-xs font-semibold text-eco hover:bg-eco/10"
                      >
                        Log progress ({completedDays}/{requiredDays} days){" "}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinMutation.mutate(c.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl gradient-eco py-2.5 text-xs font-semibold text-primary-foreground glow-eco"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Join Challenge
                    </button>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> {c.duration}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5">{c.category}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-eco" /> Completed Quests · {completedChallenges.length}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {completedChallenges.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
            No completed challenges yet.
          </div>
        ) : (
          completedChallenges.map((c) => (
            <GlassCard key={c.id} className="border-eco/30 bg-eco/5">
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-eco text-2xl">
                  {c.icon}
                </div>
                <span className="rounded-full bg-eco/20 px-2 py-1 text-[10px] font-medium text-eco">
                  ✓ Complete
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              <p className="mt-3 text-xs font-medium text-sun">+{c.xp + 50} XP earned</p>
            </GlassCard>
          ))
        )}
      </div>
    </>
  );
}
