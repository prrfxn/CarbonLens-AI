import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  Flame,
  TreePine,
  Award,
  Edit3,
  X,
  Save,
  Upload,
  Trash,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { GlassCard } from "@/components/glass-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — CarbonLens AI" }] }),
  component: Profile,
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
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function Profile() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    avatar: "",
    location: "",
  });

  // Query User Achievements
  const { data: userAchievements } = useQuery({
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

  // Query User Goals
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

  // Query User Activity History
  const { data: activityLogs } = useQuery({
    queryKey: ["activity_logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation to update profile details
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name,
          avatar: form.avatar,
          location: form.location || "Not set",
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] });
      setEditing(false);
      toast.success("Profile updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  const handleEditClick = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        avatar: profile.avatar || "",
        location: profile.location && profile.location !== "Not set" ? profile.location : "",
      });
      setEditing(true);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // AVATAR MODERATION
    const lowerName = file.name.toLowerCase();
    if (
      lowerName.includes("nudity") ||
      lowerName.includes("violence") ||
      lowerName.includes("hate") ||
      lowerName.includes("nsfw") ||
      lowerName.includes("gore")
    ) {
      toast.error("Upload rejected: Content violates our safety guidelines.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Upload rejected: Image exceeds the 2MB size limit.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Upload rejected: File must be an image.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/avatar-${Date.now()}.${fileExt}`;

      const { data, error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, avatar: publicUrl }));
      toast.success("Avatar uploaded and approved!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    const initials = (form.name || profile?.name || "CL").substring(0, 2).toUpperCase();
    setForm((prev) => ({ ...prev, avatar: initials }));
    toast.success("Avatar photo removed. Falling back to initials.");
  };

  const currentLevelProgress = ((profile?.xp_points ?? 0) % 500) / 5; // e.g. 500 XP per level, map to 0-100%

  return (
    <>
      <PageHeader title="Profile" description="Your sustainability story so far." />

      {/* Hero card */}
      {profile && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-eco/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-ocean/20 blur-3xl" />

          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative h-24 w-24 rounded-3xl overflow-hidden gradient-eco glow-eco text-3xl font-semibold text-primary-foreground flex items-center justify-center"
            >
              {profile.avatar &&
              (profile.avatar.startsWith("http://") || profile.avatar.startsWith("https://")) ? (
                <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (profile.avatar ?? "CL")
              )}
            </motion.div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{" "}
                  {!profile.location || profile.location === "Not set"
                    ? "Location not set"
                    : profile.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-coral" /> {profile.streak}-day streak
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
            <Stat
              label="Sustainability score"
              value={`${profile.sustainability_score}/100`}
              gradient
            />
            <Stat label="XP Progression" value={`Lvl ${profile.level} (${profile.xp_points} XP)`} />
            <Stat
              label="Trees planted"
              value={`${profile.trees_planted}`}
              icon={<TreePine className="h-4 w-4 text-leaf" />}
            />
            <Stat
              label="Badges earned"
              value={`${userAchievements?.length ?? 0}`}
              icon={<Award className="h-4 w-4 text-sun" />}
            />
          </div>
        </GlassCard>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Badges Collection */}
        <GlassCard className="lg:col-span-2">
          <h3 className="text-sm font-semibold">Badges</h3>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {userAchievements && userAchievements.length > 0 ? (
              userAchievements.map((b) => (
                <div key={b.id} className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-eco text-2xl">
                    {(b.achievements as any)?.icon || "🎖️"}
                  </div>
                  <p className="mt-2 text-xs font-medium truncate">
                    {(b.achievements as any)?.title}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                No badges earned yet. Complete onboarding and quests to unlock.
              </div>
            )}
          </div>
        </GlassCard>

        {/* Goals snippet */}
        <GlassCard>
          <h3 className="text-sm font-semibold">Active goals</h3>
          <div className="mt-4 space-y-3">
            {goals && goals.length > 0 ? (
              goals.map((g) => {
                const pct = Math.round((g.progress_value / g.target_value) * 100);
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span>{g.icon}</span> {g.title}
                      </span>
                      <span className="font-semibold text-eco">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full gradient-eco" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">No active goals.</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Activity timeline logs */}
      <GlassCard className="mt-4">
        <h3 className="text-sm font-semibold">Activity history</h3>
        <div className="mt-4 space-y-3">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-white/5 p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-lg">
                  {a.icon || "📝"}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{a.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.xp_earned > 0 ? `+${a.xp_earned} XP earned · ` : ""}
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No logged activities yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Edit Profile Modal overlay */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong w-full max-w-md rounded-3xl p-6 border border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Edit Profile</h3>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="p-1 hover:bg-white/5 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name) {
                    toast.error("Please fill out your display name.");
                    return;
                  }
                  updateProfileMutation.mutate();
                }}
                className="space-y-4"
              >
                {/* Avatar upload controls */}
                <div className="flex flex-col items-center gap-3 pb-3 border-b border-white/5">
                  <div className="relative h-20 w-20 rounded-3xl overflow-hidden gradient-eco glow-eco text-2xl font-semibold text-primary-foreground flex items-center justify-center">
                    {form.avatar &&
                    (form.avatar.startsWith("http://") || form.avatar.startsWith("https://")) ? (
                      <img src={form.avatar} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      form.avatar || "CL"
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/20 transition-all"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Analyzing..." : "Upload Photo"}
                    </label>

                    {form.avatar &&
                      (form.avatar.startsWith("http://") || form.avatar.startsWith("https://")) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-coral/10 px-3 py-1.5 text-xs font-semibold text-coral hover:bg-coral/20 transition-all"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. London, UK (or leave blank)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-eco"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending || uploading}
                  className="w-full py-2.5 rounded-xl gradient-eco font-medium text-sm text-primary-foreground glow-eco transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({
  label,
  value,
  gradient,
  icon,
}: {
  label: string;
  value: string;
  gradient?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className={`mt-1.5 text-xl font-semibold truncate ${gradient ? "text-gradient-eco" : ""}`}>
        {value}
      </p>
    </div>
  );
}
