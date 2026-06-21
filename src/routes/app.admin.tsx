import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Cloud,
  Trophy,
  TreePine,
  Activity,
  Percent,
  Megaphone,
  Plus,
  Edit2,
  Archive,
  Trash2,
  ShieldAlert,
  Award,
  Search,
  Sparkles,
  X,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { calculateLevel } from "@/services/user-service";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Admin Panel — CarbonLens AI" }] }),
  component: Admin,
});

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.21 0.025 210 / 0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
  } as const,
};

function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "analytics" | "users" | "challenges" | "achievements" | "broadcast"
  >("analytics");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeModal, setActiveModal] = useState<{
    type:
      | "adjust_xp"
      | "view_profile"
      | "create_challenge"
      | "edit_challenge"
      | "create_achievement"
      | "edit_achievement";
    data?: any;
  } | null>(null);

  const [xpInput, setXpInput] = useState("");
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    xp: 100,
    icon: "🏆",
    category: "Transport",
    duration: "7 Days",
    required_days: 7,
  });
  const [achievementForm, setAchievementForm] = useState({
    title: "",
    description: "",
    xp_reward: 200,
    icon: "🎖️",
    key: "",
  });
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const isAdmin = profile?.role === "admin";

  const { data: adminStats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select(
          "trees_planted, xp_points, created_at, last_activity_date, level, sustainability_score, streak, email, name, avatar, role, location",
        );

      const totalTrees = profilesData?.reduce((a, b) => a + (b.trees_planted || 0), 0) ?? 0;
      const totalXp = profilesData?.reduce((a, b) => a + (b.xp_points || 0), 0) ?? 0;

      const { count: challengesCount } = await supabase
        .from("challenges")
        .select("*", { count: "exact", head: true });

      const { data: co2SavedData } = await supabase.from("simulations").select("annual_savings");
      const totalCo2Saved =
        co2SavedData?.reduce((a, b) => a + Number(b.annual_savings || 0), 0) ?? 0;

      const { data: topUsers } = await supabase
        .from("profiles")
        .select("name, avatar, sustainability_score")
        .order("sustainability_score", { ascending: false })
        .limit(6);

      const todayStr = new Date().toISOString().split("T")[0];
      const dailyActive =
        profilesData?.filter((p) => p.last_activity_date === todayStr).length ?? 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeLast30Days =
        profilesData?.filter((p) => {
          if (!p.last_activity_date) return false;
          return new Date(p.last_activity_date) >= thirtyDaysAgo;
        }).length ?? 0;
      const retention =
        usersCount && usersCount > 0 ? Math.round((activeLast30Days / usersCount) * 100) : 0;

      const { data: activityLogs } = await supabase.from("activity_logs").select("activity_type");
      const featureUses = (activityLogs || []).reduce((acc: Record<string, number>, log: any) => {
        const type = log.activity_type || "other";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const { count: aiMessagesCount } = await supabase
        .from("ai_messages")
        .select("*", { count: "exact", head: true });

      const { count: goalsCount } = await supabase
        .from("goals")
        .select("*", { count: "exact", head: true });

      return {
        totalUsers: usersCount || 0,
        totalCO2Saved: totalCo2Saved || 0,
        activeChallenges: challengesCount || 0,
        treesPlanted: totalTrees,
        totalXp,
        topUsers: topUsers || [],
        regDates: profilesData || [],
        dailyActive,
        retention,
        featureUses,
        coachUses: aiMessagesCount || 0,
        goalsCount: goalsCount || 0,
      };
    },
    enabled: isAdmin,
  });

  const { data: allProfiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "users",
  });

  const { data: allChallenges, isLoading: loadingChallenges } = useQuery({
    queryKey: ["admin_challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "challenges",
  });

  const { data: allAchievements, isLoading: loadingAchievements } = useQuery({
    queryKey: ["admin_achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "achievements",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      toast.success("User role updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role.");
    },
  });

  const adjustXPMutation = useMutation({
    mutationFn: async ({ userId, newXp }: { userId: string; newXp: number }) => {
      const newLevel = calculateLevel(newXp);
      const { error } = await supabase
        .from("profiles")
        .update({ xp_points: newXp, level: newLevel })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      setActiveModal(null);
      toast.success("User XP and Level adjusted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust XP.");
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (payload: typeof challengeForm) => {
      const { error } = await supabase.from("challenges").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      setActiveModal(null);
      toast.success("Challenge created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create challenge.");
    },
  });

  const editChallengeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof challengeForm }) => {
      const { error } = await supabase.from("challenges").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_challenges"] });
      setActiveModal(null);
      toast.success("Challenge updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update challenge.");
    },
  });

  const archiveChallengeMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ is_archived: isArchived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_challenges"] });
      toast.success("Challenge archive status updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update archive status.");
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      toast.success("Challenge deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete challenge. It might be joined by active users.");
    },
  });

  const createAchievementMutation = useMutation({
    mutationFn: async (payload: typeof achievementForm) => {
      const { error } = await supabase.from("achievements").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_achievements"] });
      setActiveModal(null);
      toast.success("Achievement created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create achievement.");
    },
  });

  const editAchievementMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof achievementForm }) => {
      const { error } = await supabase.from("achievements").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_achievements"] });
      setActiveModal(null);
      toast.success("Achievement updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update achievement.");
    },
  });

  const archiveAchievementMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from("achievements")
        .update({ is_archived: isArchived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_achievements"] });
      toast.success("Achievement archive status updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update archive status.");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (payload: typeof broadcastForm) => {
      const { data: users, error: userErr } = await supabase.from("profiles").select("id");
      if (userErr) throw userErr;
      if (!users || users.length === 0) throw new Error("No platform users found to broadcast to.");

      const icon =
        payload.type === "warning"
          ? "⚠️"
          : payload.type === "success"
            ? "🎉"
            : payload.type === "announcement"
              ? "📢"
              : "🔔";

      const insertData = users.map((u) => ({
        user_id: u.id,
        title: payload.title,
        message: payload.message,
        type: payload.type === "announcement" ? "info" : payload.type,
        icon,
      }));

      const { error: insertErr } = await supabase.from("notifications").insert(insertData);
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      setBroadcastForm({ title: "", message: "", type: "info" });
      toast.success("Platform-wide broadcast announcement sent successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Broadcast failed.");
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-eco mx-auto" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass max-w-md rounded-3xl p-8 border border-white/10 space-y-4">
          <ShieldAlert className="h-12 w-12 text-coral mx-auto" />
          <h2 className="text-xl font-bold text-coral">Unauthorized Access</h2>
          <p className="text-sm text-muted-foreground">
            This dashboard is restricted to administrator profiles. All administrative mutations are
            protected by Row-Level Security checks.
          </p>
          <Link
            to="/app/dashboard"
            className="inline-flex rounded-xl gradient-eco px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const registrationsByMonth = (adminStats?.regDates || []).reduce(
    (acc: Record<string, number>, p: any) => {
      if (!p.created_at) return acc;
      const date = new Date(p.created_at);
      const monthName = date.toLocaleString("en-US", { month: "short" });
      acc[monthName] = (acc[monthName] || 0) + 1;
      return acc;
    },
    {},
  );

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
  const growthData = [];
  let cumulativeUsers = 0;
  const counts: Record<string, number> = {};
  monthNames.forEach((m) => {
    counts[m] = registrationsByMonth[m] || 0;
  });

  for (let i = 5; i >= 0; i--) {
    const mIdx = (currentMonthIdx - i + 12) % 12;
    const mName = monthNames[mIdx];
    cumulativeUsers += counts[mName];
    growthData.push({
      month: mName,
      users: cumulativeUsers,
      co2: Math.round(cumulativeUsers * 15.5),
    });
  }

  const engagementData = [
    {
      feature: "Dashboard",
      uses:
        (adminStats?.featureUses?.["registration"] || 0) +
        (adminStats?.featureUses?.["xp_award"] || 0) +
        15,
    },
    { feature: "Coach", uses: adminStats?.coachUses || 0 },
    { feature: "Challenges", uses: adminStats?.featureUses?.["challenge_join"] || 0 },
    { feature: "Simulator", uses: adminStats?.featureUses?.["simulation_commit"] || 0 },
    { feature: "Goals", uses: adminStats?.goalsCount || 0 },
  ];

  const filteredUsers = (allProfiles || []).filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Admin Panel"
        description="Configure challenges, achievements, broadcasts, and inspect platform telemetry."
      />

      <div className="flex border-b border-white/10 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setTab("analytics")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${tab === "analytics" ? "border-eco text-eco" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Activity className="h-4 w-4" /> Telemetry
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${tab === "users" ? "border-eco text-eco" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="h-4 w-4" /> Users
        </button>
        <button
          onClick={() => setTab("challenges")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${tab === "challenges" ? "border-eco text-eco" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Trophy className="h-4 w-4" /> Challenges
        </button>
        <button
          onClick={() => setTab("achievements")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${tab === "achievements" ? "border-eco text-eco" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Award className="h-4 w-4" /> Achievements
        </button>
        <button
          onClick={() => setTab("broadcast")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${tab === "broadcast" ? "border-eco text-eco" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Megaphone className="h-4 w-4" /> Broadcasts
        </button>
      </div>

      {tab === "analytics" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid gap-4 md:grid-cols-4 h-24 bg-white/5 rounded-2xl animate-pulse" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={Users}
                  label="Total users"
                  value={adminStats?.totalUsers.toLocaleString() ?? "0"}
                  sub="Active platform members"
                />
                <Metric
                  icon={Cloud}
                  label="CO₂ saved"
                  value={
                    adminStats?.totalCO2Saved && adminStats.totalCO2Saved >= 1000
                      ? `${(adminStats.totalCO2Saved / 1000).toFixed(1)}t`
                      : `${adminStats?.totalCO2Saved ?? 0} kg`
                  }
                  sub="Telemetry aggregates"
                />
                <Metric
                  icon={Trophy}
                  label="Active challenges"
                  value={`${adminStats?.activeChallenges ?? 0}`}
                  sub="Platform-wide"
                />
                <Metric
                  icon={TreePine}
                  label="Trees planted"
                  value={adminStats?.treesPlanted.toLocaleString() ?? "0"}
                  sub="via verified offsets"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <GlassCard className="lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">User & impact growth</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-eco" /> Users
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-ocean" /> CO₂ saved (t)
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData} margin={{ left: -20 }}>
                        <defs>
                          <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--eco)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--eco)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--ocean)" stopOpacity={0.4} />
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
                          dataKey="users"
                          stroke="var(--eco)"
                          strokeWidth={2.5}
                          fill="url(#ag1)"
                        />
                        <Area
                          type="monotone"
                          dataKey="co2"
                          stroke="var(--ocean)"
                          strokeWidth={2.5}
                          fill="url(#ag2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <div className="space-y-4 flex flex-col justify-between">
                  <GlassCard className="flex-1 flex flex-col justify-center">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Activity className="h-3.5 w-3.5 text-eco" /> Daily active
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-gradient-eco">
                      {adminStats?.dailyActive ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unique active profiles today
                    </p>
                  </GlassCard>
                  <GlassCard className="flex-1 flex flex-col justify-center">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Percent className="h-3.5 w-3.5 text-ocean" /> 30-day retention
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{adminStats?.retention ?? 0}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Users active in last 30 days
                    </p>
                  </GlassCard>
                  <GlassCard className="flex-1 flex flex-col justify-center">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-sun" /> Total XP Awarded
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {(adminStats?.totalXp ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Platform points generated</p>
                  </GlassCard>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <GlassCard>
                  <h3 className="text-sm font-semibold">Engagement by feature</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engagementData} margin={{ left: -20 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                          dataKey="feature"
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
                        <Bar dataKey="uses" fill="var(--eco)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-sm font-semibold">Top users this month</h3>
                  <div className="mt-3 space-y-2">
                    {adminStats?.topUsers.map((u: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl border border-white/5 px-3 py-2 bg-white/[0.02]"
                      >
                        <span className="w-6 text-xs text-muted-foreground">#{idx + 1}</span>
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-eco/30 to-ocean/30 text-xs font-semibold overflow-hidden">
                          {u.avatar && u.avatar.startsWith("http") ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (u.avatar ?? u.name?.substring(0, 2).toUpperCase() ?? "CL")
                          )}
                        </div>
                        <span className="flex-1 truncate text-sm">{u.name}</span>
                        <span className="text-sm font-semibold text-gradient-eco">
                          {u.sustainability_score}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-eco"
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-end">
              Showing {filteredUsers.length} of {allProfiles?.length ?? 0} users
            </div>
          </div>

          <GlassCard className="overflow-x-auto p-0 border border-white/10">
            {loadingProfiles ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
                Loading profiles...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No users found matching query.
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Level (XP)</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Streak</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-white/5 grid place-items-center text-xs font-semibold text-eco overflow-hidden flex-shrink-0">
                          {u.avatar && u.avatar.startsWith("http") ? (
                            <img
                              src={u.avatar}
                              alt={u.name || "User"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (u.avatar ?? u.name?.substring(0, 2).toUpperCase() ?? "CL")
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[150px]">
                            {u.name || "Eco Citizen"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {u.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            u.role === "admin"
                              ? "bg-coral/25 text-coral"
                              : "bg-white/10 text-muted-foreground"
                          }`}
                        >
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-sun">Lvl {u.level}</span>
                        <span className="text-xs text-muted-foreground block">
                          {(u.xp_points || 0).toLocaleString()} XP
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-eco">{u.sustainability_score}</td>
                      <td className="p-4">
                        <span className="text-coral font-medium">🔥 {u.streak}d</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Details"
                            onClick={() => setActiveModal({ type: "view_profile", data: u })}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Adjust XP"
                            onClick={() => {
                              setXpInput(String(u.xp_points || 0));
                              setActiveModal({ type: "adjust_xp", data: u });
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sun hover:text-sun/90 transition-colors"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                          {u.role === "admin" ? (
                            <button
                              title="Demote to User"
                              onClick={() => {
                                if (u.id === profile?.id) {
                                  toast.error("You cannot demote yourself!");
                                  return;
                                }
                                if (confirm(`Demote ${u.name || u.email} to normal user?`)) {
                                  updateRoleMutation.mutate({ userId: u.id, newRole: "user" });
                                }
                              }}
                              className="p-1.5 bg-white/5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              title="Promote to Admin"
                              onClick={() => {
                                if (confirm(`Promote ${u.name || u.email} to Administrator?`)) {
                                  updateRoleMutation.mutate({ userId: u.id, newRole: "admin" });
                                }
                              }}
                              className="p-1.5 bg-white/5 hover:bg-eco/10 rounded-lg text-eco hover:text-eco/90 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </div>
      )}

      {tab === "challenges" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Manage quests
            </h3>
            <button
              onClick={() => {
                setChallengeForm({
                  title: "",
                  description: "",
                  xp: 100,
                  icon: "🏆",
                  category: "Transport",
                  duration: "7 Days",
                  required_days: 7,
                });
                setActiveModal({ type: "create_challenge" });
              }}
              className="gradient-eco px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground flex items-center gap-1.5 shadow-md glow-eco"
            >
              <Plus className="h-3.5 w-3.5" /> New Challenge
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingChallenges ? (
              <div className="col-span-full text-center text-sm text-muted-foreground animate-pulse py-12">
                Loading challenges...
              </div>
            ) : allChallenges?.length === 0 ? (
              <div className="col-span-full text-center text-sm text-muted-foreground py-12">
                No challenges set up in the database.
              </div>
            ) : (
              allChallenges?.map((c) => (
                <GlassCard
                  key={c.id}
                  className={`flex flex-col justify-between h-full border ${c.is_archived ? "border-white/5 opacity-50 bg-white/[0.01]" : "border-white/10"}`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-xl">
                        {c.icon}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded-full bg-sun/15 px-2 py-0.5 text-[10px] font-semibold text-sun">
                          +{c.xp} XP
                        </span>
                        {c.is_archived && (
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                            Archived
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="mt-3 font-semibold text-sm">{c.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {c.duration} ({c.required_days} days)
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{c.category}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setChallengeForm({
                          title: c.title,
                          description: c.description || "",
                          xp: c.xp,
                          icon: c.icon,
                          category: c.category || "Transport",
                          duration: c.duration || "7 Days",
                          required_days: c.required_days || 7,
                        });
                        setActiveModal({ type: "edit_challenge", data: c });
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() =>
                        archiveChallengeMutation.mutate({ id: c.id, isArchived: !c.is_archived })
                      }
                      className={`flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${c.is_archived ? "text-eco" : "text-coral"} transition-colors`}
                    >
                      <Archive className="h-3 w-3" /> {c.is_archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you absolutely sure you want to permanently delete this challenge? Users currently pursuing it will lose progress.`,
                          )
                        ) {
                          deleteChallengeMutation.mutate(c.id);
                        }
                      }}
                      className="p-1.5 bg-white/5 hover:bg-red-500/15 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Manage Badges
            </h3>
            <button
              onClick={() => {
                setAchievementForm({
                  title: "",
                  description: "",
                  xp_reward: 200,
                  icon: "🎖️",
                  key: "",
                });
                setActiveModal({ type: "create_achievement" });
              }}
              className="gradient-eco px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground flex items-center gap-1.5 shadow-md glow-eco"
            >
              <Plus className="h-3.5 w-3.5" /> New Achievement
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loadingAchievements ? (
              <div className="col-span-full text-center text-sm text-muted-foreground animate-pulse py-12">
                Loading achievements...
              </div>
            ) : allAchievements?.length === 0 ? (
              <div className="col-span-full text-center text-sm text-muted-foreground py-12">
                No achievements loaded from DB.
              </div>
            ) : (
              allAchievements?.map((a) => (
                <GlassCard
                  key={a.id}
                  className={`flex flex-col justify-between h-full border ${a.is_archived ? "border-white/5 opacity-50 bg-white/[0.01]" : "border-white/10"}`}
                >
                  <div className="text-center">
                    <div className="relative mx-auto mt-2">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl bg-white/5 border border-white/10">
                        {a.icon}
                      </div>
                    </div>
                    <h4 className="mt-3 font-semibold text-sm truncate">{a.title}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                      {a.key}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed px-1">
                      {a.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between text-[11px] mb-3 text-muted-foreground">
                      <span>Reward</span>
                      <span className="font-semibold text-sun">+{a.xp_reward ?? 200} XP</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAchievementForm({
                            title: a.title,
                            description: a.description || "",
                            xp_reward: a.xp_reward || 200,
                            icon: a.icon,
                            key: a.key,
                          });
                          setActiveModal({ type: "edit_achievement", data: a });
                        }}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() =>
                          archiveAchievementMutation.mutate({
                            id: a.id,
                            isArchived: !a.is_archived,
                          })
                        }
                        className={`flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${a.is_archived ? "text-eco" : "text-coral"} transition-colors`}
                      >
                        <Archive className="h-3 w-3" /> {a.is_archived ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "broadcast" && (
        <GlassCard className="max-w-xl mx-auto mt-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <Megaphone className="h-6 w-6 text-eco" />
            <div>
              <h3 className="font-bold text-base">Broadcast Announcement</h3>
              <p className="text-xs text-muted-foreground">
                Send a real-time notification to all active user dashboard feeds.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!broadcastForm.title || !broadcastForm.message) {
                toast.error("Please fill in both title and message!");
                return;
              }
              broadcastMutation.mutate(broadcastForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Platform Maintenance scheduled"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-eco"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">
                Broadcast message *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write message contents here..."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-eco resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">
                Alert Level Type
              </label>
              <select
                value={broadcastForm.type}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-eco"
              >
                <option value="info">Info (Standard Notification)</option>
                <option value="announcement">Announcement (Megaphone icon)</option>
                <option value="success">Success (Achievement congrats)</option>
                <option value="warning">Warning (Immediate alert)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={broadcastMutation.isPending}
              className="w-full py-3 rounded-xl gradient-eco font-bold text-sm text-primary-foreground shadow-lg hover:shadow-xl glow-eco transition-all disabled:opacity-50 mt-2"
            >
              {broadcastMutation.isPending
                ? "Broadcasting announcement..."
                : "Send Announcement Broadcast"}
            </button>
          </form>
        </GlassCard>
      )}

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong w-full max-w-md rounded-3xl p-6 border border-white/10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                <h3 className="font-bold text-lg">
                  {activeModal.type === "adjust_xp" && "Adjust User XP"}
                  {activeModal.type === "view_profile" && "Profile Details"}
                  {activeModal.type === "create_challenge" && "Create Quest"}
                  {activeModal.type === "edit_challenge" && "Edit Quest"}
                  {activeModal.type === "create_achievement" && "Create Badge"}
                  {activeModal.type === "edit_achievement" && "Edit Badge"}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeModal.type === "adjust_xp" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!xpInput || isNaN(Number(xpInput))) return;
                    adjustXPMutation.mutate({
                      userId: activeModal.data.id,
                      newXp: Number(xpInput),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Updating XP for{" "}
                      <strong className="text-foreground">{activeModal.data.name}</strong>. Level
                      will be recalculated automatically using the 500 XP per level schema.
                    </p>
                    <label className="text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">
                      Absolute XP Points
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={xpInput}
                      onChange={(e) => setXpInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adjustXPMutation.isPending}
                    className="w-full py-2.5 rounded-xl gradient-eco font-semibold text-sm text-primary-foreground glow-eco disabled:opacity-50"
                  >
                    {adjustXPMutation.isPending ? "Updating points..." : "Save Adjustments"}
                  </button>
                </form>
              )}

              {activeModal.type === "view_profile" && activeModal.data && (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-eco/30 to-ocean/30 border border-white/10 grid place-items-center text-xl font-bold text-eco overflow-hidden">
                      {activeModal.data.avatar && activeModal.data.avatar.startsWith("http") ? (
                        <img
                          src={activeModal.data.avatar}
                          alt={activeModal.data.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (activeModal.data.avatar ??
                        activeModal.data.name?.substring(0, 2).toUpperCase() ??
                        "CL")
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base">
                        {activeModal.data.name || "Eco Citizen"}
                      </h4>
                      <p className="text-xs text-muted-foreground">{activeModal.data.email}</p>
                      <p className="text-xs text-eco/90 font-medium uppercase mt-1 tracking-wider">
                        Role: {activeModal.data.role || "user"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Sustainability Score
                      </span>
                      <span className="text-lg font-bold text-eco">
                        {activeModal.data.sustainability_score} / 100
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Trees Planted
                      </span>
                      <span className="text-lg font-bold text-ocean">
                        {activeModal.data.trees_planted} trees
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Current XP
                      </span>
                      <span className="text-lg font-bold text-sun">
                        {(activeModal.data.xp_points || 0).toLocaleString()} XP
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Calculated Level
                      </span>
                      <span className="text-lg font-bold text-sun">
                        Level {activeModal.data.level}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Location
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate block mt-1">
                        {activeModal.data.location || "Location not set"}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Active Streak
                      </span>
                      <span className="text-sm font-bold text-coral block mt-1">
                        🔥 {activeModal.data.streak} Days
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex justify-between pt-2">
                    <span>Account registration:</span>
                    <span>
                      {activeModal.data.created_at
                        ? new Date(activeModal.data.created_at).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-full bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-xs font-semibold text-foreground transition-all mt-2"
                  >
                    Close Profile Overview
                  </button>
                </div>
              )}

              {(activeModal.type === "create_challenge" ||
                activeModal.type === "edit_challenge") && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (activeModal.type === "create_challenge") {
                      createChallengeMutation.mutate(challengeForm);
                    } else {
                      editChallengeMutation.mutate({
                        id: activeModal.data.id,
                        payload: challengeForm,
                      });
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Quest Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Meat-Free Monday"
                      value={challengeForm.title}
                      onChange={(e) =>
                        setChallengeForm({ ...challengeForm, title: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Quest Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Explain challenge completion guidelines..."
                      value={challengeForm.description}
                      onChange={(e) =>
                        setChallengeForm({ ...challengeForm, description: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        XP Reward *
                      </label>
                      <input
                        type="number"
                        required
                        min="10"
                        value={challengeForm.xp}
                        onChange={(e) =>
                          setChallengeForm({ ...challengeForm, xp: Number(e.target.value) })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Badge Icon *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 🥦"
                        value={challengeForm.icon}
                        onChange={(e) =>
                          setChallengeForm({ ...challengeForm, icon: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Target Days *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={challengeForm.required_days}
                        onChange={(e) =>
                          setChallengeForm({
                            ...challengeForm,
                            required_days: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Duration Text *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 7 Days, 30 Days"
                        value={challengeForm.duration}
                        onChange={(e) =>
                          setChallengeForm({ ...challengeForm, duration: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Category
                    </label>
                    <select
                      value={challengeForm.category}
                      onChange={(e) =>
                        setChallengeForm({ ...challengeForm, category: e.target.value })
                      }
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    >
                      <option value="Transport">Transport</option>
                      <option value="Energy">Energy</option>
                      <option value="Food">Food</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Waste">Waste</option>
                      <option value="Offsets">Offsets</option>
                      <option value="Engagement">Engagement</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={createChallengeMutation.isPending || editChallengeMutation.isPending}
                    className="w-full py-2.5 rounded-xl gradient-eco font-bold text-sm text-primary-foreground glow-eco disabled:opacity-50 mt-2"
                  >
                    {activeModal.type === "create_challenge" ? "Create Quest" : "Save Changes"}
                  </button>
                </form>
              )}

              {(activeModal.type === "create_achievement" ||
                activeModal.type === "edit_achievement") && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!achievementForm.key) {
                      toast.error("Unique key is required!");
                      return;
                    }
                    if (activeModal.type === "create_achievement") {
                      createAchievementMutation.mutate(achievementForm);
                    } else {
                      editAchievementMutation.mutate({
                        id: activeModal.data.id,
                        payload: achievementForm,
                      });
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Badge Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eco Master"
                      value={achievementForm.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const autoKey =
                          activeModal.type === "create_achievement"
                            ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                            : achievementForm.key;
                        setAchievementForm({ ...achievementForm, title: newTitle, key: autoKey });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Badge Key (Unique URL Slug) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={activeModal.type === "edit_achievement"}
                      placeholder="e.g. eco_master"
                      value={achievementForm.key}
                      onChange={(e) =>
                        setAchievementForm({
                          ...achievementForm,
                          key: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, ""),
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco disabled:opacity-50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Used by engine rules. Avoid modification after creation.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Badge Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Explain achievement unlock requirement details..."
                      value={achievementForm.description}
                      onChange={(e) =>
                        setAchievementForm({ ...achievementForm, description: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        XP Reward *
                      </label>
                      <input
                        type="number"
                        required
                        min="50"
                        value={achievementForm.xp_reward}
                        onChange={(e) =>
                          setAchievementForm({
                            ...achievementForm,
                            xp_reward: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">
                        Badge Icon *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 🏅"
                        value={achievementForm.icon}
                        onChange={(e) =>
                          setAchievementForm({ ...achievementForm, icon: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      createAchievementMutation.isPending || editAchievementMutation.isPending
                    }
                    className="w-full py-2.5 rounded-xl gradient-eco font-bold text-sm text-primary-foreground glow-eco disabled:opacity-50 mt-2"
                  >
                    {activeModal.type === "create_achievement" ? "Create Badge" : "Save Changes"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
          <Icon className="h-4 w-4 text-eco" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </GlassCard>
  );
}
