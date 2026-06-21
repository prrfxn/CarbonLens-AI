import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Trophy,
  Award,
  Crown,
  Target,
  BarChart3,
  User,
  Shield,
  Bell,
  LogOut,
  Leaf,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/coach", label: "EcoAI Coach", icon: MessageCircle },
  { to: "/app/simulator", label: "Simulator", icon: Sparkles },
  { to: "/app/challenges", label: "Challenges", icon: Trophy },
  { to: "/app/achievements", label: "Achievements", icon: Award },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Crown },
  { to: "/app/goals", label: "Goals", icon: Target },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/admin", label: "Admin", icon: Shield },
] as const;

function timeAgo(dateStr: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);

  // Fetch notifications
  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setDbNotifications(data);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setDbNotifications((prev) => [payload.new, ...prev].slice(0, 10));
          toast.info(`Notification: ${payload.new.title}`);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Logout failed.");
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);

      setDbNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const userName = profile?.name ?? user?.email?.split("@")[0] ?? "CarbonLens Member";
  const userAvatar = profile?.avatar ?? userName.substring(0, 2).toUpperCase();
  const unreadCount = dbNotifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-card/40 backdrop-blur-xl p-4 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-eco glow-eco">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Carbon<span className="text-gradient-eco">Lens</span>
          </span>
        </Link>

        {/* User stats overview in sidebar */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-white/5 p-3 text-xs">
          <p className="font-semibold truncate text-foreground">{userName}</p>
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span>Level {profile?.level ?? 1}</span>
            <span>{profile?.xp_points ?? 0} XP</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full gradient-eco"
              style={{ width: `${((profile?.xp_points ?? 0) % 500) / 5}%` }}
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            // Admin page is restricted to users with admin role in DB
            if (item.to === "/app/admin" && profile?.role !== "admin") {
              return null;
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl gradient-eco">
                  <Leaf className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">
                  Carbon<span className="text-gradient-eco">Lens</span>
                </span>
              </Link>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {nav.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                if (item.to === "/app/admin" && profile?.role !== "admin") {
                  return null;
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      active
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-background/60 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 hover:bg-white/5 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs text-muted-foreground">Welcome back,</p>
              <p className="text-sm font-medium">{userName.split(" ")[0]} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 hover:bg-white/10">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral animate-pulse" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 glass-strong border-white/10 p-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notifications
                </p>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {dbNotifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    dbNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                        className={`flex gap-3 rounded-lg p-2 transition-colors cursor-pointer hover:bg-white/5 ${
                          !n.is_read ? "bg-white/[0.03]" : ""
                        }`}
                      >
                        <span className="text-xl shrink-0">{n.icon || "🔔"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-coral shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Link
              to="/app/profile"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
            >
              <div className="relative h-7 w-7 rounded-full overflow-hidden gradient-eco text-xs font-semibold text-primary-foreground flex items-center justify-center">
                {profile?.avatar &&
                (profile.avatar.startsWith("http://") || profile.avatar.startsWith("https://")) ? (
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  userAvatar.substring(0, 2)
                )}
              </div>
              <span className="hidden text-sm sm:inline truncate max-w-[120px]">{userName}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
