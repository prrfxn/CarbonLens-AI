import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/achievements")({
  head: () => ({ meta: [{ title: "Achievements — CarbonLens AI" }] }),
  component: Achievements,
});

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = [
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
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

function Achievements() {
  const { user } = useAuth();

  // Query all achievements
  const { data: achievements, isLoading: loadingAll } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Query earned achievements
  const { data: earnedAchievements, isLoading: loadingEarned } = useQuery({
    queryKey: ["user_achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const earnedMap = new Map<string, string>(); // achievement_id -> earned_at
  earnedAchievements?.forEach((ea) => {
    earnedMap.set(ea.achievement_id, ea.earned_at);
  });

  const earnedCount = earnedAchievements?.length ?? 0;
  const totalCount = achievements?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loadingAll || loadingEarned) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Achievements" description="Opening trophy room..." />
        <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Achievements"
        description={`${earnedCount} of ${totalCount} badges earned · Keep going!`}
      />

      <div className="mb-6 glass rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Collection progress</span>
          <span className="font-semibold">{progressPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1 }}
            className="h-full gradient-eco"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {achievements
          ?.filter((a) => !a.is_archived)
          .map((a, i) => {
            const earnedAt = earnedMap.get(a.id);
            const isEarned = !!earnedAt;

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard
                  className={`text-center h-full flex flex-col justify-between ${isEarned ? "" : "opacity-60"}`}
                >
                  <div>
                    <div className="relative mx-auto mt-2">
                      <div
                        className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-4xl ${
                          isEarned ? "gradient-eco glow-eco" : "bg-white/5"
                        }`}
                      >
                        {isEarned ? a.icon : <Lock className="h-7 w-7 text-muted-foreground" />}
                      </div>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{a.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground px-2 leading-relaxed">
                      {a.description}
                    </p>
                  </div>
                  <div>
                    {isEarned && earnedAt ? (
                      <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-eco/15 px-2.5 py-1 text-[10px] font-medium text-eco">
                        <Award className="h-3 w-3" /> Earned {formatDate(earnedAt)}
                      </p>
                    ) : (
                      <p className="mt-4 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Locked
                      </p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
      </div>
    </>
  );
}
