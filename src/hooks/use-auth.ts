import { useAuthContext } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Profile } from "@/types/database";

export function useAuth() {
  const context = useAuthContext();
  const { user } = context;

  // React Query to fetch user profile reactively
  const { data: profile, refetch: refetchProfileQuery } = useQuery<Profile | null>({
    queryKey: ["profiles", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile reactively:", error);
        return null;
      }

      const prof = data as Profile;

      // STREAK AUDIT: Reset streak to 0 if missed a day (diff > 1 day)
      if (prof.last_activity_date) {
        const todayStr = new Date().toISOString().split("T")[0];
        const todayDate = new Date(todayStr);
        const lastActiveDate = new Date(prof.last_activity_date);

        // Calculate date difference ignoring time of day
        const diffTime = todayDate.getTime() - lastActiveDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1 && prof.streak > 0) {
          await supabase.from("profiles").update({ streak: 0 }).eq("id", user.id);
          prof.streak = 0;
        }
      }
      return prof;
    },
    enabled: !!user,
  });

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/app/dashboard",
      },
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) throw error;
    return data;
  };

  return {
    ...context,
    profile: profile ?? context.profile, // Fallback to auth-provider state if query is resolving
    refreshProfile: async () => {
      await refetchProfileQuery();
      return context.refreshProfile();
    },
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    resetPassword,
  };
}
