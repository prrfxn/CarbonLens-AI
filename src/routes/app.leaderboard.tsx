import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — CarbonLens AI" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const { user, profile } = useAuth();

  // Query top profiles sorted by sustainability score, total XP, and streak
  const { data: rankings, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar, sustainability_score, xp_points, streak, email")
        .order("sustainability_score", { ascending: false })
        .order("xp_points", { ascending: false })
        .order("streak", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <PageHeader title="Global Leaderboard" description="Comparing sustainability scores..." />
        <div className="grid gap-3 sm:grid-cols-3 h-48 bg-white/5 rounded-2xl mb-6" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  const items = rankings || [];

  // Only show empty state when there are no users
  if (items.length === 0) {
    return (
      <>
        <PageHeader
          title="Global leaderboard"
          description="The most sustainable members this month."
        />
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <GlassCard className="max-w-md p-8 border border-white/10 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Crown className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold font-outfit">Not enough participants yet</h3>
            <p className="text-sm text-muted-foreground">
              Not enough participants yet. Invite friends to compete.
            </p>
          </GlassCard>
        </div>
      </>
    );
  }

  // Map ranks
  const rankedUsers = items.map((u, index) => ({
    ...u,
    rank: index + 1,
  }));

  const podium = [
    rankedUsers[1], // 2nd Place (Left)
    rankedUsers[0], // 1st Place (Center)
    rankedUsers[2], // 3rd Place (Right)
  ];

  const rest = rankedUsers.length < 3 ? rankedUsers : rankedUsers.slice(3);

  // Find user's rank
  const myRanking = rankedUsers.find((r) => r.id === user?.id);

  return (
    <>
      <PageHeader
        title="Global leaderboard"
        description="The most sustainable members this month."
      />

      {/* Podium */}
      <div className="mb-6 grid items-end gap-3 sm:grid-cols-3">
        {podium[0] &&
          podium[1] &&
          podium[2] &&
          (
            [
              {
                p: podium[0],
                height: "h-36",
                color: "gradient-leaf",
                crown: false,
                displayRank: 2,
              },
              { p: podium[1], height: "h-48", color: "gradient-sun", crown: true, displayRank: 1 },
              { p: podium[2], height: "h-32", color: "gradient-eco", crown: false, displayRank: 3 },
            ] as const
          ).map(({ p, height, color, crown, displayRank }) => (
            <div key={p.id} className="flex flex-col items-center justify-end">
              <div className="text-center">
                <div
                  className={`mx-auto relative h-16 w-16 rounded-full overflow-hidden text-lg font-semibold text-primary-foreground flex items-center justify-center ${color}`}
                >
                  {p.avatar &&
                  (p.avatar.startsWith("http://") || p.avatar.startsWith("https://")) ? (
                    <img src={p.avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    (p.avatar ?? "U")
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold truncate max-w-[120px]">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.sustainability_score} score</p>
                <p className="text-[10px] text-muted-foreground">{p.xp_points ?? 0} XP</p>
              </div>
              <div
                className={`mt-3 w-full max-w-[140px] ${height} flex items-start justify-center rounded-t-2xl border border-white/10 bg-white/5 pt-3`}
              >
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {crown && <Crown className="h-4 w-4 text-sun" />} #{displayRank}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="grid grid-cols-12 gap-3 border-b border-white/5 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-2 sm:col-span-1">Rank</div>
          <div className="col-span-6 sm:col-span-6">User</div>
          <div className="col-span-2 sm:col-span-3 text-right">Score</div>
          <div className="col-span-2 sm:col-span-2 text-right">Streak</div>
        </div>

        {rest.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-0 hover:bg-white/5"
          >
            <div className="col-span-2 sm:col-span-1 text-muted-foreground">#{u.rank}</div>
            <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0">
              <div className="relative h-8 w-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-eco/30 to-ocean/30 text-xs font-semibold flex items-center justify-center">
                {u.avatar && (u.avatar.startsWith("http://") || u.avatar.startsWith("https://")) ? (
                  <img src={u.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (u.avatar ?? "U")
                )}
              </div>
              <span className="truncate">{u.name}</span>
            </div>
            <div className="col-span-2 sm:col-span-3 text-right font-semibold text-gradient-eco">
              {u.sustainability_score}
            </div>
            <div className="col-span-2 sm:col-span-2 text-right text-muted-foreground">
              {u.streak} days
            </div>
          </div>
        ))}

        {/* Your position footer row */}
        {profile && myRanking && (
          <div className="grid grid-cols-12 items-center gap-3 border-t border-eco/30 bg-eco/5 px-5 py-4 text-sm">
            <div className="col-span-2 sm:col-span-1 font-semibold">#{myRanking.rank}</div>
            <div className="col-span-6 sm:col-span-6 flex items-center gap-3">
              <div className="relative h-8 w-8 rounded-full overflow-hidden gradient-eco text-xs font-semibold text-primary-foreground flex items-center justify-center">
                {myRanking.avatar &&
                (myRanking.avatar.startsWith("http://") ||
                  myRanking.avatar.startsWith("https://")) ? (
                  <img src={myRanking.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (myRanking.avatar ?? "U")
                )}
              </div>
              <span className="font-medium">
                {myRanking.name} <span className="ml-1 text-[10px] text-eco">(you)</span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-3 text-right font-semibold text-gradient-eco">
              {myRanking.sustainability_score}
            </div>
            <div className="col-span-2 sm:col-span-2 text-right text-muted-foreground">
              {profile.streak} days
            </div>
          </div>
        )}
      </GlassCard>
    </>
  );
}
